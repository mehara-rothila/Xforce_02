// CsvImporter.cs
using SpiritX.API.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using System.Linq;
using MySql.Data.MySqlClient;
using System.Threading.Tasks;

namespace SpiritX.API.Utilities
{
    public static class CsvImporter
    {
        public static List<Player> ImportPlayers(Stream csvStream, bool updateExisting = false)
        {
            try
            {
                Console.WriteLine("Starting CSV import process...");
                Console.WriteLine($"Update existing players: {updateExisting}");
                
                // First, read the raw CSV to debug its content
                using (var reader = new StreamReader(csvStream, leaveOpen: true))
                {
                    string csvContent = reader.ReadToEnd();
                    Console.WriteLine($"CSV content (first 500 chars):");
                    Console.WriteLine(csvContent.Substring(0, Math.Min(500, csvContent.Length)));
                    
                    // Reset stream position for CsvHelper
                    csvStream.Position = 0;
                }
                
                var players = new List<Player>();
                
                using (var reader = new StreamReader(csvStream))
                using (var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
                {
                    HasHeaderRecord = true,
                    HeaderValidated = null, // Don't validate header names
                    MissingFieldFound = null, // Don't throw on missing fields
                    Delimiter = "," // Make sure we're using commas
                }))
                {
                    // Log headers
                    csv.Read();
                    csv.ReadHeader();
                    var headers = csv.HeaderRecord;
                    Console.WriteLine($"CSV Headers: {string.Join(", ", headers)}");
                    
                    // Map CSV record to Player objects
                    int rowCount = 0;
                    int validCount = 0;
                    
                    while (csv.Read())
                    {
                        rowCount++;
                        try
                        {
                            var player = new Player
                            {
                                Name = csv.GetField("Name")?.Trim() ?? "",
                                University = csv.GetField("University")?.Trim() ?? "",
                                Category = csv.GetField("Category")?.Trim() ?? "",
                                TotalRuns = ParseInt(csv.GetField("Total Runs")),
                                BallsFaced = ParseInt(csv.GetField("Balls Faced")),
                                InningsPlayed = ParseInt(csv.GetField("Innings Played")),
                                Wickets = ParseInt(csv.GetField("Wickets")),
                                OversBowled = ParseInt(csv.GetField("Overs Bowled")),
                                RunsConceded = ParseInt(csv.GetField("Runs Conceded"))
                            };
                            
                            // Calculate derived statistics
                            player.CalculateStats();
                            
                            // Only add valid players
                            if (!string.IsNullOrWhiteSpace(player.Name) && 
                                !string.IsNullOrWhiteSpace(player.University) && 
                                !string.IsNullOrWhiteSpace(player.Category))
                            {
                                players.Add(player);
                                validCount++;
                                Console.WriteLine($"Added player from row {rowCount}: {player.Name}, {player.University}, {player.Category}");
                            }
                            else
                            {
                                Console.WriteLine($"Skipped invalid player at row {rowCount}: Missing required fields");
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Error processing CSV row {rowCount}: {ex.Message}");
                        }
                    }
                    
                    Console.WriteLine($"CSV processing completed. Read {rowCount} rows, found {validCount} valid players.");
                }
                
                return players;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"CSV import error: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
                }
                
                return new List<Player>();
            }
        }
        
        // Helper method to safely parse integers
        private static int ParseInt(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return 0;
                
            if (int.TryParse(value, out int result))
                return result;
                
            // Try to handle formatting issues like thousands separators
            value = value.Replace(",", "").Replace(" ", "");
            if (int.TryParse(value, out result))
                return result;
                
            return 0;
        }
        
        // This method can be called from the AdminController to handle player imports
        public static async Task<(int Added, int Updated, int Skipped, int Failed)> ImportPlayersToDatabase(
            List<Player> players, 
            string connectionString, 
            bool updateExisting = false)
        {
            int added = 0;
            int updated = 0;
            int skipped = 0;
            int failed = 0;
            
            // First, get all existing players for duplicate checking
            Dictionary<string, int> existingPlayers = new Dictionary<string, int>();
            
            using (var connection = new MySqlConnection(connectionString))
            {
                await connection.OpenAsync();
                
                // Get all existing player names and universities
                string getAllSql = "SELECT player_id, name, university FROM players";
                using (var getAllCmd = new MySqlCommand(getAllSql, connection))
                {
                    using (var reader = await getAllCmd.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            int id = Convert.ToInt32(reader["player_id"]);
                            string name = reader["name"].ToString();
                            string university = reader["university"].ToString();
                            
                            // Create a unique key for each player
                            string key = $"{name.ToLower().Trim()}|{university.ToLower().Trim()}";
                            existingPlayers[key] = id;
                        }
                    }
                }
                
                Console.WriteLine($"Found {existingPlayers.Count} existing players in database");
                
                // Now process each player with duplicate detection
                foreach (var player in players)
                {
                    try
                    {
                        // Create key for duplicate checking
                        string playerKey = $"{player.Name.ToLower().Trim()}|{player.University.ToLower().Trim()}";
                        bool exists = existingPlayers.TryGetValue(playerKey, out int existingId);
                        
                        Console.WriteLine($"Processing: {player.Name} - {player.University} - Exists: {exists}");
                        
                        if (exists && updateExisting)
                        {
                            // Update existing player
                            string updateSql = @"
                                UPDATE players 
                                SET category = @category, 
                                    total_runs = @totalRuns, 
                                    balls_faced = @ballsFaced, 
                                    innings_played = @inningsPlayed, 
                                    wickets = @wickets, 
                                    overs_bowled = @oversBowled, 
                                    runs_conceded = @runsConceded
                                WHERE player_id = @playerId";
                                
                            using (var updateCmd = new MySqlCommand(updateSql, connection))
                            {
                                updateCmd.Parameters.AddWithValue("@playerId", existingId);
                                updateCmd.Parameters.AddWithValue("@category", player.Category);
                                updateCmd.Parameters.AddWithValue("@totalRuns", player.TotalRuns);
                                updateCmd.Parameters.AddWithValue("@ballsFaced", player.BallsFaced);
                                updateCmd.Parameters.AddWithValue("@inningsPlayed", player.InningsPlayed);
                                updateCmd.Parameters.AddWithValue("@wickets", player.Wickets);
                                updateCmd.Parameters.AddWithValue("@oversBowled", player.OversBowled);
                                updateCmd.Parameters.AddWithValue("@runsConceded", player.RunsConceded);
                                
                                await updateCmd.ExecuteNonQueryAsync();
                                updated++;
                                Console.WriteLine($"Updated player: {player.Name}");
                            }
                        }
                        else if (!exists)
                        {
                            // Insert new player
                            string insertSql = @"
                                INSERT INTO players 
                                (name, university, category, total_runs, balls_faced, innings_played, wickets, overs_bowled, runs_conceded)
                                VALUES 
                                (@name, @university, @category, @totalRuns, @ballsFaced, @inningsPlayed, @wickets, @oversBowled, @runsConceded)";
                            
                            using (var insertCmd = new MySqlCommand(insertSql, connection))
                            {
                                insertCmd.Parameters.AddWithValue("@name", player.Name);
                                insertCmd.Parameters.AddWithValue("@university", player.University);
                                insertCmd.Parameters.AddWithValue("@category", player.Category);
                                insertCmd.Parameters.AddWithValue("@totalRuns", player.TotalRuns);
                                insertCmd.Parameters.AddWithValue("@ballsFaced", player.BallsFaced);
                                insertCmd.Parameters.AddWithValue("@inningsPlayed", player.InningsPlayed);
                                insertCmd.Parameters.AddWithValue("@wickets", player.Wickets);
                                insertCmd.Parameters.AddWithValue("@oversBowled", player.OversBowled);
                                insertCmd.Parameters.AddWithValue("@runsConceded", player.RunsConceded);
                                
                                await insertCmd.ExecuteNonQueryAsync();
                                
                                // Add to existing players dictionary to prevent duplicates within the same import
                                using (var getIdCmd = new MySqlCommand("SELECT LAST_INSERT_ID()", connection))
                                {
                                    int newId = Convert.ToInt32(await getIdCmd.ExecuteScalarAsync());
                                    existingPlayers[playerKey] = newId;
                                }
                                
                                added++;
                                Console.WriteLine($"Added new player: {player.Name}");
                            }
                        }
                        else
                        {
                            // Player exists but updateExisting is false
                            skipped++;
                            Console.WriteLine($"Skipped existing player: {player.Name} (update not requested)");
                        }
                    }
                    catch (Exception ex)
                    {
                        failed++;
                        Console.WriteLine($"Error importing player {player.Name}: {ex.Message}");
                    }
                }
            }
            
            return (added, updated, skipped, failed);
        }
    }
}
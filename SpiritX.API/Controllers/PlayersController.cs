// Updated File path: SpiritX.API/Controllers/PlayersController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SpiritX.API.Data;
using SpiritX.API.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MySql.Data.MySqlClient;
using Microsoft.Extensions.Configuration;
using System.ComponentModel.DataAnnotations.Schema;

namespace SpiritX.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PlayersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly string _connectionString;

        public PlayersController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _connectionString = configuration.GetConnectionString("DefaultConnection");
        }

        // Helper method to normalize and check category matches
        private bool MatchesCategory(string playerCategory, string filterCategory)
        {
            if (string.IsNullOrWhiteSpace(playerCategory) || string.IsNullOrWhiteSpace(filterCategory))
                return false;

            var normalizedPlayerCategory = playerCategory.ToLower().Trim();
            var normalizedFilterCategory = filterCategory.ToLower().Trim();

            // If filtering for Batsman
            if (normalizedFilterCategory == "batsman")
            {
                return normalizedPlayerCategory == "batsman" ||
                       normalizedPlayerCategory == "batsmen" ||
                       normalizedPlayerCategory == "bat" ||
                       normalizedPlayerCategory == "batter";
            }
            // If filtering for Bowler
            else if (normalizedFilterCategory == "bowler")
            {
                return normalizedPlayerCategory == "bowler" ||
                       normalizedPlayerCategory == "bowlers" ||
                       normalizedPlayerCategory == "bowl";
            }
            // If filtering for All-Rounder
            else if (normalizedFilterCategory == "all-rounder")
            {
                return normalizedPlayerCategory == "all-rounder" ||
                       normalizedPlayerCategory == "all rounder" ||
                       normalizedPlayerCategory == "allrounder" ||
                       normalizedPlayerCategory == "all-rounders" ||
                       normalizedPlayerCategory == "allrounders";
            }

            // Default: exact match
            return normalizedPlayerCategory == normalizedFilterCategory;
        }

        // GET: api/players
        [HttpGet]
        public IActionResult GetAllPlayers(string category = "")
        {
            try
            {
                Console.WriteLine($"GetAllPlayers called with category parameter: '{category}'");

                var players = new List<PlayerListViewModel>();

                using (var connection = new MySqlConnection(_connectionString))
                {
                    connection.Open();

                    // First, let's check what categories exist in the database
                    string checkCategoriesSql = "SELECT DISTINCT category FROM players";
                    var categories = new List<string>();

                    using (var command = new MySqlCommand(checkCategoriesSql, connection))
                    {
                        using (var reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                string dbCategory = reader.GetString("category");
                                categories.Add(dbCategory);
                                Console.WriteLine($"Found category in database: '{dbCategory}'");
                            }
                        }
                    }

                    // Get ALL players first, then filter in code
                    string sql = @"
                        SELECT player_id, name, university, category,
                               total_runs, balls_faced, innings_played,
                               wickets, overs_bowled, runs_conceded
                        FROM players";

                    Console.WriteLine($"Executing SQL query to get all players: {sql}");

                    List<PlayerListViewModel> allPlayers = new List<PlayerListViewModel>();

                    using (var command = new MySqlCommand(sql, connection))
                    {
                        using (var reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                var player = new PlayerListViewModel
                                {
                                    PlayerId = reader.GetInt32("player_id"),
                                    Name = reader.GetString("name"),
                                    University = reader.GetString("university"),
                                    Category = reader.GetString("category"),
                                    TotalRuns = reader.GetInt32("total_runs"),
                                    BallsFaced = reader.GetInt32("balls_faced"),
                                    InningsPlayed = reader.GetInt32("innings_played"),
                                    Wickets = reader.GetInt32("wickets"),
                                    OversBowled = reader.GetFloat("overs_bowled"),
                                    RunsConceded = reader.GetInt32("runs_conceded")
                                };

                                Console.WriteLine($"Player {player.PlayerId} '{player.Name}' has category: '{player.Category}'");

                                // Create a Player entity to calculate stats on backend
                                var playerEntity = new Player
                                {
                                    PlayerId = player.PlayerId,
                                    Name = player.Name,
                                    University = player.University,
                                    Category = player.Category,
                                    TotalRuns = player.TotalRuns,
                                    BallsFaced = player.BallsFaced,
                                    InningsPlayed = player.InningsPlayed,
                                    Wickets = player.Wickets,
                                    OversBowled = (int)player.OversBowled,
                                    RunsConceded = player.RunsConceded
                                };
                                
                                // Calculate all statistics on the backend
                                playerEntity.CalculateStats();
                                
                                // Apply the calculated stats to the view model (except Points)
                                player.BattingStrikeRate = playerEntity.BattingStrikeRate;
                                player.BattingAverage = playerEntity.BattingAverage;
                                player.BowlingStrikeRate = playerEntity.BowlingStrikeRate; // Now nullable
                                player.EconomyRate = playerEntity.EconomyRate; // Now nullable
                                // Do NOT expose Points - removed: player.Points = playerEntity.Points;
                                player.PlayerValue = playerEntity.PlayerValue;
                                
                                // Add display properties for handling undefined stats
                                player.BowlingStrikeRateDisplay = playerEntity.Wickets > 0 
                                    ? player.BowlingStrikeRate?.ToString("F2") 
                                    : "Undefined";
                                    
                                player.EconomyRateDisplay = playerEntity.OversBowled > 0 
                                    ? player.EconomyRate?.ToString("F2") 
                                    : "Undefined";

                                allPlayers.Add(player);
                            }
                        }
                    }

                    // Apply category filter in code
                    if (!string.IsNullOrWhiteSpace(category) && category != "All")
                    {
                        Console.WriteLine($"Filtering players in code by category: '{category}'");
                        
                        // Use the enhanced category matching
                        players = allPlayers
                            .Where(p => MatchesCategory(p.Category, category))
                            .ToList();

                        Console.WriteLine($"Found {players.Count} players after filtering by category '{category}'");
                    }
                    else
                    {
                        players = allPlayers;
                    }

                    // Get user's team players to filter out
                    var teamPlayers = new List<int>();
                    string userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                    int budget = 0;

                    if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out int userId))
                    {
                        // Get user's team ID
                        int teamId = 0;
                        string teamSql = "SELECT team_id FROM teams WHERE user_id = @userId LIMIT 1";

                        using (var command = new MySqlCommand(teamSql, connection))
                        {
                            command.Parameters.AddWithValue("@userId", userId);
                            var result = command.ExecuteScalar();
                            if (result != null && result != DBNull.Value)
                            {
                                teamId = Convert.ToInt32(result);
                            }
                        }

                        // Get team players
                        if (teamId > 0)
                        {
                            string playersSql = "SELECT player_id FROM team_players WHERE team_id = @teamId";

                            using (var command = new MySqlCommand(playersSql, connection))
                            {
                                command.Parameters.AddWithValue("@teamId", teamId);
                                using (var reader = command.ExecuteReader())
                                {
                                    while (reader.Read())
                                    {
                                        teamPlayers.Add(reader.GetInt32("player_id"));
                                    }
                                }
                            }
                        }

                        // Get user's budget
                        string budgetSql = "SELECT budget FROM users WHERE user_id = @userId";

                        using (var command = new MySqlCommand(budgetSql, connection))
                        {
                            command.Parameters.AddWithValue("@userId", userId);
                            var result = command.ExecuteScalar();
                            if (result != null && result != DBNull.Value)
                            {
                                budget = Convert.ToInt32(result);
                            }
                        }
                        
                        // UPDATED: Modified filtering based on whether a category is specified
                        if (!string.IsNullOrWhiteSpace(category) && category != "All")
                        {
                            // When filtering by a specific category, only remove players already in the team
                            // BUT NOT by budget - show all players regardless of budget
                            Console.WriteLine($"Category filter active: Will NOT filter by budget, only by team membership");
                            players = players
                                .Where(p => !teamPlayers.Contains(p.PlayerId))
                                .ToList();
                            
                            Console.WriteLine($"After team-only filtering: {players.Count} players remain");
                        }
                        else
                        {
                            // When not filtering by category, apply both budget and team filters
                            Console.WriteLine($"No category filter: Will filter by both budget ({budget}) and team membership");
                            players = players
                                .Where(p => !teamPlayers.Contains(p.PlayerId) && p.PlayerValue <= budget)
                                .ToList();
                                
                            Console.WriteLine($"After budget+team filtering: {players.Count} players remain");
                        }
                    }

                    // Get distribution of player values for debugging
                    var valueBuckets = players
                        .GroupBy(p => p.PlayerValue)
                        .OrderBy(g => g.Key)
                        .Select(g => new { Value = g.Key, Count = g.Count() })
                        .ToList();
                    
                    Console.WriteLine("Player values distribution:");
                    foreach (var bucket in valueBuckets)
                    {
                        Console.WriteLine($"  ₹{bucket.Value.ToString("N0")}: {bucket.Count} players");
                    }

                    // Return players and user's budget
                    return Ok(new { players = players, budget = budget });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting players: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }

                return StatusCode(500, new { message = "Failed to load players data", error = ex.Message });
            }
        }

        // GET: api/players/{id}
        [HttpGet("{id}")]
        public IActionResult GetPlayerById(int id)
        {
            try
            {
                using (var connection = new MySqlConnection(_connectionString))
                {
                    connection.Open();

                    string sql = @"
                        SELECT player_id, name, university, category,
                               total_runs, balls_faced, innings_played,
                               wickets, overs_bowled, runs_conceded
                        FROM players
                        WHERE player_id = @playerId";

                    using (var command = new MySqlCommand(sql, connection))
                    {
                        command.Parameters.AddWithValue("@playerId", id);

                        using (var reader = command.ExecuteReader())
                        {
                            if (reader.Read())
                            {
                                var player = new PlayerDetailViewModel
                                {
                                    PlayerId = reader.GetInt32("player_id"),
                                    Name = reader.GetString("name"),
                                    University = reader.GetString("university"),
                                    Category = reader.GetString("category"),
                                    TotalRuns = reader.GetInt32("total_runs"),
                                    BallsFaced = reader.GetInt32("balls_faced"),
                                    InningsPlayed = reader.GetInt32("innings_played"),
                                    Wickets = reader.GetInt32("wickets"),
                                    OversBowled = reader.GetFloat("overs_bowled"),
                                    RunsConceded = reader.GetInt32("runs_conceded")
                                };

                                // Create a Player entity to calculate stats on backend
                                var playerEntity = new Player
                                {
                                    PlayerId = player.PlayerId,
                                    Name = player.Name,
                                    University = player.University,
                                    Category = player.Category,
                                    TotalRuns = player.TotalRuns,
                                    BallsFaced = player.BallsFaced,
                                    InningsPlayed = player.InningsPlayed,
                                    Wickets = player.Wickets,
                                    OversBowled = (int)player.OversBowled,
                                    RunsConceded = player.RunsConceded
                                };
                                
                                // Calculate all statistics on the backend
                                playerEntity.CalculateStats();
                                
                                // Apply the calculated stats to the view model (except Points)
                                player.BattingStrikeRate = playerEntity.BattingStrikeRate;
                                player.BattingAverage = playerEntity.BattingAverage;
                                player.BowlingStrikeRate = playerEntity.BowlingStrikeRate; // Now nullable
                                player.EconomyRate = playerEntity.EconomyRate; // Now nullable
                                // Do NOT expose Points - removed: player.Points = playerEntity.Points;
                                player.PlayerValue = playerEntity.PlayerValue;
                                
                                // Add display properties for handling undefined stats
                                player.BowlingStrikeRateDisplay = playerEntity.Wickets > 0 
                                    ? player.BowlingStrikeRate?.ToString("F2") 
                                    : "Undefined";
                                    
                                player.EconomyRateDisplay = playerEntity.OversBowled > 0 
                                    ? player.EconomyRate?.ToString("F2") 
                                    : "Undefined";

                                return Ok(player);
                            }
                            else
                            {
                                return NotFound(new { message = "Player not found" });
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting player: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }

                return StatusCode(500, new { message = "Failed to load player data", error = ex.Message });
            }
        }
    }

    // ViewModels
    public class PlayerListViewModel
    {
        public int PlayerId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string University { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int TotalRuns { get; set; }
        public int BallsFaced { get; set; }
        public int InningsPlayed { get; set; }
        public int Wickets { get; set; }
        public float OversBowled { get; set; }
        public int RunsConceded { get; set; }
        public double BattingStrikeRate { get; set; }
        public double BattingAverage { get; set; }
        public double? BowlingStrikeRate { get; set; } // Now nullable for undefined value
        public double? EconomyRate { get; set; } // Now nullable for undefined value
        // Removed: public double Points { get; set; }
        public int PlayerValue { get; set; }
        
        // Added display properties
        [NotMapped]
        public string BowlingStrikeRateDisplay { get; set; } = "Undefined";
        
        [NotMapped]
        public string EconomyRateDisplay { get; set; } = "Undefined";
    }

    public class PlayerDetailViewModel
    {
        public int PlayerId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string University { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int TotalRuns { get; set; }
        public int BallsFaced { get; set; }
        public int InningsPlayed { get; set; }
        public int Wickets { get; set; }
        public float OversBowled { get; set; }
        public int RunsConceded { get; set; }
        public double BattingStrikeRate { get; set; }
        public double BattingAverage { get; set; }
        public double? BowlingStrikeRate { get; set; } // Now nullable for undefined value
        public double? EconomyRate { get; set; } // Now nullable for undefined value
        // Removed: public double Points { get; set; }
        public int PlayerValue { get; set; }
        
        // Added display properties
        [NotMapped]
        public string BowlingStrikeRateDisplay { get; set; } = "Undefined";
        
        [NotMapped]
        public string EconomyRateDisplay { get; set; } = "Undefined";
    }
}
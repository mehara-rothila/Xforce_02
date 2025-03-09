// File path: SpiritX.API/Controllers/AdminController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SpiritX.API.Data;
using SpiritX.API.Models;
using SpiritX.API.Utilities;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using MySql.Data.MySqlClient;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Configuration;

namespace SpiritX.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // This requires valid JWT authentication - SECURITY WARNING: Review if this should be [Authorize(Policy = "RequireAdminRole")]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly string _connectionString;

        public AdminController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _connectionString = configuration.GetConnectionString("DefaultConnection");
        }

        // GET: api/admin/test (for testing authentication)
        [HttpGet("test")]
        public IActionResult TestAuth()
        {
            // Get the username from the authenticated user
            var username = User.Identity?.Name;
            return Ok(new { message = $"Authentication successful for {username}" });
        }

        // POST: api/admin/importPlayers
        [HttpPost("importPlayers")]
        [DisableRequestSizeLimit]
        [RequestFormLimits(MultipartBodyLengthLimit = 104857600)] // 100 MB
        public async Task<IActionResult> ImportPlayers(IFormFile file, [FromForm] bool updateExisting = false)
        {
            try
            {
                // Log username for debugging
                var username = User.Identity?.Name;
                Console.WriteLine($"Import players request from user: {username}");
                Console.WriteLine($"Update existing players: {updateExisting}");

                if (file == null || file.Length == 0)
                {
                    return BadRequest(new { message = "No file uploaded" });
                }

                if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(new { message = "File must be a CSV" });
                }

                Console.WriteLine($"Received file: {file.FileName}, Size: {file.Length}");

                // Import players from CSV
                List<Player> players;
                using (var stream = file.OpenReadStream())
                {
                    players = CsvImporter.ImportPlayers(stream, updateExisting);
                }

                if (players.Count == 0)
                {
                    return BadRequest(new { message = "No valid player records found in the CSV" });
                }

                // Calculate stats for each player before import
                foreach (var player in players)
                {
                    player.CalculateStats();
                }

                // Import players to database with duplicate prevention
                var result = await CsvImporter.ImportPlayersToDatabase(players, _connectionString, updateExisting);

                return Ok(new
                {
                    message = $"Import completed. Added: {result.Added}, Updated: {result.Updated}, Skipped: {result.Skipped}, Failed: {result.Failed}",
                    added = result.Added,
                    updated = result.Updated,
                    skipped = result.Skipped,
                    failed = result.Failed
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error importing players: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }

                return StatusCode(500, new { message = "Failed to import players", error = ex.Message });
            }
        }

        // GET: api/admin/stats
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            try
            {
                // Log username for debugging
                var username = User.Identity?.Name;
                Console.WriteLine($"Get stats request from user: {username}");

                using (var connection = new MySqlConnection(_connectionString))
                {
                    await connection.OpenAsync();

                    // Get player count
                    int playerCount = 0;
                    string playerCountSql = "SELECT COUNT(*) FROM players";
                    using (var command = new MySqlCommand(playerCountSql, connection))
                    {
                        var result = await command.ExecuteScalarAsync();
                        playerCount = Convert.ToInt32(result);
                    }

                    // Get user count
                    int userCount = 0;
                    string userCountSql = "SELECT COUNT(*) FROM users";
                    using (var command = new MySqlCommand(userCountSql, connection))
                    {
                        var result = await command.ExecuteScalarAsync();
                        userCount = Convert.ToInt32(result);
                    }

                    // Get team count
                    int teamCount = 0;
                    string teamCountSql = "SELECT COUNT(*) FROM teams";
                    using (var command = new MySqlCommand(teamCountSql, connection))
                    {
                        var result = await command.ExecuteScalarAsync();
                        teamCount = Convert.ToInt32(result);
                    }

                    // Get top batsman
                    string topBatsmanName = "";
                    string topBatsmanUniversity = "";
                    int topBatsmanRuns = 0;
                    string topBatsmanSql = @"
                        SELECT name, university, total_runs
                        FROM players
                        ORDER BY total_runs DESC
                        LIMIT 1";

                    using (var command = new MySqlCommand(topBatsmanSql, connection))
                    {
                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                topBatsmanName = reader["name"].ToString();
                                topBatsmanUniversity = reader["university"].ToString();
                                topBatsmanRuns = Convert.ToInt32(reader["total_runs"]);
                            }
                        }
                    }

                    // Get top bowler
                    string topBowlerName = "";
                    string topBowlerUniversity = "";
                    int topBowlerWickets = 0;
                    string topBowlerSql = @"
                        SELECT name, university, wickets
                        FROM players
                        ORDER BY wickets DESC
                        LIMIT 1";

                    using (var command = new MySqlCommand(topBowlerSql, connection))
                    {
                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                topBowlerName = reader["name"].ToString();
                                topBowlerUniversity = reader["university"].ToString();
                                topBowlerWickets = Convert.ToInt32(reader["wickets"]);
                            }
                        }
                    }

                    return Ok(new
                    {
                        playerCount,
                        userCount,
                        teamCount,
                        topBatsman = string.IsNullOrEmpty(topBatsmanName) ? null : new
                        {
                            name = topBatsmanName,
                            university = topBatsmanUniversity,
                            totalRuns = topBatsmanRuns
                        },
                        topBowler = string.IsNullOrEmpty(topBowlerName) ? null : new
                        {
                            name = topBowlerName,
                            university = topBowlerUniversity,
                            wickets = topBowlerWickets
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting stats: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }

                return StatusCode(500, new { message = "Failed to get stats", error = ex.Message });
            }
        }

        // DELETE: api/admin/clearPlayers (helper endpoint to clear all players)
        [HttpDelete("clearPlayers")]
        public async Task<IActionResult> ClearPlayers()
        {
            try
            {
                var username = User.Identity?.Name;
                Console.WriteLine($"Clear players request from user: {username}");

                using (var connection = new MySqlConnection(_connectionString))
                {
                    await connection.OpenAsync();

                    // First check if there are any team_players references
                    string checkTeamPlayersSql = "SELECT COUNT(*) FROM team_players";
                    bool hasTeamPlayers = false;

                    try
                    {
                        using (var command = new MySqlCommand(checkTeamPlayersSql, connection))
                        {
                            var result = await command.ExecuteScalarAsync();
                            int teamPlayersCount = Convert.ToInt32(result);
                            hasTeamPlayers = teamPlayersCount > 0;
                        }
                    }
                    catch
                    {
                        // Table might not exist yet, ignore error
                        hasTeamPlayers = false;
                    }

                    if (hasTeamPlayers)
                    {
                        // Clear team_players first to avoid foreign key constraint errors
                        string clearTeamPlayersSql = "DELETE FROM team_players";
                        using (var command = new MySqlCommand(clearTeamPlayersSql, connection))
                        {
                            await command.ExecuteNonQueryAsync();
                        }
                    }

                    // Now clear the players table
                    string clearPlayersSql = "DELETE FROM players";
                    int rowsAffected = 0;

                    using (var command = new MySqlCommand(clearPlayersSql, connection))
                    {
                        rowsAffected = await command.ExecuteNonQueryAsync();
                    }

                    // Reset auto-increment counter
                    string resetAutoIncrementSql = "ALTER TABLE players AUTO_INCREMENT = 1";
                    using (var command = new MySqlCommand(resetAutoIncrementSql, connection))
                    {
                        await command.ExecuteNonQueryAsync();
                    }

                    return Ok(new { message = $"Successfully cleared {rowsAffected} players" });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error clearing players: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }

                return StatusCode(500, new { message = "Failed to clear players", error = ex.Message });
            }
        }

        // GET: api/admin/clearPlayersGet (Alternative endpoint that uses GET for UI compatibility)
        [HttpGet("clearPlayersGet")]
        public async Task<IActionResult> ClearPlayersGet()
        {
            // Forward to the same implementation as DELETE
            return await ClearPlayers();
        }

        // UPDATED: Added category parameter for filtering
        // GET: api/admin/players
        [HttpGet("players")]
        public async Task<IActionResult> GetPlayers(int page = 1, int pageSize = 10, string searchTerm = "", string category = "")
        {
            try
            {
                var username = User.Identity?.Name;
                Console.WriteLine($"Get players request from user: {username}, Page: {page}, PageSize: {pageSize}, Search: {searchTerm}, Category: {category}");

                using (var connection = new MySqlConnection(_connectionString))
                {
                    await connection.OpenAsync();

                    // Build the WHERE clause for filtering
                    string whereClause = "";
                    if (!string.IsNullOrWhiteSpace(searchTerm) || !string.IsNullOrWhiteSpace(category))
                    {
                        whereClause = " WHERE ";

                        if (!string.IsNullOrWhiteSpace(searchTerm))
                        {
                            whereClause += "(name LIKE @searchTerm OR university LIKE @searchTerm)";

                            if (!string.IsNullOrWhiteSpace(category) && category != "All")
                            {
                                whereClause += " AND ";
                            }
                        }

                        // Add category filter with case-insensitive comparison
                        if (!string.IsNullOrWhiteSpace(category) && category != "All")
                        {
                            whereClause += "LOWER(category) = LOWER(@category)";
                        }
                    }

                    // Count total players (for pagination) with filters
                    string countSql = "SELECT COUNT(*) FROM players" + whereClause;

                    int totalCount = 0;
                    using (var command = new MySqlCommand(countSql, connection))
                    {
                        if (!string.IsNullOrWhiteSpace(searchTerm))
                        {
                            command.Parameters.AddWithValue("@searchTerm", $"%{searchTerm}%");
                        }

                        if (!string.IsNullOrWhiteSpace(category) && category != "All")
                        {
                            command.Parameters.AddWithValue("@category", category);
                        }

                        var result = await command.ExecuteScalarAsync();
                        totalCount = Convert.ToInt32(result);
                    }

                    // Get players with pagination and filters
                    string sql = @"
                        SELECT
                            player_id,
                            name,
                            university,
                            category,
                            total_runs,
                            balls_faced,
                            innings_played,
                            wickets,
                            overs_bowled,
                            runs_conceded
                        FROM players" + whereClause;

                    sql += " ORDER BY name ASC LIMIT @offset, @pageSize";

                    var players = new List<object>();
                    using (var command = new MySqlCommand(sql, connection))
                    {
                        if (!string.IsNullOrWhiteSpace(searchTerm))
                        {
                            command.Parameters.AddWithValue("@searchTerm", $"%{searchTerm}%");
                        }

                        if (!string.IsNullOrWhiteSpace(category) && category != "All")
                        {
                            command.Parameters.AddWithValue("@category", category);
                        }

                        command.Parameters.AddWithValue("@offset", (page - 1) * pageSize);
                        command.Parameters.AddWithValue("@pageSize", pageSize);

                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                // Create a Player object for calculation
                                var playerEntity = new Player
                                {
                                    PlayerId = Convert.ToInt32(reader["player_id"]),
                                    Name = reader["name"].ToString(),
                                    University = reader["university"].ToString(),
                                    Category = reader["category"].ToString(),
                                    TotalRuns = Convert.ToInt32(reader["total_runs"]),
                                    BallsFaced = Convert.ToInt32(reader["balls_faced"]),
                                    InningsPlayed = Convert.ToInt32(reader["innings_played"]),
                                    Wickets = Convert.ToInt32(reader["wickets"]),
                                    OversBowled = Convert.ToInt32(reader["overs_bowled"]),
                                    RunsConceded = Convert.ToInt32(reader["runs_conceded"])
                                };

                                // Calculate stats using the correct formula
                                playerEntity.CalculateStats();

                                // Add player to the result list with all fields including calculated ones
                                players.Add(new
                                {
                                    id = playerEntity.PlayerId,
                                    name = playerEntity.Name,
                                    university = playerEntity.University,
                                    category = playerEntity.Category,
                                    totalRuns = playerEntity.TotalRuns,
                                    ballsFaced = playerEntity.BallsFaced,
                                    inningsPlayed = playerEntity.InningsPlayed,
                                    wickets = playerEntity.Wickets,
                                    oversBowled = playerEntity.OversBowled,
                                    runsConceded = playerEntity.RunsConceded,
                                    battingStrikeRate = playerEntity.BattingStrikeRate,
                                    battingAverage = playerEntity.BattingAverage,
                                    bowlingStrikeRate = playerEntity.BowlingStrikeRate,
                                    economyRate = playerEntity.EconomyRate,
                                  
                                    value = playerEntity.PlayerValue
                                });
                            }
                        }
                    }

                    return Ok(new
                    {
                        players,
                        total = totalCount,
                        page,
                        pageSize,
                        totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting players: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }

                return StatusCode(500, new { message = "Failed to get players", error = ex.Message });
            }
        }

        // GET: api/admin/player/{id}
        [HttpGet("player/{id}")]
        public async Task<IActionResult> GetPlayer(int id)
        {
            try
            {
                var username = User.Identity?.Name;
                Console.WriteLine($"Get player {id} request from user: {username}");

                using (var connection = new MySqlConnection(_connectionString))
                {
                    await connection.OpenAsync();

                    string sql = @"
                        SELECT
                            player_id,
                            name,
                            university,
                            category,
                            total_runs,
                            balls_faced,
                            innings_played,
                            wickets,
                            overs_bowled,
                            runs_conceded
                        FROM players
                        WHERE player_id = @id";

                    using (var command = new MySqlCommand(sql, connection))
                    {
                        command.Parameters.AddWithValue("@id", id);

                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                // Create the Player object
                                var player = new Player
                                {
                                    PlayerId = Convert.ToInt32(reader["player_id"]),
                                    Name = reader["name"].ToString(),
                                    University = reader["university"].ToString(),
                                    Category = reader["category"].ToString(),
                                    TotalRuns = Convert.ToInt32(reader["total_runs"]),
                                    BallsFaced = Convert.ToInt32(reader["balls_faced"]),
                                    InningsPlayed = Convert.ToInt32(reader["innings_played"]),
                                    Wickets = Convert.ToInt32(reader["wickets"]),
                                    OversBowled = Convert.ToInt32(reader["overs_bowled"]),
                                    RunsConceded = Convert.ToInt32(reader["runs_conceded"])
                                };

                                // Calculate derived statistics
                                player.CalculateStats();

                                return Ok(player);
                            }
                            else
                            {
                                return NotFound(new { message = $"Player with ID {id} not found" });
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting player {id}: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }

                return StatusCode(500, new { message = $"Failed to get player with ID {id}", error = ex.Message });
            }
        }

        // POST: api/admin/player
        [HttpPost("player")]
        public async Task<IActionResult> CreatePlayer([FromBody] Player player)
        {
            try
            {
                var username = User.Identity?.Name;
                Console.WriteLine($"Create player request from user: {username}");

                if (player == null)
                {
                    return BadRequest(new { message = "Invalid player data" });
                }

                // Validate required fields
                if (string.IsNullOrWhiteSpace(player.Name))
                {
                    return BadRequest(new { message = "Player name is required" });
                }

                if (string.IsNullOrWhiteSpace(player.University))
                {
                    return BadRequest(new { message = "University is required" });
                }

                if (string.IsNullOrWhiteSpace(player.Category))
                {
                    return BadRequest(new { message = "Category is required" });
                }

                // Calculate derived statistics
                player.CalculateStats();

                using (var connection = new MySqlConnection(_connectionString))
                {
                    await connection.OpenAsync();

                    // Check if player with same name and university already exists
                    string checkSql = "SELECT COUNT(*) FROM players WHERE name = @name AND university = @university";
                    bool playerExists = false;

                    using (var command = new MySqlCommand(checkSql, connection))
                    {
                        command.Parameters.AddWithValue("@name", player.Name);
                        command.Parameters.AddWithValue("@university", player.University);

                        var result = await command.ExecuteScalarAsync();
                        playerExists = Convert.ToInt32(result) > 0;
                    }

                    if (playerExists)
                    {
                        return BadRequest(new { message = $"A player named '{player.Name}' from '{player.University}' already exists" });
                    }

                    // Insert new player
                    string insertSql = @"
                        INSERT INTO players (
                            name,
                            university,
                            category,
                            total_runs,
                            balls_faced,
                            innings_played,
                            wickets,
                            overs_bowled,
                            runs_conceded
                        ) VALUES (
                            @name,
                            @university,
                            @category,
                            @totalRuns,
                            @ballsFaced,
                            @inningsPlayed,
                            @wickets,
                            @oversBowled,
                            @runsConceded
                        );
                        SELECT LAST_INSERT_ID();";

                    int newPlayerId = 0;
                    using (var command = new MySqlCommand(insertSql, connection))
                    {
                        command.Parameters.AddWithValue("@name", player.Name);
                        command.Parameters.AddWithValue("@university", player.University);
                        command.Parameters.AddWithValue("@category", player.Category);
                        command.Parameters.AddWithValue("@totalRuns", player.TotalRuns);
                        command.Parameters.AddWithValue("@ballsFaced", player.BallsFaced);
                        command.Parameters.AddWithValue("@inningsPlayed", player.InningsPlayed);
                        command.Parameters.AddWithValue("@wickets", player.Wickets);
                        command.Parameters.AddWithValue("@oversBowled", player.OversBowled);
                        command.Parameters.AddWithValue("@runsConceded", player.RunsConceded);

                        var result = await command.ExecuteScalarAsync();
                        newPlayerId = Convert.ToInt32(result);
                    }

                    // Set the ID for the response
                    player.PlayerId = newPlayerId;

                    return CreatedAtAction(nameof(GetPlayer), new { id = newPlayerId }, player);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating player: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }

                return StatusCode(500, new { message = "Failed to create player", error = ex.Message });
            }
        }

        // PUT: api/admin/player/{id}
        [HttpPut("player/{id}")]
        public async Task<IActionResult> UpdatePlayer(int id, [FromBody] Player player)
        {
            try
            {
                var username = User.Identity?.Name;
                Console.WriteLine($"Update player {id} request from user: {username}");

                if (player == null)
                {
                    return BadRequest(new { message = "Invalid player data" });
                }

                // Validate required fields
                if (string.IsNullOrWhiteSpace(player.Name))
                {
                    return BadRequest(new { message = "Player name is required" });
                }

                if (string.IsNullOrWhiteSpace(player.University))
                {
                    return BadRequest(new { message = "University is required" });
                }

                if (string.IsNullOrWhiteSpace(player.Category))
                {
                    return BadRequest(new { message = "Category is required" });
                }

                // Calculate derived statistics
                player.CalculateStats();

                using (var connection = new MySqlConnection(_connectionString))
                {
                    await connection.OpenAsync();

                    // Check if player exists
                    string checkSql = "SELECT COUNT(*) FROM players WHERE player_id = @id";
                    bool playerExists = false;

                    using (var command = new MySqlCommand(checkSql, connection))
                    {
                        command.Parameters.AddWithValue("@id", id);

                        var result = await command.ExecuteScalarAsync();
                        playerExists = Convert.ToInt32(result) > 0;
                    }

                    if (!playerExists)
                    {
                        return NotFound(new { message = $"Player with ID {id} not found" });
                    }

                    // Check if there's another player with the same name and university
                    string checkDuplicateSql = "SELECT COUNT(*) FROM players WHERE name = @name AND university = @university AND player_id != @id";
                    bool duplicateExists = false;

                    using (var command = new MySqlCommand(checkDuplicateSql, connection))
                    {
                        command.Parameters.AddWithValue("@name", player.Name);
                        command.Parameters.AddWithValue("@university", player.University);
                        command.Parameters.AddWithValue("@id", id);

                        var result = await command.ExecuteScalarAsync();
                        duplicateExists = Convert.ToInt32(result) > 0;
                    }

                    if (duplicateExists)
                    {
                        return BadRequest(new { message = $"Another player named '{player.Name}' from '{player.University}' already exists" });
                    }

                    // Update player
                    string updateSql = @"
                        UPDATE players
                        SET
                            name = @name,
                            university = @university,
                            category = @category,
                            total_runs = @totalRuns,
                            balls_faced = @ballsFaced,
                            innings_played = @inningsPlayed,
                            wickets = @wickets,
                            overs_bowled = @oversBowled,
                            runs_conceded = @runsConceded
                        WHERE player_id = @id";

                    using (var command = new MySqlCommand(updateSql, connection))
                    {
                        command.Parameters.AddWithValue("@id", id);
                        command.Parameters.AddWithValue("@name", player.Name);
                        command.Parameters.AddWithValue("@university", player.University);
                        command.Parameters.AddWithValue("@category", player.Category);
                        command.Parameters.AddWithValue("@totalRuns", player.TotalRuns);
                        command.Parameters.AddWithValue("@ballsFaced", player.BallsFaced);
                        command.Parameters.AddWithValue("@inningsPlayed", player.InningsPlayed);
                        command.Parameters.AddWithValue("@wickets", player.Wickets);
                        command.Parameters.AddWithValue("@oversBowled", player.OversBowled);
                        command.Parameters.AddWithValue("@runsConceded", player.RunsConceded);

                        await command.ExecuteNonQueryAsync();
                    }

                    return Ok(player);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating player {id}: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }

                return StatusCode(500, new { message = $"Failed to update player with ID {id}", error = ex.Message });
            }
        }

        // DELETE: api/admin/player/{id}
        [HttpDelete("player/{id}")]
        public async Task<IActionResult> DeletePlayer(int id)
        {
            try
            {
                var username = User.Identity?.Name;
                Console.WriteLine($"Delete player {id} request from user: {username}");

                using (var connection = new MySqlConnection(_connectionString))
                {
                    await connection.OpenAsync();

                    // Check if player exists
                    string checkSql = "SELECT COUNT(*) FROM players WHERE player_id = @id";
                    bool playerExists = false;

                    using (var command = new MySqlCommand(checkSql, connection))
                    {
                        command.Parameters.AddWithValue("@id", id);

                        var result = await command.ExecuteScalarAsync();
                        playerExists = Convert.ToInt32(result) > 0;
                    }

                    if (!playerExists)
                    {
                        return NotFound(new { message = $"Player with ID {id} not found" });
                    }

                    // Check if player is part of any team
                    string checkTeamSql = "SELECT COUNT(*) FROM team_players WHERE player_id = @id";
                    bool playerInTeam = false;

                    try
                    {
                        using (var command = new MySqlCommand(checkTeamSql, connection))
                        {
                            command.Parameters.AddWithValue("@id", id);

                            var result = await command.ExecuteScalarAsync();
                            playerInTeam = Convert.ToInt32(result) > 0;
                        }
                    }
                    catch
                    {
                        // Table might not exist yet, ignore error
                        playerInTeam = false;
                    }

                    if (playerInTeam)
                    {
                        // First remove from team_players
                        string deleteTeamPlayerSql = "DELETE FROM team_players WHERE player_id = @id";
                        using (var command = new MySqlCommand(deleteTeamPlayerSql, connection))
                        {
                            command.Parameters.AddWithValue("@id", id);
                            await command.ExecuteNonQueryAsync();
                        }
                    }

                    // Delete player
                    string deleteSql = "DELETE FROM players WHERE player_id = @id";
                    using (var command = new MySqlCommand(deleteSql, connection))
                    {
                        command.Parameters.AddWithValue("@id", id);
                        await command.ExecuteNonQueryAsync();
                    }

                    return Ok(new { message = $"Player with ID {id} successfully deleted" });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting player {id}: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }

                return StatusCode(500, new { message = $"Failed to delete player with ID {id}", error = ex.Message });
            }
        }

        // GET: api/admin/tournamentSummary
        [HttpGet("tournamentSummary")]
        public async Task<IActionResult> GetTournamentSummary()
        {
            try
            {
                // Log username for debugging
                var username = User.Identity?.Name;
                Console.WriteLine($"Tournament summary request from: {username}");
                Console.WriteLine("Running database queries for live tournament data...");

                using (var connection = new MySqlConnection(_connectionString))
                {
                    await connection.OpenAsync();

                    // Get total players count with debugging
                    int totalPlayers = 0;
                    using (var command = new MySqlCommand("SELECT COUNT(*) FROM players", connection))
                    {
                        var result = await command.ExecuteScalarAsync();
                        totalPlayers = Convert.ToInt32(result);
                        Console.WriteLine($"DB query result - Player count: {totalPlayers}");
                    }

                    // Get total runs with debugging
                    int totalRuns = 0;
                    using (var command = new MySqlCommand("SELECT COALESCE(SUM(total_runs), 0) FROM players", connection))
                    {
                        var result = await command.ExecuteScalarAsync();
                        totalRuns = result != DBNull.Value ? Convert.ToInt32(result) : 0;
                        Console.WriteLine($"DB query result - Total runs: {totalRuns}");
                    }

                    // Get total wickets with debugging
                    int totalWickets = 0;
                    using (var command = new MySqlCommand("SELECT COALESCE(SUM(wickets), 0) FROM players", connection))
                    {
                        var result = await command.ExecuteScalarAsync();
                        totalWickets = result != DBNull.Value ? Convert.ToInt32(result) : 0;
                        Console.WriteLine($"DB query result - Total wickets: {totalWickets}");
                    }

                    // Very simple average points calculation to avoid SQL issues
                    double averagePoints = 0;
                    if (totalPlayers > 0)
                    {
                        using (var command = new MySqlCommand("SELECT AVG(total_runs) / 10 FROM players", connection))
                        {
                            var result = await command.ExecuteScalarAsync();
                            averagePoints = result != DBNull.Value ? Convert.ToDouble(result) : 0;
                            Console.WriteLine($"DB query result - Avg points: {averagePoints}");
                        }
                    }

                    // Get top batsman (highest run scorer)
                    string topBatsmanName = "";
                    string topBatsmanUniversity = "";
                    int topBatsmanRuns = 0;
                    string topBatsmanSql = @"
                        SELECT name, university, total_runs
                        FROM players
                        WHERE total_runs > 0
                        ORDER BY total_runs DESC
                        LIMIT 1";

                    using (var command = new MySqlCommand(topBatsmanSql, connection))
                    {
                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                topBatsmanName = reader["name"].ToString();
                                topBatsmanUniversity = reader["university"].ToString();
                                topBatsmanRuns = Convert.ToInt32(reader["total_runs"]);
                                Console.WriteLine($"Top batsman: {topBatsmanName} with {topBatsmanRuns} runs");
                            }
                        }
                    }

                    // Get top bowler (highest wicket taker)
                    string topBowlerName = "";
                    string topBowlerUniversity = "";
                    int topBowlerWickets = 0;
                    string topBowlerSql = @"
                        SELECT name, university, wickets
                        FROM players
                        WHERE wickets > 0
                        ORDER BY wickets DESC
                        LIMIT 1";

                    using (var command = new MySqlCommand(topBowlerSql, connection))
                    {
                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                topBowlerName = reader["name"].ToString();
                                topBowlerUniversity = reader["university"].ToString();
                                topBowlerWickets = Convert.ToInt32(reader["wickets"]);
                                Console.WriteLine($"Top bowler: {topBowlerName} with {topBowlerWickets} wickets");
                            }
                        }
                    }

                    Console.WriteLine("Sending fresh tournament data response");

                    // Return the tournament summary with data from database
                    return Ok(new
                    {
                        totalPlayers,
                        totalRuns,
                        totalWickets,
                        averagePoints,
                        topBatsman = string.IsNullOrEmpty(topBatsmanName) ? null : new
                        {
                            name = topBatsmanName,
                            university = topBatsmanUniversity,
                            totalRuns = topBatsmanRuns
                        },
                        topBowler = string.IsNullOrEmpty(topBowlerName) ? null : new
                        {
                            name = topBowlerName,
                            university = topBowlerUniversity,
                            wickets = topBowlerWickets
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting tournament summary: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }

                return StatusCode(500, new { message = "Failed to load tournament summary", error = ex.Message });
            }
        }
    }
}
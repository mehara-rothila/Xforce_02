// Updated File path: SpiritX.API/Controllers/TeamsController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SpiritX.API.Data;
using SpiritX.API.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using MySql.Data.MySqlClient;
using System.ComponentModel.DataAnnotations.Schema;

namespace SpiritX.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TeamsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly string _connectionString;

        public TeamsController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _connectionString = configuration.GetConnectionString("DefaultConnection");
        }

        // GET: api/teams
        [HttpGet]
        public IActionResult GetUserTeam()
        {
            try
            {
                // Get the user ID from the token claims
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return BadRequest(new { message = "Invalid user ID in token" });
                }

                // Use direct SQL to get user's team and players
                using (var connection = new MySqlConnection(_connectionString))
                {
                    connection.Open();
                    
                    // Get user's team
                    var team = new TeamDataViewModel();
                    string teamSql = @"
                        SELECT team_id, team_name, total_points
                        FROM teams
                        WHERE user_id = @userId
                        LIMIT 1";
                    
                    using (var command = new MySqlCommand(teamSql, connection))
                    {
                        command.Parameters.AddWithValue("@userId", userId);
                        
                        using (var reader = command.ExecuteReader())
                        {
                            if (reader.Read())
                            {
                                team.TeamId = reader.GetInt32("team_id");
                                team.TeamName = reader.GetString("team_name");
                                team.TotalPoints = reader.GetInt32("total_points");
                            }
                            else
                            {
                                // No team found, return an empty team
                                return Ok(new { 
                                    teamId = 0,
                                    teamName = "My Team",
                                    totalPoints = 0,
                                    players = new List<TeamPlayerViewModel>()
                                });
                            }
                        }
                    }
                    
                    // Get team players
                    var players = new List<TeamPlayerViewModel>();
                    string playersSql = @"
                        SELECT p.player_id, p.name, p.university, p.category, 
                               p.total_runs, p.balls_faced, p.innings_played,
                               p.wickets, p.overs_bowled, p.runs_conceded
                        FROM team_players tp
                        JOIN players p ON tp.player_id = p.player_id
                        WHERE tp.team_id = @teamId";
                    
                    using (var command = new MySqlCommand(playersSql, connection))
                    {
                        command.Parameters.AddWithValue("@teamId", team.TeamId);
                        
                        using (var reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                var player = new TeamPlayerViewModel
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
                                
                                players.Add(player);
                            }
                        }
                    }
                    
                    // Get user budget
                    int budget = 0;
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
                    
                    return Ok(new {
                        teamId = team.TeamId,
                        teamName = team.TeamName,
                        totalPoints = team.TotalPoints,
                        players = players,
                        budget = budget
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching team: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                
                return StatusCode(500, new { message = "Failed to load team data", error = ex.Message });
            }
        }

        // POST: api/teams/addPlayer
        [HttpPost("addPlayer")]
        public IActionResult AddPlayerToTeam([FromBody] AddPlayerRequest request)
        {
            try
            {
                if (request == null || request.PlayerId <= 0)
                {
                    return BadRequest(new { message = "Invalid player ID" });
                }

                // Get the user ID from the token claims
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return BadRequest(new { message = "Invalid user ID in token" });
                }

                using (var connection = new MySqlConnection(_connectionString))
                {
                    connection.Open();
                    
                    // Check if user has a team
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
                        else
                        {
                            return BadRequest(new { message = "User doesn't have a team" });
                        }
                    }
                    
                    // Check if player exists
                    bool playerExists = false;
                    string playerSql = "SELECT COUNT(*) FROM players WHERE player_id = @playerId";
                    
                    using (var command = new MySqlCommand(playerSql, connection))
                    {
                        command.Parameters.AddWithValue("@playerId", request.PlayerId);
                        playerExists = Convert.ToInt32(command.ExecuteScalar()) > 0;
                    }
                    
                    if (!playerExists)
                    {
                        return BadRequest(new { message = "Player not found" });
                    }
                    
                    // Get player data and calculate value
                    Player player = new Player();
                    string playerDataSql = @"
                        SELECT player_id, name, university, category, 
                               total_runs, balls_faced, innings_played,
                               wickets, overs_bowled, runs_conceded
                        FROM players 
                        WHERE player_id = @playerId";
                               
                    using (var command = new MySqlCommand(playerDataSql, connection))
                    {
                        command.Parameters.AddWithValue("@playerId", request.PlayerId);
                        
                        using (var reader = command.ExecuteReader())
                        {
                            if (reader.Read())
                            {
                                player.PlayerId = reader.GetInt32("player_id");
                                player.Name = reader.GetString("name");
                                player.University = reader.GetString("university");
                                player.Category = reader.GetString("category");
                                player.TotalRuns = reader.GetInt32("total_runs");
                                player.BallsFaced = reader.GetInt32("balls_faced");
                                player.InningsPlayed = reader.GetInt32("innings_played");
                                player.Wickets = reader.GetInt32("wickets");
                                player.OversBowled = reader.GetInt32("overs_bowled");
                                player.RunsConceded = reader.GetInt32("runs_conceded");
                            }
                        }
                    }
                    
                    // Calculate player value using backend logic
                    player.CalculateStats();
                    int playerValue = player.PlayerValue;
                    
                    // Check if player is already in team
                    bool playerInTeam = false;
                    string checkSql = "SELECT COUNT(*) FROM team_players WHERE team_id = @teamId AND player_id = @playerId";
                    
                    using (var command = new MySqlCommand(checkSql, connection))
                    {
                        command.Parameters.AddWithValue("@teamId", teamId);
                        command.Parameters.AddWithValue("@playerId", request.PlayerId);
                        playerInTeam = Convert.ToInt32(command.ExecuteScalar()) > 0;
                    }
                    
                    if (playerInTeam)
                    {
                        return BadRequest(new { message = "Player already in team" });
                    }
                    
                    // Count players in team
                    int playerCount = 0;
                    string countSql = "SELECT COUNT(*) FROM team_players WHERE team_id = @teamId";
                    
                    using (var command = new MySqlCommand(countSql, connection))
                    {
                        command.Parameters.AddWithValue("@teamId", teamId);
                        playerCount = Convert.ToInt32(command.ExecuteScalar());
                    }
                    
                    if (playerCount >= 11)
                    {
                        return BadRequest(new { message = "Team already has maximum number of players (11)" });
                    }
                    
                    // Check user budget
                    int budget = 0;
                    string budgetSql = "SELECT budget FROM users WHERE user_id = @userId";
                    
                    using (var command = new MySqlCommand(budgetSql, connection))
                    {
                        command.Parameters.AddWithValue("@userId", userId);
                        budget = Convert.ToInt32(command.ExecuteScalar());
                    }
                    
                    if (budget < playerValue)
                    {
                        return BadRequest(new { message = $"Insufficient budget. Player value: ₹{playerValue}, Your budget: ₹{budget}" });
                    }
                    
                    // Add player to team
                    string addSql = "INSERT INTO team_players (team_id, player_id) VALUES (@teamId, @playerId)";
                    
                    using (var command = new MySqlCommand(addSql, connection))
                    {
                        command.Parameters.AddWithValue("@teamId", teamId);
                        command.Parameters.AddWithValue("@playerId", request.PlayerId);
                        command.ExecuteNonQuery();
                    }
                    
                    // Update user budget
                    int newBudget = budget - playerValue;
                    string updateBudgetSql = "UPDATE users SET budget = @newBudget WHERE user_id = @userId";
                    
                    using (var command = new MySqlCommand(updateBudgetSql, connection))
                    {
                        command.Parameters.AddWithValue("@newBudget", newBudget);
                        command.Parameters.AddWithValue("@userId", userId);
                        command.ExecuteNonQuery();
                    }
                    
                    // Update team total points with the proper undefined handling
                    string updatePointsSql = @"
                        UPDATE teams 
                        SET total_points = (
                            SELECT COALESCE(SUM(
                                ((p.total_runs / CASE WHEN p.balls_faced = 0 THEN 1 ELSE p.balls_faced END) * 100 / 5 + 
                                (p.total_runs / CASE WHEN p.innings_played = 0 THEN 1 ELSE p.innings_played END) * 0.8) +
                                
                                -- Only include Bowling Strike Rate component if wickets > 0 (otherwise 0)
                                (CASE WHEN p.wickets > 0 
                                      THEN 500 / ((p.overs_bowled * 6) / p.wickets) 
                                      ELSE 0 
                                 END) + 
                                
                                -- Only include Economy Rate component if overs_bowled > 0
                                (CASE WHEN p.overs_bowled > 0 
                                      THEN 140 / ((p.runs_conceded / (p.overs_bowled * 6)) * 6) 
                                      ELSE 0 
                                 END)
                            ), 0)
                            FROM players p
                            JOIN team_players tp ON p.player_id = tp.player_id
                            WHERE tp.team_id = @teamId
                        )
                        WHERE team_id = @teamId";
                    
                    using (var command = new MySqlCommand(updatePointsSql, connection))
                    {
                        command.Parameters.AddWithValue("@teamId", teamId);
                        try {
                            command.ExecuteNonQuery();
                        } catch (Exception ex) {
                            Console.WriteLine($"Error updating points: {ex.Message}");
                            // Continue even if point calculation fails
                        }
                    }
                    
                    return Ok(new { message = "Player added to team", remainingBudget = newBudget });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error adding player: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                
                return StatusCode(500, new { message = "Failed to add player to team", error = ex.Message });
            }
        }

        // POST: api/teams/removePlayer
        [HttpPost("removePlayer")]
        public IActionResult RemovePlayerFromTeam([FromBody] RemovePlayerRequest request)
        {
            try
            {
                if (request == null || request.PlayerId <= 0)
                {
                    return BadRequest(new { message = "Invalid player ID" });
                }

                // Get the user ID from the token claims
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return BadRequest(new { message = "Invalid user ID in token" });
                }

                using (var connection = new MySqlConnection(_connectionString))
                {
                    connection.Open();
                    
                    // Check if user has a team
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
                        else
                        {
                            return BadRequest(new { message = "User doesn't have a team" });
                        }
                    }
                    
                    // Check if player is in team
                    bool playerInTeam = false;
                    string checkSql = "SELECT COUNT(*) FROM team_players WHERE team_id = @teamId AND player_id = @playerId";
                    
                    using (var command = new MySqlCommand(checkSql, connection))
                    {
                        command.Parameters.AddWithValue("@teamId", teamId);
                        command.Parameters.AddWithValue("@playerId", request.PlayerId);
                        playerInTeam = Convert.ToInt32(command.ExecuteScalar()) > 0;
                    }
                    
                    if (!playerInTeam)
                    {
                        return BadRequest(new { message = "Player is not in your team" });
                    }
                    
                    // Get player data and calculate value
                    Player player = new Player();
                    string playerDataSql = @"
                        SELECT player_id, name, university, category, 
                               total_runs, balls_faced, innings_played,
                               wickets, overs_bowled, runs_conceded
                        FROM players 
                        WHERE player_id = @playerId";
                               
                    using (var command = new MySqlCommand(playerDataSql, connection))
                    {
                        command.Parameters.AddWithValue("@playerId", request.PlayerId);
                        
                        using (var reader = command.ExecuteReader())
                        {
                            if (reader.Read())
                            {
                                player.PlayerId = reader.GetInt32("player_id");
                                player.Name = reader.GetString("name");
                                player.University = reader.GetString("university");
                                player.Category = reader.GetString("category");
                                player.TotalRuns = reader.GetInt32("total_runs");
                                player.BallsFaced = reader.GetInt32("balls_faced");
                                player.InningsPlayed = reader.GetInt32("innings_played");
                                player.Wickets = reader.GetInt32("wickets");
                                player.OversBowled = reader.GetInt32("overs_bowled");
                                player.RunsConceded = reader.GetInt32("runs_conceded");
                            }
                        }
                    }
                    
                    // Calculate player value using backend logic
                    player.CalculateStats();
                    int playerValue = player.PlayerValue;
                    
                    // Remove player from team
                    string removeSql = "DELETE FROM team_players WHERE team_id = @teamId AND player_id = @playerId";
                    
                    using (var command = new MySqlCommand(removeSql, connection))
                    {
                        command.Parameters.AddWithValue("@teamId", teamId);
                        command.Parameters.AddWithValue("@playerId", request.PlayerId);
                        command.ExecuteNonQuery();
                    }
                    
                    // Update user budget
                    int currentBudget = 0;
                    string budgetSql = "SELECT budget FROM users WHERE user_id = @userId";
                    
                    using (var command = new MySqlCommand(budgetSql, connection))
                    {
                        command.Parameters.AddWithValue("@userId", userId);
                        currentBudget = Convert.ToInt32(command.ExecuteScalar());
                    }
                    
                    int newBudget = currentBudget + playerValue;
                    string updateBudgetSql = "UPDATE users SET budget = @newBudget WHERE user_id = @userId";
                    
                    using (var command = new MySqlCommand(updateBudgetSql, connection))
                    {
                        command.Parameters.AddWithValue("@newBudget", newBudget);
                        command.Parameters.AddWithValue("@userId", userId);
                        command.ExecuteNonQuery();
                    }
                    
                    // Update team total points with proper undefined handling
                    string updatePointsSql = @"
                        UPDATE teams
                        SET total_points = (
                            SELECT COALESCE(SUM(
                                ((p.total_runs / CASE WHEN p.balls_faced = 0 THEN 1 ELSE p.balls_faced END) * 100 / 5 + 
                                (p.total_runs / CASE WHEN p.innings_played = 0 THEN 1 ELSE p.innings_played END) * 0.8) +
                                
                                -- Only include Bowling Strike Rate component if wickets > 0 (otherwise 0)
                                (CASE WHEN p.wickets > 0 
                                      THEN 500 / ((p.overs_bowled * 6) / p.wickets) 
                                      ELSE 0 
                                 END) + 
                                
                                -- Only include Economy Rate component if overs_bowled > 0
                                (CASE WHEN p.overs_bowled > 0 
                                      THEN 140 / ((p.runs_conceded / (p.overs_bowled * 6)) * 6) 
                                      ELSE 0 
                                 END)
                            ), 0)
                            FROM players p
                            JOIN team_players tp ON p.player_id = tp.player_id
                            WHERE tp.team_id = @teamId
                        )
                        WHERE team_id = @teamId";
                    
                    using (var command = new MySqlCommand(updatePointsSql, connection))
                    {
                        command.Parameters.AddWithValue("@teamId", teamId);
                        try {
                            command.ExecuteNonQuery();
                        } catch (Exception ex) {
                            Console.WriteLine($"Error updating points: {ex.Message}");
                            // Continue even if point calculation fails
                        }
                    }
                    
                    return Ok(new { message = "Player removed from team", newBudget = newBudget });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error removing player: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                
                return StatusCode(500, new { message = "Failed to remove player from team", error = ex.Message });
            }
        }
    }

    // View models - renamed to avoid conflicts
    public class TeamDataViewModel
    {
        public int TeamId { get; set; }
        public string TeamName { get; set; } = string.Empty;
        public int TotalPoints { get; set; }
    }

    public class TeamPlayerViewModel
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
        // Points property removed to prevent it from being exposed via API
        public int PlayerValue { get; set; }
        
        // Added display properties
        [NotMapped]
        public string BowlingStrikeRateDisplay { get; set; } = "Undefined";
        
        [NotMapped]
        public string EconomyRateDisplay { get; set; } = "Undefined";
    }

    public class AddPlayerRequest
    {
        public int PlayerId { get; set; }
    }

    public class RemovePlayerRequest
    {
        public int PlayerId { get; set; }
    }
}
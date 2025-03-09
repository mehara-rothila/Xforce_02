// Updated LeaderboardController.cs with proper undefined stat handling

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SpiritX.API.Data;
using SpiritX.API.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MySql.Data.MySqlClient;

namespace SpiritX.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class LeaderboardController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly string _connectionString;

        public LeaderboardController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _connectionString = configuration.GetConnectionString("DefaultConnection");
        }

        // GET: api/leaderboard
        [HttpGet]
        public IActionResult GetLeaderboard()
        {
            try
            {
                var leaderboard = new List<LeaderboardEntryViewModel>();
                
                using (var connection = new MySqlConnection(_connectionString))
                {
                    connection.Open();
                    
                    // 1. First, let's update the total_points for all teams based on the sum of player points
                    // UPDATED: Use standardized formula for point calculation with handling for undefined values
                    string updateTeamPointsSql = @"
                        UPDATE teams t
                        SET t.total_points = (
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
                            FROM team_players tp
                            JOIN players p ON tp.player_id = p.player_id
                            WHERE tp.team_id = t.team_id
                        )";
                    
                    using (var updateCommand = new MySqlCommand(updateTeamPointsSql, connection))
                    {
                        updateCommand.ExecuteNonQuery();
                        Console.WriteLine("Updated team points based on player points sum");
                    }
                    
                    // 2. Now get the leaderboard data
                    // UPDATED: Only include teams with exactly 11 players
                    string sql = @"
                        SELECT u.user_id, u.username, t.team_id, t.team_name, t.total_points
                        FROM users u
                        JOIN teams t ON u.user_id = t.user_id
                        WHERE (SELECT COUNT(*) FROM team_players tp WHERE tp.team_id = t.team_id) = 11
                        ORDER BY t.total_points DESC";
                    
                    using (var command = new MySqlCommand(sql, connection))
                    {
                        using (var reader = command.ExecuteReader())
                        {
                            int rank = 1;
                            while (reader.Read())
                            {
                                // Use double or decimal for points instead of int
                                var entry = new LeaderboardEntryViewModel
                                {
                                    Rank = rank++,
                                    UserId = Convert.ToInt32(reader["user_id"]),
                                    Username = reader["username"].ToString(),
                                    TeamId = Convert.ToInt32(reader["team_id"]),
                                    TeamName = reader["team_name"].ToString(),
                                    TotalPoints = Convert.ToDouble(reader["total_points"])
                                };
                                
                                leaderboard.Add(entry);
                            }
                        }
                    }
                    
                    // 3. Also get the user's team information even if it's not yet complete (for reference)
                    // This is so the current user can see their team status even if not on leaderboard
                    var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                    
                    if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out int userId))
                    {
                        string userTeamSql = @"
                            SELECT u.user_id, u.username, t.team_id, t.team_name, t.total_points,
                                  (SELECT COUNT(*) FROM team_players tp WHERE tp.team_id = t.team_id) as player_count
                            FROM users u
                            JOIN teams t ON u.user_id = t.user_id
                            WHERE u.user_id = @userId";
                            
                        using (var command = new MySqlCommand(userTeamSql, connection))
                        {
                            command.Parameters.AddWithValue("@userId", userId);
                            
                            using (var reader = command.ExecuteReader())
                            {
                                if (reader.Read())
                                {
                                    int playerCount = Convert.ToInt32(reader["player_count"]);
                                    
                                    // Only include current user's team info if not already in leaderboard
                                    if (playerCount < 11 && !leaderboard.Any(e => e.UserId == userId))
                                    {
                                        // Special entry for current user's team that's not yet complete
                                        var userEntry = new LeaderboardEntryViewModel
                                        {
                                            Rank = 0, // Special rank to indicate not ranked yet
                                            UserId = userId,
                                            Username = reader["username"].ToString(),
                                            TeamId = Convert.ToInt32(reader["team_id"]),
                                            TeamName = reader["team_name"].ToString(),
                                            TotalPoints = Convert.ToDouble(reader["total_points"]),
                                            PlayersCount = playerCount,
                                            IsComplete = false
                                        };
                                        
                                        // Add as a special non-ranked entry
                                        leaderboard.Add(userEntry);
                                    }
                                }
                            }
                        }
                    }
                    
                    return Ok(leaderboard);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting leaderboard: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                
                return StatusCode(500, new { message = "Failed to load leaderboard data", error = ex.Message });
            }
        }
    }

    // ViewModel with additional properties for team completeness
    public class LeaderboardEntryViewModel
    {
        public int Rank { get; set; }
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public int TeamId { get; set; }
        public string TeamName { get; set; } = string.Empty;
        public double TotalPoints { get; set; } // Changed from int to double
        public int PlayersCount { get; set; } = 11; // Default to 11 for ranked teams
        public bool IsComplete { get; set; } = true; // Default to true for ranked teams
    }
}
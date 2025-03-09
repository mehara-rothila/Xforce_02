using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Linq;
using MySql.Data.MySqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Http;

namespace SpiritX.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ChatbotController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;
        private readonly string _connectionString;

        public ChatbotController(IConfiguration configuration, IHttpClientFactory httpClientFactory)
        {
            _configuration = configuration;
            _httpClient = httpClientFactory.CreateClient();
            _connectionString = configuration.GetConnectionString("DefaultConnection") ?? "";
        }

        [HttpPost("query")]
        public async Task<IActionResult> Query([FromBody] ChatbotQueryRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Message))
                {
                    return BadRequest(new { message = "Query message is required" });
                }

                Console.WriteLine($"Received chatbot query: {request.Message}");

                // Process different types of queries based on keywords
                string lowerMessage = request.Message.ToLower();

                // Top run scorers query
                if (lowerMessage.Contains("most runs") ||
                    (lowerMessage.Contains("top") && lowerMessage.Contains("runs")) ||
                    (lowerMessage.Contains("highest") && lowerMessage.Contains("runs")) ||
                    (lowerMessage.Contains("best") && lowerMessage.Contains("batsman")))
                {
                    var topRunScorers = await GetTopRunScorers();
                    return Ok(topRunScorers);
                }

                // Top wicket takers query
                if (lowerMessage.Contains("most wicket") ||
                    (lowerMessage.Contains("top") && lowerMessage.Contains("wicket")) ||
                    (lowerMessage.Contains("highest") && lowerMessage.Contains("wicket")) ||
                    (lowerMessage.Contains("best") && lowerMessage.Contains("bowler")))
                {
                    var topWicketTakers = await GetTopWicketTakers();
                    return Ok(topWicketTakers);
                }

                // Best team recommendation
                if (lowerMessage.Contains("best team") ||
                    lowerMessage.Contains("suggest team") ||
                    lowerMessage.Contains("recommend team") ||
                    lowerMessage.Contains("optimal team") ||
                    lowerMessage.Contains("good team"))
                {
                    var bestTeam = await GetBestTeamRecommendation();
                    return Ok(bestTeam);
                }

                // Player statistics by name
                if ((lowerMessage.Contains("stats") || lowerMessage.Contains("statistics")) &&
                    !lowerMessage.Contains("most") && !lowerMessage.Contains("top") && !lowerMessage.Contains("best"))
                {
                    // Try to extract player name
                    string playerName = ExtractPlayerName(request.Message);
                    if (!string.IsNullOrWhiteSpace(playerName))
                    {
                        var playerStats = await GetPlayerStatsByName(playerName);
                        return Ok(playerStats);
                    }
                }

                // Points related query - we don't reveal points
                if (lowerMessage.Contains("point") || lowerMessage.Contains("score") ||
                    (lowerMessage.Contains("how") && lowerMessage.Contains("calculated")))
                {
                    return Ok(new ChatbotQueryResponse
                    {
                        Reply = "I don't have information about player points. Points are kept hidden as per the rules of the platform.",
                        RecommendedPlayers = new List<object>()
                    });
                }

                // For other messages, call Gemini API with enhanced prompt
                string geminiApiKey = _configuration["GeminiAPI:Key"] ?? "";

                if (string.IsNullOrEmpty(geminiApiKey))
                {
                    // If no API key, provide a generic helpful response
                    return Ok(new ChatbotQueryResponse
                    {
                        Reply = "I can help you with player information, statistics, and team building recommendations. Try asking about top run scorers, best bowlers, or for suggestions on building your team.",
                        RecommendedPlayers = new List<object>()
                    });
                }

                // Enhanced prompt for Gemini
                string enhancedPrompt =
                    "You are Spiriter, a cricket assistant for a fantasy cricket platform. " +
                    "IMPORTANT: NEVER mention or discuss player points or any scoring system. " +
                    "If asked about points, say 'Points are kept hidden as per the rules of the platform.' " +
                    "Focus on providing helpful cricket advice and team building suggestions based on player statistics. " +
                    "Now answer this: " + request.Message;

                // Make call to Gemini API
                string apiResponse = await CallGeminiAPI(geminiApiKey, enhancedPrompt);

                return Ok(new ChatbotQueryResponse
                {
                    Reply = apiResponse,
                    RecommendedPlayers = new List<object>()
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in ChatbotController: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { message = "An error occurred while processing your request", error = ex.Message });
            }
        }

        private async Task<ChatbotQueryResponse> GetTopRunScorers(int limit = 5)
        {
            var response = new ChatbotQueryResponse();
            var players = new List<object>();

            try
            {
                using (var connection = new MySqlConnection(_connectionString))
                {
                    await connection.OpenAsync();

                    string sql = @"
                        SELECT player_id, name, university, category,
                               total_runs, balls_faced, innings_played,
                               wickets, overs_bowled, runs_conceded
                        FROM players
                        ORDER BY total_runs DESC
                        LIMIT @limit";

                    using (var command = new MySqlCommand(sql, connection))
                    {
                        command.Parameters.AddWithValue("@limit", limit);

                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                var player = new
                                {
                                    PlayerId = reader.GetInt32(reader.GetOrdinal("player_id")),
                                    Name = reader.GetString(reader.GetOrdinal("name")),
                                    University = reader.GetString(reader.GetOrdinal("university")),
                                    Category = reader.GetString(reader.GetOrdinal("category")),
                                    TotalRuns = reader.GetInt32(reader.GetOrdinal("total_runs")),
                                    BallsFaced = reader.GetInt32(reader.GetOrdinal("balls_faced")),
                                    InningsPlayed = reader.GetInt32(reader.GetOrdinal("innings_played")),
                                    BattingStrikeRate = reader.GetInt32(reader.GetOrdinal("balls_faced")) > 0 ?
                                        (reader.GetInt32(reader.GetOrdinal("total_runs")) * 100.0) / reader.GetInt32(reader.GetOrdinal("balls_faced")) : 0,
                                    BattingAverage = reader.GetInt32(reader.GetOrdinal("innings_played")) > 0 ?
                                        reader.GetInt32(reader.GetOrdinal("total_runs")) / (double)reader.GetInt32(reader.GetOrdinal("innings_played")) : 0,
                                    Wickets = reader.GetInt32(reader.GetOrdinal("wickets")),
                                    OversBowled = reader.GetFloat(reader.GetOrdinal("overs_bowled")),
                                    RunsConceded = reader.GetInt32(reader.GetOrdinal("runs_conceded")),
                                    RecommendationReason = "Top run-scorer with impressive batting statistics"
                                };

                                players.Add(player);
                            }
                        }
                    }
                }

                // Create an appropriate response message
                string reply = "Here are the top run-scorers in our database:\n\n";

                for (int i = 0; i < players.Count; i++)
                {
                    var player = players[i];
                    var p = (dynamic)player;
                    reply += $"{i + 1}. {p.Name} ({p.University}) - {p.TotalRuns} runs, Strike Rate: {p.BattingStrikeRate:F2}\n";
                }

                reply += "\nWould you like more detailed statistics for any of these players?";

                response.Reply = reply;
                response.RecommendedPlayers = players;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting top run-scorers: {ex.Message}");
                response.Reply = "I encountered an error while retrieving the top run-scorers. Please try again later.";
                response.RecommendedPlayers = new List<object>();
            }

            return response;
        }

        private async Task<ChatbotQueryResponse> GetTopWicketTakers(int limit = 5)
        {
            var response = new ChatbotQueryResponse();
            var players = new List<object>();

            try
            {
                using (var connection = new MySqlConnection(_connectionString))
                {
                    await connection.OpenAsync();

                    string sql = @"
                        SELECT player_id, name, university, category,
                               total_runs, balls_faced, innings_played,
                               wickets, overs_bowled, runs_conceded
                        FROM players
                        ORDER BY wickets DESC
                        LIMIT @limit";

                    using (var command = new MySqlCommand(sql, connection))
                    {
                        command.Parameters.AddWithValue("@limit", limit);

                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                float oversBowled = reader.GetFloat(reader.GetOrdinal("overs_bowled"));
                                int wickets = reader.GetInt32(reader.GetOrdinal("wickets"));
                                int runsConceded = reader.GetInt32(reader.GetOrdinal("runs_conceded"));

                                // Calculate economy rate (runs per over)
                                double? economyRate = oversBowled > 0 ?
                                    runsConceded / (double)oversBowled : null;

                                // Calculate bowling average (runs per wicket)
                                double? bowlingAverage = wickets > 0 ?
                                    runsConceded / (double)wickets : null;

                                // Calculate bowling strike rate (balls per wicket)
                                double? bowlingStrikeRate = wickets > 0 ?
                                    (oversBowled * 6) / wickets : null;

                                var player = new
                                {
                                    PlayerId = reader.GetInt32(reader.GetOrdinal("player_id")),
                                    Name = reader.GetString(reader.GetOrdinal("name")),
                                    University = reader.GetString(reader.GetOrdinal("university")),
                                    Category = reader.GetString(reader.GetOrdinal("category")),
                                    TotalRuns = reader.GetInt32(reader.GetOrdinal("total_runs")),
                                    Wickets = wickets,
                                    OversBowled = oversBowled,
                                    RunsConceded = runsConceded,
                                    EconomyRate = economyRate,
                                    BowlingAverage = bowlingAverage,
                                    BowlingStrikeRate = bowlingStrikeRate,
                                    RecommendationReason = "Top wicket-taker with impressive bowling statistics"
                                };

                                players.Add(player);
                            }
                        }
                    }
                }

                // Create an appropriate response message
                string reply = "Here are the top wicket-takers in our database:\n\n";

                for (int i = 0; i < players.Count; i++)
                {
                    var player = players[i];
                    var p = (dynamic)player;
                    string economyStr = p.EconomyRate.HasValue ? $"{p.EconomyRate:F2}" : "N/A";

                    reply += $"{i + 1}. {p.Name} ({p.University}) - {p.Wickets} wickets, Economy: {economyStr}\n";
                }

                reply += "\nWould you like more detailed statistics for any of these players?";

                response.Reply = reply;
                response.RecommendedPlayers = players;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting top wicket-takers: {ex.Message}");
                response.Reply = "I encountered an error while retrieving the top wicket-takers. Please try again later.";
                response.RecommendedPlayers = new List<object>();
            }

            return response;
        }

        private async Task<ChatbotQueryResponse> GetBestTeamRecommendation()
        {
            var response = new ChatbotQueryResponse();
            var players = new List<object>();

            try
            {
                using (var connection = new MySqlConnection(_connectionString))
                {
                    await connection.OpenAsync();

                    // Get user ID from claims
                    var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                    int userId = 0;
                    if (!string.IsNullOrEmpty(userIdClaim))
                    {
                        int.TryParse(userIdClaim, out userId);
                    }

                    // Get user's team ID if exists
                    int teamId = 0;
                    if (userId > 0)
                    {
                        string teamSql = "SELECT team_id FROM teams WHERE user_id = @userId LIMIT 1";
                        using (var command = new MySqlCommand(teamSql, connection))
                        {
                            command.Parameters.AddWithValue("@userId", userId);
                            var result = await command.ExecuteScalarAsync();
                            if (result != null && result != DBNull.Value)
                            {
                                teamId = Convert.ToInt32(result);
                            }
                        }
                    }

                    // Get player exclusion list (players already in team)
                    var exclusionList = new List<int>();
                    if (teamId > 0)
                    {
                        string exclusionSql = "SELECT player_id FROM team_players WHERE team_id = @teamId";
                        using (var command = new MySqlCommand(exclusionSql, connection))
                        {
                            command.Parameters.AddWithValue("@teamId", teamId);
                            using (var reader = await command.ExecuteReaderAsync())
                            {
                                while (await reader.ReadAsync())
                                {
                                    exclusionList.Add(reader.GetInt32(reader.GetOrdinal("player_id")));
                                }
                            }
                        }
                    }

                    // Get user's budget
                    int budget = 9000000; // Default budget
                    if (userId > 0)
                    {
                        string budgetSql = "SELECT budget FROM users WHERE user_id = @userId";
                        using (var command = new MySqlCommand(budgetSql, connection))
                        {
                            command.Parameters.AddWithValue("@userId", userId);
                            var result = await command.ExecuteScalarAsync();
                            if (result != null && result != DBNull.Value)
                            {
                                budget = Convert.ToInt32(result);
                            }
                        }
                    }

                    // Get the best balanced team - we'll simplify by getting:
                    // - 4 top batsmen (batting stats)
                    // - 4 top bowlers (bowling stats)
                    // - 3 top all-rounders (combined stats)

                    // 1. Get top batsmen
                    string batsmenSql = @"
                        SELECT player_id, name, university, category,
                               total_runs, balls_faced, innings_played,
                               wickets, overs_bowled, runs_conceded,
                               (9 * (((total_runs / CASE WHEN balls_faced = 0 THEN 1 ELSE balls_faced END) * 100 / 5) +
                                    (total_runs / CASE WHEN innings_played = 0 THEN 1 ELSE innings_played END) * 0.8) + 100) * 1000 as player_value
                        FROM players
                        WHERE category LIKE '%bat%' OR category LIKE '%batter%' OR category LIKE '%batsman%'
                        ORDER BY total_runs DESC, (total_runs / CASE WHEN balls_faced = 0 THEN 1 ELSE balls_faced END) DESC
                        LIMIT 4";

                    if (exclusionList.Count > 0)
                    {
                        batsmenSql = batsmenSql.Replace("WHERE", $"WHERE player_id NOT IN ({string.Join(",", exclusionList)}) AND");
                    }

                    using (var command = new MySqlCommand(batsmenSql, connection))
                    {
                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                // Calculate key batting metrics
                                int totalRuns = reader.GetInt32(reader.GetOrdinal("total_runs"));
                                int ballsFaced = reader.GetInt32(reader.GetOrdinal("balls_faced"));
                                int inningsPlayed = reader.GetInt32(reader.GetOrdinal("innings_played"));

                                double battingStrikeRate = ballsFaced > 0 ?
                                    (totalRuns * 100.0) / ballsFaced : 0;

                                double battingAverage = inningsPlayed > 0 ?
                                    totalRuns / (double)inningsPlayed : 0;

                                // Round the player value to nearest 50,000
                                int playerValue = (int)(Math.Round(reader.GetDouble(reader.GetOrdinal("player_value")) / 50000.0) * 50000.0);

                                if (playerValue <= budget)
                                {
                                    var player = new
                                    {
                                        PlayerId = reader.GetInt32(reader.GetOrdinal("player_id")),
                                        Name = reader.GetString(reader.GetOrdinal("name")),
                                        University = reader.GetString(reader.GetOrdinal("university")),
                                        Category = reader.GetString(reader.GetOrdinal("category")),
                                        TotalRuns = totalRuns,
                                        BattingStrikeRate = battingStrikeRate,
                                        BattingAverage = battingAverage,
                                        PlayerValue = playerValue,
                                        RecommendationReason = "Top-class batsman with impressive run-scoring ability"
                                    };

                                    players.Add(player);
                                    budget -= playerValue;

                                    // Add to exclusion list
                                    exclusionList.Add(reader.GetInt32(reader.GetOrdinal("player_id")));
                                }
                            }
                        }
                    }

                    // 2. Get top bowlers
                    string bowlersSql = @"
                        SELECT player_id, name, university, category,
                               total_runs, balls_faced, innings_played,
                               wickets, overs_bowled, runs_conceded,
                               (9 * ((CASE WHEN wickets > 0 THEN 500 / ((overs_bowled * 6) / wickets) ELSE 0 END) +
                                    (CASE WHEN overs_bowled > 0 THEN 140 / ((runs_conceded / (overs_bowled * 6)) * 6) ELSE 0 END)) + 100) * 1000 as player_value
                        FROM players
                        WHERE category LIKE '%bowl%' OR category LIKE '%bowler%'
                        ORDER BY wickets DESC, (runs_conceded / CASE WHEN overs_bowled = 0 THEN 1 ELSE overs_bowled END) ASC
                        LIMIT 4";

                    if (exclusionList.Count > 0)
                    {
                        bowlersSql = bowlersSql.Replace("WHERE", $"WHERE player_id NOT IN ({string.Join(",", exclusionList)}) AND");
                    }

                    using (var command = new MySqlCommand(bowlersSql, connection))
                    {
                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                // Calculate key bowling metrics
                                int wickets = reader.GetInt32(reader.GetOrdinal("wickets"));
                                float oversBowled = reader.GetFloat(reader.GetOrdinal("overs_bowled"));
                                int runsConceded = reader.GetInt32(reader.GetOrdinal("runs_conceded"));

                                double? economyRate = oversBowled > 0 ?
                                    runsConceded / (double)oversBowled : null;

                                double? bowlingStrikeRate = wickets > 0 ?
                                    (oversBowled * 6) / wickets : null;

                                // Round the player value to nearest 50,000
                                int playerValue = (int)(Math.Round(reader.GetDouble(reader.GetOrdinal("player_value")) / 50000.0) * 50000.0);

                                if (playerValue <= budget)
                                {
                                    var player = new
                                    {
                                        PlayerId = reader.GetInt32(reader.GetOrdinal("player_id")),
                                        Name = reader.GetString(reader.GetOrdinal("name")),
                                        University = reader.GetString(reader.GetOrdinal("university")),
                                        Category = reader.GetString(reader.GetOrdinal("category")),
                                        Wickets = wickets,
                                        OversBowled = oversBowled,
                                        RunsConceded = runsConceded,
                                        EconomyRate = economyRate,
                                        BowlingStrikeRate = bowlingStrikeRate,
                                        PlayerValue = playerValue,
                                        RecommendationReason = "Excellent bowler with strong wicket-taking ability"
                                    };

                                    players.Add(player);
                                    budget -= playerValue;

                                    // Add to exclusion list
                                    exclusionList.Add(reader.GetInt32(reader.GetOrdinal("player_id")));
                                }
                            }
                        }
                    }

                    // 3. Get top all-rounders
                    string allRoundersSql = @"
                        SELECT player_id, name, university, category,
                               total_runs, balls_faced, innings_played,
                               wickets, overs_bowled, runs_conceded,
                               (9 * (((total_runs / CASE WHEN balls_faced = 0 THEN 1 ELSE balls_faced END) * 100 / 5 +
                                (total_runs / CASE WHEN innings_played = 0 THEN 1 ELSE innings_played END) * 0.8) +
                                (CASE WHEN wickets > 0 THEN 500 / ((overs_bowled * 6) / wickets) ELSE 0 END +
                                CASE WHEN overs_bowled > 0 THEN 140 / ((runs_conceded / (overs_bowled * 6)) * 6) ELSE 0 END)) + 100) * 1000 as player_value
                        FROM players
                        WHERE category LIKE '%all%' OR category LIKE '%rounder%'
                        ORDER BY (total_runs * wickets) DESC
                        LIMIT 3";

                    if (exclusionList.Count > 0)
                    {
                        allRoundersSql = allRoundersSql.Replace("WHERE", $"WHERE player_id NOT IN ({string.Join(",", exclusionList)}) AND");
                    }

                    using (var command = new MySqlCommand(allRoundersSql, connection))
                    {
                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                // Calculate key all-rounder metrics
                                int totalRuns = reader.GetInt32(reader.GetOrdinal("total_runs"));
                                int ballsFaced = reader.GetInt32(reader.GetOrdinal("balls_faced"));
                                int inningsPlayed = reader.GetInt32(reader.GetOrdinal("innings_played"));
                                int wickets = reader.GetInt32(reader.GetOrdinal("wickets"));
                                float oversBowled = reader.GetFloat(reader.GetOrdinal("overs_bowled"));
                                int runsConceded = reader.GetInt32(reader.GetOrdinal("runs_conceded"));

                                // Calculate batting stats
                                double battingStrikeRate = ballsFaced > 0 ?
                                    (totalRuns * 100.0) / ballsFaced : 0;

                                double battingAverage = inningsPlayed > 0 ?
                                    totalRuns / (double)inningsPlayed : 0;

                                // Calculate bowling stats
                                double? economyRate = oversBowled > 0 ?
                                    runsConceded / (double)oversBowled : null;

                                // Round the player value to nearest 50,000
                                int playerValue = (int)(Math.Round(reader.GetDouble(reader.GetOrdinal("player_value")) / 50000.0) * 50000.0);

                                if (playerValue <= budget)
                                {
                                    var player = new
                                    {
                                        PlayerId = reader.GetInt32(reader.GetOrdinal("player_id")),
                                        Name = reader.GetString(reader.GetOrdinal("name")),
                                        University = reader.GetString(reader.GetOrdinal("university")),
                                        Category = reader.GetString(reader.GetOrdinal("category")),
                                        TotalRuns = totalRuns,
                                        BattingStrikeRate = battingStrikeRate,
                                        BattingAverage = battingAverage,
                                        Wickets = wickets,
                                        OversBowled = oversBowled,
                                        RunsConceded = runsConceded,
                                        EconomyRate = economyRate,
                                        PlayerValue = playerValue,
                                        RecommendationReason = "Versatile all-rounder who contributes with both bat and ball"
                                    };

                                    players.Add(player);
                                    budget -= playerValue;

                                    // Add to exclusion list
                                    exclusionList.Add(reader.GetInt32(reader.GetOrdinal("player_id")));
                                }
                            }
                        }
                    }
                }

                // Create an appropriate response
                string reply = "Here's my recommendation for the best possible team based on player statistics:\n\n";

                // Count player types
                int batsmen = players.Count(p => ((dynamic)p).Category.ToString().ToLower().Contains("bat") ||
                                               ((dynamic)p).Category.ToString().ToLower().Contains("batsman") ||
                                               ((dynamic)p).Category.ToString().ToLower().Contains("batter"));

                int bowlers = players.Count(p => ((dynamic)p).Category.ToString().ToLower().Contains("bowl") ||
                                              ((dynamic)p).Category.ToString().ToLower().Contains("bowler"));

                int allRounders = players.Count(p => ((dynamic)p).Category.ToString().ToLower().Contains("all") ||
                                                  ((dynamic)p).Category.ToString().ToLower().Contains("rounder"));

                reply += $"I've selected a balanced team with {batsmen} batsmen, {bowlers} bowlers, and {allRounders} all-rounders.\n\n";

                // List batsmen
                if (batsmen > 0)
                {
                    reply += "Batsmen:\n";
                    foreach (var player in players.Where(p => ((dynamic)p).Category.ToString().ToLower().Contains("bat") ||
                                                          ((dynamic)p).Category.ToString().ToLower().Contains("batsman") ||
                                                          ((dynamic)p).Category.ToString().ToLower().Contains("batter")))
                    {
                        var p = (dynamic)player;
                        reply += $"- {p.Name} ({p.University}) - {p.TotalRuns} runs, SR: {p.BattingStrikeRate:F2}\n";
                    }
                    reply += "\n";
                }

                // List bowlers
                if (bowlers > 0)
                {
                    reply += "Bowlers:\n";
                    foreach (var player in players.Where(p => ((dynamic)p).Category.ToString().ToLower().Contains("bowl") ||
                                                          ((dynamic)p).Category.ToString().ToLower().Contains("bowler")))
                    {
                        var p = (dynamic)player;
                        string economy = p.EconomyRate.HasValue ? $"{p.EconomyRate:F2}" : "N/A";
                        reply += $"- {p.Name} ({p.University}) - {p.Wickets} wickets, Economy: {economy}\n";
                    }
                    reply += "\n";
                }

                // List all-rounders
                if (allRounders > 0)
                {
                    reply += "All-Rounders:\n";
                    foreach (var player in players.Where(p => ((dynamic)p).Category.ToString().ToLower().Contains("all") ||
                                                          ((dynamic)p).Category.ToString().ToLower().Contains("rounder")))
                    {
                        var p = (dynamic)player;
                        reply += $"- {p.Name} ({p.University}) - {p.TotalRuns} runs, {p.Wickets} wickets\n";
                    }
                    reply += "\n";
                }

                reply += "You can select these players to build your team or ask for more information about any specific player.";

                response.Reply = reply;
                response.RecommendedPlayers = players;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting best team: {ex.Message}");
                response.Reply = "I encountered an error while generating team recommendations. Please try again later.";
                response.RecommendedPlayers = new List<object>();
            }

            return response;
        }

        private async Task<ChatbotQueryResponse> GetPlayerStatsByName(string playerName)
        {
            var response = new ChatbotQueryResponse();
            var players = new List<object>();

            try
            {
                using (var connection = new MySqlConnection(_connectionString))
                {
                    await connection.OpenAsync();

                    string sql = @"
                        SELECT player_id, name, university, category,
                               total_runs, balls_faced, innings_played,
                               wickets, overs_bowled, runs_conceded
                        FROM players
                        WHERE name LIKE @playerName
                        LIMIT 5";

                    using (var command = new MySqlCommand(sql, connection))
                    {
                        command.Parameters.AddWithValue("@playerName", $"%{playerName}%");

                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                // Process first player
                                string name = reader.GetString(reader.GetOrdinal("name"));
                                string university = reader.GetString(reader.GetOrdinal("university"));
                                string category = reader.GetString(reader.GetOrdinal("category"));
                                int totalRuns = reader.GetInt32(reader.GetOrdinal("total_runs"));
                                int ballsFaced = reader.GetInt32(reader.GetOrdinal("balls_faced"));
                                int inningsPlayed = reader.GetInt32(reader.GetOrdinal("innings_played"));
                                int wickets = reader.GetInt32(reader.GetOrdinal("wickets"));
                                float oversBowled = reader.GetFloat(reader.GetOrdinal("overs_bowled"));
                                int runsConceded = reader.GetInt32(reader.GetOrdinal("runs_conceded"));

                                // Calculate batting stats
                                double battingStrikeRate = ballsFaced > 0 ?
                                    (totalRuns * 100.0) / ballsFaced : 0;

                                double battingAverage = inningsPlayed > 0 ?
                                    totalRuns / (double)inningsPlayed : 0;

                                // Calculate bowling stats
                                double? economyRate = reader.GetFloat(reader.GetOrdinal("overs_bowled")) > 0 ?
                                    reader.GetInt32(reader.GetOrdinal("runs_conceded")) / (double)reader.GetFloat(reader.GetOrdinal("overs_bowled")) : (double?)null;

                                double? bowlingStrikeRate = reader.GetInt32(reader.GetOrdinal("wickets")) > 0 ?
                                    (reader.GetFloat(reader.GetOrdinal("overs_bowled")) * 6) / reader.GetInt32(reader.GetOrdinal("wickets")) : (double?)null;


                                // Calculate player value without showing internal points calculation
                                double internalValue = ((battingStrikeRate / 5) + (battingAverage * 0.8));
                                if (wickets > 0)
                                    internalValue += 500 / ((oversBowled * 6) / wickets);
                                if (oversBowled > 0)
                                    internalValue += 140 / ((runsConceded / (oversBowled * 6)) * 6);

                                int playerValue = (int)(Math.Round(((9 * internalValue + 100) * 1000) / 50000.0) * 50000.0);

                                // Create detailed response
                                string reply = $"Here are the statistics for {name} ({university}):\n\n";
                                reply += $"Category: {category}\n";
                                reply += $"Total Runs: {totalRuns}\n";
                                reply += $"Batting Strike Rate: {battingStrikeRate:F2}\n";
                                reply += $"Batting Average: {battingAverage:F2}\n";
                                reply += $"Wickets: {wickets}\n";

                                if (bowlingStrikeRate.HasValue)
                                    reply += $"Bowling Strike Rate: {bowlingStrikeRate.Value:F2}\n";
                                else
                                    reply += "Bowling Strike Rate: Undefined (no wickets taken)\n";

                                if (economyRate.HasValue)
                                    reply += $"Economy Rate: {economyRate.Value:F2}\n";
                                else
                                    reply += "Economy Rate: Undefined (no overs bowled)\n";

                                reply += $"Player Value: ₹{playerValue:N0}\n\n";

                                // Add performance analysis based on player type
                                if (category.ToLower().Contains("bat") || category.ToLower().Contains("batsman") || category.ToLower().Contains("batter"))
                                {
                                    if (battingStrikeRate > 130)
                                        reply += "This player has an exceptional strike rate, making them excellent for scoring quick runs.";
                                    else if (battingAverage > 35)
                                        reply += "This player has a high batting average, indicating consistent performance.";
                                    else
                                        reply += "This player has solid batting credentials.";
                                }
                                else if (category.ToLower().Contains("bowl") || category.ToLower().Contains("bowler"))
                                {
                                    if (wickets > 15)
                                        reply += "This player is an excellent wicket-taker and could be a match-winner.";
                                    else if (economyRate.HasValue && economyRate.Value < 7)
                                        reply += "This player is economical and can restrict the flow of runs.";
                                    else
                                        reply += "This player has decent bowling statistics.";
                                }
                                else if (category.ToLower().Contains("all") || category.ToLower().Contains("rounder"))
                                {
                                    reply += "This all-rounder can contribute with both bat and ball, providing flexibility to your team.";
                                }

                                response.Reply = reply;

                                // Add player to recommended list
                                var player = new
                                {
                                    PlayerId = reader.GetInt32(reader.GetOrdinal("player_id")),
                                    Name = name,
                                    University = university,
                                    Category = category,
                                    TotalRuns = totalRuns,
                                    BallsFaced = ballsFaced,
                                    InningsPlayed = inningsPlayed,
                                    Wickets = wickets,
                                    OversBowled = oversBowled,
                                    RunsConceded = runsConceded,
                                    BattingStrikeRate = battingStrikeRate,
                                    BattingAverage = battingAverage,
                                    EconomyRate = economyRate,
                                    BowlingStrikeRate = bowlingStrikeRate,
                                    PlayerValue = playerValue
                                };

                                players.Add(player);

                                // Get additional players with similar names
                                while (await reader.ReadAsync())
                                {
                                    player = new
                                    {
                                        PlayerId = reader.GetInt32(reader.GetOrdinal("player_id")),
                                        Name = reader.GetString(reader.GetOrdinal("name")),
                                        University = reader.GetString(reader.GetOrdinal("university")),
                                        Category = reader.GetString(reader.GetOrdinal("category")),
                                        TotalRuns = reader.GetInt32(reader.GetOrdinal("total_runs")),
                                        BallsFaced = reader.GetInt32(reader.GetOrdinal("balls_faced")),
                                        InningsPlayed = reader.GetInt32(reader.GetOrdinal("innings_played")),
                                        Wickets = reader.GetInt32(reader.GetOrdinal("wickets")),
                                        OversBowled = reader.GetFloat(reader.GetOrdinal("overs_bowled")),
                                        RunsConceded = reader.GetInt32(reader.GetOrdinal("runs_conceded")),
                                        BattingStrikeRate = reader.GetInt32(reader.GetOrdinal("balls_faced")) > 0 ?
                                            (reader.GetInt32(reader.GetOrdinal("total_runs")) * 100.0) / reader.GetInt32(reader.GetOrdinal("balls_faced")) : 0,
                                        BattingAverage = reader.GetInt32(reader.GetOrdinal("innings_played")) > 0 ?
                                            reader.GetInt32(reader.GetOrdinal("total_runs")) / (double)reader.GetInt32(reader.GetOrdinal("innings_played")) : 0,
                                        EconomyRate = reader.GetFloat(reader.GetOrdinal("overs_bowled")) > 0 ?
                                            reader.GetInt32(reader.GetOrdinal("runs_conceded")) / (double)reader.GetFloat(reader.GetOrdinal("overs_bowled")) : (double?)null,
                                        BowlingStrikeRate = reader.GetInt32(reader.GetOrdinal("wickets")) > 0 ?
                                            (reader.GetFloat(reader.GetOrdinal("overs_bowled")) * 6) / reader.GetInt32(reader.GetOrdinal("wickets")) : (double?)null,
                                        PlayerValue = 0 // Default value or calculate if needed for additional players
                                    };

                                    players.Add(player);
                                }

                                if (players.Count > 1)
                                {
                                    response.Reply += "\n\nI found other players with similar names who might interest you. Check the recommendations panel for details.";
                                }
                            }
                            else
                            {
                                response.Reply = $"I couldn't find any player named '{playerName}'. Please check the spelling or try a different name.";
                            }
                        }
                    }
                }

                response.RecommendedPlayers = players;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting player stats: {ex.Message}");
                response.Reply = "I encountered an error while retrieving player statistics. Please try again later.";
                response.RecommendedPlayers = new List<object>();
            }

            return response;
        }

        private string ExtractPlayerName(string message)
        {
            // Try to extract player name from query
            string lowerMessage = message.ToLower();
            string playerName = "";

            // Check for common phrases
            string[] prefixes = {
                "stats for ", "statistics for ", "info on ", "about player ",
                "tell me about ", "player named ", "show me "
            };

            foreach (var prefix in prefixes)
            {
                int index = lowerMessage.IndexOf(prefix);
                if (index >= 0)
                {
                    int startIndex = index + prefix.Length;
                    int endIndex = lowerMessage.IndexOfAny(new[] { '.', ',', '?', '!' }, startIndex);

                    if (endIndex > startIndex)
                    {
                        playerName = message.Substring(startIndex, endIndex - startIndex).Trim();
                    }
                    else
                    {
                        playerName = message.Substring(startIndex).Trim();
                    }

                    break;
                }
            }

            // If no player name found with prefixes, look for capitalized words
            if (string.IsNullOrWhiteSpace(playerName))
            {
                var words = message.Split(new[] { ' ', '.', ',', '?', '!' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var word in words)
                {
                    if (word.Length > 1 && char.IsUpper(word[0]))
                    {
                        playerName = word;
                        break;
                    }
                }
            }

            return playerName;
        }

        private async Task<string> CallGeminiAPI(string apiKey, string userMessage)
        {
            try
            {
                // Simple endpoint call with minimal complexity
                string apiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={apiKey}";

                // Create a minimal request
                var requestBody = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new[]
                            {
                                new { text = userMessage }
                            }
                        }
                    }
                };

                string jsonContent = JsonSerializer.Serialize(requestBody);
                Console.WriteLine($"Request: {jsonContent.Substring(0, Math.Min(100, jsonContent.Length))}...");

                var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync(apiUrl, httpContent);

                string responseContent = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Response status: {response.StatusCode}");
                Console.WriteLine($"Response: {responseContent.Substring(0, Math.Min(200, responseContent.Length))}...");

                if (!response.IsSuccessStatusCode)
                {
                    return $"Error from API: {response.StatusCode}";
                }

                // Basic parsing - just try to extract text
                try
                {
                    var jsonResponse = JsonSerializer.Deserialize<JsonElement>(responseContent);
                    if (jsonResponse.TryGetProperty("candidates", out var candidates) &&
                        candidates.GetArrayLength() > 0 &&
                        candidates[0].TryGetProperty("content", out var content) &&
                        content.TryGetProperty("parts", out var parts) &&
                        parts.GetArrayLength() > 0 &&
                        parts[0].TryGetProperty("text", out var text))
                    {
                        return text.GetString() ?? "No text returned";
                    }
                    else
                    {
                        return "Could not parse response from API";
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"JSON parsing error: {ex.Message}");
                    return "Error parsing API response";
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"API call error: {ex.Message}");
                return $"Error calling API: {ex.Message}";
            }
        }
    }

    public class ChatbotQueryRequest
    {
        public string Message { get; set; } = string.Empty;
    }

    public class ChatbotQueryResponse
    {
        public string Reply { get; set; } = string.Empty;
        public List<object> RecommendedPlayers { get; set; } = new List<object>();
    }
}
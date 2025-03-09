// File path: SpiritX.API/Controllers/AuthController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SpiritX.API.Models;
using SpiritX.API.Utilities;
using System;
using System.Threading.Tasks;
using MySql.Data.MySqlClient;
using Microsoft.Extensions.Configuration;
using System.Text.Json;

namespace SpiritX.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly JwtHelper _jwtHelper;
        private readonly string _connectionString;

        public AuthController(JwtHelper jwtHelper, IConfiguration configuration)
        {
            _jwtHelper = jwtHelper;
            _connectionString = configuration.GetConnectionString("DefaultConnection");
        }

        // Test endpoint to check if API is running
        [HttpGet("test")]
        public IActionResult Test()
        {
            return Ok(new { message = "Auth API is running" });
        }

        // Test endpoint to verify authentication
        [HttpGet("protected")]
        [Authorize]
        public IActionResult Protected()
        {
            var username = User.Identity?.Name;
            return Ok(new { message = $"Hello, {username}! This is a protected endpoint." });
        }

        // POST: api/auth/register
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterModel model)
        {
            try
            {
                if (model == null || string.IsNullOrEmpty(model.Username) || string.IsNullOrEmpty(model.Password))
                {
                    return BadRequest(new { message = "Username and password are required" });
                }

                Console.WriteLine($"Registration attempt for username: {model.Username}");

                using (var connection = new MySqlConnection(_connectionString))
                {
                    await connection.OpenAsync();

                    // Check if username already exists
                    string checkSql = "SELECT COUNT(*) FROM users WHERE username = @username";
                    using (var command = new MySqlCommand(checkSql, connection))
                    {
                        command.Parameters.AddWithValue("@username", model.Username);
                        var count = Convert.ToInt32(await command.ExecuteScalarAsync());
                        
                        if (count > 0)
                        {
                            Console.WriteLine($"Username {model.Username} already exists");
                            return BadRequest(new { message = "Username already exists" });
                        }
                    }

                    // Hash password
                    string hashedPassword = BCrypt.Net.BCrypt.HashPassword(model.Password);

                    // Create new user
                    string sql = @"
                        INSERT INTO users (username, password, budget, created_at, is_admin)
                        VALUES (@username, @password, @budget, @createdAt, @isAdmin);
                        SELECT LAST_INSERT_ID();";

                    int userId;
                    using (var command = new MySqlCommand(sql, connection))
                    {
                        command.Parameters.AddWithValue("@username", model.Username);
                        command.Parameters.AddWithValue("@password", hashedPassword);
                        command.Parameters.AddWithValue("@budget", 9000000); // Default budget
                        command.Parameters.AddWithValue("@createdAt", DateTime.UtcNow);
                        command.Parameters.AddWithValue("@isAdmin", false); // Default is not admin

                        userId = Convert.ToInt32(await command.ExecuteScalarAsync());
                    }

                    // Create user's default team
                    string teamSql = @"
                        INSERT INTO teams (user_id, team_name, total_points)
                        VALUES (@userId, 'My Team', 0);";

                    using (var command = new MySqlCommand(teamSql, connection))
                    {
                        command.Parameters.AddWithValue("@userId", userId);
                        await command.ExecuteNonQueryAsync();
                    }

                    Console.WriteLine($"User {model.Username} registered successfully with ID: {userId}");
                    return Ok(new { message = "Registration successful" });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error during registration: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                return StatusCode(500, new { message = "An error occurred during registration" });
            }
        }

        // POST: api/auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginModel model)
        {
            try
            {
                Console.WriteLine($"Login attempt for user: {model.Username}");

                using (var connection = new MySqlConnection(_connectionString))
                {
                    await connection.OpenAsync();

                    // Get user with password for verification
                    string sql = @"
                        SELECT user_id, username, password, is_admin
                        FROM users
                        WHERE username = @username";

                    User user = null;
                    using (var command = new MySqlCommand(sql, connection))
                    {
                        command.Parameters.AddWithValue("@username", model.Username);

                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                user = new User
                                {
                                    UserId = Convert.ToInt32(reader["user_id"]),
                                    Username = reader["username"].ToString(),
                                    Password = reader["password"].ToString(),
                                    IsAdmin = Convert.ToBoolean(reader["is_admin"])
                                };
                            }
                        }
                    }

                    if (user == null)
                    {
                        Console.WriteLine($"User {model.Username} not found");
                        return Unauthorized(new { message = "Invalid username or password" });
                    }

                    // Verify password
                    if (!BCrypt.Net.BCrypt.Verify(model.Password, user.Password))
                    {
                        Console.WriteLine($"Invalid password for user {model.Username}");
                        return Unauthorized(new { message = "Invalid username or password" });
                    }

                    // Log IsAdmin status for debugging
                    Console.WriteLine($"User {user.Username} IsAdmin: {user.IsAdmin}");

                    // Generate JWT token
                    var token = _jwtHelper.GenerateJwtToken(user);

                    // Return token and user info (excluding password)
                    return Ok(new
                    {
                        token,
                        user = new
                        {
                            userId = user.UserId,
                            username = user.Username,
                            isAdmin = user.IsAdmin // Return isAdmin to client
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error during login: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                return StatusCode(500, new { message = "An error occurred during login" });
            }
        }
    }

    // Models for authentication
    public class RegisterModel
    {
        public string Username { get; set; }
        public string Password { get; set; }
    }

    public class LoginModel
    {
        public string Username { get; set; }
        public string Password { get; set; }
    }
}
// JwtHelper.cs
using Microsoft.IdentityModel.Tokens;
using SpiritX.API.Models;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SpiritX.API.Utilities
{
    public class JwtHelper
    {
        private readonly IConfiguration _configuration;

        public JwtHelper(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public string GenerateJwtToken(User user)
        {
            try
            {
                // Get JWT settings from configuration
                var jwtSecret = _configuration["Jwt:Secret"];
                if (string.IsNullOrEmpty(jwtSecret))
                {
                    Console.WriteLine("WARNING: JWT Secret is missing in configuration");
                    jwtSecret = "YourSecretKeyHereMinimum32CharactersLong"; // Default fallback for development
                }
                
                var jwtIssuer = _configuration["Jwt:Issuer"] ?? "SpiritX";
                var jwtAudience = _configuration["Jwt:Audience"] ?? "SpiritXUsers";
                var jwtDurationStr = _configuration["Jwt:ExpiryInMinutes"] ?? "60";
                
                if (!int.TryParse(jwtDurationStr, out int jwtDurationInMinutes))
                {
                    jwtDurationInMinutes = 60; // Default to 60 minutes
                }
                
                // Debug output
                Console.WriteLine($"Generating JWT token for user: {user.Username}");
                Console.WriteLine($"JWT Issuer: {jwtIssuer}");
                Console.WriteLine($"JWT Audience: {jwtAudience}");
                Console.WriteLine($"JWT Duration: {jwtDurationInMinutes} minutes");
                Console.WriteLine($"JWT Secret Length: {jwtSecret.Length} characters");

                // Create claims for the token
                var claims = new[]
                {
                    new Claim(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
                    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                    new Claim(ClaimTypes.Name, user.Username),
                    new Claim("userId", user.UserId.ToString())
                };

                // Create the signing key
                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
                var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

                // Create the token
                var token = new JwtSecurityToken(
                    issuer: jwtIssuer,
                    audience: jwtAudience,
                    claims: claims,
                    expires: DateTime.UtcNow.AddMinutes(jwtDurationInMinutes),
                    signingCredentials: creds
                );

                // Generate the token string
                var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
                Console.WriteLine($"Token generated successfully. First 20 chars: {tokenString.Substring(0, Math.Min(20, tokenString.Length))}...");
                
                return tokenString;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error generating JWT token: {ex.Message}");
                throw; // Rethrow to let the caller handle it
            }
        }
    }
}
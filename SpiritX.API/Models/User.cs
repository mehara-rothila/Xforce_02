// File path: SpiritX.API/Models/User.cs

using System;
using System.Collections.Generic;

namespace SpiritX.API.Models
{
    public class User
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public int Budget { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsAdmin { get; set; }
        
        public ICollection<Team> Teams { get; set; } = new List<Team>();
    }
}
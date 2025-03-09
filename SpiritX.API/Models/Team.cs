using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SpiritX.API.Models
{
    public class Team
    {
        public Team()
        {
            // Initialize collections and properties
            TeamPlayers = new List<TeamPlayer>();
            TeamName = "My Team";
        }
        
        [Key]
        public int TeamId { get; set; }
        
        [Required]
        public int UserId { get; set; }
        
        public string TeamName { get; set; }
        
        public int TotalPoints { get; set; } = 0;
        
        [ForeignKey("UserId")]
        public virtual User User { get; set; }
        
        public virtual ICollection<TeamPlayer> TeamPlayers { get; set; }
    }
}
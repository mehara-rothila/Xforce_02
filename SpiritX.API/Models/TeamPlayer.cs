using System.ComponentModel.DataAnnotations.Schema;

namespace SpiritX.API.Models
{
    public class TeamPlayer
    {
        public int TeamId { get; set; }
        public int PlayerId { get; set; }
        
        [ForeignKey("TeamId")]
        public virtual Team Team { get; set; }
        
        [ForeignKey("PlayerId")]
        public virtual Player Player { get; set; }
    }
}
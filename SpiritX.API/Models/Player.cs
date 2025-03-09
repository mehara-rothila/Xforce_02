using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SpiritX.API.Models
{
    public class Player
    {
        [Key]
        [Column("player_id")]
        public int PlayerId { get; set; }
        
        [Required]
        [Column("name")]
        public string Name { get; set; } = "";
        
        [Required]
        [Column("university")]
        public string University { get; set; } = "";
        
        [Required]
        [Column("category")]
        public string Category { get; set; } = "";
        
        [Column("total_runs")]
        public int TotalRuns { get; set; }
        
        [Column("balls_faced")]
        public int BallsFaced { get; set; }
        
        [Column("innings_played")]
        public int InningsPlayed { get; set; }
        
        [Column("wickets")]
        public int Wickets { get; set; }
        
        [Column("overs_bowled")]
        public int OversBowled { get; set; }
        
        [Column("runs_conceded")]
        public int RunsConceded { get; set; }
        
        [NotMapped]
        public double BattingStrikeRate { get; private set; }
        
        [NotMapped]
        public double BattingAverage { get; private set; }
        
        [NotMapped]
        // Make BowlingStrikeRate nullable to represent "undefined"
        public double? BowlingStrikeRate { get; private set; }
        
        [NotMapped]
        // Make EconomyRate nullable to represent "undefined"
        public double? EconomyRate { get; private set; }
        
        // Keep Points private but accessible for internal calculations
        [NotMapped]
        private double Points { get; set; }
        
        [NotMapped]
        public int PlayerValue { get; private set; }
        
        public void CalculateStats()
        {
            // Calculate batting statistics
            BattingStrikeRate = BallsFaced > 0 ? (TotalRuns * 100.0) / BallsFaced : 0;
            BattingAverage = InningsPlayed > 0 ? TotalRuns / (double)InningsPlayed : 0;
            
            // Calculate bowling statistics with proper undefined handling
            double ballsBowled = OversBowled * 6.0;
            
            // Set BowlingStrikeRate to null when Wickets = 0 (undefined)
            BowlingStrikeRate = Wickets > 0 ? ballsBowled / Wickets : null;
            
            // Set EconomyRate to null when no balls bowled (undefined)
            EconomyRate = ballsBowled > 0 ? (RunsConceded / ballsBowled) * 6.0 : null;
            
            // Calculate points using the correct formula with proper undefined handling
            double battingComponent = (BattingStrikeRate / 5.0) + (BattingAverage * 0.8);
            
            double bowlingComponent = 0;
            
            // Per instructions: if BowlingStrikeRate is undefined (null), that part is 0
            if (BowlingStrikeRate.HasValue)
            {
                bowlingComponent += 500.0 / BowlingStrikeRate.Value;
            }
            
            // Add Economy Rate component if defined
            if (EconomyRate.HasValue)
            {
                bowlingComponent += 140.0 / EconomyRate.Value;
            }
            
            Points = battingComponent + bowlingComponent;
            
            // CORRECTED: Calculate player value using the original formula
            double rawValue = (9.0 * Points + 100.0) * 1000.0;
            PlayerValue = (int)(Math.Round(rawValue / 50000.0) * 50000.0);
            
            // Debug output
            Console.WriteLine($"Player: {Name}, Points: {Points}, Raw Value: {rawValue}, Value: {PlayerValue}");
        }
        
        // Accessor method for internal use only (not exposed via API)
        internal double GetPoints()
        {
            return Points;
        }
        
        // Helper method to get display value for nullable statistics
        public string GetBowlingStrikeRateDisplay()
        {
            return BowlingStrikeRate.HasValue ? BowlingStrikeRate.Value.ToString("F2") : "Undefined";
        }
        
        // Helper method to get display value for Economy Rate
        public string GetEconomyRateDisplay()
        {
            return EconomyRate.HasValue ? EconomyRate.Value.ToString("F2") : "Undefined";
        }
    }
}
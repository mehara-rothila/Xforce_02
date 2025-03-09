using Microsoft.EntityFrameworkCore;
using SpiritX.API.Models;

namespace SpiritX.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }
        
        public DbSet<Player> Players { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Team> Teams { get; set; }
        public DbSet<TeamPlayer> TeamPlayers { get; set; }
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Configure TeamPlayer composite key
            modelBuilder.Entity<TeamPlayer>()
                .HasKey(tp => new { tp.TeamId, tp.PlayerId });
                
            // Configure relationships
            modelBuilder.Entity<TeamPlayer>()
                .HasOne(tp => tp.Team)
                .WithMany(t => t.TeamPlayers)
                .HasForeignKey(tp => tp.TeamId);
                
            modelBuilder.Entity<TeamPlayer>()
                .HasOne(tp => tp.Player)
                .WithMany()
                .HasForeignKey(tp => tp.PlayerId);
            
            // Set table names
            modelBuilder.Entity<Player>().ToTable("players");
            modelBuilder.Entity<User>().ToTable("users");
            modelBuilder.Entity<Team>().ToTable("teams");
            modelBuilder.Entity<TeamPlayer>().ToTable("team_players");
            
            base.OnModelCreating(modelBuilder);
        }
    }
}
// File path: SpiritX.API/Services/PlayerStatsService.cs

using Microsoft.AspNetCore.SignalR;
using SpiritX.API.Hubs;
using System.Threading.Tasks;

namespace SpiritX.API.Services
{
    public class PlayerStatsService
    {
        private readonly IHubContext<PlayerStatsHub> _hubContext;
        
        public PlayerStatsService(IHubContext<PlayerStatsHub> hubContext)
        {
            _hubContext = hubContext;
        }
        
        /// <summary>
        /// Notify clients that a specific player has been updated
        /// </summary>
        /// <param name="playerId">The ID of the updated player</param>
        public async Task NotifyPlayerUpdated(int playerId)
        {
            await _hubContext.Clients.All.SendAsync("PlayerUpdated", playerId);
        }
        
        /// <summary>
        /// Notify clients that the players list has been updated (new player added, deleted etc.)
        /// </summary>
        public async Task NotifyPlayersListUpdated()
        {
            await _hubContext.Clients.All.SendAsync("PlayersListUpdated");
        }
        
        /// <summary>
        /// Notify clients that overall tournament statistics have been updated
        /// </summary>
        public async Task NotifyStatsUpdated()
        {
            await _hubContext.Clients.All.SendAsync("StatsUpdated");
        }
        
        /// <summary>
        /// Notify a specific group about an update
        /// </summary>
        /// <param name="group">The group name</param>
        /// <param name="message">The message type</param>
        /// <param name="data">Optional data to send</param>
        public async Task NotifyGroup(string group, string message, object? data = null)
        {
            if (data != null)
            {
                await _hubContext.Clients.Group(group).SendAsync(message, data);
            }
            else
            {
                await _hubContext.Clients.Group(group).SendAsync(message);
            }
        }
    }
}
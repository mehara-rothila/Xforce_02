// File path: SpiritX.API/Hubs/PlayerStatsHub.cs

using Microsoft.AspNetCore.SignalR;
using System;
using System.Threading.Tasks;

namespace SpiritX.API.Hubs
{
    public class PlayerStatsHub : Hub
    {
        // Method to allow clients to join a specific group
        public async Task JoinGroup(string group)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, group);
        }
        
        // Method to allow clients to leave a specific group
        public async Task LeaveGroup(string group)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, group);
        }

        // Called when connection is established
        public override async Task OnConnectedAsync()
        {
            await base.OnConnectedAsync();
        }

        // Called when connection is closed
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await base.OnDisconnectedAsync(exception);
        }
    }
}
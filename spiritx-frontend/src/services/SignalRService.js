// File path: spiritx-frontend/src/services/SignalRService.js

import * as signalR from '@microsoft/signalr';

class SignalRService {
    constructor() {
        this.connection = null;
        this.callbacks = {
            playerUpdated: [],
            playersListUpdated: [],
            statsUpdated: []
        };
    }

    // Initialize the SignalR connection
    async start() {
        try {
            // Create the connection if it doesn't exist
            if (!this.connection) {
                this.connection = new signalR.HubConnectionBuilder()
                    .withUrl('http://localhost:5234/playerStatsHub')
                    .withAutomaticReconnect()
                    .build();

                // Set up event handlers
                this.connection.on('PlayerUpdated', (playerId) => {
                    this.callbacks.playerUpdated.forEach(callback => callback(playerId));
                });

                this.connection.on('PlayersListUpdated', () => {
                    this.callbacks.playersListUpdated.forEach(callback => callback());
                });

                this.connection.on('StatsUpdated', () => {
                    this.callbacks.statsUpdated.forEach(callback => callback());
                });
            }

            // Start the connection if it's disconnected
            if (this.connection.state === signalR.HubConnectionState.Disconnected) {
                await this.connection.start();
                console.log('SignalR connection established');
            }

            return true;
        } catch (error) {
            console.error('Error starting SignalR connection:', error);
            return false;
        }
    }

    // Stop the SignalR connection
    async stop() {
        if (this.connection) {
            await this.connection.stop();
            console.log('SignalR connection stopped');
        }
    }

    // Subscribe to player updates
    onPlayerUpdated(callback) {
        this.start();
        this.callbacks.playerUpdated.push(callback);
        return () => {
            this.callbacks.playerUpdated = this.callbacks.playerUpdated.filter(cb => cb !== callback);
        };
    }

    // Subscribe to players list updates
    onPlayersListUpdated(callback) {
        this.start();
        this.callbacks.playersListUpdated.push(callback);
        return () => {
            this.callbacks.playersListUpdated = this.callbacks.playersListUpdated.filter(cb => cb !== callback);
        };
    }

    // Subscribe to stats updates
    onStatsUpdated(callback) {
        this.start();
        this.callbacks.statsUpdated.push(callback);
        return () => {
            this.callbacks.statsUpdated = this.callbacks.statsUpdated.filter(cb => cb !== callback);
        };
    }

    // Join a specific group
    async joinGroup(group) {
        if (await this.start()) {
            await this.connection.invoke('JoinGroup', group);
            console.log(`Joined group: ${group}`);
        }
    }

    // Leave a specific group
    async leaveGroup(group) {
        if (await this.start()) {
            await this.connection.invoke('LeaveGroup', group);
            console.log(`Left group: ${group}`);
        }
    }
}

// Export a singleton instance of the service
export default new SignalRService();
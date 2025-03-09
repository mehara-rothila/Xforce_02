## Sample Data Import

The application comes with a sample dataset (`sample_data.csv`) containing player information for testing. You can import this data using any of the following methods:

### Method 1: Using the Admin Dashboard

1. Log in as an admin user
2. Navigate to the Admin Dashboard
3. Use the "Import Players" form to upload the CSV file
4. Check "Update existing players" if you want to update any matching records

### Method 2: Direct Database Import using SQL

You can also import the data directly into your MySQL database using the following SQL commands:

```sql
-- Create a temporary table to load CSV data
CREATE TEMPORARY TABLE temp_players (
    name VARCHAR(255),
    university VARCHAR(255),
    category VARCHAR(50),
    total_runs INT,
    balls_faced INT,
    innings_played INT,
    wickets INT,
    overs_bowled INT,
    runs_conceded INT
);

-- Load data from CSV file (adjust path as needed)
LOAD DATA INFILE '/path/to/sample_data.csv' 
INTO TABLE temp_players
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"' 
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;  -- Skip header row

-- Insert data from temporary table to actual players table
INSERT INTO players (
    name, university, category, 
    total_runs, balls_faced, innings_played, 
    wickets, overs_bowled, runs_conceded
)
SELECT 
    name, university, category, 
    total_runs, balls_faced, innings_played, 
    wickets, overs_bowled, runs_conceded
FROM temp_players;

-- Drop the temporary table
DROP TEMPORARY TABLE temp_players;
```

### Method 3: Using C# Import Utility

You can use the built-in `CsvImporter` utility to programmatically import the data:

```csharp
// Example code to import players from a CSV file
using (var stream = new FileStream("path/to/sample_data.csv", FileMode.Open))
{
    var players = CsvImporter.ImportPlayers(stream);
    var result = await CsvImporter.ImportPlayersToDatabase(
        players, 
        _connectionString,
        updateExisting: false
    );
    
    Console.WriteLine($"Added: {result.Added}, Updated: {result.Updated}, Skipped: {result.Skipped}");
}
```

### Sample CSV Structure

The CSV file should have the following structure:

```
Name,University,Category,Total Runs,Balls Faced,Innings Played,Wickets,Overs Bowled,Runs Conceded
John Doe,Sample University,Batsman,450,320,10,0,0,0
Jane Smith,Sample University,Bowler,120,150,8,25,60,240
...
```

This data will be used to calculate derived statistics like batting strike rate, bowling economy, etc. using the formulas described in the [Player Points Calculation](#player-points-calculation) section.## Troubleshooting Common Issues

### Backend Issues

1. **Database Connection Problems**
   ```
   Error: Unable to connect to MySQL server
   ```
   - Ensure MySQL is running
   - Verify connection string in `appsettings.json`
   - Check that the database exists: `CREATE DATABASE IF NOT EXISTS spiritx_fantasy;`
   - Make sure the user has appropriate permissions

2. **JWT Authentication Issues**
   ```
   Error: IDX10503: Signature validation failed
   ```
   - Ensure the JWT secret is consistent
   - Check that token expiration is configured correctly
   - Verify Issuer and Audience settings match between token generation and validation

3. **Migration Errors**
   ```
   Error: Build failed
   ```
   - Delete the Migrations folder and recreate:
     ```bash
     dotnet ef migrations remove
     dotnet ef migrations add InitialCreate
     dotnet ef database update
     ```

4. **SignalR Connection Issues**
   - Ensure CORS is properly configured
   - Check that SignalR client URL matches the server URL
   - Verify WebSockets are enabled (if using IIS)

### Frontend Issues

1. **API Connection Problems**
   ```
   Error: Network Error
   ```
   - Check that the backend API is running
   - Verify the API URL in `.env` is correct
   - Ensure CORS is properly configured on the backend

2. **JWT Token Issues**
   ```
   Error: 401 Unauthorized
   ```
   - Clear browser storage and log in again
   - Verify token is being included in requests
   - Check token expiration

3. **React Component Rendering Issues**
   - Check for null or undefined values in props
   - Use optional chaining (`?.`) for nested properties
   - Always provide default values for props

4. **SignalR Connection Problems**
   ```
   Error: Failed to start the connection
   ```
   - Ensure the SignalR hub URL in `.env` is correct
   - Check that the hub is registered in the backend
   - Verify connection setup in frontend services

## Deployment Guidelines

### Backend Deployment

1. **Publish the API**
   ```bash
   dotnet publish -c Release -o ./publish
   ```

2. **Configure Production Settings**
   - Create `appsettings.Production.json` with production-specific settings
   - Secure your JWT secret key
   - Configure production database connection

3. **Host Options**
   - **Azure App Service**:
     - Create new App Service
     - Deploy using Git, GitHub Actions, or Azure DevOps
   
   - **IIS**:
     - Install .NET 8.0 Runtime on server
     - Create new IIS website pointing to the publish folder
     - Configure application pool to use No Managed Code

   - **Docker**:
     - Use the included Dockerfile
     - Build and run:
       ```bash
       docker build -t spiritx-api .
       docker run -p 5234:80 spiritx-api
       ```

### Frontend Deployment

1. **Build for Production**
   ```bash
   npm run build
   ```

2. **Host Options**
   - **Netlify**:
     - Connect to GitHub repository
     - Configure build command: `npm run build`
     - Set publish directory: `build`
     - Add environment variables

   - **Vercel**:
     - Import from Git repository
     - Configure build settings
     - Add environment variables

   - **Static Web Server**:
     - Copy the `build` folder to your web server
     - Configure URL rewrites for SPA routing## Using React Icons and FontAwesome

The project makes extensive use of both React Icons and FontAwesome for icons throughout the UI. Here's how to use them:

### FontAwesome Icons
FontAwesome icons are used through the `@fortawesome/react-fontawesome` package. Example usage:

```jsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUsers, faTrophy, faChartLine, 
  faUserPlus, faUserMinus, faFilter 
} from '@fortawesome/free-solid-svg-icons';

// In your component:
<FontAwesomeIcon icon={faUsers} className="me-2" />
```

### React Icons
React Icons provides a wider range of icon sets. Example usage:

```jsx
import { FaUser, FaLock, FaSignInAlt } from 'react-icons/fa';
// Or other icon sets like:
import { IoMdSettings } from 'react-icons/io';
import { BsGraphUp } from 'react-icons/bs';

// In your component:
<FaUser className="icon-class" />
```

## Common React Component Patterns

### Player Card Component

```jsx
import React from 'react';
import { Card, Badge, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faUserPlus } from '@fortawesome/free-solid-svg-icons';

const PlayerCard = ({ player, onAddPlayer }) => {
  return (
    <Card className="h-100 shadow-sm">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">{player.name}</h5>
      </Card.Header>
      <Card.Body>
        <p className="mb-1">University: {player.university}</p>
        <Badge bg="secondary">{player.category}</Badge>
        <div className="mt-3">
          <p>Runs: {player.totalRuns}</p>
          <p>Wickets: {player.wickets}</p>
          <p>Value: ₹{player.playerValue.toLocaleString()}</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => onAddPlayer(player.playerId)}
        >
          <FontAwesomeIcon icon={faUserPlus} className="me-2" />
          Add to Team
        </Button>
      </Card.Body>
    </Card>
  );
};

export default PlayerCard;
```

### API Service Integration

```jsx
// In api.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5234/api';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Usage in components
export const getAllPlayers = (category = '') => {
  return axiosInstance.get(`/players${category ? `?category=${category}` : ''}`);
};
```

### SignalR Integration

```jsx
// In SignalRService.js
import * as signalR from '@microsoft/signalr';

class SignalRService {
  constructor() {
    this.connection = null;
    this.callbacks = {
      playerUpdated: [],
      statsUpdated: []
    };
  }

  async start() {
    if (!this.connection) {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(process.env.REACT_APP_SIGNALR_HUB)
        .withAutomaticReconnect()
        .build();

      this.connection.on('PlayerUpdated', (playerId) => {
        this.callbacks.playerUpdated.forEach(callback => callback(playerId));
      });
    }

    if (this.connection.state === signalR.HubConnectionState.Disconnected) {
      await this.connection.start();
    }
  }

  onPlayerUpdated(callback) {
    this.callbacks.playerUpdated.push(callback);
    return () => {
      this.callbacks.playerUpdated = this.callbacks.playerUpdated.filter(cb => cb !== callback);
    };
  }
}

export default new SignalRService();
```# SpiritX Fantasy Cricket

SpiritX is a fantasy cricket platform where users can build dream teams using real university cricket players, compete with others, and track their performance on a leaderboard. The application includes an AI-powered chatbot (Spiriter) to provide recommendations and assistance.

## Table of Contents

- [System Requirements](#system-requirements)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Getting Started](#getting-started)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Environment Files](#environment-files)
- [Player Points Calculation](#player-points-calculation)
- [Security Measures](#security-measures)
- [API Documentation](#api-documentation)
- [License](#license)

## System Requirements

- .NET 8.0 SDK
- Node.js v16+
- MySQL 8.0+
- React 19.0+

## Technology Stack

### Backend
- **.NET 8.0** - Core framework
- **Entity Framework Core** - ORM for database operations
- **MySQL** - Database
- **JWT Authentication** - For secure user authentication
- **BCrypt.Net-Next** - For password hashing
- **Swagger** - API documentation
- **CsvHelper** - For CSV import functionality
- **SignalR** - For real-time updates

### Frontend
- **React 19.0+** - UI library
- **React Router v7** - For navigation
- **Axios** - For API requests
- **React Bootstrap** - UI components
- **FontAwesome** - Icons
- **Chart.js** - For data visualization
- **Microsoft SignalR Client** - For real-time updates

## Project Structure

### Backend (`SpiritX.API`)

```
SpiritX.API/
  |- Controllers/              # API Controllers
  |   |- AdminController.cs    # Admin operations (import players, manage players, view stats)
  |   |- AuthController.cs     # Authentication (login, register)
  |   |- ChatbotController.cs  # AI chatbot (Spiriter)
  |   |- LeaderboardController.cs # Leaderboard operations
  |   |- PlayersController.cs  # Player data operations
  |   |- TeamsController.cs    # Team management
  |
  |- Models/                   # Entity models
  |   |- Player.cs             # Player entity with points calculation logic
  |   |- Team.cs               # Team entity
  |   |- TeamPlayer.cs         # Junction entity for Team-Player relationship
  |   |- User.cs               # User entity with admin flag
  |
  |- Data/                     # Database context
  |   |- AppDbContext.cs       # EF Core DbContext
  |
  |- Utilities/                # Helper classes
  |   |- CsvImporter.cs        # CSV import utility
  |   |- JwtHelper.cs          # JWT token generation
  |
  |- Hubs/                     # SignalR Hubs
  |   |- PlayerStatsHub.cs     # Real-time updates for player statistics
  |
  |- Services/                 # Service classes
  |   |- PlayerStatsService.cs # Service for player statistics updates
  |
  |- Migrations/               # Database migrations
  |   |- 20250308030613_InitialCreate.cs
  |   |- 20250309022222_AddAdminFlag.cs
  |   |- 20250309023454_AddIsAdminColumn.cs
  |   |- 20250309023856_AddAdminRoleToUsers.cs
  |
  |- Program.cs                # Application startup and configuration
  |- appsettings.json          # Application settings
  |- appsettings.Development.json # Development-specific settings
  |- SpiritX.API.csproj        # Project file with dependencies
```

### Frontend (`spiritx-frontend`)

```
spiritx-frontend/
  |- public/                   # Static assets
  |   |- index.html            # Main HTML file
  |   |- favicon.ico           # Site favicon
  |   |- manifest.json         # Web app manifest
  |
  |- src/                      # Source code
  |   |- components/           # Reusable components
  |   |   |- ChatbotInterface.js  # Chatbot UI component
  |   |   |- Header.js            # Navigation header component
  |   |   |- PlayerCard.js        # Player display card component
  |   |
  |   |- pages/                # Page components
  |   |   |- Admin.js            # Admin dashboard page
  |   |   |- Chatbot.js          # Chatbot page
  |   |   |- Leaderboard.js      # Leaderboard page
  |   |   |- Login.js            # Login page
  |   |   |- Players.js          # Players listing page
  |   |   |- Register.js         # Registration page
  |   |   |- Team.js             # Team management page
  |   |   |- PlayerManagement.js # Player CRUD operations page
  |   |   |- TournamentSummary.js # Tournament statistics and analysis page
  |   |
  |   |- services/             # API services
  |   |   |- api.js              # API client with Axios
  |   |   |- SignalRService.js   # SignalR client for real-time updates
  |   |
  |   |- App.js                # Main application component
  |   |- App.css               # Global styles
  |   |- index.js              # Application entry point
  |   |- setupTests.js         # Test setup configuration
  |
  |- package.json              # NPM dependencies
  |- package-lock.json         # Locked dependencies
  |- .env                      # Environment variables
  |- .gitignore                # Git ignore file
  |- README.md                 # Frontend README
```

### Database Schema

```
players
  |- player_id (PK) - Auto-increment ID
  |- name - Player name
  |- university - University name
  |- category - Player category (Batsman, Bowler, All-Rounder)
  |- total_runs - Total runs scored
  |- balls_faced - Total balls faced
  |- innings_played - Number of innings played
  |- wickets - Total wickets taken
  |- overs_bowled - Total overs bowled
  |- runs_conceded - Total runs conceded

users
  |- user_id (PK) - Auto-increment ID
  |- username - Unique username
  |- password - Hashed password
  |- budget - Available budget (default: 9,000,000)
  |- created_at - Account creation timestamp
  |- is_admin - Boolean flag indicating admin privileges

teams
  |- team_id (PK) - Auto-increment ID
  |- user_id (FK) - References users.user_id
  |- team_name - Team name (default: "My Team")
  |- total_points - Sum of player points

team_players
  |- team_id (PK, FK) - References teams.team_id
  |- player_id (PK, FK) - References players.player_id
```

## Key Features

### 1. Player Management
- Import players from CSV
- Advanced filtering and search capabilities
- Complete CRUD operations for player management
- Detailed statistics for each player
- Category-based player filtering (Batsman, Bowler, All-Rounder)

### 2. Team Building
- Create fantasy cricket teams
- Add/remove players with budget constraints
- Real-time stat updates via SignalR
- Team composition analysis
- Maximum of 11 players per team
- Budget management system (starting budget of ₹9,000,000)

### 3. Leaderboard
- Real-time ranking of teams
- Performance metrics visualization
- Teams must have exactly 11 players to be ranked
- Current user's team highlighting
- Search functionality for finding specific users

### 4. AI Assistant (Spiriter)
- Player recommendations based on statistics
- Stat analysis using Gemini AI integration
- Team composition advice
- Tournament insights
- Natural language query processing

### 5. Admin Dashboard
- CSV import/export functionality
- Tournament statistics with detailed metrics
- Player management interface
- System metrics (users, teams, players)
- Top performer highlights

### 6. Player Points Restriction
- Player points are completely hidden from both admin and regular users
- Points are still calculated internally for proper player valuation and team ranking
- All UI elements that would display points have been removed
- API responses never include point values

### 7. Security Features
- JWT authentication
- Password hashing using BCrypt
- Role-based authorization (admin/user)
- Input validation and sanitization
- Protected API endpoints

### 8. Responsive UI
- Mobile-friendly design
- Bootstrap-based responsive layout
- Interactive player cards
- Dynamic data visualization
- Real-time updates without page refresh

## Detailed Installation Guide

### Backend Requirements and Setup

1. Install .NET SDK 8.0
   - Download from [https://dotnet.microsoft.com/download/dotnet/8.0](https://dotnet.microsoft.com/download/dotnet/8.0)
   - Verify installation: `dotnet --version` (should show 8.0.x)

2. Install MySQL 8.0+
   - Download from [https://dev.mysql.com/downloads/mysql/](https://dev.mysql.com/downloads/mysql/)
   - Setup a new database named `spiritx_fantasy`

3. Clone the repository
   ```bash
   git clone https://github.com/yourusername/spiritx.git
   cd spiritx/SpiritX.API
   ```

4. Install required NuGet packages (run these commands in the SpiritX.API directory):
   ```bash
   # Entity Framework and MySQL Provider
   dotnet add package Microsoft.EntityFrameworkCore --version 8.0.2
   dotnet add package Microsoft.EntityFrameworkCore.Tools --version 8.0.2
   dotnet add package Pomelo.EntityFrameworkCore.MySql --version 8.0.0

   # Authentication and Security
   dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer --version 8.0.2
   dotnet add package BCrypt.Net-Next --version 4.0.3

   # API Documentation
   dotnet add package Swashbuckle.AspNetCore --version 6.5.0

   # Data Processing
   dotnet add package CsvHelper --version 30.0.1
   dotnet add package MySql.Data --version 8.3.0

   # Real-time Communication
   dotnet add package Microsoft.AspNetCore.SignalR --version 1.1.0
   ```

   Alternatively, you can use the included `.csproj` file which has all dependencies:
   ```bash
   dotnet restore
   ```

5. Configure `appsettings.json` - Create this file in the project root:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Server=localhost;Database=spiritx_fantasy;User=root;Password=your_password;Convert Zero Datetime=True;AllowZeroDateTime=True;"
     },
     "Logging": {
       "LogLevel": {
         "Default": "Information",
         "Microsoft": "Warning",
         "Microsoft.Hosting.Lifetime": "Information",
         "Microsoft.EntityFrameworkCore.Database.Command": "Information"
       }
     },
     "AllowedHosts": "*",
     "Jwt": {
       "Secret": "^N8>4}K2(1tIQC*sc(}b>)ZFC9Xk5!rymt=f5Q<k,/-NWsg%G]g7[rBtWJ3w4QZv",
       "Issuer": "SpiritX",
       "Audience": "SpiritXUsers",
       "ExpiryInMinutes": 60
     },
     "Cors": {
       "AllowedOrigins": [
         "http://localhost:3000"
       ]
     },
     "GeminiAPI": {
       "Key": "YOUR_GEMINI_API_KEY"
     }
   }
   ```

6. Create `appsettings.Development.json` for development-specific settings:
   ```json
   {
     "Logging": {
       "LogLevel": {
         "Default": "Debug",
         "Microsoft": "Information",
         "Microsoft.Hosting.Lifetime": "Information",
         "Microsoft.EntityFrameworkCore.Database.Command": "Information"
       }
     },
     "DetailedErrors": true
   }
   ```

7. Apply database migrations
   ```bash
   dotnet ef database update
   ```

8. Run the project
   ```bash
   dotnet run
   ```

9. The API will be accessible at `http://localhost:5234`

### Frontend Requirements and Setup

1. Install Node.js (v16+) and npm
   - Download from [https://nodejs.org/](https://nodejs.org/)
   - Verify installation: `node --version` and `npm --version`

2. Navigate to the frontend directory
   ```bash
   cd spiritx/spiritx-frontend
   ```

3. Install all required NPM packages:
   ```bash
   # Core React packages
   npm install react@19.0.0 react-dom@19.0.0 react-scripts@5.0.1

   # Routing
   npm install react-router-dom@7.3.0

   # UI components
   npm install bootstrap@5.3.3 react-bootstrap@2.10.9 styled-components@6.1.15

   # Icons and UI elements
   npm install @fortawesome/react-fontawesome@0.2.2 @fortawesome/free-solid-svg-icons@6.7.2
   npm install react-icons@5.5.0

   # HTTP requests
   npm install axios@1.8.2

   # Real-time updates with SignalR
   npm install @microsoft/signalr@8.0.7

   # Charts and data visualization
   npm install chart.js@4.4.8 react-chartjs-2@5.3.0

   # Testing libraries
   npm install @testing-library/jest-dom@6.6.3 @testing-library/react@16.2.0 
   npm install @testing-library/user-event@13.5.0 @testing-library/dom@10.4.0

   # Performance measurement
   npm install web-vitals@2.1.4
   ```

   Alternatively, you can install all dependencies at once using the package.json:
   ```bash
   npm install
   ```

4. Create `.env` file in the root of the frontend project:
   ```
   # API Endpoint
   REACT_APP_API_URL=http://localhost:5234/api

   # SignalR Hub
   REACT_APP_SIGNALR_HUB=http://localhost:5234/playerStatsHub

   # Default Budget
   REACT_APP_DEFAULT_BUDGET=9000000

   # Team Size Limit
   REACT_APP_TEAM_SIZE_LIMIT=11

   # Application Version
   REACT_APP_VERSION=1.0.0

   # Enable/Disable Debug Mode (true/false)
   REACT_APP_DEBUG=false
   ```

5. Start the development server
   ```bash
   npm start
   ```

6. The application will be accessible at `http://localhost:3000`

### Working with SignalR for Real-time Updates

SignalR is used for real-time updates in the application. Here's how it's configured:

1. Backend Setup (already included in the installation steps):
   - Install the SignalR package: `dotnet add package Microsoft.AspNetCore.SignalR`
   - Configure SignalR in `Program.cs`
   
2. Frontend Setup (already included in the installation steps):
   - Install the SignalR client: `npm install @microsoft/signalr@8.0.7`
   - Use the SignalRService.js to connect to the hub

3. How to use SignalR in your components:
   ```javascript
   import SignalRService from '../services/SignalRService';

   // Subscribe to updates in your component
   useEffect(() => {
     // Start the connection if not already started
     SignalRService.start();

     // Subscribe to an event
     const unsubscribe = SignalRService.onPlayersListUpdated(() => {
       // Handle the update, e.g., refresh data
       fetchData();
     });

     // Clean up when component unmounts
     return () => {
       unsubscribe();
     };
   }, []);
   ```

### Environment Files

#### Backend (`appsettings.json`)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=spiritx_fantasy;User=root;Password=;Convert Zero Datetime=True;AllowZeroDateTime=True;"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft": "Warning",
      "Microsoft.Hosting.Lifetime": "Information"
    }
  },
  "AllowedHosts": "*",
  "Jwt": {
    "Secret": "^N8>4}K2(1tIQC*sc(}b>)ZFC9Xk5!rymt=f5Q<k,/-NWsg%G]g7[rBtWJ3w4QZv",
    "Issuer": "SpiritX",
    "Audience": "SpiritXUsers",
    "ExpiryInMinutes": 60
  },
  "GeminiAPI": {
    "Key": "YOUR_GEMINI_API_KEY"
  }
}
```

#### Frontend (`.env`)
Create this file in the root of the frontend project:
```
# API Endpoint
REACT_APP_API_URL=http://localhost:5234/api

# SignalR Hub
REACT_APP_SIGNALR_HUB=http://localhost:5234/playerStatsHub

# Default Budget
REACT_APP_DEFAULT_BUDGET=9000000

# Team Size Limit
REACT_APP_TEAM_SIZE_LIMIT=11

# Application Version
REACT_APP_VERSION=1.0.0

# Enable/Disable Debug Mode (true/false)
REACT_APP_DEBUG=false
```

#### Package.json
Here is the complete `package.json` file for reference:
```json
{
  "name": "spiritx-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@fortawesome/free-solid-svg-icons": "^6.7.2",
    "@fortawesome/react-fontawesome": "^0.2.2",
    "@microsoft/signalr": "^8.0.7",
    "@testing-library/dom": "^10.4.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.2.0",
    "@testing-library/user-event": "^13.5.0",
    "axios": "^1.8.2",
    "bootstrap": "^5.3.3",
    "chart.js": "^4.4.8",
    "react": "^19.0.0",
    "react-bootstrap": "^2.10.9",
    "react-chartjs-2": "^5.3.0",
    "react-dom": "^19.0.0",
    "react-icons": "^5.5.0",
    "react-router-dom": "^7.3.0",
    "react-scripts": "5.0.1",
    "styled-components": "^6.1.15",
    "web-vitals": "^2.1.4"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
```

## Player Points Calculation

The player points are calculated using the following formula (but never shown to users):
```
points = ((batting_strike_rate / 5) + (batting_average * 0.8)) + 
         ((500 / (bowling_strike_rate + 0.1)) + (140 / (economy_rate + 0.1)))
```

Key components of the formula:
- Batting Strike Rate = (Total Runs / Balls Faced) * 100
- Batting Average = Total Runs / Innings Played
- Bowling Strike Rate = (Overs Bowled * 6) / Wickets
- Economy Rate = Runs Conceded / Overs Bowled

For players with 0 wickets, a default bowling strike rate of 0.1 is used to avoid division by zero.
For players with 0 overs bowled, a default economy rate of 0.1 is used to avoid division by zero.

## Player Value Calculation

The player value is calculated using the following formula:
```
value = (9 * Points + 100) * 1000
```

This value is then rounded to the nearest multiple of 50,000 to get the final player value in Rupees.

## Security Measures

1. **Password Security**: 
   - Passwords are hashed using BCrypt
   - Passwords are never sent or stored in plain text

2. **JWT Security**:
   - Tokens are signed with a strong secret key
   - Token expiration is enforced
   - Tokens include only necessary claims

3. **Input Validation**:
   - All user inputs are validated on both frontend and backend
   - SQL parameters are used to prevent SQL injection

4. **Error Handling**:
   - Detailed errors are logged on the server
   - Generic error messages are returned to clients to avoid information leakage
   
5. **Data Protection**:
   - Player points are kept private and never exposed to users
   - Sensitive data is not exposed through API responses

## API Documentation

When the application is running, you can access the Swagger documentation at:
```
http://localhost:5234/swagger
```

### Main API Endpoints

#### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive JWT token

#### Players
- `GET /api/players` - Get all players (with optional category filter)
- `GET /api/players/{id}` - Get player by ID

#### Teams
- `GET /api/teams` - Get current user's team
- `POST /api/teams/addPlayer` - Add player to team
- `POST /api/teams/removePlayer` - Remove player from team

#### Leaderboard
- `GET /api/leaderboard` - Get leaderboard data

#### Chatbot
- `POST /api/chatbot/query` - Send query to Spiriter chatbot

#### Admin
- `GET /api/admin/stats` - Get system statistics
- `POST /api/admin/importPlayers` - Import players from CSV
- `DELETE /api/admin/clearPlayers` - Clear all players
- `GET /api/admin/tournamentSummary` - Get tournament statistics

## License

This project is licensed under the MIT License - see the LICENSE file for details.

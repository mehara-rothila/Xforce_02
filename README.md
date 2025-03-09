# SpiritX Fantasy Cricket

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

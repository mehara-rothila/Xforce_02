import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Components
import Header from './components/Header';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Players from './pages/Players';
import Team from './pages/Team';
import Leaderboard from './pages/Leaderboard';
import Chatbot from './pages/Chatbot';
import Admin from './pages/Admin';
import PlayerManagement from './pages/PlayerManagement';
import TournamentSummary from './pages/TournamentSummary'; // Add this import

// Services
import { logout, isAuthenticated } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);
  
  const handleLogin = (userData) => {
    setUser(userData);
  };
  
  const handleLogout = () => {
    logout();
    setUser(null);
    // Redirect to login page after logout
    window.location.href = '/login';
  };
  
  // Enhanced Protected route component that checks for valid token
  const ProtectedRoute = ({ children }) => {
    // Use isAuthenticated to check for a valid token instead of just checking user state
    if (!isAuthenticated()) {
      return <Navigate to="/login" />;
    }
    return children;
  };
  
  return (
    <Router>
      <div className="d-flex flex-column min-vh-100">
        <Header isLoggedIn={isAuthenticated()} onLogout={handleLogout} />
        
        <main className="flex-grow-1 bg-light">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={
              isAuthenticated() ? <Navigate to="/team" replace /> : <Login onLogin={handleLogin} />
            } />
            
            <Route path="/register" element={
              isAuthenticated() ? <Navigate to="/team" replace /> : <Register />
            } />
            
            {/* Protected routes */}
            <Route path="/players" element={
              <ProtectedRoute>
                <Players />
              </ProtectedRoute>
            } />
            
            <Route path="/team" element={
              <ProtectedRoute>
                <Team />
              </ProtectedRoute>
            } />
            
            <Route path="/leaderboard" element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            } />
            
            <Route path="/chatbot" element={
              <ProtectedRoute>
                <Chatbot />
              </ProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } />
            
            {/* New route for Player Management */}
            <Route path="/admin/players" element={
              <ProtectedRoute>
                <PlayerManagement />
              </ProtectedRoute>
            } />
            
            {/* Add route for Tournament Summary */}
            <Route path="/admin/tournament" element={
              <ProtectedRoute>
                <TournamentSummary />
              </ProtectedRoute>
            } />
            
            {/* Redirect root path to team page if authenticated, otherwise to login */}
            <Route path="/" element={
              isAuthenticated() ? <Navigate to="/team" replace /> : <Navigate to="/login" replace />
            } />
          </Routes>
        </main>
        
        <footer className="bg-dark text-white py-3 text-center">
          <Container>
            <p className="mb-0">SpiritX Fantasy Cricket &copy; 2025</p>
          </Container>
        </footer>
      </div>
    </Router>
  );
}

export default App;
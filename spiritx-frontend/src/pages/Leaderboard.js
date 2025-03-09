// Leaderboard.js
import React, { useState, useEffect } from 'react';
import { Container, Table, Card, Badge, Spinner, Alert, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faMedal, faAward, faSyncAlt, faUsers, faSearch } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { isAdmin } from '../services/api';

const API_URL = 'http://localhost:5234/api';

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [currentUserTeam, setCurrentUserTeam] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Check if user is admin
  const userIsAdmin = isAdmin();

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setLoading(false);
        return;
      }
      
      const response = await axios.get(`${API_URL}/leaderboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log("Leaderboard response:", response.data);
      
      // Filter the data to get ranked teams (rank > 0)
      const rankedData = response.data.filter(entry => entry.rank > 0);
      
      // Get current user's team if it exists (rank = 0)
      const userTeam = response.data.find(entry => entry.rank === 0);
      if (userTeam) {
        setCurrentUserTeam(userTeam);
      }
      
      setLeaderboardData(rankedData);
      
      // Find current user rank
      const currentUsername = localStorage.getItem('username');
      const userEntry = rankedData.find(entry => entry.username === currentUsername);
      if (userEntry) {
        setCurrentUserRank(userEntry.rank);
      }
      
      setError('');
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      
      if (err.response && err.response.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else {
        setError('Failed to load leaderboard data. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <FontAwesomeIcon icon={faTrophy} className="text-warning" />;
      case 2:
        return <FontAwesomeIcon icon={faMedal} className="text-secondary" />;
      case 3:
        return <FontAwesomeIcon icon={faAward} className="text-danger" />;
      default:
        return rank;
    }
  };

  const getUsernameWithHighlight = (entry) => {
    const isCurrentUser = entry.username === localStorage.getItem('username');
    return (
      <span className={isCurrentUser ? "fw-bold text-primary" : ""}>
        {entry.username}
        {isCurrentUser && <span className="ms-2">(You)</span>}
      </span>
    );
  };

  const filteredLeaderboard = leaderboardData.filter(entry =>
    entry.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.teamName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !refreshing) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading leaderboard data...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">Leaderboard</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FontAwesomeIcon icon={faTrophy} className="me-2" />
            <h5 className="mb-0">Fantasy Cricket Rankings</h5>
          </div>
          <div className="d-flex">
            <div className="input-group me-2">
              <span className="input-group-text">
                <FontAwesomeIcon icon={faSearch} />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search user or team..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="light"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <FontAwesomeIcon icon={faSyncAlt} spin={refreshing} />
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead>
                <tr>
                  <th width="10%">Rank</th>
                  <th width="25%">User</th>
                  <th width="40%">Team Name</th>
                  <th width="25%">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaderboard.length > 0 ? (
                  filteredLeaderboard.map(entry => (
                    <tr key={entry.teamId} className={entry.rank === currentUserRank ? "table-primary" : ""}>
                      <td className="text-center align-middle">
                        {getRankIcon(entry.rank)}
                      </td>
                      <td className="align-middle">
                        {getUsernameWithHighlight(entry)}
                      </td>
                      <td className="align-middle">{entry.teamName}</td>
                      <td className="align-middle">
                        <Badge bg={entry.rank === 1 ? "warning" : "secondary"}>
                          {entry.rank === 1 ? "Top Ranked" : `Rank ${entry.rank}`}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-4">
                      {searchTerm ? (
                        <div>
                          <FontAwesomeIcon icon={faSearch} className="mb-2 text-muted" size="lg" />
                          <p className="mb-0">No users or teams found matching '{searchTerm}'</p>
                        </div>
                      ) : (
                        <div>
                          <FontAwesomeIcon icon={faUsers} className="mb-2 text-muted" size="lg" />
                          <p className="mb-0">No complete teams on the leaderboard yet. A team must have exactly 11 players to appear.</p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
                
                {/* Display current user's incomplete team if not already on the leaderboard */}
                {currentUserTeam && !currentUserRank && (
                  <tr className="table-secondary">
                    <td className="text-center align-middle">
                      -
                    </td>
                    <td className="align-middle">
                      <span className="fw-bold">{currentUserTeam.username} (You)</span>
                    </td>
                    <td className="align-middle">{currentUserTeam.teamName}</td>
                    <td className="align-middle">
                      <Badge bg="info">
                        Incomplete ({currentUserTeam.playersCount}/11 players)
                      </Badge>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
        <Card.Footer className="bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <span>
              <small className="text-muted">
                Total Teams: {leaderboardData.length}
              </small>
            </span>
            <span>
              {currentUserRank ? (
                <small>
                  Your Rank: <strong>{currentUserRank}</strong> of {leaderboardData.length}
                </small>
              ) : (
                <small className="text-muted">
                  {currentUserTeam ? 
                    `Complete your team (${currentUserTeam.playersCount}/11 players) to appear on the leaderboard` : 
                    'Create a team to appear on the leaderboard'}
                </small>
              )}
            </span>
          </div>
        </Card.Footer>
      </Card>
    </Container>
  );
};

export default Leaderboard;
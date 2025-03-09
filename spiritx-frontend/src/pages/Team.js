// Team.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Nav, ListGroup, Alert, Modal, Spinner, Form, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserPlus, faUserMinus, faCoins, faTrophy, faList, faInfoCircle,
  faFilter, faSearch, faSyncAlt, faExclamationTriangle, faCheckCircle,
  faBaseballBatBall, faShield, faUsers, faCreditCard, faUniversity
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { isAdmin } from '../services/api';

const API_URL = 'http://localhost:5234/api';

const Team = () => {
  const [playerCategory, setPlayerCategory] = useState('All');
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [myTeam, setMyTeam] = useState([]);
  const [budget, setBudget] = useState(9000000);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [actionMessage, setActionMessage] = useState({ text: '', type: '' });
  const [categoryStats, setCategoryStats] = useState({});
  const [showAllPlayers, setShowAllPlayers] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false); // State for confirmation modal
  const [playerToRemove, setPlayerToRemove] = useState(null); // State to hold player to remove

  // Check if user is admin
  const userIsAdmin = isAdmin();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    console.log(`Category changed to: ${playerCategory}`);
    fetchData();
  }, [playerCategory, showAllPlayers]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const endpoint = showAllPlayers
        ? `${API_URL}/admin/players?pageSize=1000${playerCategory !== 'All' ? `&category=${playerCategory}` : ''}`
        : `${API_URL}/players${playerCategory !== 'All' ? `?category=${playerCategory}` : ''}`;

      // Fetch all players
      const playersResponse = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Get team data
      const teamResponse = await axios.get(`${API_URL}/teams`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log("API Response:", playersResponse.data);
      console.log("Team Response:", teamResponse.data);

      // Handle players data
      if (playersResponse.data && playersResponse.data.players) {
        // Normalize player data from the admin API to match the structure expected by the component
        if (showAllPlayers) {
          playersResponse.data.players = playersResponse.data.players.map(player => ({
            playerId: player.playerId || player.id,
            name: player.name,
            university: player.university,
            category: player.category,
            playerValue: player.playerValue || player.value,
            // Remove points property to prevent access
            totalRuns: player.totalRuns,
            ballsFaced: player.ballsFaced,
            inningsPlayed: player.inningsPlayed,
            wickets: player.wickets,
            oversBowled: player.oversBowled,
            runsConceded: player.runsConceded,
            battingStrikeRate: player.battingStrikeRate,
            battingAverage: player.battingAverage,
            bowlingStrikeRate: player.bowlingStrikeRate,
            economyRate: player.economyRate
          }));
        }

        setAvailablePlayers(playersResponse.data.players);
        setBudget(playersResponse.data.budget || 0);
      } else if (Array.isArray(playersResponse.data)) {
        setAvailablePlayers(playersResponse.data);
      } else {
        console.error("API response format unexpected:", playersResponse.data);
        setError("Failed to load players data. Unexpected data format received.");
        setAvailablePlayers([]);
      }

      // Handle team data - store the full player objects, not just IDs
      if (teamResponse.data && teamResponse.data.players) {
        setMyTeam(teamResponse.data.players);
        if ((!playersResponse.data || !playersResponse.data.budget) && teamResponse.data.budget) {
          setBudget(teamResponse.data.budget);
        }
      } else {
        setMyTeam([]);
      }

      // Calculate category statistics for debug info
      if (userIsAdmin && playersResponse.data && playersResponse.data.players) {
        const stats = {};
        playersResponse.data.players.forEach(player => {
          const category = player.category || 'Unknown';
          if (!stats[category]) {
            stats[category] = { total: 0, affordable: 0, tooExpensive: 0 };
          }
          stats[category].total++;
          if (player.playerValue <= (playersResponse.data.budget || 0)) {
            stats[category].affordable++;
          } else {
            stats[category].tooExpensive++;
          }
        });
        setCategoryStats(stats);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddPlayer = async (playerId) => {
    try {
      setActionInProgress(true);
      setActionMessage({ text: '', type: '' });

      // Check if team already has 11 players
      if (myTeam.length >= 11) {
        setActionMessage({
          text: 'Your team already has 11 players. Remove a player before adding a new one.',
          type: 'danger'
        });
        return;
      }

      // Check if player is already in the team
      if (myTeam.some(p => p.playerId === playerId)) {
        setActionMessage({
          text: `This player is already in your team.`,
          type: 'warning'
        });
        return;
      }

      const token = localStorage.getItem('token');

      if (!token) {
        setActionMessage({
          text: 'Authentication token not found. Please log in again.',
          type: 'danger'
        });
        return;
      }

      // Find player to get value for immediate budget update
      const player = availablePlayers.find(p => p.playerId === playerId);
      const playerValue = player ? player.playerValue : 0;

      // Check if player value exceeds budget
      if (playerValue > budget) {
        setActionMessage({
          text: `Insufficient budget. Player value: ${formatValue(playerValue)}, Your budget: ${formatValue(budget)}`,
          type: 'danger'
        });
        return;
      }

      // Call API to add player to team
      const response = await axios.post(
        `${API_URL}/teams/addPlayer`,
        { playerId: playerId },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log("Add player response:", response.data);

      // Update the budget from the response
      if (response.data && response.data.remainingBudget !== undefined) {
        console.log("Setting budget from API response:", response.data.remainingBudget);
        setBudget(response.data.remainingBudget);
      } else {
        // Fallback: update budget based on the current budget and player value
        const newBudget = budget - playerValue;
        console.log("Calculating budget locally:", newBudget);
        setBudget(newBudget);
      }

      // Add player to team immediately in local state
      if (player) {
        setMyTeam(prevTeam => [...prevTeam, player]);

        // Remove from available players list if not showing all players
        if (!showAllPlayers) {
          setAvailablePlayers(prevPlayers =>
            prevPlayers.filter(p => p.playerId !== playerId)
          );
        }
      }

      setActionMessage({
        text: `Player added to your team successfully!`,
        type: 'success'
      });

    } catch (err) {
      console.error('Error adding player to team:', err);

      let errorMessage = 'Failed to add player to team.';

      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      } else if (err.response && err.response.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      }

      setActionMessage({ text: errorMessage, type: 'danger' });
    } finally {
      setActionInProgress(false);
    }
  };

  const removePlayerFromTeam = async () => {
    try {
      setActionInProgress(true);
      setActionMessage({ text: '', type: '' });

      const token = localStorage.getItem('token');

      if (!token) {
        setActionMessage({
          text: 'Authentication token not found. Please log in again.',
          type: 'danger'
        });
        return;
      }

      // Remember player value for immediate budget update
      const playerValue = playerToRemove.playerValue || 0; // Use playerToRemove

      // Call API to remove player from team
      const response = await axios.post(
        `${API_URL}/teams/removePlayer`,
        { playerId: playerToRemove.playerId }, // Use playerToRemove
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log("Remove player response:", response.data);

      // Update budget from the response
      if (response.data && response.data.newBudget !== undefined) {
        console.log("Setting new budget from API response:", response.data.newBudget);
        setBudget(response.data.newBudget);
      } else {
        // Fallback to calculating locally if API doesn't return new budget
        const newBudget = budget + playerValue;
        console.log("Calculating new budget locally:", newBudget);
        setBudget(newBudget);
      }

      // Immediately remove player from team list in local state
      setMyTeam(prevTeam => {
        const newTeam = prevTeam.filter(p => p.playerId !== playerToRemove.playerId); // Use playerToRemove
        console.log("Updated team size:", newTeam.length);
        return newTeam;
      });

      setActionMessage({
        text: `Player removed from your team. Value refunded to your budget.`,
        type: 'success'
      });
    } catch (err) {
      console.error('Error removing player from team:', err);
      let errorMessage = 'Failed to remove player from team.';

      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      }

      setActionMessage({ text: errorMessage, type: 'danger' });
    } finally {
      setActionInProgress(false);
      setShowRemoveConfirmModal(false); // Close confirmation modal after action
      setPlayerToRemove(null); // Clear playerToRemove
    }
  };

  const showPlayerDetailsModal = (player) => {
    setSelectedPlayer(player);
    setShowPlayerDetails(true);
  };

  const getCategoryColor = (category) => {
    if (category === "Batsman") return 'primary';
    if (category === "Bowler") return 'success';
    if (category === "All-Rounder") return 'warning';
    return 'secondary';
  };

  const formatValue = (value) => {
    if (value === undefined || value === null) {
      return 'Rs 0';
    }
    return `Rs ${value.toLocaleString()}`;
  };

  // Format stat with proper handling of undefined values
  const formatStat = (value) => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    return value.toFixed(2);
  };

  // Filter the players based on search and team membership
  const filteredPlayers = availablePlayers
    .filter(player => {
      // Search filter (case insensitive)
      const matchesSearch = !searchTerm ||
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.university.toLowerCase().includes(searchTerm.toLowerCase());

      // If showAllPlayers is false, don't show players already in the team
      // If showAllPlayers is true, show all players matching the category
      const notInTeam = showAllPlayers ? true : !myTeam.some(p => p.playerId === player.playerId);

      return matchesSearch && notInTeam;
    })
    .sort((a, b) => b.playerValue - a.playerValue); // Sort by player value

  // Get category counts
  const categoryCountsInTeam = {
    "Batsman": myTeam.filter(p => p.category === "Batsman").length,
    "Bowler": myTeam.filter(p => p.category === "Bowler").length,
    "All-Rounder": myTeam.filter(p => p.category === "All-Rounder").length
  };

  const openRemoveConfirmationModal = (player) => {
    setPlayerToRemove(player);
    setShowRemoveConfirmModal(true);
  };

  const closeRemoveConfirmationModal = () => {
    setShowRemoveConfirmModal(false);
    setPlayerToRemove(null);
  };


  // Loading state
  if (loading && !refreshing) {
    return (
      <Container className="my-5 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "60vh" }}>
        <Spinner animation="border" variant="primary" style={{ width: "3rem", height: "3rem" }} />
        <p className="mt-4 text-primary fw-bold">Loading team data...</p>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Card className="border-0 shadow-lg rounded-lg mb-5">
        <Card.Header className="bg-gradient-primary text-white p-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
            <div className="mb-3 mb-md-0">
              <h2 className="mb-0 fw-bold">
                <FontAwesomeIcon icon={faUsers} className="me-2" />
                Team Management
              </h2>
              <p className="mb-0 mt-1 text-white-50">Create your fantasy cricket team</p>
            </div>
            <div className="d-flex align-items-center gap-3">
              <div className="budget-display px-4 py-2 bg-white bg-opacity-25 rounded-pill">
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon icon={faCreditCard} className="text-warning me-2" />
                  <div>
                    <span className="text-white-50 small">Budget:</span>
                    <h4 className="mb-0 text-white">{formatValue(budget)}</h4>
                  </div>
                </div>
              </div>
              <div className="team-status px-4 py-2 bg-white bg-opacity-25 rounded-pill">
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon icon={faUsers} className="text-warning me-2" />
                  <div>
                    <span className="text-white-50 small">Team:</span>
                    <h4 className="mb-0 text-white">{myTeam.length}/11</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card.Header>

        <Card.Body className="p-4">
          {/* Action messages */}
          {actionMessage.text && (
            <Alert
              variant={actionMessage.type}
              className="mb-4 d-flex align-items-center"
              dismissible
              onClose={() => setActionMessage({ text: '', type: '' })}
            >
              <FontAwesomeIcon
                icon={actionMessage.type === 'success' ? faCheckCircle : faExclamationTriangle}
                className="me-3 fs-4"
              />
              <div>
                <p className="mb-0 fw-bold">{actionMessage.text}</p>
              </div>
            </Alert>
          )}

          {error && (
            <Alert
              variant="danger"
              className="mb-4 d-flex align-items-center"
              dismissible
              onClose={() => setError('')}
            >
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-3 fs-4" />
              <div>
                <p className="mb-0 fw-bold">{error}</p>
              </div>
            </Alert>
          )}

          {/* Team composition summary */}
          <div className="team-composition bg-light p-3 rounded mb-4">
            <Row className="g-3 text-center">
              <Col lg={3} md={6}>
                <div className="stat-card p-3 bg-white rounded shadow-sm">
                  <div className="d-flex align-items-center">
                    <div className="icon-circle bg-primary-subtle me-3">
                      <FontAwesomeIcon icon={faBaseballBatBall} className="text-primary" />
                    </div>
                    <div className="text-start">
                      <h5 className="mb-0 fw-bold">{categoryCountsInTeam["Batsman"]}</h5>
                      <span className="text-muted small">Batsmen</span>
                    </div>
                  </div>
                </div>
              </Col>
              <Col lg={3} md={6}>
                <div className="stat-card p-3 bg-white rounded shadow-sm">
                  <div className="d-flex align-items-center">
                    <div className="icon-circle bg-success-subtle me-3">
                      <FontAwesomeIcon icon={faTrophy} className="text-success" />
                    </div>
                    <div className="text-start">
                      <h5 className="mb-0 fw-bold">{categoryCountsInTeam["Bowler"]}</h5>
                      <span className="text-muted small">Bowlers</span>
                    </div>
                  </div>
                </div>
              </Col>
              <Col lg={3} md={6}>
                <div className="stat-card p-3 bg-white rounded shadow-sm">
                  <div className="d-flex align-items-center">
                    <div className="icon-circle bg-warning-subtle me-3">
                      <FontAwesomeIcon icon={faShield} className="text-warning" />
                    </div>
                    <div className="text-start">
                      <h5 className="mb-0 fw-bold">{categoryCountsInTeam["All-Rounder"]}</h5>
                      <span className="text-muted small">All-Rounders</span>
                    </div>
                  </div>
                </div>
              </Col>
              <Col lg={3} md={6}>
                <div className="stat-card p-3 bg-white rounded shadow-sm">
                  <div className="d-flex align-items-center">
                    <div className="icon-circle bg-info-subtle me-3">
                      <FontAwesomeIcon icon={faCreditCard} className="text-info" />
                    </div>
                    <div className="text-start">
                      <h5 className="mb-0 fw-bold">{formatValue(budget)}</h5>
                      <span className="text-muted small">Remaining Budget</span>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </div>

          <Row className="g-4">
            <Col lg={8}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-gradient-primary text-white p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold">Available Players</h5>
                    <div className="d-flex gap-2">
                      <InputGroup>
                        <InputGroup.Text className="bg-white border-end-0">
                          <FontAwesomeIcon icon={faSearch} className="text-primary" />
                        </InputGroup.Text>
                        <Form.Control
                          type="text"
                          placeholder="Search player or university..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="border-start-0 shadow-none"
                        />
                        {searchTerm && (
                          <Button
                            variant="white"
                            className="border-start-0"
                            onClick={() => setSearchTerm('')}
                          >
                            ×
                          </Button>
                        )}
                      </InputGroup>
                      <Button
                        variant="light"
                        size="sm"
                        className="d-flex align-items-center px-3"
                        onClick={() => fetchData()}
                        disabled={refreshing}
                      >
                        <FontAwesomeIcon icon={faSyncAlt} spin={refreshing} />
                      </Button>
                    </div>
                  </div>
                </Card.Header>

                <div className="p-3 border-bottom bg-light">
                  <div className="d-flex flex-wrap justify-content-between align-items-center">
                    <Nav variant="pills" className="category-nav">
                      <Nav.Item>
                        <Nav.Link
                          active={playerCategory === 'All'}
                          onClick={() => setPlayerCategory('All')}
                          className="d-flex align-items-center px-3 me-1"
                        >
                          <FontAwesomeIcon icon={faUsers} className="me-2" />
                          All
                        </Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link
                          active={playerCategory === 'Batsman'}
                          onClick={() => setPlayerCategory('Batsman')}
                          className="d-flex align-items-center px-3 me-1"
                        >
                          <FontAwesomeIcon icon={faBaseballBatBall} className="me-2" />
                          Batsmen
                        </Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link
                          active={playerCategory === 'Bowler'}
                          onClick={() => setPlayerCategory('Bowler')}
                          className="d-flex align-items-center px-3 me-1"
                        >
                          <FontAwesomeIcon icon={faTrophy} className="me-2" />
                          Bowlers
                        </Nav.Link>
                      </Nav.Item>
                      <Nav.Item>
                        <Nav.Link
                          active={playerCategory === 'All-Rounder'}
                          onClick={() => setPlayerCategory('All-Rounder')}
                          className="d-flex align-items-center px-3"
                        >
                          <FontAwesomeIcon icon={faShield} className="me-2" />
                          All-Rounders
                        </Nav.Link>
                      </Nav.Item>
                    </Nav>

                    <Button
                      variant={showAllPlayers ? "outline-primary" : "primary"}
                      size="sm"
                      onClick={() => setShowAllPlayers(!showAllPlayers)}
                      className="mt-2 mt-sm-0 d-flex align-items-center"
                    >
                      <FontAwesomeIcon icon={faFilter} className="me-2" />
                      {showAllPlayers ? "Show Affordable Only" : "Show All Players"}
                    </Button>
                  </div>

                  {/* Debug info toggle for admins */}
                  {userIsAdmin && (
                    <div className="mt-2">
                      <Button
                        variant="link"
                        onClick={() => setShowDebug(!showDebug)}
                        className="p-0 text-muted text-decoration-none"
                        size="sm"
                      >
                        <FontAwesomeIcon icon={faInfoCircle} className="me-1" />
                        {showDebug ? "Hide" : "Show"} Debug Info
                      </Button>
                    </div>
                  )}

                  {/* Debug info panel */}
                  {userIsAdmin && showDebug && (
                    <div className="debug-panel bg-white p-2 rounded mt-2 small">
                      <p className="mb-1">Found {filteredPlayers.length} players matching current filters.</p>
                      <p className="mb-1">Total available players: {availablePlayers.length}</p>
                      <p className="mb-1">Current category filter: {playerCategory}</p>
                      <p className="mb-1">Show All: {showAllPlayers ? "Yes" : "No"}</p>
                      <div>
                        <strong>Categories in data:</strong>
                        {Object.entries(categoryStats).map(([cat, stats]) => (
                          <Badge bg="secondary" className="me-1 mb-1" key={cat}>
                            {cat}: {stats.total} ({stats.affordable} affordable)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Card.Body className="p-0">
                  <div className="player-list" style={{ maxHeight: '550px', overflowY: 'auto' }}>
                    <ListGroup variant="flush">
                      {filteredPlayers.length > 0 ? (
                        filteredPlayers.map(player => (
                          <ListGroup.Item
                            key={player.playerId}
                            className={`player-item d-flex justify-content-between align-items-center p-3 ${
                              myTeam.some(p => p.playerId === player.playerId) ? 'selected-player' : ''
                              } ${(player.playerValue || 0) > budget ? 'unaffordable-player' : ''}`}
                          >
                            <div className="d-flex align-items-center">
                              <div className="player-avatar me-3">
                                <span className={`avatar-text bg-${getCategoryColor(player.category)}-subtle text-${getCategoryColor(player.category)}`}>
                                  {player.name.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <h6 className="mb-0 fw-bold">{player.name}</h6>
                                <div className="d-flex align-items-center">
                                  <Badge
                                    bg={getCategoryColor(player.category)}
                                    className="me-2"
                                  >
                                    {player.category}
                                  </Badge>
                                  <span className="small text-muted d-flex align-items-center">
                                    <FontAwesomeIcon icon={faUniversity} className="me-1" size="xs" />
                                    {player.university}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="d-flex align-items-center">
                              <div className="text-end me-3">
                                <span className={`player-value fw-bold ${(player.playerValue || 0) > budget ? "text-danger" : "text-primary"}`}>
                                  {formatValue(player.playerValue)}
                                </span>
                                {(player.playerValue || 0) > budget && (
                                  <div className="small text-danger">exceeds budget</div>
                                )}
                              </div>
                              <div className="d-flex gap-2">
                                <Button
                                  variant="outline-info"
                                  size="sm"
                                  className="btn-circle"
                                  onClick={() => showPlayerDetailsModal(player)}
                                >
                                  <FontAwesomeIcon icon={faInfoCircle} />
                                </Button>
                                <Button
                                  variant={myTeam.some(p => p.playerId === player.playerId) ? "outline-danger" : "outline-success"}
                                  size="sm"
                                  className="btn-circle"
                                  onClick={() => myTeam.some(p => p.playerId === player.playerId)
                                    ? openRemoveConfirmationModal(player) // Open confirmation modal instead of direct remove
                                    : handleAddPlayer(player.playerId)}
                                  disabled={
                                    actionInProgress ||
                                    (!myTeam.some(p => p.playerId === player.playerId) &&
                                      (budget < (player.playerValue || 0) || myTeam.length >= 11))
                                  }
                                >
                                  <FontAwesomeIcon
                                    icon={myTeam.some(p => p.playerId === player.playerId) ? faUserMinus : faUserPlus}
                                  />
                                </Button>
                              </div>
                            </div>
                          </ListGroup.Item>
                        ))
                      ) : (
                        <div className="text-center py-5 empty-state">
                          <div className="empty-state-icon">
                            <FontAwesomeIcon icon={faUsers} className="text-muted" />
                          </div>
                          <h5 className="mt-3">No Players Found</h5>
                          <p className="text-muted mb-3">No players match your current filters</p>
                          <div className="d-flex justify-content-center gap-2">
                            {searchTerm && (
                              <Button variant="outline-primary" onClick={() => setSearchTerm('')}>
                                Clear Search
                              </Button>
                            )}
                            <Button variant="primary" onClick={() => fetchData()}>
                              <FontAwesomeIcon icon={faSyncAlt} className="me-2" />
                              Refresh Players
                            </Button>
                          </div>
                        </div>
                      )}
                    </ListGroup>
                  </div>
                </Card.Body>
                <Card.Footer className="bg-light p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted small">
                      Showing {filteredPlayers.length} of {availablePlayers.length} players
                    </span>
                    <Badge bg="primary" pill>
                      {playerCategory} Players
                    </Badge>
                  </div>
                </Card.Footer>
              </Card>
            </Col>

            <Col lg={4}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-gradient-success text-white p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold">
                      <FontAwesomeIcon icon={faUsers} className="me-2" />
                      My Team
                    </h5>
                    <Badge bg="light" text="dark" className="fw-bold px-3 py-2">
                      {myTeam.length}/11 Players
                    </Badge>
                  </div>
                </Card.Header>

                <Card.Body className="p-0">
                  <div className="team-list" style={{ maxHeight: '550px', overflowY: 'auto' }}>
                    {myTeam.length > 0 ? (
                      <ListGroup variant="flush">
                        {myTeam.map(player => (
                          <ListGroup.Item key={player.playerId} className="team-player-item p-3">
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="d-flex align-items-center">
                                <div className="player-avatar me-3">
                                  <span className={`avatar-text bg-${getCategoryColor(player.category)}-subtle text-${getCategoryColor(player.category)}`}>
                                    {player.name.charAt(0)}
                                  </span>
                                </div>
                                <div>
                                  <h6 className="mb-0 fw-bold">{player.name}</h6>
                                  <div className="d-flex align-items-center">
                                    <Badge
                                      bg={getCategoryColor(player.category)}
                                      className="me-2"
                                    >
                                      {player.category}
                                    </Badge>
                                    <span className="player-value fw-bold text-success">
                                      {formatValue(player.playerValue)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                className="btn-circle"
                                onClick={() => openRemoveConfirmationModal(player)} // Open confirmation modal
                                disabled={actionInProgress}
                              >
                                <FontAwesomeIcon icon={faUserMinus} />
                              </Button>
                            </div>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    ) : (
                      <div className="text-center py-5 empty-state">
                        <div className="empty-state-icon">
                          <FontAwesomeIcon icon={faUsers} className="text-muted" />
                        </div>
                        <h5 className="mt-3">No Players Selected</h5>
                        <p className="text-muted mb-3">
                          Your team is empty. Add players from the available list.
                        </p>
                      </div>
                    )}
                  </div>
                </Card.Body>

                <Card.Footer className="bg-light p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small">Team Value:</span>
                      <span className="ms-2 fw-bold">
                        {formatValue(myTeam.reduce((sum, player) => sum + (player.playerValue || 0), 0))}
                      </span>
                    </div>
                    <div>
                      <Badge bg={myTeam.length === 11 ? "success" : "warning"} className="px-3 py-2">
                        {myTeam.length === 11 ? "Complete" : `${myTeam.length}/11 Players`}
                      </Badge>
                    </div>
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Player Details Modal */}
      <Modal
        show={showPlayerDetails}
        onHide={() => setShowPlayerDetails(false)}
        size="lg"
        centered
        className="player-details-modal"
      >
        {/* ... Player Details Modal content ... */}
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fw-bold">Player Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          {selectedPlayer && (
            <div>
              <div className="player-header p-4 bg-gradient-light">
                <Row className="align-items-center">
                  <Col md={8}>
                    {/* ... Player Header Content ... */}
                    <div className="d-flex align-items-center">
                      <div className="player-avatar-lg me-3">
                        <span className={`avatar-text bg-${getCategoryColor(selectedPlayer.category)}-subtle text-${getCategoryColor(selectedPlayer.category)}`}>
                          {selectedPlayer.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="mb-1 fw-bold">{selectedPlayer.name}</h3>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <Badge bg={getCategoryColor(selectedPlayer.category)} className="px-3 py-2">
                            {selectedPlayer.category}
                          </Badge>
                          <span className="d-flex align-items-center text-muted">
                            <FontAwesomeIcon icon={faUniversity} className="me-1" />
                            {selectedPlayer.university}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Col>
                  <Col md={4}>
                    {/* ... Player Header Value and ID ... */}
                    <div className="text-md-end mt-3 mt-md-0">
                      <h4 className={`mb-1 ${(selectedPlayer.playerValue || 0) > budget ? "text-danger" : "text-success"}`}>
                        {formatValue(selectedPlayer.playerValue)}
                      </h4>
                      <div className="d-flex justify-content-md-end align-items-center gap-2">
                        <span className="text-muted small">Player ID:</span>
                        <Badge bg="secondary" pill>
                          {selectedPlayer.playerId}
                        </Badge>
                      </div>
                      {(selectedPlayer.playerValue || 0) > budget && (
                        <div className="mt-2 alert alert-danger py-1 mb-0">
                          <small>Exceeds your current budget</small>
                        </div>
                      )}
                    </div>
                  </Col>
                </Row>
              </div>

              <div className="player-stats p-4">
                <Row>
                  <Col md={6}>
                    {/* ... Batting Stats Section ... */}
                    <div className="stat-section">
                      <h5 className="mb-3 border-bottom pb-2 d-flex align-items-center text-primary">
                        <FontAwesomeIcon icon={faBaseballBatBall} className="me-2" />
                        Batting Statistics
                      </h5>
                      <ListGroup variant="flush">
                        <ListGroup.Item className="d-flex justify-content-between bg-transparent px-0">
                          <span>Total Runs:</span>
                          <span className="fw-bold">{selectedPlayer.totalRuns}</span>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between bg-transparent px-0">
                          <span>Balls Faced:</span>
                          <span className="fw-bold">{selectedPlayer.ballsFaced}</span>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between bg-transparent px-0">
                          <span>Innings Played:</span>
                          <span className="fw-bold">{selectedPlayer.inningsPlayed}</span>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between bg-transparent px-0">
                          <span>Batting Strike Rate:</span>
                          <span className="fw-bold">{formatStat(selectedPlayer.battingStrikeRate)}</span>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between bg-transparent px-0">
                          <span>Batting Average:</span>
                          <span className="fw-bold">{formatStat(selectedPlayer.battingAverage)}</span>
                        </ListGroup.Item>
                      </ListGroup>
                    </div>
                  </Col>

                  <Col md={6}>
                    {/* ... Bowling Stats Section ... */}
                    <div className="stat-section">
                      <h5 className="mb-3 border-bottom pb-2 d-flex align-items-center text-success">
                        <FontAwesomeIcon icon={faTrophy} className="me-2" />
                        Bowling Statistics
                      </h5>
                      <ListGroup variant="flush">
                        <ListGroup.Item className="d-flex justify-content-between bg-transparent px-0">
                          <span>Wickets:</span>
                          <span className="fw-bold">{selectedPlayer.wickets}</span>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between bg-transparent px-0">
                          <span>Overs Bowled:</span>
                          <span className="fw-bold">{selectedPlayer.oversBowled}</span>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between bg-transparent px-0">
                          <span>Runs Conceded:</span>
                          <span className="fw-bold">{selectedPlayer.runsConceded}</span>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between bg-transparent px-0">
                          <span>Bowling Strike Rate:</span>
                          <span className="fw-bold">{selectedPlayer.wickets === 0 ? 'N/A' : formatStat(selectedPlayer.bowlingStrikeRate)}</span>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between bg-transparent px-0">
                          <span>Economy Rate:</span>
                          <span className="fw-bold">{selectedPlayer.oversBowled === 0 ? 'N/A' : formatStat(selectedPlayer.economyRate)}</span>
                        </ListGroup.Item>
                      </ListGroup>
                    </div>
                  </Col>
                </Row>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="outline-secondary" onClick={() => setShowPlayerDetails(false)}>
            Close
          </Button>
          {selectedPlayer && !myTeam.some(p => p.playerId === selectedPlayer.playerId) && (
            <Button
              variant="success"
              onClick={() => {
                handleAddPlayer(selectedPlayer.playerId);
                setShowPlayerDetails(false);
              }}
              disabled={actionInProgress || budget < (selectedPlayer.playerValue || 0) || myTeam.length >= 11}
            >
              <FontAwesomeIcon icon={faUserPlus} className="me-2" />
              {budget < (selectedPlayer.playerValue || 0) ? "Not Enough Budget" : "Add to Team"}
            </Button>
          )}
          {selectedPlayer && myTeam.some(p => p.playerId === selectedPlayer.playerId) && (
            <Button
              variant="danger"
              onClick={() => {
                openRemoveConfirmationModal(selectedPlayer); // Open confirmation from details modal too
                setShowPlayerDetails(false);
              }}
              disabled={actionInProgress}
            >
              <FontAwesomeIcon icon={faUserMinus} className="me-2" />
              Remove from Team
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Remove Confirmation Modal */}
      <Modal
        show={showRemoveConfirmModal}
        onHide={closeRemoveConfirmationModal}
        backdrop="static"
        centered
        className="modal-danger"
      >
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title>
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            Confirm Remove
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {playerToRemove && (
            <>
              <div className="text-center mb-4">
                <div className="warning-icon-circle mb-3 mx-auto">
                  <FontAwesomeIcon icon={faExclamationTriangle} size="2x" className="text-danger" />
                </div>
                <h4>Are you sure?</h4>
                <p className="mb-0">Do you want to remove <strong>{playerToRemove.name}</strong> from your team?</p>
              </div>

              <Alert variant="warning" className="mt-3">
                <p className="mb-0">This action will remove the player from your team and refund their value to your budget.</p>
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="outline-secondary" onClick={closeRemoveConfirmationModal}>
            Cancel
          </Button>
          <Button variant="danger" onClick={removePlayerFromTeam} disabled={actionInProgress}>
            {actionInProgress ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Removing...
              </>
            ) : (
              'Confirm Remove'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add styles */}
      <style jsx="true">{`
        ${`
        .bg-gradient-primary {
          background: linear-gradient(45deg, #0d6efd, #0a58ca);
        }

        .bg-gradient-success {
          background: linear-gradient(45deg, #198754, #157347);
        }

        .bg-gradient-light {
          background: linear-gradient(45deg, #f8f9fa, #e9ecef);
        }

        .player-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .player-avatar-lg {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .avatar-text {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-weight: bold;
          font-size: 1.2rem;
        }

        .player-avatar-lg .avatar-text {
          font-size: 1.8rem;
        }

        .player-item {
          transition: all 0.2s ease;
          border-left: 4px solid transparent;
        }

        .player-item:hover {
          background-color: rgba(0, 0, 0, 0.02);
        }

        .selected-player {
          border-left-color: #198754;
          background-color: rgba(25, 135, 84, 0.05);
        }

        .unaffordable-player {
          opacity: 0.7;
        }

        .unaffordable-player .player-value {
          color: #dc3545 !important;
        }

        .btn-circle {
          width: 32px;
          height: 32px;
          padding: 0;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .team-player-item {
          border-left: 4px solid #198754;
          transition: all 0.2s ease;
        }

        .team-player-item:hover {
          background-color: rgba(25, 135, 84, 0.05);
        }

        .category-nav .nav-link {
          border-radius: 30px;
          color: #495057;
          font-weight: 500;
        }

        .category-nav .nav-link.active {
          background-color: #0d6efd;
          color: white;
        }

        .icon-circle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
        }

        .empty-state {
          padding: 2rem;
        }

        .empty-state-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background-color: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin: 0 auto;
        }

        .debug-panel {
          border-left: 4px solid #ffc107;
        }
        .warning-icon-circle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background-color: rgba(220, 53, 69, 0.1); /* Light red background */
        }

        .modal-danger .modal-header .btn-close {
          filter: invert(1) grayscale(100%) brightness(200%); /* For white close icon on danger header */
        }
      `}
      `}</style>
    </Container>
  );
};

export default Team;
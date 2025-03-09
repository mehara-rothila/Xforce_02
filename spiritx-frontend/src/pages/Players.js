import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Form, InputGroup, Button, Spinner, Alert, Card, Badge, Nav } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch, faFilter, faSyncAlt, faToggleOn, faToggleOff,
  faUserPlus, faCoins, faUsers, faSort,
  faInfoCircle, faExclamationTriangle, faCreditCard,
  faBaseballBatBall, faTrophy, faShield
} from '@fortawesome/free-solid-svg-icons';
import PlayerCard from '../components/PlayerCard';
import { getAllPlayers, getUserTeam, addPlayerToTeam, removePlayerFromTeam } from '../services/api';
import axios from 'axios';

const API_URL = 'http://localhost:5234/api';

const Players = () => {
  const [players, setPlayers] = useState([]);
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [universityFilter, setUniversityFilter] = useState('All');
  const [budget, setBudget] = useState(0);
  const [showAllPlayers, setShowAllPlayers] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // UPDATED: Improved category matching functions
  const isBatsman = (category) => {
    if (!category) return false;
    const normalized = category.toLowerCase().trim();
    return normalized === 'batsman' ||
           normalized === 'batsmen' ||
           normalized === 'bat' ||
           normalized === 'batter';
  };

  const isBowler = (category) => {
    if (!category) return false;
    const normalized = category.toLowerCase().trim();
    return normalized === 'bowler' ||
           normalized === 'bowlers' ||
           normalized === 'bowl';
  };

  const isAllRounder = (category) => {
    if (!category) return false;
    const normalized = category.toLowerCase().trim();
    return normalized === 'all-rounder' ||
           normalized === 'all rounder' ||
           normalized === 'allrounder' ||
           normalized === 'all-rounders' ||
           normalized === 'allrounders';
  };

  // Debug function to help diagnose category issues
  const debugCategoryInfo = () => {
    console.log("--- Detailed Category Analysis ---");

    // Get all unique categories
    const uniqueCategories = [...new Set(players.map(p => p.category))];
    console.log("All unique categories in data:", uniqueCategories);

    // Check each category against our filters
    uniqueCategories.forEach(category => {
      console.log(`Category "${category}": Batsman=${isBatsman(category)}, Bowler=${isBowler(category)}, All-Rounder=${isAllRounder(category)}`);
    });

    // Count players by our category detection
    const batsmenCount = players.filter(p => isBatsman(p.category)).length;
    const bowlersCount = players.filter(p => isBowler(p.category)).length;
    const allRoundersCount = players.filter(p => isAllRounder(p.category)).length;
    const uncategorizedCount = players.filter(p =>
      !isBatsman(p.category) && !isBowler(p.category) && !isAllRounder(p.category)
    ).length;

    console.log(`Player counts by category detection: Batsmen=${batsmenCount}, Bowlers=${bowlersCount}, All-Rounders=${allRoundersCount}, Uncategorized=${uncategorizedCount}`);

    if (uncategorizedCount > 0) {
      console.log("Uncategorized players:", players.filter(p =>
        !isBatsman(p.category) && !isBowler(p.category) && !isAllRounder(p.category)
      ).map(p => `${p.name} (${p.category})`));
    }

    console.log("--- End Category Analysis ---");
  };

  // Get category from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get('category');
    if (categoryParam) {
      // Only set if it matches one of our exact category values
      if(['All', 'Batsman', 'Bowler', 'All-Rounder'].includes(categoryParam)) {
        setCategoryFilter(categoryParam);
        console.log(`Setting category from URL param: ${categoryParam}`);
      } else {
        console.log(`Invalid category param in URL: ${categoryParam}. Resetting to All.`);
        setCategoryFilter('All');
        window.history.pushState({}, '', '/players'); // Update URL to remove invalid param
      }
    }
  }, []);

  // Fetch data once on component mount
  useEffect(() => {
    fetchData();
  }, [categoryFilter, showAllPlayers]); // Re-fetch when category or showAllPlayers changes

  const fetchData = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      setError('');

      // Get category from URL to ensure it's the most up-to-date
      const params = new URLSearchParams(window.location.search);
      const categoryParam = params.get('category') || 'All';
      setCategoryFilter(categoryParam);

      console.log(`Fetching players with category filter: ${categoryParam}`);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // CHANGE: Use admin API endpoint to get all players when showAllPlayers is true
      const endpoint = showAllPlayers
        ? `${API_URL}/admin/players?pageSize=1000${categoryParam !== 'All' ? `&category=${categoryParam}` : ''}`
        : `${API_URL}/players${categoryParam !== 'All' ? `?category=${categoryParam}` : ''}`;

      // Fetch all players
      const playersResponse = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Get team data
      const teamResponse = await getUserTeam();

      console.log("API Response:", playersResponse.data);

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
            points: player.points || 0,
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

        setPlayers(playersResponse.data.players);
        setBudget(playersResponse.data.budget || 0);
      } else if (Array.isArray(playersResponse.data)) {
        setPlayers(playersResponse.data);
      } else {
        console.error("API response format unexpected:", playersResponse.data);
        setError("Failed to load players data. Unexpected data format received.");
        setPlayers([]);
      }

      // Handle team data
      if (teamResponse.data && teamResponse.data.players) {
        setTeamPlayers(teamResponse.data.players.map(p => p.playerId));
        if ((!playersResponse.data || !playersResponse.data.budget) && teamResponse.data.budget) {
          setBudget(teamResponse.data.budget);
        }
      } else {
        setTeamPlayers([]);
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
      await addPlayerToTeam(playerId);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add player');
    }
  };

  const handleRemovePlayer = async (playerId) => {
    try {
      await removePlayerFromTeam(playerId);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove player');
    }
  };

  // Get unique universities for filter
  const universities = useMemo(() => {
    return players.length > 0
      ? ['All', ...new Set(players.map(player => player.university))]
      : ['All'];
  }, [players]);

  // Apply filters locally
  const filteredPlayers = useMemo(() => {
    console.log("Filtering players with category:", categoryFilter);
    console.log("Total players before filtering:", players.length);
    console.log("Player categories in data:",
      [...new Set(players.map(p => p.category))]
    );
    return players.filter(player => {
      // Search filter
      const matchesSearch = !searchTerm ||
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.university.toLowerCase().includes(searchTerm.toLowerCase());

      // Category filter with improved matching
      let matchesCategory = true;
      if (categoryFilter !== 'All') {
        if (categoryFilter === 'Batsman') {
          matchesCategory = isBatsman(player.category);
        } else if (categoryFilter === 'Bowler') {
          matchesCategory = isBowler(player.category);
        } else if (categoryFilter === 'All-Rounder') {
          matchesCategory = isAllRounder(player.category);
        }
      }

      // University filter
      const matchesUniversity = universityFilter === 'All' ||
        player.university === universityFilter;

      return matchesSearch && matchesCategory && matchesUniversity;
    });
  }, [players, searchTerm, categoryFilter, universityFilter]);

  // Manual refresh
  const handleRefresh = () => {
    fetchData();
  };

  // Call the debug function during component mount and when players data updates
  useEffect(() => {
    if (players && players.length > 0) { // Ensure players data is available before running debug
      debugCategoryInfo();
    }
  }, [players]);

  // Format value safely
  const formatValue = (value) => {
    if (value === undefined || value === null) {
      return 'Rs 0';
    }
    return `Rs ${value.toLocaleString()}`;
  };

  return (
    <Container className="py-5">
      <Card className="border-0 shadow-lg rounded-lg mb-5">
        <Card.Header className="bg-gradient-primary text-white p-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
            <div className="mb-3 mb-md-0">
              <h2 className="mb-0 fw-bold">
                <FontAwesomeIcon icon={faUsers} className="me-2" />
                Player Selection
              </h2>
              <p className="mb-0 mt-1 text-white-50">Build your fantasy cricket team</p>
            </div>
            <div className="d-flex align-items-center budget-display px-4 py-2 bg-white bg-opacity-25 rounded-pill">
              <FontAwesomeIcon icon={faCreditCard} className="text-warning me-2" />
              <div>
                <span className="text-white-50 small">Available Budget:</span>
                <h4 className="mb-0 text-white">{formatValue(budget)}</h4>
              </div>
            </div>
          </div>
        </Card.Header>

        <Card.Body className="p-4">
          {/* Search and Filters */}
          <div className="search-filters bg-light p-3 rounded mb-4">
            <Row className="g-3">
              <Col lg={4} md={6}>
                <InputGroup className="search-box">
                  <InputGroup.Text className="bg-white border-end-0">
                    <FontAwesomeIcon icon={faSearch} className="text-primary" />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search players or universities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-start-0 shadow-none"
                  />
                  {searchTerm && (
                    <Button
                      variant="outline-secondary"
                      className="border-start-0"
                      onClick={() => setSearchTerm('')}
                    >
                      ×
                    </Button>
                  )}
                </InputGroup>
              </Col>

              <Col lg={3} md={6}>
                <InputGroup>
                  <InputGroup.Text className="bg-white">
                    <FontAwesomeIcon icon={faFilter} className="text-primary" />
                  </InputGroup.Text>
                  <Form.Select
                    value={universityFilter}
                    onChange={(e) => setUniversityFilter(e.target.value)}
                    className="shadow-none"
                  >
                    <option value="All">All Universities</option>
                    {universities.filter(u => u !== 'All').map((university, index) => (
                      <option key={index} value={university}>{university}</option>
                    ))}
                  </Form.Select>
                </InputGroup>
              </Col>

              <Col lg={3} md={6}>
                <Button
                  variant={showAllPlayers ? "primary" : "outline-primary"}
                  className="w-100 py-2 position-relative"
                  onClick={() => setShowAllPlayers(!showAllPlayers)}
                >
                  <div className="d-flex align-items-center justify-content-center">
                    <FontAwesomeIcon
                      icon={showAllPlayers ? faToggleOn : faToggleOff}
                      className="me-2"
                      size="lg"
                    />
                    <span>{showAllPlayers ? "All Players" : "Affordable Only"}</span>
                  </div>
                </Button>
              </Col>

              <Col lg={2} md={6}>
                <Button
                  variant="success"
                  className="w-100 py-2 d-flex align-items-center justify-content-center"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <FontAwesomeIcon
                    icon={faSyncAlt}
                    spin={refreshing}
                    className="me-2"
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </Button>
              </Col>
            </Row>
          </div>

          {error && (
            <Alert variant="danger" className="d-flex align-items-center mb-4">
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-3 fs-4" />
              <div>
                <p className="mb-0 fw-bold">{error}</p>
              </div>
            </Alert>
          )}

          {/* Category Navigation */}
          <Nav
            variant="pills"
            className="category-nav mb-4 bg-light p-2 rounded justify-content-center justify-content-md-start"
          >
            <Nav.Item>
              <Nav.Link
                href="/players"
                active={categoryFilter === 'All'}
                className="d-flex align-items-center px-4"
              >
                <FontAwesomeIcon icon={faUsers} className="me-2" />
                All
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                href="/players?category=Batsman"
                active={categoryFilter === 'Batsman'}
                className="d-flex align-items-center px-4"
              >
                <FontAwesomeIcon icon={faBaseballBatBall} className="me-2" />
                Batsmen
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                href="/players?category=Bowler"
                active={categoryFilter === 'Bowler'}
                className="d-flex align-items-center px-4"
              >
                <FontAwesomeIcon icon={faTrophy} className="me-2" />
                Bowlers
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                href="/players?category=All-Rounder"
                active={categoryFilter === 'All-Rounder'}
                className="d-flex align-items-center px-4"
              >
                <FontAwesomeIcon icon={faShield} className="me-2" />
                All-Rounders
              </Nav.Link>
            </Nav.Item>
          </Nav>

          {/* Stats Summary */}
          <div className="stats-summary bg-light p-3 rounded mb-4">
            <Row className="g-3 text-center">
              <Col md={3}>
                <div className="stat-card p-2">
                  <h5 className="mb-0">{filteredPlayers.length}</h5>
                  <span className="text-muted small">Available Players</span>
                </div>
              </Col>
              <Col md={3}>
                <div className="stat-card p-2">
                  <h5 className="mb-0">{teamPlayers.length}/11</h5>
                  <span className="text-muted small">Team Players</span>
                </div>
              </Col>
              <Col md={3}>
                <div className="stat-card p-2">
                  <h5 className="mb-0">{players.filter(p => isBatsman(p.category)).length}</h5>
                  <span className="text-muted small">Batsmen</span>
                </div>
              </Col>
              <Col md={3}>
                <div className="stat-card p-2">
                  <h5 className="mb-0">{players.filter(p => isBowler(p.category)).length}</h5>
                  <span className="text-muted small">Bowlers</span>
                </div>
              </Col>
            </Row>
          </div>

          {/* Debug Info Toggle */}
          <div className="mb-4">
            <Button
              variant="link"
              onClick={() => setShowDebug(!showDebug)}
              className="p-0 text-muted text-decoration-none"
            >
              <FontAwesomeIcon icon={faInfoCircle} className="me-1" />
              {showDebug ? "Hide" : "Show"} Debug Info
            </Button>
          </div>

          {/* Debug Info Panel */}
          {showDebug && (
            <div className="debug-panel bg-light p-3 rounded mb-4 small">
              <h6 className="fw-bold">Debug Information:</h6>
              <p className="mb-1">Found {filteredPlayers.length} players matching current filters.</p>
              <p className="mb-1">Total players: {players.length}</p>
              <p className="mb-1">Category filter: {categoryFilter}</p>
              <p className="mb-1">Show all players: {showAllPlayers ? "Yes" : "No"}</p>
              <hr className="my-2" />
              <p className="mb-1">Categories in data: {[...new Set(players.map(p => p.category))].join(', ')}</p>
              <div className="row g-2 mt-1">
                <div className="col-md-4">
                  <Badge bg="primary" className="w-100 p-2">
                    Batsmen: {players.filter(p => isBatsman(p.category)).length}
                  </Badge>
                </div>
                <div className="col-md-4">
                  <Badge bg="success" className="w-100 p-2">
                    Bowlers: {players.filter(p => isBowler(p.category)).length}
                  </Badge>
                </div>
                <div className="col-md-4">
                  <Badge bg="warning" className="text-dark w-100 p-2">
                    All-Rounders: {players.filter(p => isAllRounder(p.category)).length}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Players Grid */}
          {loading && players.length === 0 ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" style={{width: "3rem", height: "3rem"}} />
              <p className="mt-4 text-primary">Loading players...</p>
            </div>
          ) : (
            <Row className="g-4">
              {filteredPlayers.length > 0 ? (
                filteredPlayers.map(player => (
                  <Col key={player.playerId || player.id} lg={3} md={4} sm={6}>
                    <PlayerCard
                      player={{
                        ...player,
                        playerId: player.playerId || player.id,
                        playerValue: player.playerValue || player.value
                      }}
                      onAddPlayer={handleAddPlayer}
                      onRemovePlayer={handleRemovePlayer}
                      isInTeam={teamPlayers.includes(player.playerId || player.id)}
                      userBudget={budget}
                    />
                  </Col>
                ))
              ) : (
                <Col xs={12}>
                  <div className="text-center py-5 empty-state">
                    <div className="empty-state-icon">
                      <FontAwesomeIcon icon={faUsers} className="text-muted" />
                    </div>
                    <h4 className="mt-3">No Players Found</h4>
                    <p className="text-muted mb-3">No players match your current filters.</p>
                    <div className="d-flex justify-content-center gap-3">
                      <Button
                        variant="outline-primary"
                        onClick={() => setSearchTerm('')}
                        disabled={!searchTerm}
                      >
                        Clear Search
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleRefresh}
                      >
                        <FontAwesomeIcon icon={faSyncAlt} className="me-2" />
                        Refresh Players
                      </Button>
                    </div>
                  </div>
                </Col>
              )}
            </Row>
          )}
        </Card.Body>

        <Card.Footer className="bg-light p-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <small className="text-muted">
              Last updated: {new Date().toLocaleString()}
            </small>
            <div>
              <Badge bg="primary" className="me-2">
                {teamPlayers.length}/11 Players Selected
              </Badge>
              <Badge bg="success">
                Budget: {formatValue(budget)}
              </Badge>
            </div>
          </div>
        </Card.Footer>
      </Card>

      {/* Add styles */}
      <style jsx="true">{`
        .bg-gradient-primary {
          background: linear-gradient(45deg, #0d6efd, #0a58ca);
        }

        .budget-display {
          backdrop-filter: blur(5px);
        }

        .search-box .form-control:focus {
          box-shadow: none;
          border-color: #ced4da;
        }

        .category-nav .nav-link {
          border-radius: 30px;
          color: #495057;
          font-weight: 500;
          margin: 0 0.25rem;
        }

        .category-nav .nav-link.active {
          background-color: #0d6efd;
          color: white;
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

        .stat-card {
          background-color: white;
          border-radius: 10px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }

        .search-filters, .stats-summary {
          border-left: 4px solid #0d6efd;
        }

        .debug-panel {
          border-left: 4px solid #ffc107;
        }
      `}</style>
    </Container>
  );
};

export default Players;
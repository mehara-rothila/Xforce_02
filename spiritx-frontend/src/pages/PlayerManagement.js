// PlayerManagement.js with improved category handling and error fixes
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Table, Modal, Pagination, InputGroup, Spinner, Nav, Badge } from 'react-bootstrap'; import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faSearch, faSyncAlt, faArrowLeft, faInfoCircle, faFilter, faExclamationTriangle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

// Define API URL directly to avoid config.js dependency
const API_URL = 'http://localhost:5234/api';

const PlayerManagement = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  const [totalPlayers, setTotalPlayers] = useState(0);

  // Search
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Category filter
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modal states
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [isNewPlayer, setIsNewPlayer] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  // Player form state
  const [playerForm, setPlayerForm] = useState({
    name: '',
    university: '',
    category: 'Batsman', // Default value
    totalRuns: 0,
    ballsFaced: 0,
    inningsPlayed: 0,
    wickets: 0,
    oversBowled: 0,
    runsConceded: 0
  });

  useEffect(() => {
    fetchPlayers(currentPage, pageSize, searchTerm, categoryFilter);
  }, [currentPage, pageSize, categoryFilter]);

  // Helper functions for category handling
  const isBatsman = (category) => {
    const normalizedCategory = (category || '').toLowerCase().trim();
    return normalizedCategory === 'batsman' ||
      normalizedCategory === 'bat' ||
      normalizedCategory === 'batter';
  };

  const isBowler = (category) => {
    const normalizedCategory = (category || '').toLowerCase().trim();
    return normalizedCategory === 'bowler' ||
      normalizedCategory === 'bowl';
  };

  const isAllRounder = (category) => {
    const normalizedCategory = (category || '').toLowerCase().trim();
    return normalizedCategory === 'all-rounder' ||
      normalizedCategory === 'allrounder' ||
      normalizedCategory === 'all rounder';
  };

  // Format value safely
  const formatValue = (value) => {
    if (value === undefined || value === null) {
      return 'Rs 0';
    }
    return `Rs ${Number(value).toLocaleString()}`;
  };

  // Format points safely
  const formatPoints = (value) => {
    if (value === undefined || value === null) {
      return 'N/A'; // Return N/A instead of trying to use toFixed on undefined
    }
    return Number(value).toFixed(2);
  };

  const fetchPlayers = async (page, size, search = '', category = 'All') => {
    try {
      setLoading(true);
      setRefreshing(true);
      setError('');

      const token = localStorage.getItem('token');

      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      let url = `${API_URL}/admin/players?page=${page}&pageSize=${size}`;
      if (search) {
        url += `&searchTerm=${encodeURIComponent(search)}`;
      }

      if (category && category !== 'All') {
        url += `&category=${encodeURIComponent(category)}`;
      }

      console.log('Fetching from:', url);

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Players response:', response.data);
      setPlayers(response.data.players);
      setTotalPages(response.data.totalPages);
      setTotalPlayers(response.data.total);

      // Debug: Log the categories of received players
      if (response.data.players && response.data.players.length > 0) {
        const uniqueCategories = [...new Set(response.data.players.map(p => p.category))];
        console.log("Unique categories in fetched data:", uniqueCategories);
      }
    } catch (err) {
      console.error('Error fetching players:', err);

      if (err.response) {
        console.log('Error response status:', err.response.status);
        console.log('Error response data:', err.response.data);

        if (err.response.status === 401) {
          setError('Unauthorized: Your session may have expired. Please log in again.');
        } else {
          setError(`Failed to load players: ${err.response.data?.message || err.message}`);
        }
      } else {
        setError('Failed to connect to the server. Please check your network connection.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsSearching(false);
    }
  };

  const handleSearch = () => {
    setIsSearching(true);
    setCurrentPage(1); // Reset to first page when searching
    fetchPlayers(1, pageSize, searchTerm, categoryFilter);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
    fetchPlayers(1, pageSize, '', categoryFilter);
  };

  const handleCategoryFilter = (category) => {
    setCategoryFilter(category);
    setCurrentPage(1); // Reset to first page when changing filters
    fetchPlayers(1, pageSize, searchTerm, category);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const openAddPlayerModal = () => {
    setPlayerForm({
      name: '',
      university: '',
      category: 'Batsman',
      totalRuns: 0,
      ballsFaced: 0,
      inningsPlayed: 0,
      wickets: 0,
      oversBowled: 0,
      runsConceded: 0
    });
    setValidationErrors({});
    setIsNewPlayer(true);
    setShowPlayerModal(true);
  };

  const openEditPlayerModal = async (playerId) => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');

      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setLoading(false);
        return;
      }

      const url = `${API_URL}/admin/player/${playerId}`;
      console.log('Fetching player details from:', url);

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Player details:', response.data);

      // Convert snake_case to camelCase
      const player = {
        id: response.data.playerId,
        name: response.data.name,
        university: response.data.university,
        category: response.data.category,
        totalRuns: response.data.totalRuns,
        ballsFaced: response.data.ballsFaced,
        inningsPlayed: response.data.inningsPlayed,
        wickets: response.data.wickets,
        oversBowled: response.data.oversBowled,
        runsConceded: response.data.runsConceded
      };

      setPlayerForm(player);
      setCurrentPlayer(player);
      setValidationErrors({});
      setIsNewPlayer(false);
      setShowPlayerModal(true);
    } catch (err) {
      console.error('Error fetching player details:', err);

      if (err.response) {
        console.log('Error response status:', err.response.status);
        console.log('Error response data:', err.response.data);
        setError(`Failed to load player details: ${err.response.data?.message || err.message}`);
      } else {
        setError('Failed to connect to the server. Please check your network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const openDeletePlayerModal = (player) => {
    setCurrentPlayer(player);
    setShowDeleteModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    // Convert numeric fields to numbers
    if (['totalRuns', 'ballsFaced', 'inningsPlayed', 'wickets', 'runsConceded'].includes(name)) {
      processedValue = parseInt(value) || 0;
    } else if (name === 'oversBowled') {
      processedValue = parseFloat(value) || 0;
    }

    setPlayerForm(prev => ({ ...prev, [name]: processedValue }));

    // Clear validation error when field is updated
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!playerForm.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!playerForm.university.trim()) {
      errors.university = 'University is required';
    }

    if (!playerForm.category) {
      errors.category = 'Category is required';
    }

    // Validate numeric fields are non-negative
    if (playerForm.totalRuns < 0) {
      errors.totalRuns = 'Total runs cannot be negative';
    }

    if (playerForm.ballsFaced < 0) {
      errors.ballsFaced = 'Balls faced cannot be negative';
    }

    if (playerForm.inningsPlayed < 0) {
      errors.inningsPlayed = 'Innings played cannot be negative';
    }

    if (playerForm.wickets < 0) {
      errors.wickets = 'Wickets cannot be negative';
    }

    if (playerForm.oversBowled < 0) {
      errors.oversBowled = 'Overs bowled cannot be negative';
    }

    if (playerForm.runsConceded < 0) {
      errors.runsConceded = 'Runs conceded cannot be negative';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const savePlayer = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      const token = localStorage.getItem('token');

      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setIsSaving(false);
        return;
      }

      // Prepare player data
      const playerData = {
        playerId: isNewPlayer ? 0 : currentPlayer.id,
        name: playerForm.name,
        university: playerForm.university,
        category: playerForm.category,
        totalRuns: playerForm.totalRuns,
        ballsFaced: playerForm.ballsFaced,
        inningsPlayed: playerForm.inningsPlayed,
        wickets: playerForm.wickets,
        oversBowled: playerForm.oversBowled,
        runsConceded: playerForm.runsConceded
      };

      let response;

      if (isNewPlayer) {
        // Create new player
        console.log('Creating new player:', playerData);

        response = await axios.post(`${API_URL}/admin/player`, playerData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        setSuccessMessage('Player created successfully');
      } else {
        // Update existing player
        console.log(`Updating player ${currentPlayer.id}:`, playerData);

        response = await axios.put(`${API_URL}/admin/player/${currentPlayer.id}`, playerData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        setSuccessMessage('Player updated successfully');
      }

      console.log('Save response:', response.data);

      // Close modal and refresh players
      setShowPlayerModal(false);
      fetchPlayers(currentPage, pageSize, searchTerm, categoryFilter);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error saving player:', err);

      if (err.response) {
        console.log('Error response status:', err.response.status);
        console.log('Error response data:', err.response.data);

        if (err.response.status === 401) {
          setError('Unauthorized: Your session may have expired. Please log in again.');
        } else {
          setError(`Failed to save player: ${err.response.data?.message || err.message}`);
        }
      } else {
        setError('Failed to connect to the server. Please check your network connection.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const deletePlayer = async () => {
    try {
      setIsDeleting(true);
      setError('');

      const token = localStorage.getItem('token');

      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setIsDeleting(false);
        return;
      }

      console.log(`Deleting player ${currentPlayer.id}`);

      await axios.delete(`${API_URL}/admin/player/${currentPlayer.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setSuccessMessage('Player deleted successfully');

      // Close modal and refresh players
      setShowDeleteModal(false);

      // If this was the last item on the page, go to previous page
      if (players.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchPlayers(currentPage, pageSize, searchTerm, categoryFilter);
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error deleting player:', err);

      if (err.response) {
        console.log('Error response status:', err.response.status);
        console.log('Error response data:', err.response.data);

        if (err.response.status === 401) {
          setError('Unauthorized: Your session may have expired. Please log in again.');
        } else {
          setError(`Failed to delete player: ${err.response.data?.message || err.message}`);
        }
      } else {
        setError('Failed to connect to the server. Please check your network connection.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const items = [];

    // Previous button
    items.push(
      <Pagination.Prev
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      />
    );

    // First page
    items.push(
      <Pagination.Item
        key={1}
        active={1 === currentPage}
        onClick={() => handlePageChange(1)}
      >
        1
      </Pagination.Item>
    );

    // Ellipsis if needed
    if (currentPage > 3) {
      items.push(<Pagination.Ellipsis key="ellipsis1" disabled />);
    }

    // Pages around current
    for (let page = Math.max(2, currentPage - 1); page <= Math.min(totalPages - 1, currentPage + 1); page++) {
      items.push(
        <Pagination.Item
          key={page}
          active={page === currentPage}
          onClick={() => handlePageChange(page)}
        >
          {page}
        </Pagination.Item>
      );
    }

    // Ellipsis if needed
    if (currentPage < totalPages - 2) {
      items.push(<Pagination.Ellipsis key="ellipsis2" disabled />);
    }

    // Last page if not first page
    if (totalPages > 1) {
      items.push(
        <Pagination.Item
          key={totalPages}
          active={totalPages === currentPage}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      );
    }

    // Next button
    items.push(
      <Pagination.Next
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      />
    );

    return <Pagination>{items}</Pagination>;
  };

  if (loading && players.length === 0) {
    return (
      <Container className="py-5 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "60vh" }}>
        <Spinner animation="border" variant="primary" style={{ width: "3rem", height: "3rem" }} />
        <p className="mt-4 text-primary fw-bold">Loading players...</p>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Card className="border-0 shadow-lg rounded-lg mb-5">
        <Card.Header className="bg-gradient-primary text-white p-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-0 fw-bold">Player Management</h2>
              <p className="mb-0 mt-2 text-white-50">Add, edit, and remove players</p>
            </div>
            <Button
              variant="light"
              onClick={() => fetchPlayers(currentPage, pageSize, searchTerm, categoryFilter)}
              disabled={loading}
              className="px-3 py-2"
            >
              <FontAwesomeIcon icon={faSyncAlt} spin={refreshing} className="me-2" />
              Refresh Data
            </Button>
          </div>
        </Card.Header>

        <Card.Body className="p-4">
          {error && (
            <Alert variant="danger" className="d-flex align-items-center mb-4">
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-3 fs-4" />
              <div>
                <p className="mb-0 fw-bold">{error}</p>
              </div>
            </Alert>
          )}

          {successMessage && (
            <Alert variant="success" className="d-flex align-items-center mb-4">
              <FontAwesomeIcon icon={faCheckCircle} className="me-3 fs-4" />
              <div>
                <p className="mb-0 fw-bold">{successMessage}</p>
              </div>
            </Alert>
          )}

          <div className="d-flex flex-column flex-md-row justify-content-between mb-4 gap-3">
            <div className="d-flex align-items-center flex-grow-1">
              <InputGroup>
                <InputGroup.Text className="bg-white border-end-0">
                  <FontAwesomeIcon icon={faSearch} className="text-primary" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by name or university"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="border-start-0 shadow-none"
                />
                {searchTerm && (
                  <Button
                    variant="outline-secondary"
                    onClick={clearSearch}
                  >
                    Clear
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={handleSearch}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    "Search"
                  )}
                </Button>
              </InputGroup>
            </div>

            <div>
              <Button
                variant="success"
                onClick={openAddPlayerModal}
                className="px-4 py-2"
              >
                <FontAwesomeIcon icon={faPlus} className="me-2" /> Add Player
              </Button>
            </div>
          </div>

          {/* Category filter tabs */}
          <div className="bg-light p-3 rounded mb-4">
            <Nav
              variant="pills"
              className="category-nav mb-0"
            >
              <Nav.Item>
                <Nav.Link
                  active={categoryFilter === 'All'}
                  onClick={() => handleCategoryFilter('All')}
                  className="d-flex align-items-center px-4"
                >
                  <FontAwesomeIcon icon={faFilter} className="me-2" />
                  All
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  active={categoryFilter === 'Batsman'}
                  onClick={() => handleCategoryFilter('Batsman')}
                  className="d-flex align-items-center px-4"
                >
                  Batsman
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  active={categoryFilter === 'Bowler'}
                  onClick={() => handleCategoryFilter('Bowler')}
                  className="d-flex align-items-center px-4"
                >
                  Bowler
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  active={categoryFilter === 'All-Rounder'}
                  onClick={() => handleCategoryFilter('All-Rounder')}
                  className="d-flex align-items-center px-4"
                >
                  All-Rounder
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </div>

          <div className="table-responsive mb-4">
            <Table striped hover className="align-middle player-table">
              <thead className="bg-light">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">University</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-center">Runs</th>
                  <th className="px-4 py-3 text-center">Wickets</th>
                  <th className="px-4 py-3 text-center">Value</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {players.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <div className="empty-state">
                        <div className="empty-state-icon">
                          <FontAwesomeIcon icon={faInfoCircle} className="text-muted" />
                        </div>
                        <h5 className="mt-3">No Players Found</h5>
                        <p className="text-muted mb-0">
                          {searchTerm ? "No players match your search criteria." : "No players found in the database."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  players.map(player => (
                    <tr key={player.id}>
                      <td className="fw-bold px-4 py-3">{player.name}</td>
                      <td className="px-4 py-3">{player.university}</td>
                      <td className="px-4 py-3">
                        <Badge
                          bg={
                            player.category === 'Batsman' ? 'primary' :
                              player.category === 'Bowler' ? 'success' :
                                player.category === 'All-Rounder' ? 'warning' :
                                  'secondary'
                          }
                          className="px-3 py-2"
                        >
                          {player.category}
                        </Badge>
                      </td>
                      <td className="text-center px-4 py-3">{player.totalRuns}</td>
                      <td className="text-center px-4 py-3">{player.wickets}</td>
                      <td className="text-center px-4 py-3 fw-bold">
                        {formatValue(player.value || player.playerValue)}
                      </td>
                      <td className="text-center px-4 py-3">
                        <div className="d-flex justify-content-center gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="btn-circle"
                            onClick={() => openEditPlayerModal(player.id)}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="btn-circle"
                            onClick={() => openDeletePlayerModal(player)}
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <div className="mb-3 mb-md-0">
              <span className="text-muted">
                Showing {players.length} of {totalPlayers} players
              </span>
            </div>
            <div>{renderPagination()}</div>
          </div>
        </Card.Body>
      </Card>

      {/* Player Modal (Add/Edit) */}
      <Modal
        show={showPlayerModal}
        onHide={() => setShowPlayerModal(false)}
        backdrop="static"
        size="lg"
        centered
      >
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fw-bold">{isNewPlayer ? 'Add New Player' : 'Edit Player'}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold">Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={playerForm.name}
                    onChange={handleInputChange}
                    isInvalid={!!validationErrors.name}
                    placeholder="Player name"
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.name}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold">University</Form.Label>
                  <Form.Control
                    type="text"
                    name="university"
                    value={playerForm.university}
                    onChange={handleInputChange}
                    isInvalid={!!validationErrors.university}
                    placeholder="Player university"
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.university}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mt-3">
              <Form.Label className="fw-bold">Category</Form.Label>
              <Form.Select
                name="category"
                value={playerForm.category}
                onChange={handleInputChange}
                isInvalid={!!validationErrors.category}
              >
                <option value="Batsman">Batsman</option>
                <option value="Bowler">Bowler</option>
                <option value="All-Rounder">All-Rounder</option>
              </Form.Select>
              <Form.Control.Feedback type="invalid">
                {validationErrors.category}
              </Form.Control.Feedback>
            </Form.Group>

            <h5 className="mt-4 mb-3 border-bottom pb-2 text-primary">Batting Statistics</h5>
            <Row className="g-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold">Total Runs</Form.Label>
                  <Form.Control
                    type="number"
                    name="totalRuns"
                    value={playerForm.totalRuns}
                    onChange={handleInputChange}
                    isInvalid={!!validationErrors.totalRuns}
                    min="0"
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.totalRuns}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold">Balls Faced</Form.Label>
                  <Form.Control
                    type="number"
                    name="ballsFaced"
                    value={playerForm.ballsFaced}
                    onChange={handleInputChange}
                    isInvalid={!!validationErrors.ballsFaced}
                    min="0"
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.ballsFaced}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold">Innings Played</Form.Label>
                  <Form.Control
                    type="number"
                    name="inningsPlayed"
                    value={playerForm.inningsPlayed}
                    onChange={handleInputChange}
                    isInvalid={!!validationErrors.inningsPlayed}
                    min="0"
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.inningsPlayed}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <h5 className="mt-4 mb-3 border-bottom pb-2 text-success">Bowling Statistics</h5>
            <Row className="g-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold">Wickets</Form.Label>
                  <Form.Control
                    type="number"
                    name="wickets"
                    value={playerForm.wickets}
                    onChange={handleInputChange}
                    isInvalid={!!validationErrors.wickets}
                    min="0"
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.wickets}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold">Overs Bowled</Form.Label>
                  <Form.Control
                    type="number"
                    name="oversBowled"
                    value={playerForm.oversBowled}
                    onChange={handleInputChange}
                    isInvalid={!!validationErrors.oversBowled}
                    min="0"
                    step="0.1"
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.oversBowled}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-bold">Runs Conceded</Form.Label>
                  <Form.Control
                    type="number"
                    name="runsConceded"
                    value={playerForm.runsConceded}
                    onChange={handleInputChange}
                    isInvalid={!!validationErrors.runsConceded}
                    min="0"
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.runsConceded}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="outline-secondary" onClick={() => setShowPlayerModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={savePlayer}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Saving...
              </>
            ) : (
              'Save Player'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        backdrop="static"
        centered
        className="modal-danger"
      >
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title>
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            Confirm Delete
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {currentPlayer && (
            <>
              <div className="text-center mb-4">
                <div className="warning-icon-circle mb-3 mx-auto">
                  <FontAwesomeIcon icon={faExclamationTriangle} size="2x" className="text-danger" />
                </div>
                <h4>Are you sure?</h4>
                <p className="mb-0">You are about to delete this player:</p>
              </div>

              <div className="player-info p-3 bg-light rounded mb-3">
                <p className="mb-1"><strong>Name:</strong> {currentPlayer.name}</p>
                <p className="mb-1"><strong>University:</strong> {currentPlayer.university}</p>
                <p className="mb-0"><strong>Category:</strong> {currentPlayer.category}</p>
              </div>

              <Alert variant="danger">
                <p className="mb-0"><strong>Warning:</strong> This action cannot be undone. If this player is part of any team, they will be removed from those teams as well.</p>
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="outline-secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={deletePlayer}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Deleting...
              </>
            ) : (
              'Delete Player'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add styles */}
      <style jsx="true">{`
        .bg-gradient-primary {
          background: linear-gradient(45deg, #0d6efd, #0a58ca);
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

        .player-table th {
          font-weight: 600;
          color: #495057;
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

        .warning-icon-circle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background-color: rgba(220, 53, 69, 0.1);
        }

        .modal-danger .modal-header .btn-close {
          filter: invert(1) grayscale(100%) brightness(200%);
        }
      `}</style>
    </Container>
  );
};

export default PlayerManagement;
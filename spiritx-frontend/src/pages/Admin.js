// Admin.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Spinner, Modal, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUpload, faUsers, faClipboardList, faTrophy, faUserCheck, 
  faSyncAlt, faTrash, faUserCog, faChartPie, faShieldAlt,
  faFileUpload, faExclamationTriangle, faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import axios from 'axios';

// Define API URL directly to avoid config.js dependency
const API_URL = 'http://localhost:5234/api';

const Admin = () => {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ message: '', type: '' });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updateExisting, setUpdateExisting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setLoading(false);
        return;
      }

      console.log('Fetching from:', `${API_URL}/admin/stats`);

      const response = await axios.get(`${API_URL}/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Stats response:', response.data);
      setStats(response.data);
      setLastUpdated(new Date());
      setError('');
    } catch (err) {
      console.error('Error fetching stats:', err);

      // More detailed error handling
      if (err.response) {
        console.log('Error response status:', err.response.status);
        console.log('Error response data:', err.response.data);

        if (err.response.status === 401) {
          setError('Unauthorized: Your session may have expired. Please log in again.');
        } else {
          setError(`Failed to load admin statistics: ${err.response.data?.message || err.message}`);
        }
      } else {
        setError('Failed to connect to the server. Please check your network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    // Reset upload status when a new file is selected
    setUploadStatus({ message: '', type: '' });
  };

  const handleUpdateExistingChange = (e) => {
    setUpdateExisting(e.target.checked);
  };

  const handleImport = async (e) => {
    e.preventDefault();

    if (!file) {
      setUploadStatus({
        message: 'Please select a CSV file to import',
        type: 'danger'
      });
      return;
    }

    if (!file.name.endsWith('.csv')) {
      setUploadStatus({
        message: 'Please upload a CSV file',
        type: 'danger'
      });
      return;
    }

    try {
      setImporting(true);
      setUploadStatus({ message: 'Uploading and processing...', type: 'info' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('updateExisting', updateExisting);

      const token = localStorage.getItem('token');

      if (!token) {
        setUploadStatus({
          message: 'Authentication token not found. Please log in again.',
          type: 'danger'
        });
        setImporting(false);
        return;
      }

      console.log('Uploading to:', `${API_URL}/admin/importPlayers`);
      console.log('Update existing:', updateExisting);

      const response = await axios.post(`${API_URL}/admin/importPlayers`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Upload response:', response.data);

      setUploadStatus({
        message: response.data.message,
        type: 'success'
      });

      // Refresh stats after successful import
      fetchStats();
    } catch (err) {
      console.error('Error importing players:', err);

      // More detailed error handling
      if (err.response) {
        console.log('Error response status:', err.response.status);
        console.log('Error response data:', err.response.data);

        if (err.response.status === 401) {
          setUploadStatus({
            message: 'Unauthorized: Your session may have expired. Please log in again.',
            type: 'danger'
          });
        } else {
          setUploadStatus({
            message: err.response.data?.message || 'Failed to import players',
            type: 'danger'
          });
        }
      } else {
        setUploadStatus({
          message: 'Failed to connect to the server. Please check your network connection.',
          type: 'danger'
        });
      }
    } finally {
      setImporting(false);
    }
  };

  // Updated clearPlayers function with proper DELETE method
  const handleClearPlayers = async () => {
    try {
      setClearing(true);

      const token = localStorage.getItem('token');

      if (!token) {
        setUploadStatus({
          message: 'Authentication token not found. Please log in again.',
          type: 'danger'
        });
        setClearing(false);
        setShowClearModal(false);
        return;
      }

      console.log('Clearing players...');

      // Use DELETE method with proper authorization header
      const response = await axios.delete(`${API_URL}/admin/clearPlayers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Clear players response:', response.data);

      setUploadStatus({
        message: response.data.message || 'Successfully cleared all players',
        type: 'success'
      });

      // Refresh stats after clearing players
      fetchStats();
    } catch (err) {
      console.error('Error clearing players:', err);

      // Detailed error logging
      if (err.response) {
        console.log('Error status:', err.response.status);
        console.log('Error data:', err.response.data);
      }

      setUploadStatus({
        message: err.response?.data?.message || 'Failed to clear players',
        type: 'danger'
      });
    } finally {
      setClearing(false);
      setShowClearModal(false);
    }
  };

  if (loading) {
    return (
      <Container className="my-5 d-flex flex-column align-items-center justify-content-center" style={{minHeight: "60vh"}}>
        <Spinner animation="border" variant="primary" style={{width: "3rem", height: "3rem"}} />
        <p className="mt-4 text-primary fw-bold">Loading admin dashboard...</p>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Card className="border-0 shadow-lg rounded-lg mb-5">
        <Card.Header className="bg-gradient-primary text-white p-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-0 fw-bold">
                <FontAwesomeIcon icon={faShieldAlt} className="me-3" />
                Admin Dashboard
              </h2>
              <p className="mb-0 mt-2 text-white-50">Manage players, teams, and tournament data</p>
            </div>
            <Button
              variant="light"
              onClick={fetchStats}
              disabled={loading}
              className="px-3 py-2"
            >
              <FontAwesomeIcon icon={faSyncAlt} spin={loading} className="me-2" />
              Refresh Data
            </Button>
          </div>
        </Card.Header>

        {error && (
          <Alert variant="danger" className="m-4 d-flex align-items-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-3 fs-4" />
            <div>
              <p className="mb-1 fw-bold">Error Loading Dashboard</p>
              <p className="mb-0">{error}</p>
            </div>
          </Alert>
        )}

        <Card.Body className="p-4">
          {/* Admin Navigation Cards */}
          <Row className="g-4 mb-5">
            <Col md={6}>
              <Link to="/admin/players" className="text-decoration-none">
                <Card className="border-0 shadow-sm admin-nav-card h-100">
                  <Card.Body className="p-4 d-flex align-items-center">
                    <div className="icon-circle bg-primary-subtle me-4">
                      <FontAwesomeIcon icon={faUserCog} size="lg" className="text-primary" />
                    </div>
                    <div>
                      <h4 className="mb-1 fw-bold">Player Management</h4>
                      <p className="text-muted mb-0">Add, edit, or delete individual players</p>
                    </div>
                  </Card.Body>
                </Card>
              </Link>
            </Col>

            <Col md={6}>
              <Link to="/admin/tournament" className="text-decoration-none">
                <Card className="border-0 shadow-sm admin-nav-card h-100">
                  <Card.Body className="p-4 d-flex align-items-center">
                    <div className="icon-circle bg-warning-subtle me-4">
                      <FontAwesomeIcon icon={faChartPie} size="lg" className="text-warning" />
                    </div>
                    <div>
                      <h4 className="mb-1 fw-bold">Tournament Summary</h4>
                      <p className="text-muted mb-0">View overall statistics and analysis</p>
                    </div>
                  </Card.Body>
                </Card>
              </Link>
            </Col>
          </Row>

          {/* Stats Cards */}
          <h4 className="mb-3 fw-bold">
            <FontAwesomeIcon icon={faChartPie} className="me-2" />
            System Overview
          </h4>

          <Row className="g-4 mb-5">
            <Col md={3}>
              <Card className="text-center border-0 shadow-sm h-100 hover-lift">
                <Card.Body className="p-4">
                  <div className="icon-circle bg-primary-subtle mb-3">
                    <FontAwesomeIcon icon={faUsers} size="2x" className="text-primary" />
                  </div>
                  <h2 className="display-5 fw-bold text-primary mb-1">{stats?.userCount || 0}</h2>
                  <Card.Title className="text-uppercase fs-6 text-muted">Active Users</Card.Title>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3}>
              <Card className="text-center border-0 shadow-sm h-100 hover-lift">
                <Card.Body className="p-4">
                  <div className="icon-circle bg-success-subtle mb-3">
                    <FontAwesomeIcon icon={faClipboardList} size="2x" className="text-success" />
                  </div>
                  <h2 className="display-5 fw-bold text-success mb-1">{stats?.playerCount || 0}</h2>
                  <Card.Title className="text-uppercase fs-6 text-muted">Total Players</Card.Title>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3}>
              <Card className="text-center border-0 shadow-sm h-100 hover-lift">
                <Card.Body className="p-4">
                  <div className="icon-circle bg-warning-subtle mb-3">
                    <FontAwesomeIcon icon={faTrophy} size="2x" className="text-warning" />
                  </div>
                  <h2 className="display-5 fw-bold text-warning mb-1">{stats?.teamCount || 0}</h2>
                  <Card.Title className="text-uppercase fs-6 text-muted">Fantasy Teams</Card.Title>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3}>
              <Card className="text-center border-0 shadow-sm h-100 hover-lift">
                <Card.Body className="p-4">
                  <div className="icon-circle bg-info-subtle mb-3">
                    <FontAwesomeIcon icon={faUserCheck} size="2x" className="text-info" />
                  </div>
                  <h2 className="display-5 fw-bold text-info mb-1">
                    {(stats?.userCount && stats?.playerCount && stats?.playerCount > 0) 
                      ? ((stats.userCount / stats.playerCount) * 100).toFixed(1) + '%' 
                      : '0%'}
                  </h2>
                  <Card.Title className="text-uppercase fs-6 text-muted">User Engagement</Card.Title>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="g-4">
            <Col lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-gradient-primary text-white py-3 px-4">
                  <h5 className="mb-0 fw-bold">
                    <FontAwesomeIcon icon={faFileUpload} className="me-2" />
                    Import Players
                  </h5>
                </Card.Header>
                <Card.Body className="p-4">
                  <Form onSubmit={handleImport}>
                    <div className="file-upload-container mb-4">
                      <div className="file-upload-box p-4 text-center border rounded bg-light mb-3">
                        <FontAwesomeIcon icon={faUpload} size="2x" className="text-primary mb-3" />
                        <h5 className="mb-2">Drop CSV File Here</h5>
                        <p className="text-muted small mb-3">or click to browse</p>
                        <Form.Control
                          type="file"
                          onChange={handleFileChange}
                          accept=".csv"
                          disabled={importing}
                          className="file-input"
                        />
                        {file && (
                          <div className="selected-file mt-3 p-2 bg-white rounded border">
                            <span className="file-name">{file.name}</span>
                            <Badge bg="primary" className="ms-2">
                              {(file.size / 1024).toFixed(1)} KB
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="csv-format-info p-3 bg-light border rounded">
                        <p className="mb-1 small text-muted">CSV should include these columns:</p>
                        <p className="mb-0 small text-muted">
                          <code>Name, University, Category, Total Runs, Balls Faced, Innings Played, Wickets, Overs Bowled, Runs Conceded</code>
                        </p>
                      </div>
                    </div>

                    <Form.Group className="mb-4">
                      <Form.Check
                        type="switch"
                        id="updateExisting"
                        label="Update existing players (match by name and university)"
                        checked={updateExisting}
                        onChange={handleUpdateExistingChange}
                        disabled={importing}
                      />
                      <Form.Text className="text-muted">
                        When enabled, players that already exist will be updated with new statistics
                      </Form.Text>
                    </Form.Group>

                    {uploadStatus.message && (
                      <Alert 
                        variant={uploadStatus.type} 
                        className="mb-4 d-flex align-items-center"
                      >
                        <FontAwesomeIcon 
                          icon={uploadStatus.type === 'success' ? faCheckCircle : faExclamationTriangle} 
                          className="me-3 fs-4" 
                        />
                        <div>
                          <p className="mb-0 fw-bold">{uploadStatus.message}</p>
                        </div>
                      </Alert>
                    )}

                    <div className="d-flex gap-2">
                      <Button
                        variant="primary"
                        type="submit"
                        className="px-4 py-2 d-flex align-items-center"
                        disabled={!file || importing}
                      >
                        {importing ? (
                          <>
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="me-2"
                            />
                            Importing...
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faUpload} className="me-2" />
                            Import Players
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline-danger"
                        onClick={() => setShowClearModal(true)}
                        className="ms-auto d-flex align-items-center"
                        disabled={importing || clearing}
                      >
                        <FontAwesomeIcon icon={faTrash} className="me-2" />
                        Clear All Players
                      </Button>
                    </div>
                  </Form>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-gradient-success text-white py-3 px-4">
                  <h5 className="mb-0 fw-bold">
                    <FontAwesomeIcon icon={faTrophy} className="me-2" />
                    Top Performers
                  </h5>
                </Card.Header>
                <Card.Body className="p-4">
                  <Row className="g-4">
                    <Col md={6}>
                      <Card className="border-0 bg-light h-100">
                        <Card.Body className="text-center p-4">
                          <div className="performer-avatar mx-auto mb-3">
                            <span className="performer-initials bg-primary-subtle text-primary">
                              {stats?.topBatsman ? stats.topBatsman.name.charAt(0) : "?"}
                            </span>
                          </div>
                          <Badge bg="primary" className="mb-3 px-3 py-2">Top Batsman</Badge>
                          {stats?.topBatsman ? (
                            <>
                              <h4 className="mb-1 fw-bold">{stats.topBatsman.name}</h4>
                              <p className="text-muted mb-3">{stats.topBatsman.university}</p>
                              <div className="stat-box bg-white p-3 rounded shadow-sm">
                                <h3 className="text-primary mb-0">{stats.topBatsman.totalRuns}</h3>
                                <p className="text-uppercase small mb-0">Total Runs</p>
                              </div>
                            </>
                          ) : (
                            <p className="text-muted">No data available</p>
                          )}
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={6}>
                      <Card className="border-0 bg-light h-100">
                        <Card.Body className="text-center p-4">
                          <div className="performer-avatar mx-auto mb-3">
                            <span className="performer-initials bg-success-subtle text-success">
                              {stats?.topBowler ? stats.topBowler.name.charAt(0) : "?"}
                            </span>
                          </div>
                          <Badge bg="success" className="mb-3 px-3 py-2">Top Bowler</Badge>
                          {stats?.topBowler ? (
                            <>
                              <h4 className="mb-1 fw-bold">{stats.topBowler.name}</h4>
                              <p className="text-muted mb-3">{stats.topBowler.university}</p>
                              <div className="stat-box bg-white p-3 rounded shadow-sm">
                                <h3 className="text-success mb-0">{stats.topBowler.wickets}</h3>
                                <p className="text-uppercase small mb-0">Total Wickets</p>
                              </div>
                            </>
                          ) : (
                            <p className="text-muted">No data available</p>
                          )}
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Card.Body>
                <Card.Footer className="bg-light p-3 text-center">
                  <small className="text-muted">Last updated: {lastUpdated.toLocaleString()}</small>
                </Card.Footer>
              </Card>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Confirmation Modal for Clear Players */}
      <Modal 
        show={showClearModal} 
        onHide={() => setShowClearModal(false)}
        centered
        dialogClassName="modal-danger"
      >
        <Modal.Header className="bg-danger text-white">
          <Modal.Title>
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            Confirm Clear Players
          </Modal.Title>
          <Button 
            variant="close" 
            className="btn-close-white" 
            onClick={() => setShowClearModal(false)}
          />
        </Modal.Header>
        <Modal.Body className="p-4">
          <div className="text-center mb-4">
            <div className="warning-icon-circle mb-3 mx-auto">
              <FontAwesomeIcon icon={faExclamationTriangle} size="2x" className="text-danger" />
            </div>
            <h4>Are you sure?</h4>
            <p className="mb-0">This action will permanently delete all players from the database.</p>
          </div>
          <Alert variant="danger">
            <p className="mb-0"><strong>Warning:</strong> All player associations with teams will also be removed. This action cannot be undone.</p>
          </Alert>
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button 
            variant="outline-secondary" 
            onClick={() => setShowClearModal(false)} 
            disabled={clearing}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleClearPlayers} 
            disabled={clearing}
          >
            {clearing ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Clearing...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faTrash} className="me-2" />
                Clear All Players
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add styles */}
      <style jsx="true">{`
        .bg-gradient-primary {
          background: linear-gradient(45deg, #0d6efd, #0a58ca);
        }
        
        .bg-gradient-success {
          background: linear-gradient(45deg, #198754, #157347);
        }
        
        .admin-nav-card {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          cursor: pointer;
        }
        
        .admin-nav-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
        }
        
        .icon-circle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 60px;
          height: 60px;
          border-radius: 50%;
        }
        
        .file-upload-box {
          position: relative;
          cursor: pointer;
          border: 2px dashed #dee2e6;
          transition: all 0.2s ease;
        }
        
        .file-upload-box:hover {
          border-color: #0d6efd;
        }
        
        .file-input {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }
        
        .hover-lift {
          transition: transform 0.2s ease-in-out;
        }
        
        .hover-lift:hover {
          transform: translateY(-5px);
        }
        
        .performer-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .performer-initials {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          font-size: 2rem;
          font-weight: bold;
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
        
        .modal-danger .modal-header .btn-close-white {
          filter: invert(1) grayscale(100%) brightness(200%);
        }
      `}</style>
    </Container>
  );
};

export default Admin;
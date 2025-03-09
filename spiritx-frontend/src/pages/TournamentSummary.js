// File path: spiritx-frontend/src/pages/TournamentSummary.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSyncAlt, 
  faTrophy, 
  faBaseballBatBall, 
  faUserTie, 
  faChartLine,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import * as apiService from '../services/api';

const TournamentSummary = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalPlayers: 0,
    totalRuns: 0,
    totalWickets: 0,
    averagePoints: 0,
    topBatsman: null,
    topBowler: null
  });

  const fetchTournamentSummary = async (forceRefresh = false) => {
    try {
      setRefreshing(true);
      setError('');
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      console.log('Making API call to get tournament summary...');
      
      // Add cache busting for force refresh
      const response = await apiService.getTournamentSummary(forceRefresh ? 
        `?_=${new Date().getTime()}` : '');
      
      console.log("Tournament summary data:", response.data);
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching tournament summary:', err);
      
      let errorMessage = 'Failed to load tournament summary.';
      
      if (err.response) {
        console.error('Response status:', err.response.status);
        console.error('Response data:', err.response.data);
        
        if (err.response.status === 401) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (err.response.status === 403) {
          errorMessage = 'You do not have permission to view tournament summary.';
        } else if (err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      } else if (err.request) {
        errorMessage = 'Server did not respond. Please check your connection.';
      }
      
      setError(errorMessage + ' Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTournamentSummary();
  }, []);

  if (loading && !refreshing) {
    return (
      <Container className="my-5 d-flex flex-column align-items-center justify-content-center" style={{minHeight: "60vh"}}>
        <Spinner animation="border" variant="primary" style={{width: "3rem", height: "3rem"}} />
        <p className="mt-4 text-primary fw-bold">Loading tournament summary...</p>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Card className="border-0 shadow-lg rounded-lg mb-5">
        <Card.Header className="bg-primary text-white p-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-0 fw-bold"><FontAwesomeIcon icon={faChartLine} className="me-3" />Tournament Summary</h2>
              <p className="mb-0 mt-2 text-white-50">Real-time statistics and top performers</p>
            </div>
            <Button 
              variant="light" 
              onClick={() => fetchTournamentSummary(true)} 
              disabled={refreshing}
              className="d-flex align-items-center"
            >
              <FontAwesomeIcon icon={faSyncAlt} spin={refreshing} className="me-2" />
              {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>
        </Card.Header>
        
        <Card.Body className="p-4">
          {error && (
            <Alert variant="danger" className="mb-4 d-flex align-items-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-3 fs-4" />
              <div className="flex-grow-1">
                <p className="mb-1 fw-bold">Error Loading Data</p>
                <p className="mb-2">{error}</p>
                <Button 
                  variant="outline-danger" 
                  size="sm" 
                  onClick={() => fetchTournamentSummary(true)} 
                  disabled={refreshing}
                >
                  <FontAwesomeIcon icon={faSyncAlt} className={refreshing ? "fa-spin me-2" : "me-2"} />
                  Try Again
                </Button>
              </div>
            </Alert>
          )}
          
          <Row className="g-4 mb-5">
            <Col md={3}>
              <Card className="text-center h-100 border-0 shadow-sm hover-lift">
                <Card.Body className="p-4">
                  <div className="icon-circle bg-primary-subtle mb-3">
                    <FontAwesomeIcon icon={faUserTie} size="2x" className="text-primary" />
                  </div>
                  <h2 className="display-5 fw-bold text-primary mb-1">{stats.totalPlayers || 0}</h2>
                  <Card.Title className="text-uppercase fs-6 text-muted">Total Players</Card.Title>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={3}>
              <Card className="text-center h-100 border-0 shadow-sm hover-lift">
                <Card.Body className="p-4">
                  <div className="icon-circle bg-success-subtle mb-3">
                    <FontAwesomeIcon icon={faBaseballBatBall} size="2x" className="text-success" />
                  </div>
                  <h2 className="display-5 fw-bold text-success mb-1">{(stats.totalRuns || 0).toLocaleString()}</h2>
                  <Card.Title className="text-uppercase fs-6 text-muted">Total Runs</Card.Title>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={3}>
              <Card className="text-center h-100 border-0 shadow-sm hover-lift">
                <Card.Body className="p-4">
                  <div className="icon-circle bg-warning-subtle mb-3">
                    <FontAwesomeIcon icon={faTrophy} size="2x" className="text-warning" />
                  </div>
                  <h2 className="display-5 fw-bold text-warning mb-1">{(stats.totalWickets || 0).toLocaleString()}</h2>
                  <Card.Title className="text-uppercase fs-6 text-muted">Total Wickets</Card.Title>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={3}>
              <Card className="text-center h-100 border-0 shadow-sm hover-lift">
                <Card.Body className="p-4">
                  <div className="icon-circle bg-info-subtle mb-3">
                    <FontAwesomeIcon icon={faSyncAlt} size="2x" className="text-info" />
                  </div>
                  <h2 className="display-5 fw-bold text-info mb-1">{(stats.averagePoints || 0).toFixed(2)}</h2>
                  <Card.Title className="text-uppercase fs-6 text-muted">Avg. Points</Card.Title>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          {/* Top Performers */}
          <Row className="g-4">
            <Col md={6}>
              <Card className="border-0 shadow-sm h-100 hover-lift">
                <Card.Header className="bg-gradient-primary text-white py-3 px-4">
                  <h5 className="mb-0 fw-bold">
                    <FontAwesomeIcon icon={faBaseballBatBall} className="me-2" />
                    Highest Run Scorer
                  </h5>
                </Card.Header>
                <Card.Body className="p-4">
                  {stats.topBatsman ? (
                    <div className="text-center py-3">
                      <div className="avatar-circle mx-auto mb-3">
                        <span className="avatar-initials bg-primary-subtle text-primary">
                          {stats.topBatsman.name.charAt(0)}
                        </span>
                      </div>
                      <h3 className="fw-bold mb-1">{stats.topBatsman.name}</h3>
                      <p className="mb-4 text-muted">{stats.topBatsman.university}</p>
                      <div className="stat-box bg-light p-3 rounded">
                        <h2 className="text-primary mb-0">{stats.topBatsman.totalRuns.toLocaleString()}</h2>
                        <p className="text-uppercase small mb-0">Total Runs</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <div className="icon-circle bg-light mx-auto mb-3">
                        <FontAwesomeIcon icon={faBaseballBatBall} size="2x" className="text-muted" />
                      </div>
                      <p className="text-muted mb-0">No data available yet</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6}>
              <Card className="border-0 shadow-sm h-100 hover-lift">
                <Card.Header className="bg-gradient-success text-white py-3 px-4">
                  <h5 className="mb-0 fw-bold">
                    <FontAwesomeIcon icon={faTrophy} className="me-2" />
                    Highest Wicket Taker
                  </h5>
                </Card.Header>
                <Card.Body className="p-4">
                  {stats.topBowler ? (
                    <div className="text-center py-3">
                      <div className="avatar-circle mx-auto mb-3">
                        <span className="avatar-initials bg-success-subtle text-success">
                          {stats.topBowler.name.charAt(0)}
                        </span>
                      </div>
                      <h3 className="fw-bold mb-1">{stats.topBowler.name}</h3>
                      <p className="mb-4 text-muted">{stats.topBowler.university}</p>
                      <div className="stat-box bg-light p-3 rounded">
                        <h2 className="text-success mb-0">{stats.topBowler.wickets.toLocaleString()}</h2>
                        <p className="text-uppercase small mb-0">Total Wickets</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <div className="icon-circle bg-light mx-auto mb-3">
                        <FontAwesomeIcon icon={faTrophy} size="2x" className="text-muted" />
                      </div>
                      <p className="text-muted mb-0">No data available yet</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Card.Body>
        
        <Card.Footer className="bg-light py-3 px-4 text-center">
          <small className="text-muted">Last updated: {new Date().toLocaleString()}</small>
        </Card.Footer>
      </Card>
    </Container>
  );
};

// Add required CSS
const styles = `
.hover-lift {
  transition: transform 0.2s ease-in-out;
}
.hover-lift:hover {
  transform: translateY(-5px);
}
.icon-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
}
.avatar-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-initials {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  font-size: 2rem;
  font-weight: bold;
}
.bg-gradient-primary {
  background: linear-gradient(45deg, #0d6efd, #0a58ca);
}
.bg-gradient-success {
  background: linear-gradient(45deg, #198754, #157347);
}
`;

// Add the styles to the document
const style = document.createElement('style');
style.textContent = styles;
document.head.appendChild(style);

export default TournamentSummary;
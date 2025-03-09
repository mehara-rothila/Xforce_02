// Enhanced PlayerCard.js with Rs currency format
import React, { useState } from 'react';
import { Card, Button, Row, Col, Badge, Modal, ListGroup, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faInfoCircle, faUserMinus, faUserPlus, faUniversity,
  faBaseballBatBall, faTrophy, faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { isAdmin } from '../services/api';

const PlayerCard = ({ player, onAddPlayer, onRemovePlayer, isInTeam, userBudget }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const getCategoryColor = (category) => {
    switch (category) {
      case 'Batsman':
        return 'primary';
      case 'Bowler':
        return 'success';
      case 'All-Rounder':
        return 'warning';
      default:
        return 'secondary';
    }
  };
  
  const canAddPlayer = !isInTeam && userBudget >= player.playerValue;
  
  // Format numbers with proper handling for undefined values
  const formatDecimal = (value, digits = 2) => {
    if (value === null || value === undefined) return 'N/A';
    return Number(value).toFixed(digits);
  };
  
  // Format currency with Rs symbol
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'Rs 0';
    return `Rs ${Number(value).toLocaleString()}`;
  };
  
  // Check if a stat should be displayed as "Undefined"
  const shouldShowUndefined = (statName, player) => {
    if (statName === 'bowlingStrikeRate') {
      return player.wickets === 0;
    }
    if (statName === 'economyRate') {
      return player.oversBowled === 0;
    }
    return false;
  };
  
  // Safe handlers for add/remove
  const handleAddPlayer = async (playerId) => {
    setIsProcessing(true);
    try {
      await onAddPlayer(playerId);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleRemovePlayer = async (playerId) => {
    setIsProcessing(true);
    try {
      await onRemovePlayer(playerId);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <>
      <Card className="h-100 shadow-sm border-0 hover-card">
        <Card.Header className={`bg-gradient-${getCategoryColor(player.category)} text-white p-3`}>
          <h5 className="mb-0 fw-bold">{player.name}</h5>
        </Card.Header>
        <Card.Body className="p-3">
          <div className="d-flex align-items-center mb-3">
            <FontAwesomeIcon icon={faUniversity} className="text-muted me-2" />
            <span className="text-muted">{player.university}</span>
          </div>
          
          <Badge bg={getCategoryColor(player.category)} className="mb-3 px-3 py-2">
            {player.category}
          </Badge>
          
          <Row className="g-3 mt-2">
            <Col xs={6}>
              <div className="stat-box p-2 bg-light rounded">
                <div className="d-flex align-items-center mb-1">
                  <FontAwesomeIcon icon={faBaseballBatBall} className="text-primary me-2" size="sm" />
                  <small className="text-muted fw-bold">Batting</small>
                </div>
                <p className="mb-1 small">Runs: <span className="fw-bold">{player.totalRuns}</span></p>
                <p className="mb-1 small">S/R: <span className="fw-bold">{formatDecimal(player.battingStrikeRate)}</span></p>
                <p className="mb-0 small">Avg: <span className="fw-bold">{formatDecimal(player.battingAverage)}</span></p>
              </div>
            </Col>
            <Col xs={6}>
              <div className="stat-box p-2 bg-light rounded">
                <div className="d-flex align-items-center mb-1">
                  <FontAwesomeIcon icon={faTrophy} className="text-success me-2" size="sm" />
                  <small className="text-muted fw-bold">Bowling</small>
                </div>
                <p className="mb-1 small">Wickets: <span className="fw-bold">{player.wickets}</span></p>
                <p className="mb-1 small">Econ: <span className="fw-bold">{shouldShowUndefined('economyRate', player) ? 'N/A' : formatDecimal(player.economyRate)}</span></p>
                <p className="mb-0 small">S/R: <span className="fw-bold">{shouldShowUndefined('bowlingStrikeRate', player) ? 'N/A' : formatDecimal(player.bowlingStrikeRate)}</span></p>
              </div>
            </Col>
          </Row>
          
          <div className="player-value-box p-2 rounded bg-light mt-3">
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-muted small">Player Value:</span>
              <span className={`fw-bold ${player.playerValue > userBudget ? "text-danger" : "text-success"}`}>
                {formatCurrency(player.playerValue)}
              </span>
            </div>
          </div>
          
          <div className="d-flex justify-content-between align-items-center mt-3">
            <Button 
              variant="outline-primary" 
              size="sm"
              className="py-1 px-3"
              onClick={() => setShowDetails(true)}
            >
              <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
              Details
            </Button>
            
            {isInTeam ? (
              <Button 
                variant="outline-danger" 
                size="sm"
                className="py-1 px-3"
                onClick={() => handleRemovePlayer(player.playerId)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <>
                    <FontAwesomeIcon icon={faUserMinus} className="me-2" />
                    Remove
                  </>
                )}
              </Button>
            ) : (
              <Button 
                variant="outline-success" 
                size="sm"
                className="py-1 px-3"
                onClick={() => handleAddPlayer(player.playerId)}
                disabled={!canAddPlayer || isProcessing}
                title={!canAddPlayer ? "Not enough budget" : ""}
              >
                {isProcessing ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <>
                    <FontAwesomeIcon icon={faUserPlus} className="me-2" />
                    {canAddPlayer ? 'Add' : 'No Budget'}
                  </>
                )}
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>
      
      {/* Detailed Player Information Modal */}
      <Modal 
        show={showDetails} 
        onHide={() => setShowDetails(false)} 
        size="lg"
        centered
        className="player-details-modal"
      >
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fw-bold">{player.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <div className="player-header p-4 bg-gradient-light">
            <Row className="align-items-center">
              <Col md={8}>
                <div className="d-flex align-items-center">
                  <div className="player-avatar-lg me-3">
                    <span className={`avatar-text bg-${getCategoryColor(player.category)}-subtle text-${getCategoryColor(player.category)}`}>
                      {player.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="mb-1 fw-bold">{player.name}</h3>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <Badge bg={getCategoryColor(player.category)} className="px-3 py-2">
                        {player.category}
                      </Badge>
                      <span className="d-flex align-items-center text-muted">
                        <FontAwesomeIcon icon={faUniversity} className="me-1" />
                        {player.university}
                      </span>
                    </div>
                  </div>
                </div>
              </Col>
              <Col md={4}>
                <div className="text-md-end mt-3 mt-md-0">
                  <h4 className={`mb-1 ${player.playerValue > userBudget ? "text-danger" : "text-success"}`}>
                    {formatCurrency(player.playerValue)}
                  </h4>
                  <div className="d-flex justify-content-md-end align-items-center gap-2">
                    <span className="text-muted small">Player ID:</span>
                    <Badge bg="secondary" pill>
                      {player.playerId}
                    </Badge>
                  </div>
                  {player.playerValue > userBudget && (
                    <div className="mt-2 alert alert-danger py-1 mb-0">
                      <small>
                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
                        Exceeds your current budget
                      </small>
                    </div>
                  )}
                </div>
              </Col>
            </Row>
          </div>
          
          <div className="player-stats p-4">
            <Row>
              <Col md={6}>
                <div className="stat-section">
                  <h5 className="mb-3 border-bottom pb-2 d-flex align-items-center text-primary">
                    <FontAwesomeIcon icon={faBaseballBatBall} className="me-2" />
                    Batting Statistics
                  </h5>
                  <ListGroup variant="flush">
                    <ListGroup.Item className="d-flex justify-content-between bg-transparent px-0">
                      <span>Total Runs:</span>
                      <span className="fw-bold">{player.totalRuns}</span>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between bg-transparent px-0">
                      <span>Balls Faced:</span>
                      <span className="fw-bold">{player.ballsFaced}</span>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between bg-transparent px-0">
                      <span>Innings Played:</span>
                      <span className="fw-bold">{player.inningsPlayed}</span>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between bg-transparent px-0">
                      <span>Batting Strike Rate:</span>
                      <span className="fw-bold">{formatDecimal(player.battingStrikeRate)}</span>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between bg-transparent px-0">
                      <span>Batting Average:</span>
                      <span className="fw-bold">{formatDecimal(player.battingAverage)}</span>
                    </ListGroup.Item>
                  </ListGroup>
                </div>
              </Col>

              <Col md={6}>
                <div className="stat-section">
                  <h5 className="mb-3 border-bottom pb-2 d-flex align-items-center text-success">
                    <FontAwesomeIcon icon={faTrophy} className="me-2" />
                    Bowling Statistics
                  </h5>
                  <ListGroup variant="flush">
                    <ListGroup.Item className="d-flex justify-content-between bg-transparent px-0">
                      <span>Wickets:</span>
                      <span className="fw-bold">{player.wickets}</span>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between bg-transparent px-0">
                      <span>Overs Bowled:</span>
                      <span className="fw-bold">{player.oversBowled}</span>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between bg-transparent px-0">
                      <span>Runs Conceded:</span>
                      <span className="fw-bold">{player.runsConceded}</span>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between bg-transparent px-0">
                      <span>Bowling Strike Rate:</span>
                      <span className="fw-bold">{shouldShowUndefined('bowlingStrikeRate', player) ? 'N/A' : formatDecimal(player.bowlingStrikeRate)}</span>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between bg-transparent px-0">
                      <span>Economy Rate:</span>
                      <span className="fw-bold">{shouldShowUndefined('economyRate', player) ? 'N/A' : formatDecimal(player.economyRate)}</span>
                    </ListGroup.Item>
                  </ListGroup>
                </div>
              </Col>
            </Row>
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="outline-secondary" onClick={() => setShowDetails(false)}>
            Close
          </Button>
          {!isInTeam && (
            <Button
              variant="success"
              onClick={() => {
                handleAddPlayer(player.playerId);
                setShowDetails(false);
              }}
              disabled={!canAddPlayer || isProcessing}
            >
              {isProcessing ? (
                <Spinner animation="border" size="sm" className="me-2" />
              ) : (
                <FontAwesomeIcon icon={faUserPlus} className="me-2" />
              )}
              {canAddPlayer ? "Add to Team" : "Not Enough Budget"}
            </Button>
          )}
          {isInTeam && (
            <Button
              variant="danger"
              onClick={() => {
                handleRemovePlayer(player.playerId);
                setShowDetails(false);
              }}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Spinner animation="border" size="sm" className="me-2" />
              ) : (
                <FontAwesomeIcon icon={faUserMinus} className="me-2" />
              )}
              Remove from Team
            </Button>
          )}
        </Modal.Footer>
      </Modal>
      
      <style jsx="true">{`
        .bg-gradient-primary {
          background: linear-gradient(45deg, #0d6efd, #0a58ca);
        }
        
        .bg-gradient-success {
          background: linear-gradient(45deg, #198754, #157347);
        }
        
        .bg-gradient-warning {
          background: linear-gradient(45deg, #ffc107, #e0a800);
        }
        
        .bg-gradient-secondary {
          background: linear-gradient(45deg, #6c757d, #5a6268);
        }
        
        .bg-gradient-light {
          background: linear-gradient(45deg, #f8f9fa, #e9ecef);
        }
        
        .hover-card {
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        
        .hover-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1) !important;
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
          font-size: 1.8rem;
        }
      `}</style>
    </>
  );
};

export default PlayerCard;
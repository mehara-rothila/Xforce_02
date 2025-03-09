import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert, Spinner, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaperPlane, faRobot, faUser, faStar, faPlus,
  faUniversity, faExclamationTriangle, faLightbulb,
  faBaseballBatBall, faTrophy
} from '@fortawesome/free-solid-svg-icons';
import { queryChatbot, addPlayerToTeam } from '../services/api';

const ChatbotInterface = () => {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      content: 'Hi, I\'m Spiriter! I can help you with player information and team building. What would you like to know?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommendedPlayers, setRecommendedPlayers] = useState([]);
  const messagesEndRef = useRef(null);
  const [addingPlayer, setAddingPlayer] = useState(null);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!input.trim()) return;

    // Add user message to chat
    setMessages([...messages, { sender: 'user', content: input }]);

    // Clear input field
    const userQuery = input;
    setInput('');

    // Set loading state
    setIsLoading(true);
    setError('');

    try {
      // Use the queryChatbot function from the API service
      const response = await queryChatbot(userQuery);

      // Add bot response to chat
      setMessages(prev => [...prev, { sender: 'bot', content: response.data.reply }]);

      // Set recommended players if any
      if (response.data.recommendedPlayers && response.data.recommendedPlayers.length > 0) {
        setRecommendedPlayers(response.data.recommendedPlayers);
      } else {
        setRecommendedPlayers([]);
      }

    } catch (err) {
      console.error('Error sending message to chatbot:', err);
      setError(err.response?.data?.message || 'Failed to connect to Spiriter. Please try again later.');
      setMessages(prev => [...prev, {
        sender: 'bot',
        content: 'Sorry, I encountered an error. Please try again later.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToTeam = async (playerId) => {
    try {
      setAddingPlayer(playerId);
      const response = await addPlayerToTeam(playerId);

      setMessages(prev => [...prev, {
        sender: 'bot',
        content: `Player added to your team! ${response.data.message || ''}`
      }]);

    } catch (err) {
      console.error('Error adding player to team:', err);
      setError(err.response?.data?.message || 'Failed to add player to your team. Please try again later.');
      setMessages(prev => [...prev, {
        sender: 'bot',
        content: `Unable to add player to your team: ${err.response?.data?.message || 'Unknown error'}`
      }]);
    } finally {
      setAddingPlayer(null);
    }
  };

  const getCategoryColor = (category) => {
    if (category.toLowerCase().includes('bat')) return 'primary';
    if (category.toLowerCase().includes('bowl')) return 'success';
    if (category.toLowerCase().includes('all')) return 'warning';
    return 'secondary';
  };

  return (
    <Container className="py-5">
      <Card className="border-0 shadow-lg rounded-lg">
        <Card.Header className="bg-gradient-primary text-white p-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-0 fw-bold">
                <FontAwesomeIcon icon={faRobot} className="me-3" />
                Spiriter
              </h2>
              <p className="mb-0 mt-2 text-white-50">Your Fantasy Cricket Assistant</p>
            </div>
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          {error && (
            <Alert
              variant="danger"
              className="m-4 d-flex align-items-center"
              dismissible
              onClose={() => setError('')}
            >
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-3 fs-4" />
              <div>
                <p className="mb-0 fw-bold">{error}</p>
              </div>
            </Alert>
          )}

          <Row className="g-0">
            <Col lg={12} >
              <div className="chat-messages p-4" style={{ height: '65vh', overflowY: 'auto' }}>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
                    style={{
                      display: 'flex',
                      justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                      marginBottom: '20px'
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '80%',
                        borderRadius: '1rem',
                        padding: '1rem',
                        backgroundColor: message.sender === 'user' ? '#0d6efd' : '#f8f9fa',
                        color: message.sender === 'user' ? 'white' : 'black',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div className="mb-2 d-flex align-items-center">
                        <div
                          className="avatar-circle me-2"
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: message.sender === 'user' ? 'rgba(255,255,255,0.2)' : '#e3f2fd',
                            color: message.sender === 'user' ? 'white' : '#0d6efd'
                          }}
                        >
                          <FontAwesomeIcon
                            icon={message.sender === 'user' ? faUser : faRobot}
                            size="sm"
                          />
                        </div>
                        <span className="fw-bold">
                          {message.sender === 'user' ? 'You' : 'Spiriter'}
                        </span>
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-input p-3 bg-light border-top">
                <Form onSubmit={handleSubmit}>
                  <div className="d-flex">
                    <Form.Control
                      type="text"
                      placeholder="Ask about players, stats, or team recommendations..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={isLoading}
                      className="me-2 py-2"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isLoading}
                      className="px-3"
                    >
                      {isLoading ? (
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                      ) : (
                        <FontAwesomeIcon icon={faPaperPlane} />
                      )}
                    </Button>
                  </div>
                </Form>
              </div>
            </Col>


          </Row>
        </Card.Body>

        <Card.Footer className="bg-light p-3">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              <FontAwesomeIcon icon={faLightbulb} className="me-1" />
              Tip: Ask about player statistics, team building, or request team recommendations
            </small>
          </div>
        </Card.Footer>
      </Card>

      {/* Add styles */}
      <style jsx="true">{`
        .bg-gradient-primary {
          background: linear-gradient(45deg, #0d6efd, #0a58ca);
        }

        .chat-messages::-webkit-scrollbar {
          width: 6px;
        }

        .chat-messages::-webkit-scrollbar-track {
          background: #f1f1f1;
        }

        .chat-messages::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 10px;
        }

        .chat-messages::-webkit-scrollbar-thumb:hover {
          background: #aaa;
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
        }

        .hover-card {
          transition: transform 0.2s ease-in-out;
        }

        .hover-card:hover {
          transform: translateY(-5px);
        }
      `}</style>
    </Container>
  );
};

export default ChatbotInterface;
import React, { useEffect, useState } from 'react';
import { Container, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import ChatbotInterface from '../components/ChatbotInterface';
import { isAuthenticated } from '../services/api';

const Chatbot = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      // If not authenticated, redirect to login
      navigate('/login', { state: { from: '/chatbot', message: 'Please log in to use Spiriter' } });
    } else {
      setLoading(false);
    }
  }, [navigate]);

  return (
    <Container className="my-4">
      {loading ? (
        <Alert variant="info">
          Loading Spiriter chatbot...
        </Alert>
      ) : (
        <ChatbotInterface />
      )}
    </Container>
  );
};

export default Chatbot;
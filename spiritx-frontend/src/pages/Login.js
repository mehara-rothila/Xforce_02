import React, { useState } from 'react';
import { Form, Button, Container, Row, Col, Card, Alert, InputGroup } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import { FaUser, FaLock, FaSignInAlt } from 'react-icons/fa';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Call the login function and log the response for debugging
      const response = await login(username, password);
      console.log('Login response:', response);

      // Check if we have a token and proceed
      if (response && response.token) {
        // Call onLogin with the user data
        if (onLogin) {
          const userData = {
            token: response.token,
            user: response.user || {
              userId: 0,
              username: username,
              isAdmin: false
            }
          };
          onLogin(userData);
        }
        // Navigate to team page
        navigate('/team');
      } else {
        setError('Login failed - invalid response from server');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Container className="mt-5" style={{ overflowY: 'hidden' }}>
      <Row className="justify-content-center">
        <Col md={6} lg={5}>
          <Card className="shadow-lg border-0 rounded-lg" style={{ height: 'auto', display: 'flex', flexDirection: 'column' }}>
            <Card.Header className="bg-primary text-white text-center py-4">
              <h2 className="font-weight-bold mb-0">
                <FaSignInAlt className="me-2" />
                Login to SpiritX
              </h2>
            </Card.Header>

            <Card.Body className="p-5" style={{ overflowY: 'auto' }}>
              {error && (
                <Alert variant="danger" className="mb-4 text-center animate__animated animate__headShake">
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">Username</Form.Label>
                  <InputGroup>
                    <InputGroup.Text className="bg-light">
                      <FaUser />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="py-2"
                      required
                    />
                  </InputGroup>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">Password</Form.Label>
                  <InputGroup>
                    <InputGroup.Text className="bg-light">
                      <FaLock />
                    </InputGroup.Text>
                    <Form.Control
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="py-2"
                      required
                    />
                  </InputGroup>
                </Form.Group>

                <div className="d-flex justify-content-between align-items-center mb-4">
                  <Form.Check
                    type="checkbox"
                    label="Remember me"
                    className="text-muted"
                  />
                  {/* Forgot Password Link Removed */}
                </div>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100 py-3 text-uppercase fw-bold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Logging in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </Form>
            </Card.Body>

            <Card.Footer className="bg-light py-3 text-center border-0">
              <p className="mb-0">
                Don't have an account?
                <Link to="/register" className="text-primary fw-bold ms-2 text-decoration-none">
                  Register Now
                </Link>
              </p>
            </Card.Footer>
          </Card>

          <div className="text-center mt-4 text-muted">
            <small>© {new Date().getFullYear()} SpiritX. All rights reserved.</small>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;
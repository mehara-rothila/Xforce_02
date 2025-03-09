import React, { useState } from 'react';
import { Form, Button, Container, Row, Col, Card, Alert, InputGroup, ProgressBar } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/api';
import { FaUser, FaLock, FaUserPlus, FaCheckCircle, FaEye, FaEyeSlash } from 'react-icons/fa';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  
  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    if (!password) return 0;
    
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 25;
    
    // Character variety checks
    if (/[A-Z]/.test(password)) strength += 25; // Has uppercase
    if (/[0-9]/.test(password)) strength += 25; // Has number
    if (/[^A-Za-z0-9]/.test(password)) strength += 25; // Has special char
    
    return strength;
  };
  
  const passwordStrength = calculatePasswordStrength(password);
  
  const getPasswordStrengthColor = () => {
    if (passwordStrength < 50) return 'danger';
    if (passwordStrength < 75) return 'warning';
    return 'success';
  };
  
  const getPasswordStrengthLabel = () => {
    if (passwordStrength < 50) return 'Weak';
    if (passwordStrength < 75) return 'Medium';
    return 'Strong';
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (passwordStrength < 50) {
      setError('Please use a stronger password');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await register(username, password);
      setSuccess('Registration successful! You can now login.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={6} lg={5}>
          <Card className="shadow-lg border-0 rounded-lg">
            <Card.Header className="bg-primary text-white text-center py-4">
              <h2 className="font-weight-bold mb-0">
                <FaUserPlus className="me-2" />
                Join SpiritX Today
              </h2>
            </Card.Header>
            
            <Card.Body className="p-5">
              {error && (
                <Alert variant="danger" className="mb-4 text-center animate__animated animate__headShake">
                  {error}
                </Alert>
              )}
              
              {success && (
                <Alert variant="success" className="mb-4 text-center animate__animated animate__fadeIn">
                  <FaCheckCircle className="me-2" />
                  {success}
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
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="py-2"
                      required
                    />
                  </InputGroup>
                  <Form.Text className="text-muted">
                    Your username will be visible to other users.
                  </Form.Text>
                </Form.Group>
                
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">Password</Form.Label>
                  <InputGroup>
                    <InputGroup.Text className="bg-light">
                      <FaLock />
                    </InputGroup.Text>
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="py-2"
                      required
                    />
                    <Button 
                      variant="outline-secondary" 
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </Button>
                  </InputGroup>
                  
                  {password && (
                    <div className="mt-2">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <small>Password Strength:</small>
                        <small className={`text-${getPasswordStrengthColor()}`}>{getPasswordStrengthLabel()}</small>
                      </div>
                      <ProgressBar 
                        variant={getPasswordStrengthColor()} 
                        now={passwordStrength} 
                        className="mb-2" 
                        style={{height: "8px"}}
                      />
                      <div className="mt-2">
                        <small className="text-muted">
                          Use 8+ characters with a mix of uppercase, numbers, and symbols.
                        </small>
                      </div>
                    </div>
                  )}
                </Form.Group>
                
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">Confirm Password</Form.Label>
                  <InputGroup>
                    <InputGroup.Text className="bg-light">
                      <FaLock />
                    </InputGroup.Text>
                    <Form.Control
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="py-2"
                      required
                    />
                    <Button 
                      variant="outline-secondary" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </Button>
                  </InputGroup>
                </Form.Group>
                
                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100 py-3 text-uppercase fw-bold mt-2" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </Form>
            </Card.Body>
            
            <Card.Footer className="bg-light py-3 text-center border-0">
              <p className="mb-0">
                Already have an account? 
                <Link to="/login" className="text-primary fw-bold ms-2 text-decoration-none">
                  Sign In
                </Link>
              </p>
            </Card.Footer>
          </Card>
          
          <div className="text-center mt-4 text-muted">
            <small>By registering, you agree to our Terms of Service and Privacy Policy.</small>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Register;
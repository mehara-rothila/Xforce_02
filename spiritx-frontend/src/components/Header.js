import React from 'react';
import { Nav, Button, Container, Navbar } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSignOutAlt, faTrophy, faUsers, faChartLine, 
  faRobot, faTools, faHome
} from '@fortawesome/free-solid-svg-icons';
import { isAdmin } from '../services/api';

const Header = ({ isLoggedIn, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };
  
  // Check if user has admin privileges
  const showAdminLinks = isAdmin();
  
  return (
    <Navbar bg="white" expand="lg" className="shadow-sm border-bottom py-2">
      <Container>
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <FontAwesomeIcon icon={faHome} className="text-primary me-2" />
          <span className="fw-bold">SpiritX</span>
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="mx-auto">
            <Nav.Link 
              as={Link} 
              to="/players" 
              className={`mx-2 px-3 py-2 rounded-pill ${location.pathname === '/players' ? 'bg-light text-primary fw-bold' : 'text-secondary'}`}
            >
              <FontAwesomeIcon icon={faUsers} className="me-2" /> Players
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/team" 
              className={`mx-2 px-3 py-2 rounded-pill ${location.pathname === '/team' ? 'bg-light text-primary fw-bold' : 'text-secondary'}`}
            >
              <FontAwesomeIcon icon={faChartLine} className="me-2" /> My Team
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/leaderboard" 
              className={`mx-2 px-3 py-2 rounded-pill ${location.pathname === '/leaderboard' ? 'bg-light text-primary fw-bold' : 'text-secondary'}`}
            >
              <FontAwesomeIcon icon={faTrophy} className="me-2" /> Leaderboard
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/chatbot" 
              className={`mx-2 px-3 py-2 rounded-pill ${location.pathname === '/chatbot' ? 'bg-light text-primary fw-bold' : 'text-secondary'}`}
            >
              <FontAwesomeIcon icon={faRobot} className="me-2" /> Spiriter
            </Nav.Link>
            {showAdminLinks && (
              <Nav.Link 
                as={Link} 
                to="/admin" 
                className={`mx-2 px-3 py-2 rounded-pill ${location.pathname.startsWith('/admin') ? 'bg-danger-subtle text-danger fw-bold' : 'bg-light text-danger'}`}
              >
                <FontAwesomeIcon icon={faTools} className="me-2" /> Admin
              </Nav.Link>
            )}
          </Nav>
          
          <Button 
            variant="outline-primary" 
            className="rounded-pill px-3 py-1" 
            onClick={handleLogout}
          >
            <FontAwesomeIcon icon={faSignOutAlt} className="me-2" /> Logout
          </Button>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
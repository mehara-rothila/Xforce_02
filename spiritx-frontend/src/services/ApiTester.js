// ApiTester.js - Direct API tester for debugging category filtering
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5234/api';

const ApiTester = () => {
  const [apiResponse, setApiResponse] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get unique categories on load
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/players`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log("Initial API Response:", response.data);

      let allPlayers = [];
      if (response.data && response.data.players) {
        allPlayers = response.data.players;
      } else if (Array.isArray(response.data)) {
        allPlayers = response.data;
      }

      // Get unique categories
      const uniqueCategories = [...new Set(allPlayers.map(p => p.category))];
      setCategories(uniqueCategories);
      
      // Save response
      setApiResponse({
        endpoint: `${API_URL}/players`,
        status: response.status,
        data: response.data
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to fetch categories.');
      setLoading(false);
    }
  };

  const testCategoryApi = async () => {
    if (!selectedCategory) {
      setError('Please select a category to test');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setLoading(false);
        return;
      }

      console.log(`Testing API with category: "${selectedCategory}"`);
      
      // First, try with URL parameter
      const urlEndpoint = `${API_URL}/players?category=${encodeURIComponent(selectedCategory)}`;
      console.log(`Requesting: ${urlEndpoint}`);
      
      const response = await axios.get(urlEndpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log(`Response for category "${selectedCategory}":`, response.data);
      
      // Save the response
      setApiResponse({
        endpoint: urlEndpoint,
        status: response.status,
        data: response.data
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Error testing category API:', err);
      setError(`Failed to test API: ${err.message}`);
      setLoading(false);
    }
  };

  const countPlayersByCategory = (data) => {
    if (!data) return {};
    
    let players = [];
    if (data.players) {
      players = data.players;
    } else if (Array.isArray(data)) {
      players = data;
    }
    
    return players.reduce((acc, player) => {
      const category = player.category || 'Unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
  };

  return (
    <div className="container py-4">
      <h2>API Category Tester</h2>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">Test API with Category</h5>
        </div>
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label">Select Category</label>
            <select 
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">-- Select Category --</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div className="mb-3">
            <div className="input-group">
              <span className="input-group-text">{API_URL}/players?category=</span>
              <input 
                type="text" 
                className="form-control"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                placeholder="Enter category manually"
              />
            </div>
            <small className="form-text text-muted">
              You can also manually type a category value to test
            </small>
          </div>
          
          <div className="d-flex gap-2">
            <button 
              className="btn btn-primary" 
              onClick={testCategoryApi}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Testing...
                </>
              ) : (
                'Test API'
              )}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={fetchCategories}
              disabled={loading}
            >
              Reset (Get All Players)
            </button>
          </div>
        </div>
      </div>
      
      {apiResponse && (
        <div className="card">
          <div className="card-header bg-success text-white">
            <h5 className="mb-0">API Response</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <strong>Endpoint:</strong> {apiResponse.endpoint}
            </div>
            <div className="mb-3">
              <strong>Status:</strong> {apiResponse.status}
            </div>
            
            <div className="mb-3">
              <strong>Player Count:</strong> {
                apiResponse.data.players 
                  ? apiResponse.data.players.length 
                  : (Array.isArray(apiResponse.data) ? apiResponse.data.length : 'Unknown')
              }
            </div>
            
            <div className="mb-3">
              <strong>Categories Found:</strong>
              <ul className="list-group mt-2">
                {Object.entries(countPlayersByCategory(apiResponse.data)).map(([category, count]) => (
                  <li key={category} className="list-group-item d-flex justify-content-between align-items-center">
                    "{category}"
                    <span className="badge bg-primary rounded-pill">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <strong>Raw Response Data:</strong>
              <pre className="border rounded p-3 mt-2 bg-light" style={{maxHeight: '300px', overflow: 'auto'}}>
                {JSON.stringify(apiResponse.data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiTester;
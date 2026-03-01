import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import themeContext from '../store/theme-context';
import { API_URL } from '../config';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDarkMode, toggleTheme } = useContext(themeContext);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // debug output to ensure fetch is being called and API_URL is correct
    console.log('handleRegister called', { name, email, API_URL });

    try {
      const response = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      // log status for debugging
      console.log('registration response status:', response.status);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Redirect to login page after successful registration
      alert('Registration successful! Please login.');
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: isDarkMode ? '#1a1a1a' : '#f8f9fa',
      transition: 'background-color 0.3s ease',
      padding: '30px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end',
        marginBottom: '20px'
      }}>
        <button onClick={toggleTheme} style={{
          padding: '10px 16px',
          backgroundColor: isDarkMode ? '#6366f1' : '#4f46e5',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '18px',
          fontWeight: '600',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
        }} title="Toggle theme">
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>
      <div style={{ 
        maxWidth: '450px', 
        margin: '0 auto', 
        padding: '40px',
        backgroundColor: isDarkMode ? '#2d2d2d' : '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        border: `1px solid ${isDarkMode ? '#4a4a4a' : '#e5e7eb'}`
      }}>
        <h2 style={{
          fontSize: '32px',
          fontWeight: '800',
          marginBottom: '30px',
          color: isDarkMode ? '#e5e5e5' : '#1a1a1a',
          textAlign: 'center'
        }}>Register</h2>
        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              fontWeight: '600',
              color: isDarkMode ? '#e5e5e5' : '#1a1a1a'
            }}>Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ 
                width: '100%', 
                padding: '12px',
                boxSizing: 'border-box',
                borderRadius: '8px',
                border: `2px solid ${isDarkMode ? '#4a4a4a' : '#e5e7eb'}`,
                backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                color: isDarkMode ? '#e5e5e5' : '#1a1a1a',
                fontSize: '14px',
                transition: 'border-color 0.2s ease'
              }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              fontWeight: '600',
              color: isDarkMode ? '#e5e5e5' : '#1a1a1a'
            }}>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ 
                width: '100%', 
                padding: '12px',
                boxSizing: 'border-box',
                borderRadius: '8px',
                border: `2px solid ${isDarkMode ? '#4a4a4a' : '#e5e7eb'}`,
                backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                color: isDarkMode ? '#e5e5e5' : '#1a1a1a',
                fontSize: '14px',
                transition: 'border-color 0.2s ease'
              }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              fontWeight: '600',
              color: isDarkMode ? '#e5e5e5' : '#1a1a1a'
            }}>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ 
                width: '100%', 
                padding: '12px',
                boxSizing: 'border-box',
                borderRadius: '8px',
                border: `2px solid ${isDarkMode ? '#4a4a4a' : '#e5e7eb'}`,
                backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                color: isDarkMode ? '#e5e5e5' : '#1a1a1a',
                fontSize: '14px',
                transition: 'border-color 0.2s ease'
              }}
              placeholder="Min 8 chars, uppercase, lowercase, number, symbol"
            />
          </div>
          {error && <p style={{ 
            color: '#ef4444',
            backgroundColor: isDarkMode ? '#3d1a1a' : '#fee2e2',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '14px',
              backgroundColor: isDarkMode ? '#10b981' : '#059669',
              color: 'white', 
              border: 'none', 
              cursor: loading ? 'not-allowed' : 'pointer',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '700',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p style={{ 
          marginTop: '20px',
          textAlign: 'center',
          color: isDarkMode ? '#9ca3af' : '#6b7280',
          fontSize: '14px'
        }}>
          Already have an account? <a href="/login" style={{
            color: isDarkMode ? '#818cf8' : '#4f46e5',
            textDecoration: 'none',
            fontWeight: '600'
          }}>Login here</a>
        </p>
      </div>
    </div>
  );
}

export default Register;

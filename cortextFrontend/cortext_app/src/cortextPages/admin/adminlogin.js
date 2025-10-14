import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { 
  containerStyle,
  cardStyle,
  headingStyle,
  inputStyle,
  inputFocusStyle,
  buttonStyle,
  buttonHoverStyle,
  buttonActiveStyle,
  errorStyle, 
  spinnerStyle,
  linkStyle,
} from '../../cortextPages_Styles/style';

const Styles = {
  Go_button: {
    width: '100%',
    padding: '0.9rem 1.5rem',
    background: 'linear-gradient(45deg, #00a885, #00d4aa)',
    border: '2px solid rgba(0, 212, 170, 0.5)',
    borderRadius: '12px',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '0.95rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(0, 212, 170, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    textDecoration: 'none',
  },
}

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [focusedInput, setFocusedInput] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('http://192.168.56.1:8000/api/check-magicEmail-auth/', {
          method: 'GET',
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          setAuthenticated(data.authenticated);
          setIsAdmin(data.is_magic_admin);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  // ⏳ Loading screen while checking session
  if (!authChecked) {
    return (
      <div style={containerStyle}>
        <motion.div style={cardStyle}>
          <p style={{ color: '#ccc', textAlign: 'center' }}>
            Checking admin access...
          </p>
          <div style={spinnerStyle}></div>
        </motion.div>
      </div>
    );
  }

  if (authChecked && !authenticated) {
    return (
      <div style={containerStyle}>
        <motion.div style={cardStyle}>
          <p style={{ color: '#ccc', textAlign: 'center' }}>
            You must log in to access the Admin Site.
          </p>
          <a href="/login" style={Styles.Go_button} className="mt-4 block text-center">Go to Login</a>
        </motion.div>
      </div>
    );
  }

  const handleAdminLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('http://192.168.56.1:8000/api/admin-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (data.admin_verified) {
        localStorage.setItem('admin_verified', 'true');
        navigate('/adminDash');
      }

      if (!res.ok) {
        setError(data.error || 'Network error');
        return;
      }

      if (data.message === 'Admin fully authenticated') {
        window.location.href = '/adminDash';
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (authenticated && isAdmin) {
    return (
      <motion.div className="min-h-screen flex items-center justify-center bg-black" style={containerStyle}>
        <motion.div 
          style={cardStyle}
          initial={{ scale: 0.9, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold mb-6 text-center" style={headingStyle}>Admin Login</h2>

          <input
            type="text"
            placeholder="Username"
            style={focusedInput === 'username' ? inputFocusStyle : inputStyle}
            value={username}
            onChange={e => {
              setUsername(e.target.value);
              setError('');
            }}
            onFocus={() => setFocusedInput('username')}
            onBlur={() => setFocusedInput(null)}
          />

          <input
            type="password"
            placeholder="Password"
            style={focusedInput === 'password' ? inputFocusStyle : inputStyle}
            value={password}
            onChange={e => {
              setPassword(e.target.value);
              setError('');
            }}
            onFocus={() => setFocusedInput('password')}
            onBlur={() => setFocusedInput(null)}
          />

          {error && (
            <motion.div 
              style={errorStyle}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {error}
            </motion.div>
          )}

          <motion.button
            onClick={handleAdminLogin}
            style={buttonStyle}
            whileHover={{ ...buttonHoverStyle }}
            whileTap={{ ...buttonActiveStyle }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span style={spinnerStyle}></span>
                Authenticating...
              </>
            ) : (
              'Authenticate'
            )}
          </motion.button>

          <a href="/" style={linkStyle} className="mt-4 block text-center">Back to Home</a>
        </motion.div>
      </motion.div>
    );
  }
}

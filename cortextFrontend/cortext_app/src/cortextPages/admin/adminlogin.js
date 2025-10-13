import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

import { 
  containerStyle,
  cardStyle,
  headingStyle,
  linkStyle,
  inputStyle,
  inputFocusStyle,
  buttonStyle,
  buttonHoverStyle,
  buttonActiveStyle,
  errorStyle, 
  spinnerStyle,
 } from '../../cortextPages_Styles/style';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [error] = useState('');
  const [focusedInput, setFocusedInput] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('http://192.168.56.1:8000/api/check-auth/', {
          method: 'GET',
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          setAuthenticated(data.authenticated);
          setIsAdmin(data.is_admin);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

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

  if (authChecked && authenticated && !isAdmin) {
    return (
      <div style={containerStyle}>
        <motion.div 
          style={cardStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h2 style={headingStyle}>Access Denied</h2>
          <p style={{ color: '#ccc', textAlign: 'center' }}>
            You are logged in, but not authorized to access the admin panel.
          </p>
          <a href="/" style={linkStyle} className="mt-4 block text-center">Back to Home</a>
        </motion.div>
      </div>
    );
  }

  const handleAdminLogin = async () => {
    setIsLoading(true);
    const res = await fetch('http://192.168.56.1:8000/api/admin-login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      alert('Network response was not ok');
      return;
    }

    const data = await res.json();
    if (data.message === 'Admin fully authenticated') {
      // Redirect to admin dashboard
      window.location.href = '/adminDash';
    } else {
      alert(data.error);
    }
    setIsLoading(false);
  };

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
          onChange={e => setUsername(e.target.value)}
          onFocus={() => setFocusedInput('username')}
          onBlur={() => setFocusedInput(null)}
        />
        
        <input
          type="password"
          placeholder="Password"
          style={focusedInput === 'password' ? inputFocusStyle : inputStyle}
          value={password}
          onChange={e => setPassword(e.target.value)}
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


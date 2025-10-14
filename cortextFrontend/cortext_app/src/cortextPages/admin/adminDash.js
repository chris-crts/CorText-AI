import React, { useState} from 'react';
import { motion } from 'framer-motion';
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
  successStyle,
} from '../../cortextPages_Styles/style';

export default function AdminDash() {
  const [showPanel, setShowPanel] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [focusedInput, setFocusedInput] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpdate = async () => {
    setError('');
    setSuccess('');

    try {
      const res = await fetch('http://192.168.56.1:8000/api/update-manual-admin/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Update failed');
        return;
      }

      setSuccess('Credentials updated successfully');
      setNewUsername('');
      setNewPassword('');
    } catch (err) {
      setError('Unexpected error occurred');
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('http://192.168.56.1:8000/api/logout/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data.message);
        window.location.href = '/login';
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <motion.div className="min-h-screen flex items-center justify-center bg-black" style={containerStyle}>
      <motion.div 
        style={cardStyle}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 style={headingStyle}>Welcome, Admin</h2>

        <motion.button
          onClick={() => setShowPanel(!showPanel)}
          style={buttonStyle}
          whileHover={buttonHoverStyle}
          whileTap={buttonActiveStyle}
        >
          {showPanel ? 'Hide Update Panel' : 'Update Credentials'}
        </motion.button>

        {showPanel && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            style={{ marginTop: '1rem' }}
          >
            <input
              type="text"
              placeholder="New Username"
              style={focusedInput === 'username' ? inputFocusStyle : inputStyle}
              value={newUsername}
              onChange={e => {
                setNewUsername(e.target.value);
                setError('');
                setSuccess('');
              }}
              onFocus={() => setFocusedInput('username')}
              onBlur={() => setFocusedInput(null)}
            />

            <input
              type="password"
              placeholder="New Password"
              style={focusedInput === 'password' ? inputFocusStyle : inputStyle}
              value={newPassword}
              onChange={e => {
                setNewPassword(e.target.value);
                setError('');
                setSuccess('');
              }}
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
            />

            {error && (
              <motion.div style={errorStyle} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div style={successStyle} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {success}
              </motion.div>
            )}

            <motion.button
              onClick={handleUpdate}
              style={{ ...buttonStyle, marginTop: '1rem' }}
              whileHover={buttonHoverStyle}
              whileTap={buttonActiveStyle}
            >
              Save Changes
            </motion.button>
          </motion.div>
        )}
      </motion.div>
      <button style={buttonStyle} onClick={handleLogout}>
        🚪 Logout
      </button>
    </motion.div>
  );
}

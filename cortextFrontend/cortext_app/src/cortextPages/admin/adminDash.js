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
  successStyle,
} from '../../cortextPages_Styles/style';

const Styles = {
  Go_button: {
    width: '100%',
    padding: '0.9rem 1.5rem',
    background: 'linear-gradient(45deg, #a8a500ff, #d49800ff)',
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
    marginTop: '2rem',
  },
}

export default function AdminDash() {
  const [admins, setAdmins] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const [showPanel, setShowPanel] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [focusedInput, setFocusedInput] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true); // 🔒 auth gate
  const [delayedReady, setDelayedReady] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDelayedReady(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // 🔐 Verify admin second-layer login
  useEffect(() => {
    const verified = localStorage.getItem('admin_verified');
    if (verified !== 'true') {
      navigate('/admin-login');
    } else {
      setCheckingAuth(false); // ✅ allow rendering
    }
  }, [navigate]);

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const res = await fetch('http://192.168.56.1:8000/api/list-manual-admins/', {
          method: 'GET',
          credentials: 'include',
        });
        const data = await res.json();
        setAdmins(data.admins || []);
      } catch (err) {
        console.error('Failed to fetch admins:', err);
      }
    };

    if (!checkingAuth) fetchAdmins();
  }, [checkingAuth]);

  const handleEdit = async (originalUsername) => {
    try {
      const res = await fetch('http://192.168.56.1:8000/api/edit-manual-admin/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: originalUsername,
          new_username: editUsername,
          password: editPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Edit failed');
        return;
      }

      setSuccess('Admin updated successfully');
      setEditingIndex(null);
      setEditUsername('');
      setEditPassword('');
      setAdmins(prev => prev.map(a => a === originalUsername ? editUsername : a));
    } catch (err) {
      setError('Unexpected error during edit');
    }
  };

  const handleDelete = async (username) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${username}"?`);
    if (!confirmed) return;

    try {
      const res = await fetch('http://192.168.56.1:8000/api/delete-manual-admin/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Delete failed');
        return;
      }

      setSuccess('Admin deleted successfully');
      setAdmins(prev => prev.filter(a => a !== username));
    } catch (err) {
      setError('Unexpected error during delete');
    }
  };


  const handleUserCred = async () => {
    setError('');
    setSuccess('');

    try {
      const res = await fetch('http://192.168.56.1:8000/api/edit-manual-admin/', {
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

  // 🚪 Logout and clear admin flag
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
        localStorage.removeItem('admin_verified'); // ✅ clear second-layer flag
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

  if (checkingAuth || !delayedReady) {
    return (
      <motion.div
        className="min-h-screen flex items-center justify-center bg-black"
        style={containerStyle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 style={{ color: 'skyblue', fontSize: '1.5rem' }}>🔐 Verifying Admin Access...</h2>
      </motion.div>
    );
  }

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
          {showPanel ? 'Hide Credentials Panel' : 'Manage Credentials'}
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
              onClick={handleUserCred}
              style={{ ...buttonStyle, marginTop: '1rem' }}
              whileHover={buttonHoverStyle}
              whileTap={buttonActiveStyle}
            >
              Save Changes
            </motion.button>
          </motion.div>
        )}
        <h3 style={adminTextStyle}>Existing Admins</h3>
        {admins.map((admin, index) => (
          <motion.div
            key={admin}
            style={adminCardStyle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {editingIndex === index ? (
              <>
                <input
                  type="text"
                  placeholder="Edit Username"
                  style={editInputStyle}
                  value={editUsername}
                  onChange={e => setEditUsername(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Edit Password"
                  style={editInputStyle}
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                />
                <button style={SavebuttonStyle} onClick={() => handleEdit(admin)}>Save</button>
                <button style={X_ButtonStyle} onClick={() => setEditingIndex(null)}>Cancel</button>
              </>
            ) : (
              <>
                <div style={usernameStyle}><strong>Username:</strong> {admin}</div>
                  <button style={editButtonStyle} onClick={() => {
                    setEditingIndex(index);
                    setEditUsername(admin);
                  }}>Edit</button>
                  <button style={X_ButtonStyle} onClick={() => handleDelete(admin)}>Delete</button>
              </>
            )}
          </motion.div>
        ))}
        <button style={LogoutButtonStyle} onClick={handleLogout}>
          🚪 Logout
        </button>
        <button style={Styles.Go_button} onClick={() => window.location.href = '/medicinePage'}>
          Go to Medicine Page
        </button>
          <button style={Styles.Go_button} onClick={() => window.location.href = '/addMedicinePage'}>
          Add Medicine Data
        </button>
      </motion.div>
    </motion.div>
  );
}

const usernameStyle = {
  fontSize: '1rem',
  fontWeight: '500',
  marginBottom: '1rem',
};

const adminCardStyle = {
  backgroundColor: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: '10px',
  padding: '1.5rem',
  marginTop: '1rem',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
  color: '#e0e0e0',
  transition: 'all 0.3s ease',
};

const adminTextStyle = {
  fontSize: '2rem',
  fontWeight: '500',
  marginTop: '5rem',
  marginBottom: '0.5rem',
  color: '#4B9CD3',
  textAlign: 'center',
};

const editInputStyle = {
  width: '100%',
  padding: '0.75rem',
  marginBottom: '0.75rem',
  borderRadius: '6px',
  border: '1px solid #555',
  backgroundColor: '#2a2a2a',
  color: '#f0f0f0',
  fontSize: '0.95rem',
};

const editButtonStyle = {
  padding: '0.5rem 1rem',
  marginRight: '0.5rem',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: '#007acc',
  color: '#fff',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background-color 0.3s ease',
};

const X_ButtonStyle = {
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: '#c90f0fff',
  color: '#fff',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background-color 0.3s ease',
};

const SavebuttonStyle = {
  padding: '0.5rem 1rem',
  marginRight: '0.5rem',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: '#444',
  color: '#fff',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'background-color 0.3s ease',
};

const LogoutButtonStyle = {
  padding: '0.6rem 1.2rem',
  marginTop: '2rem',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#cc3333',
  color: '#fff',
  fontWeight: '600',
  fontSize: '1rem',
  cursor: 'pointer',
  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
  transition: 'background-color 0.3s ease, transform 0.2s ease',
};
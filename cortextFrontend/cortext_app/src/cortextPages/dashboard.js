import { useState, useEffect, useCallback } from 'react';

const styles = {
  container: {
    minHeight: '100vh',
    width: '100%',
    background: 'linear-gradient(135deg, #0a304dff 0%, #1a3d5fff 25%, #0d1e52ff 50%, #16464aff 75%, #0a284dff 100%)',
    backgroundAttachment: 'fixed',
    color: '#ffffff',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  welcomeSection: {
    textAlign: 'center',
    maxWidth: '800px',
    margin: '0 auto',
  },
  welcomeTitle: {
    fontSize: '3.5rem',
    fontWeight: '700',
    background: 'linear-gradient(45deg, #0071d4ff, #ffffff, #0071d4ff)',
    backgroundSize: '300% 300%',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '1rem',
    textTransform: 'uppercase',
    letterSpacing: '3px',
    animation: 'gradientFlow 4s ease-in-out infinite',
  },
  welcomeSubtitle: {
    fontSize: '1.5rem',
    color: '#e4eaeeff',
    fontWeight: '400',
    letterSpacing: '1px',
    marginBottom: '0.5rem',
  },
  welcomeDescription: {
    fontSize: '1.2rem',
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '300',
    letterSpacing: '0.5px',
    lineHeight: '1.6',
  },
  medicalIcon: {
    fontSize: '5rem',
    marginBottom: '1rem',
    filter: 'drop-shadow(0 0 20px rgba(0, 177, 212, 0.58))',
  },
  sidePanel: {
    position: 'fixed',
    right: 0,
    top: 0,
    height: '100vh',
    background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.15), rgba(7, 121, 136, 0.95))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderLeft: '2px solid rgba(0, 212, 170, 0.3)',
    padding: '2rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  sidePanelCollapsed: {
    width: '120px',
  },
  sidePanelExpanded: {
    width: '280px',
  },
  profileImageContainer: {
    position: 'relative',
    cursor: 'pointer',
    marginTop: '2rem',
  },
  profileImage: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    border: '4px solid #030404ff',
    objectFit: 'cover',
    boxShadow: '0 0 30px rgba(0, 201, 212, 0.5), inset 0 2px 4px rgba(0, 0, 0, 0.3)',
    transition: 'all 0.4s ease',
    cursor: 'pointer',
  },
  profileImageHover: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    border: '4px solid #0a93a5ff',
    objectFit: 'cover',
    boxShadow: '0 0 50px rgba(24, 118, 142, 0.7), inset 0 2px 4px rgba(0, 0, 0, 0.3)',
    transition: 'all 0.4s ease',
    cursor: 'pointer',
    transform: 'scale(1.1)',
  },
  defaultAvatar: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    border: '4px solid #0098d4ff',
    background: 'linear-gradient(45deg, #0a4d4d, #d1e2e2ff)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '3rem',
    color: '#dfe2e2ff',
    boxShadow: '0 0 30px rgba(0, 212, 170, 0.5)',
    cursor: 'pointer',
    transition: 'all 0.4s ease',
  },
  userName: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: '1rem',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
    transition: 'opacity 0.3s ease',
  },
  userNameHidden: {
    opacity: 0,
    height: 0,
    overflow: 'hidden',
  },
  sideButton: {
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
  },
  logoutButton: {
    width: '100%',
    padding: '0.9rem 1.5rem',
    background: 'linear-gradient(45deg, #dc143c, #ff1744)',
    border: '2px solid rgba(220, 20, 60, 0.5)',
    borderRadius: '12px',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '0.95rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(220, 20, 60, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  idCard: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '450px',
    background: 'linear-gradient(135deg, #ffffff 0%, #f0f4f8 100%)',
    borderRadius: '20px',
    boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6), 0 0 0 2px rgba(0, 212, 170, 0.5)',
    overflow: 'hidden',
    zIndex: 2000,
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  idCardHeader: {
    background: 'linear-gradient(135deg, #00a885, #00d4aa)',
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '3px solid rgba(0, 212, 170, 0.5)',
  },
  idCardTitle: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  closeButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: '2px solid rgba(255, 255, 255, 0.5)',
    borderRadius: '50%',
    width: '35px',
    height: '35px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '1.5rem',
    color: '#ffffff',
    transition: 'all 0.3s ease',
    fontWeight: '700',
  },
  idCardBody: {
    padding: '2rem',
  },
  idCardImageSection: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '1.5rem',
  },
  idCardImage: {
    width: '150px',
    height: '150px',
    borderRadius: '15px',
    border: '4px solid #00d4aa',
    objectFit: 'cover',
    boxShadow: '0 8px 20px rgba(0, 212, 170, 0.4)',
  },
  idCardDefaultAvatar: {
    width: '150px',
    height: '150px',
    borderRadius: '15px',
    border: '4px solid #00d4aa',
    background: 'linear-gradient(45deg, #0a4d4d, #1a5f5f)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '4rem',
    color: '#00d4aa',
    boxShadow: '0 8px 20px rgba(0, 212, 170, 0.4)',
  },
  idCardInfo: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '1rem',
  },
  idCardRow: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr',
    gap: '0.5rem',
    padding: '0.8rem',
    background: 'rgba(0, 212, 170, 0.05)',
    borderRadius: '10px',
    borderLeft: '4px solid #00d4aa',
  },
  idCardLabel: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#00a885',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  idCardValue: {
    fontSize: '1rem',
    fontWeight: '500',
    color: '#2d3748',
  },
  changePasswordLink: {
    marginTop: '1.5rem',
    padding: '1rem',
    background: 'linear-gradient(45deg, #00a885, #00d4aa)',
    borderRadius: '12px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '2px solid rgba(0, 212, 170, 0.3)',
  },
  changePasswordText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: '1rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(5px)',
    zIndex: 1999,
  },
  loadingSpinner: {
    display: 'inline-block',
    width: '60px',
    height: '60px',
    border: '6px solid rgba(0, 212, 170, 0.2)',
    borderTop: '6px solid #00d4aa',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    padding: '2rem',
    background: 'rgba(220, 20, 60, 0.15)',
    border: '2px solid rgba(220, 20, 60, 0.4)',
    borderRadius: '20px',
    color: '#ff6b6b',
    textAlign: 'center',
    backdropFilter: 'blur(20px)',
  },
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidePanelExpanded, setSidePanelExpanded] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);
  const [hoveredImage, setHoveredImage] = useState(false);

  const fetchUserData = useCallback(async () => {
    setLoading(true);
    try {
      const csrftoken = getCookie('csrftoken');
      const response = await fetch('http://192.168.56.1:8000/api/profile/', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken || '',
        },
      });

      if (!response.ok) throw new Error(`Server responded with ${response.status}`);
      const userData = await response.json();
      setUser(userData);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []); // ✅ No dependencies, so it's stable

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]); // ✅ Warning gone


  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  const handleLogout = async () => {
    try {
      const response = await fetch('http://192.168.56.1:8000/api/logout/', {
        method: 'POST',
        credentials: 'include', // ensures cookies/session are sent
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data.message); // Optional: show "Logged out"
        // Redirect or update UI
        window.location.href = '/';
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleProfileClick = () => {
    setShowIdCard(true);
  };

  const handleCloseIdCard = () => {
    setShowIdCard(false);
  };

  if (loading) {
    return (
      <div style={{...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={styles.loadingSpinner}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div style={{...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={styles.errorContainer}>
          <h2>⚠️ Error Loading Dashboard</h2>
          <p>{error}</p>
          <button onClick={fetchUserData} style={styles.sideButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Welcome Section */}
      <div style={styles.welcomeSection}>
        <div style={styles.medicalIcon}>⚕️</div>
        <h1 style={styles.welcomeTitle}>Welcome to CorText</h1>
        <p style={styles.welcomeSubtitle}>Your All-Time Medicine Suggester AI</p>
        <p style={styles.welcomeDescription}>
          Empowering healthcare professionals with intelligent medical insights and personalized treatment recommendations
        </p>
      </div>

      {/* Side Panel */}
      <div 
        style={{
          ...styles.sidePanel,
          ...(sidePanelExpanded ? styles.sidePanelExpanded : styles.sidePanelCollapsed)
        }}
        onMouseEnter={() => setSidePanelExpanded(true)}
        onMouseLeave={() => setSidePanelExpanded(false)}
      >
        <div style={styles.profileImageContainer} onClick={handleProfileClick}>
          {user.profile_image ? (
            <img 
              src={`http://192.168.56.1:8000${user.profile_image}`}
              alt={`${user.first_name} ${user.last_name}`}
              style={hoveredImage ? styles.profileImageHover : styles.profileImage}
              onMouseEnter={() => setHoveredImage(true)}
              onMouseLeave={() => setHoveredImage(false)}
            />
          ) : (
            <div 
              style={styles.defaultAvatar}
              onMouseEnter={() => setHoveredImage(true)}
              onMouseLeave={() => setHoveredImage(false)}
            >
              {user.first_name && user.last_name ? 
                `${user.first_name[0]}${user.last_name[0]}` : 
                '👤'
              }
            </div>
          )}
        </div>

        {sidePanelExpanded && user && (
          <div style={styles.userName}>
            {user.first_name} {user.last_name}
          </div>
        )}

        {sidePanelExpanded && (
          <>
            <button style={styles.sideButton} onClick={() => window.location.href = '/subscribe'}>
              💳 Go to Subscribe
            </button>
            <button style={styles.logoutButton} onClick={handleLogout}>
              🚪 Logout
            </button>
          </>
        )}
      </div>

      {/* ID Card Modal */}
      {showIdCard && (
        <>
          <div style={styles.overlay} onClick={handleCloseIdCard}></div>
          <div style={styles.idCard}>
            <div style={styles.idCardHeader}>
              <div style={styles.idCardTitle}>
                ⚕️ Profile Card
              </div>
              <button style={styles.closeButton} onClick={handleCloseIdCard}>
                ×
              </button>
            </div>
            <div style={styles.idCardBody}>
              <div style={styles.idCardImageSection}>
                {user.profile_image ? (
                  <img 
                    src={`http://192.168.56.1:8000${user.profile_image}`}
                    alt={`${user.first_name} ${user.last_name}`}
                    style={styles.idCardImage}
                  />
                ) : (
                  <div style={styles.idCardDefaultAvatar}>
                    {user.first_name && user.last_name ? 
                      `${user.first_name[0]}${user.last_name[0]}` : 
                      '👤'
                    }
                  </div>
                )}
              </div>

              <div style={styles.idCardInfo}>
                <div style={styles.idCardRow}>
                  <div style={styles.idCardLabel}>First Name</div>
                  <div style={styles.idCardValue}>{user.first_name}</div>
                </div>
                <div style={styles.idCardRow}>
                  <div style={styles.idCardLabel}>Last Name</div>
                  <div style={styles.idCardValue}>{user.last_name}</div>
                </div>
                <div style={styles.idCardRow}>
                  <div style={styles.idCardLabel}>Age</div>
                  <div style={styles.idCardValue}>{user.age} years</div>
                </div>
                <div style={styles.idCardRow}>
                  <div style={styles.idCardLabel}>Gender</div>
                  <div style={styles.idCardValue}>{user.gender}</div>
                </div>
                <div style={styles.idCardRow}>
                  <div style={styles.idCardLabel}>Address</div>
                  <div style={styles.idCardValue}>{user.address || 'Not provided'}</div>
                </div>
                <div style={styles.idCardRow}>
                  <div style={styles.idCardLabel}>Email</div>
                  <div style={styles.idCardValue}>{user.email}</div>
                </div>
              </div>

              <div style={styles.changePasswordLink}>
                <div style={styles.changePasswordText}>
                  🔒 Change Password
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes gradientFlow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}


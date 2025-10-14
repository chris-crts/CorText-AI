import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../cortextPages_Styles/style.css';
import { useAuth } from '../hooks/useAuth';

const style = {
  containerStyle: {
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
    flexDirection: 'column'
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
  profileImage: {
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    border: '4px solid cyan',
    objectFit: 'cover',
    boxShadow: '0 0 30px rgba(0, 201, 212, 0.5), inset 0 2px 4px rgba(0, 0, 0, 0.3)',
    transition: 'all 0.4s ease',
    cursor: 'pointer',
  },
  profileImageHover: {
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    border: '4px solid #0a93a5ff',
    objectFit: 'cover',
    boxShadow: '0 0 50px rgba(24, 118, 142, 0.7), inset 0 2px 4px rgba(0, 0, 0, 0.3)',
    transition: 'all 0.4s ease',
    cursor: 'pointer',
    transform: 'scale(1.1)',
  },
  buttonHover: {
    marginTop: '2rem',
    fontSize: '1rem',
    cursor: 'pointer',
    width: '100%',
    padding: '0.9rem 1.5rem',
    background: 'black', 
    border: '2px solid rgba(0, 212, 170, 0.5)',
    borderRadius: '12px',
    color: '#ffffff',
    fontWeight: '700',
    textTransform: 'uppercase',
    transform: 'scale(1.1)'
  },
};

export default function SubscribePage() {
  const navigate = useNavigate();
  const { isLoggedIn, isAdmin, loading: authLoading } = useAuth();

  const [delayedReady, setDelayedReady] = useState(false);
  const [hoveredImage, setHoveredImage] = useState(false);
  const [hoveredViewPlanButton, setViewPlanHoveredButton] = useState(false);
  const [hoveredDashButton, setDashHoveredButton] = useState(false);

  // Delay before showing content or redirecting
  useEffect(() => {
    const timer = setTimeout(() => {
      setDelayedReady(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (delayedReady && !authLoading) {
      if (!isLoggedIn) {
        navigate('/login');
      } else if (isAdmin) {
        navigate('/admin-login');
      }
    }
  }, [delayedReady, authLoading, isLoggedIn, isAdmin, navigate]);

  if (!delayedReady || authLoading || isLoggedIn === null) {
    return (
      <div style={loadingContainerStyle}>
        <div style={spinnerStyle}></div>
        <p style={loadingTextStyle}>Preparing your CorText experience...</p>
      </div>
    );
  }

  // Only render if logged in
  if (isLoggedIn) {
    return (
      <div style={style.containerStyle}>
        <img 
            src={`./img/AI.png`}
            style={hoveredImage ? style.profileImageHover : style.profileImage}
            alt='logo'
            onMouseEnter={() => setHoveredImage(true)}
            onMouseLeave={() => setHoveredImage(false)}
          />
        <h1 style={style.welcomeTitle}>Subscribe to CorText API</h1>
        <p style={style.welcomeSubtitle}>Choose a plan and get your API key to start integrating semantic medicine suggestions.</p>

        <Link to="/plans">
          <button 
            style={hoveredViewPlanButton ? style.buttonHover : buttonStyle}
            onMouseEnter={() => setViewPlanHoveredButton(true)}
            onMouseLeave={() => setViewPlanHoveredButton(false)}
          >
            View Plans
          </button>
        </Link>
        <Link to="/dashboard">
          <button 
            style={hoveredDashButton ? style.buttonHover : buttonStyle}
            onMouseEnter={() => setDashHoveredButton(true)}
            onMouseLeave={() => setDashHoveredButton(false)}
            >
              Go to Dashboard
            </button>
        </Link>
      </div>
    );
  }

  return null; // fallback (shouldn’t be hit)
}

const spinnerStyle = {
  display: 'inline-block',
  width: '24px',
  height: '24px',
  border: '3px solid rgba(255, 255, 255, 0.3)',
  borderTop: '3px solid #4B9CD3',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
  marginBottom: '1rem'
};

const loadingContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  backgroundColor: '#f4f8fc',
  color: '#4B9CD3',
  fontFamily: 'sans-serif'
};

const loadingTextStyle = {
  fontSize: '1.2rem',
  fontWeight: '500',
  textAlign: 'center'
};

const buttonStyle = {
  marginTop: '2rem',
  fontSize: '1rem',
  cursor: 'pointer',
  width: '100%',
  padding: '0.9rem 1.5rem',
  background: 'black',
  border: '2px solid rgba(0, 212, 170, 0.5)',
  borderRadius: '12px',
  color: '#ffffff',
  fontWeight: '700',
  textTransform: 'uppercase',
  transition: 'all 2s ease',
};

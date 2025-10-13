import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MagicEmailAuth() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isMagicAdmin, setIsMagicAdmin] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkMagicAuth = async () => {
      try {
        const res = await fetch('http://192.168.56.1:8000/api/check-magicEmail-auth/', {
          method: 'GET',
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          setAuthenticated(data.authenticated);
          setIsMagicAdmin(data.is_magic_admin);
        }
      } catch (err) {
        console.error('Magic email auth check failed:', err);
      } finally {
        setAuthChecked(true);
      }
    };

    checkMagicAuth();
  }, []);

  useEffect(() => {
    if (authChecked) {
      if (!authenticated) {
        navigate('/login');
      } else if (!isMagicAdmin) {
        navigate('/unauthorized');
      } else {
        navigate('/adminDash');
      }
    }
  }, [authChecked, authenticated, isMagicAdmin, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <p className="text-white text-xl">Verifying your magic access...</p>
    </div>
  );
}

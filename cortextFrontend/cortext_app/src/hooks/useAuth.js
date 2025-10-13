export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('http://192.168.56.1:8000/api/check-auth/', {
          method: 'GET',
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          setIsLoggedIn(data.is_authenticated);
          setIsAdmin(data.is_admin);
        } else {
          setIsLoggedIn(false);
        }
      } catch (err) {
        setError('Unable to verify session');
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return { isLoggedIn, isAdmin, loading, error };
}

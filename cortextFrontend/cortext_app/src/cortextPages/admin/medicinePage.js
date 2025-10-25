import React, { useState, useEffect } from 'react';
import { Save, Loader2, AlertCircle, CheckCircle, Database } from 'lucide-react';

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom right, #faf5ff, #e0e7ff)',
    padding: '24px',
  },
  maxWidth: {
    maxWidth: '1280px',
    margin: '0 auto',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    padding: '24px',
    marginBottom: '24px',
  },
  headerFlex: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  title: {
    fontSize: '30px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#4b5563',
  },
  statsFlex: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  statsGroup: {
    display: 'flex',
    gap: '24px',
  },
  statBox: {
    marginBottom: '0',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statValueGreen: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#059669',
  },
  statValueYellow: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#d97706',
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#9333ea',
    color: 'white',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '18px',
    fontWeight: '600',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    transition: 'background-color 0.2s',
  },
  buttonHover: {
    backgroundColor: '#7e22ce',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  successAlert: {
    marginTop: '16px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
    padding: '12px 16px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  errorAlert: {
    marginTop: '16px',
    backgroundColor: '#fef2f2',
    border: "1px solid #fecaca",
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  loadingCenter: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    padding: '48px',
    textAlign: 'center',
  },
  loadingTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: '8px',
  },
  loadingText: {
    color: '#6b7280',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(1, 1fr)',
    gap: '16px',
  },
  gridMd: {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },
  gridLg: {
    gridTemplateColumns: 'repeat(3, 1fr)',
  },
  medicineCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    padding: '16px',
    transition: 'box-shadow 0.2s',
  },
  medicineCardHover: {
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  medicineHeader: {
    marginBottom: '12px',
  },
  medicineName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  medicineSource: {
    fontSize: '12px',
    color: '#6b7280',
  },
  fieldContainer: {
    marginBottom: '12px',
  },
  fieldLabel: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#4b5563',
    marginBottom: '4px',
  },
  list: {
    listStyle: 'disc',
    listStylePosition: 'inside',
  },
  listItem: {
    fontSize: '14px',
    color: '#374151',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  listMore: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  iconSpin: {
    animation: 'spin 1s linear infinite',
  },
};

export default function MedicineBulkLoader() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveResult, setSaveResult] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);

  const API_BASE_URL = 'http://localhost:8000';

  const fetchAllMedicines = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://api.fda.gov/drug/label.json?limit=999');

      if (!response.ok) {
        throw new Error('Failed to fetch medicines from openFDA');
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const medicinesList = data.results.map((result, index) => {
          const brandNames = result.openfda?.brand_name || [];
          const genericNames = result.openfda?.generic_name || [];
          const name = brandNames[0] || genericNames[0] || `Medicine ${index + 1}`;

          return {
            id: `medicine-${index}-${Date.now()}`,
            name: name,
            brand_name: brandNames,
            generic_name: genericNames,
            active_ingredient: result.active_ingredient || [],
            indications: result.indications_and_usage || [],
            warnings: result.warnings || [],
            dosage: result.dosage_and_administration || [],
          };
        });

        setMedicines(medicinesList);
      } else {
        setError('No medicines found');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch medicines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllMedicines();
  }, []);

  const saveAllToDatabase = async () => {
    if (medicines.length === 0) {
      setError('No medicines to save');
      return;
    }

    setSaving(true);
    setError('');
    setSaveResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/save_all_medicines/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          medicines: medicines.map(med => ({
            name: med.name,
            brand_name: med.brand_name,
            generic_name: med.generic_name,
            active_ingredient: med.active_ingredient,
            indications: med.indications,
            warnings: med.warnings,
            dosage: med.dosage,
          }))
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save medicines');
      }

      setSaveResult(data);
    } catch (err) {
      setError(err.message || 'Failed to save medicines to database');
    } finally {
      setSaving(false);
    }
  };

  const renderArrayField = (label, data) => {
    if (!data || data.length === 0) return null;
    return (
      <div style={styles.fieldContainer}>
        <h4 style={styles.fieldLabel}>{label}</h4>
        <ul style={styles.list}>
          {data.slice(0, 3).map((item, idx) => (
            <li key={idx} style={styles.listItem}>{item}</li>
          ))}
          {data.length > 3 && (
            <li style={styles.listMore}>+ {data.length - 3} more...</li>
          )}
        </ul>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @media (min-width: 768px) {
            .grid-responsive {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          @media (min-width: 1024px) {
            .grid-responsive {
              grid-template-columns: repeat(3, 1fr);
            }
          }
        `}
      </style>
      <div style={styles.maxWidth}>
        <div style={styles.card}>
          <div style={styles.headerFlex}>
            <div>
              <h1 style={styles.title}>Medicine Bulk Loader</h1>
              <p style={styles.subtitle}>
                Load all medicines from openFDA API and save them to your database in bulk
              </p>
            </div>
            <Database size={48} color="#9333ea" />
          </div>

          <div style={styles.statsFlex}>
            <div style={styles.statsGroup}>
              <div style={styles.statBox}>
                <p style={styles.statLabel}>Total Medicines</p>
                <p style={styles.statValue}>{medicines.length}</p>
              </div>
              {saveResult && (
                <>
                  <div style={styles.statBox}>
                    <p style={styles.statLabel}>Saved</p>
                    <p style={styles.statValueGreen}>{saveResult.saved}</p>
                  </div>
                  <div style={styles.statBox}>
                    <p style={styles.statLabel}>Skipped</p>
                    <p style={styles.statValueYellow}>{saveResult.skipped}</p>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={saveAllToDatabase}
              disabled={saving || loading || medicines.length === 0}
              style={{
                ...styles.button,
                ...(saving || loading || medicines.length === 0 ? styles.buttonDisabled : {}),
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={20} style={styles.iconSpin} />
                  Saving {medicines.length} medicines...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Save All to Database
                </>
              )}
            </button>
          </div>

          {saveResult && !error && (
            <div style={styles.successAlert}>
              <CheckCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ fontWeight: '600' }}>{saveResult.message}</p>
                <p style={{ fontSize: '14px' }}>
                  Saved: {saveResult.saved} | Skipped: {saveResult.skipped} | Total: {saveResult.total}
                </p>
                {saveResult.errors && saveResult.errors.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <p style={{ fontSize: '14px', fontWeight: '600' }}>Errors:</p>
                    <ul style={{ fontSize: '12px', listStyle: 'disc', listStylePosition: 'inside' }}>
                      {saveResult.errors.slice(0, 5).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div style={styles.errorAlert}>
              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {loading && (
          <div style={styles.loadingCenter}>
            <Loader2 size={64} color="#9333ea" style={{ ...styles.iconSpin, margin: '0 auto 16px' }} />
            <h3 style={styles.loadingTitle}>Loading all medicines...</h3>
            <p style={styles.loadingText}>Fetching 999 medicines from openFDA API</p>
          </div>
        )}

        {!loading && medicines.length > 0 && (
          <div style={styles.grid} className="grid-responsive">
            {medicines.map((medicine) => (
              <div
                key={medicine.id}
                style={{
                  ...styles.medicineCard,
                  ...(hoveredCard === medicine.id ? styles.medicineCardHover : {}),
                }}
                onMouseEnter={() => setHoveredCard(medicine.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div style={styles.medicineHeader}>
                  <h2 style={styles.medicineName}>{medicine.name}</h2>
                  <p style={styles.medicineSource}>Source: openFDA</p>
                </div>

                <div>
                  {renderArrayField('Brand Names', medicine.brand_name)}
                  {renderArrayField('Generic Names', medicine.generic_name)}
                  {renderArrayField('Active Ingredients', medicine.active_ingredient)}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && medicines.length === 0 && !error && (
          <div style={styles.loadingCenter}>
            <AlertCircle size={64} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
            <h3 style={styles.loadingTitle}>No medicines found</h3>
            <p style={styles.loadingText}>Unable to load medicines from openFDA API</p>
          </div>
        )}
      </div>
    </div>
  );
}
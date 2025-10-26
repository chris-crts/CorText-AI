import React, { useState } from 'react';
import { Save, Loader2, AlertCircle, CheckCircle, Database, RefreshCw } from 'lucide-react';

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
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '16px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#9333ea',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '8px',
    textAlign: 'center',
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
    border: '1px solid #fecaca',
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
  medicineCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    padding: '20px',
    transition: 'box-shadow 0.2s',
  },
  medicineCardHover: {
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  medicineName: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '2px solid #e0e7ff',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '4px',
    marginLeft: '8px',
  },
  badgeRxNorm: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  badgeDailyMed: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  fieldRow: {
    marginBottom: '16px',
  },
  fieldLabel: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  fieldValue: {
    fontSize: '15px',
    color: '#374151',
    lineHeight: '1.6',
  },
  fieldValueList: {
    fontSize: '15px',
    color: '#374151',
    lineHeight: '1.6',
    paddingLeft: '0',
    listStyle: 'none',
  },
  listItem: {
    marginBottom: '4px',
    paddingLeft: '12px',
    position: 'relative',
  },
  iconSpin: {
    animation: 'spin 1s linear infinite',
  },
  checkbox: {
    marginRight: '8px',
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '16px',
    color: '#374151',
    cursor: 'pointer',
  },
};

export default function MedicineBulkLoader() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [normalizing, setNormalizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveResult, setSaveResult] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [enrichWithDailyMed, setEnrichWithDailyMed] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });

  const API_BASE_URL = 'http://192.168.56.1:8000';

  // Fetch from openFDA
  const fetchFromOpenFDA = async () => {
    setProgress({ current: 0, total: 900, stage: 'Fetching from openFDA' });
    const response = await fetch('https://api.fda.gov/drug/label.json?limit=900');
    if (!response.ok) throw new Error('Failed to fetch from openFDA');
    
    const data = await response.json();
    if (!data.results) throw new Error('No results from openFDA');
    
    return data.results.map((result, index) => {
      const brandNames = result.openfda?.brand_name || [];
      const genericNames = result.openfda?.generic_name || [];
      const name = brandNames[0] || genericNames[0] || `Medicine ${index + 1}`;

      return {
        id: `medicine-${index}`,
        name: name,
        brand_name: brandNames,
        generic_name: genericNames,
        indications: result.indications_and_usage || [],
        warnings: result.warnings || [],
        dosage: result.dosage_and_administration || [],
        normalized: false,
        enriched: false,
      };
    });
  };

  // Normalize with RxNorm
  const normalizeWithRxNorm = async (medicineName) => {
    try {
      const response = await fetch(
        `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(medicineName)}`
      );
      const data = await response.json();
      
      if (data.idGroup?.rxnormId?.[0]) {
        const rxcui = data.idGroup.rxnormId[0];
        
        // Get normalized name
        const detailResponse = await fetch(
          `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/properties.json`
        );
        const detailData = await detailResponse.json();
        
        return {
          rxcui: rxcui,
          normalizedName: detailData.properties?.name || medicineName,
        };
      }
      return null;
    } catch (err) {
      console.error(`RxNorm normalization failed for ${medicineName}:`, err);
      return null;
    }
  };

  // Enrich with DailyMed
  const enrichWithDailyMedData = async (medicineName) => {
    try {
      const response = await fetch(
        `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=${encodeURIComponent(medicineName)}`
      );
      const data = await response.json();
      
      if (data.data?.[0]) {
        const setid = data.data[0].setid;
        
        // Get detailed info
        const detailResponse = await fetch(
          `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/${setid}.json`
        );
        const detailData = await detailResponse.json();
        
        return {
          dailymedId: setid,
          manufacturer: detailData.data?.[0]?.labeler || '',
          packageInfo: detailData.data?.[0]?.packaging || '',
        };
      }
      return null;
    } catch (err) {
      console.error(`DailyMed enrichment failed for ${medicineName}:`, err);
      return null;
    }
  };

  // Main fetch and normalize process
  const fetchAndNormalize = async () => {
    setLoading(true);
    setNormalizing(false);
    setError('');
    setMedicines([]);

    try {
      // Step 1: Fetch from openFDA
      const openFDAData = await fetchFromOpenFDA();
      setMedicines(openFDAData);
      
      // Step 2: Normalize with RxNorm
      setNormalizing(true);
      setProgress({ current: 0, total: openFDAData.length, stage: 'Normalizing with RxNorm' });
      
      const normalized = [];
      for (let i = 0; i < openFDAData.length; i++) {
        const medicine = openFDAData[i];
        setProgress({ current: i + 1, total: openFDAData.length, stage: 'Normalizing with RxNorm' });
        
        const rxnormData = await normalizeWithRxNorm(medicine.name);
        
        let enrichedMedicine = {
          ...medicine,
          normalized: !!rxnormData,
        };
        
        if (rxnormData) {
          enrichedMedicine.rxcui = rxnormData.rxcui;
          enrichedMedicine.normalizedName = rxnormData.normalizedName;
        }
        
        // Step 3: Optionally enrich with DailyMed
        if (enrichWithDailyMed) {
          setProgress({ current: i + 1, total: openFDAData.length, stage: 'Enriching with DailyMed' });
          const dailymedData = await enrichWithDailyMedData(medicine.name);
          
          if (dailymedData) {
            enrichedMedicine = {
              ...enrichedMedicine,
              enriched: true,
              dailymedId: dailymedData.dailymedId,
              manufacturer: dailymedData.manufacturer,
              packageInfo: dailymedData.packageInfo,
            };
          }
        }
        
        normalized.push(enrichedMedicine);
        
        // Update UI every 10 medicines
        if (i % 10 === 0) {
          setMedicines([...normalized]);
        }
        
        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setMedicines(normalized);
      setProgress({ current: normalized.length, total: normalized.length, stage: 'Complete' });
      
    } catch (err) {
      setError(err.message || 'Failed to fetch and normalize medicines');
    } finally {
      setLoading(false);
      setNormalizing(false);
    }
  };

  const saveAllToDatabase = async () => {
    if (medicines.length === 0) {
      setError('No medicines to save');
      return;
    }

    setSaving(true);
    setError('');
    setSaveResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/save_all_medicines/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          medicines: medicines.map(med => ({
            name: med.normalizedName || med.name,
            brand_name: med.brand_name,
            generic_name: med.generic_name,
            indications: med.indications,
            warnings: med.warnings,
            dosage: med.dosage,
            rxcui: med.rxcui,
            dailymed_id: med.dailymedId,
            manufacturer: med.manufacturer,
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

  const renderField = (label, value) => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return null;
    }

    if (Array.isArray(value)) {
      return (
        <div style={styles.fieldRow}>
          <div style={styles.fieldLabel}>{label}</div>
          <ul style={styles.fieldValueList}>
            {value.slice(0, 2).map((item, idx) => (
              <li key={idx} style={styles.listItem}>
                <span style={{ position: 'absolute', left: '0', color: '#9333ea' }}>•</span>
                {item.length > 150 ? item.substring(0, 150) + '...' : item}
              </li>
            ))}
            {value.length > 2 && (
              <li style={{ ...styles.listItem, fontStyle: 'italic', color: '#6b7280' }}>
                + {value.length - 2} more...
              </li>
            )}
          </ul>
        </div>
      );
    }

    return (
      <div style={styles.fieldRow}>
        <div style={styles.fieldLabel}>{label}</div>
        <div style={styles.fieldValue}>{value}</div>
      </div>
    );
  };

  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

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
              <h1 style={styles.title}>Medicine Data Pipeline</h1>
              <p style={styles.subtitle}>
                Fetch → Normalize with RxNorm → Optionally Enrich with DailyMed → Save
              </p>
            </div>
            <Database size={48} color="#9333ea" />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={enrichWithDailyMed}
                onChange={(e) => setEnrichWithDailyMed(e.target.checked)}
                style={styles.checkbox}
                disabled={loading || normalizing}
              />
              Enrich with DailyMed (manufacturer, packaging info)
            </label>
          </div>

          <button
            onClick={fetchAndNormalize}
            disabled={loading || normalizing}
            style={{
              ...styles.button,
              ...(loading || normalizing ? styles.buttonDisabled : {}),
              width: '100%',
              justifyContent: 'center',
            }}
          >
            {loading || normalizing ? (
              <>
                <Loader2 size={20} style={styles.iconSpin} />
                {progress.stage}...
              </>
            ) : (
              <>
                <RefreshCw size={20} />
                Start Data Pipeline
              </>
            )}
          </button>

          {(loading || normalizing) && (
            <>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${progressPercentage}%` }} />
              </div>
              <div style={styles.progressText}>
                {progress.current} / {progress.total} medicines processed
              </div>
            </>
          )}

          <div style={styles.statsFlex}>
            <div style={styles.statsGroup}>
              <div style={styles.statBox}>
                <p style={styles.statLabel}>Total Medicines</p>
                <p style={styles.statValue}>{medicines.length}</p>
              </div>
              <div style={styles.statBox}>
                <p style={styles.statLabel}>RxNorm Normalized</p>
                <p style={styles.statValueGreen}>
                  {medicines.filter(m => m.normalized).length}
                </p>
              </div>
              {enrichWithDailyMed && (
                <div style={styles.statBox}>
                  <p style={styles.statLabel}>DailyMed Enriched</p>
                  <p style={styles.statValueYellow}>
                    {medicines.filter(m => m.enriched).length}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={saveAllToDatabase}
              disabled={saving || loading || normalizing || medicines.length === 0}
              style={{
                ...styles.button,
                ...(saving || loading || normalizing || medicines.length === 0 ? styles.buttonDisabled : {}),
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={20} style={styles.iconSpin} />
                  Saving...
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

        {!loading && !normalizing && medicines.length > 0 && (
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
                <h2 style={styles.medicineName}>
                  {medicine.normalizedName || medicine.name}
                  {medicine.normalized && (
                    <span style={{ ...styles.badge, ...styles.badgeRxNorm }}>RxNorm</span>
                  )}
                  {medicine.enriched && (
                    <span style={{ ...styles.badge, ...styles.badgeDailyMed }}>DailyMed</span>
                  )}
                </h2>

                {medicine.rxcui && renderField('RxCUI', medicine.rxcui)}
                {medicine.manufacturer && renderField('Manufacturer', medicine.manufacturer)}
                {renderField('Brand Names', medicine.brand_name)}
                {renderField('Generic Names', medicine.generic_name)}
                {renderField('Indications & Usage', medicine.indications)}
                {renderField('Warnings', medicine.warnings)}
                {renderField('Dosage & Administration', medicine.dosage)}
              </div>
            ))}
          </div>
        )}

        {!loading && !normalizing && medicines.length === 0 && (
          <div style={styles.loadingCenter}>
            <Database size={64} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
            <h3 style={styles.loadingTitle}>Ready to fetch medicines</h3>
            <p style={styles.loadingText}>Click "Start Data Pipeline" to begin</p>
          </div>
        )}
      </div>
    </div>
  );
}
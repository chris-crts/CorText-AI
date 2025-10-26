import React, { useState, useEffect } from 'react';
import { Plus, Save, CheckCircle, AlertCircle, Database, Sparkles } from 'lucide-react';

export default function AddMedicineForm() {
  const [formData, setFormData] = useState({
    name: '',
    brand_name: '',
    generic_name: '',
    active_ingredient: '',
    indications: '',
    warnings: '',
    dosage: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [dbStats, setDbStats] = useState(null);
  const [progress, setProgress] = useState(0);

  // Fetch database statistics on component mount
  useEffect(() => {
    fetchDatabaseStats();
  }, []);

  // Simulate progress during loading
  useEffect(() => {
    if (loading) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 300);
      return () => clearInterval(interval);
    }
  }, [loading]);

  const fetchDatabaseStats = async () => {
    try {
      const response = await fetch('http://192.168.56.1:8000/api/medicines/stats/');
      const data = await response.json();
      if (data.success) {
        setDbStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Medicine name is required' });
      return;
    }

    setLoading(true);
    setProgress(0);
    setMessage({ type: '', text: '' });

    try {
      const medicineData = {
        name: formData.name.trim(),
        brand_name: formData.brand_name.split(',').map(s => s.trim()).filter(s => s),
        generic_name: formData.generic_name.split(',').map(s => s.trim()).filter(s => s),
        active_ingredient: formData.active_ingredient.split(',').map(s => s.trim()).filter(s => s),
        indications: formData.indications.split(',').map(s => s.trim()).filter(s => s),
        warnings: formData.warnings.split(',').map(s => s.trim()).filter(s => s),
        dosage: formData.dosage.split(',').map(s => s.trim()).filter(s => s)
      };

      const response = await fetch('http://192.168.56.1:8000/api/medicines/add/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(medicineData)
      });

      const data = await response.json();
      setProgress(100);

      setTimeout(() => {
        if (data.success) {
          setMessage({ 
            type: 'success', 
            text: `✅ ${data.message}` 
          });
          
          setFormData({
            name: '',
            brand_name: '',
            generic_name: '',
            active_ingredient: '',
            indications: '',
            warnings: '',
            dosage: ''
          });

          fetchDatabaseStats();
        } else {
          setMessage({ 
            type: 'error', 
            text: `❌ ${data.error}` 
          });
        }
        setLoading(false);
      }, 500);
    } catch (error) {
      setProgress(100);
      setTimeout(() => {
        setMessage({ 
          type: 'error', 
          text: `❌ Error: ${error.message}` 
        });
        setLoading(false);
      }, 500);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #7e87b8ff 0%, #274a6aff 100%)',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    },
    mainCard: {
      maxWidth: '1000px',
      margin: '0 auto'
    },
    headerCard: {
      background: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '16px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      padding: '2rem',
      marginBottom: '2rem',
      backdropFilter: 'blur(10px)'
    },
    headerContent: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '1.5rem'
    },
    title: {
      fontSize: '2rem',
      fontWeight: '800',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      margin: 0
    },
    subtitle: {
      color: '#6b7280',
      marginTop: '0.5rem',
      fontSize: '0.95rem'
    },
    statsBox: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '12px',
      padding: '1.25rem',
      color: 'white',
      minWidth: '200px'
    },
    statsTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '0.75rem',
      fontSize: '0.95rem',
      fontWeight: '600'
    },
    statsItem: {
      fontSize: '0.875rem',
      marginBottom: '0.25rem',
      opacity: 0.95
    },
    statsNumber: {
      fontWeight: '700',
      fontSize: '1.5rem',
      color: '#fbbf24'
    },
    messageBox: {
      borderRadius: '12px',
      padding: '1rem',
      marginBottom: '2rem',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      animation: 'slideDown 0.3s ease-out'
    },
    successBox: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: 'white',
      boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)'
    },
    errorBox: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: 'white',
      boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)'
    },
    formCard: {
      background: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '16px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      padding: '2.5rem',
      backdropFilter: 'blur(10px)'
    },
    formGroup: {
      marginBottom: '1.5rem'
    },
    label: {
      display: 'block',
      fontSize: '0.875rem',
      fontWeight: '700',
      color: '#374151',
      marginBottom: '0.5rem',
      letterSpacing: '0.025em'
    },
    required: {
      color: '#ef4444',
      marginLeft: '0.25rem'
    },
    input: {
      width: '100%',
      padding: '0.875rem 1rem',
      border: '2px solid #e5e7eb',
      borderRadius: '10px',
      fontSize: '0.95rem',
      transition: 'all 0.2s ease',
      outline: 'none',
      background: 'white'
    },
    inputFocus: {
      borderColor: '#667eea',
      boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)'
    },
    textarea: {
      width: '100%',
      padding: '0.875rem 1rem',
      border: '2px solid #e5e7eb',
      borderRadius: '10px',
      fontSize: '0.95rem',
      transition: 'all 0.2s ease',
      outline: 'none',
      resize: 'vertical',
      fontFamily: 'inherit',
      background: 'white'
    },
    hint: {
      fontSize: '0.75rem',
      color: '#9ca3af',
      marginTop: '0.375rem'
    },
    buttonContainer: {
      display: 'flex',
      gap: '1rem',
      paddingTop: '1.5rem',
      borderTop: '2px solid #f3f4f6',
      marginTop: '1rem'
    },
    submitButton: {
      flex: 1,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '1rem 2rem',
      borderRadius: '10px',
      fontWeight: '700',
      fontSize: '1rem',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
    },
    submitButtonHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)'
    },
    submitButtonDisabled: {
      background: '#9ca3af',
      cursor: 'not-allowed',
      boxShadow: 'none'
    },
    clearButton: {
      padding: '1rem 2rem',
      border: '2px solid #e5e7eb',
      borderRadius: '10px',
      fontWeight: '700',
      fontSize: '1rem',
      background: 'white',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    clearButtonHover: {
      background: '#f9fafb',
      borderColor: '#d1d5db'
    },
    infoPanel: {
      background: 'black',
      border: '2px solid rgba(102, 126, 234, 0.3)',
      borderRadius: '16px',
      padding: '1.5rem',
      marginTop: '2rem'
    },
    infoTitle: {
      fontWeight: '700',
      color: '#4f46e5',
      marginBottom: '1rem',
      fontSize: '1.1rem'
    },
    infoList: {
      listStyle: 'none',
      padding: 0,
      margin: 0
    },
    infoItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      marginBottom: '0.75rem',
      fontSize: '0.9rem',
      color: '#4b5563',
      lineHeight: '1.6'
    },
    infoNumber: {
      fontWeight: '800',
      color: '#667eea',
      minWidth: '1.5rem',
      marginTop: '0.125rem'
    },
    loadingOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.3s ease-out'
    },
    loadingCard: {
      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%)',
      borderRadius: '24px',
      padding: '3rem',
      textAlign: 'center',
      maxWidth: '500px',
      boxShadow: '0 25px 80px rgba(102, 126, 234, 0.5)',
      border: '2px solid rgba(255, 255, 255, 0.2)'
    },
    loadingTitle: {
      color: 'white',
      fontSize: '1.75rem',
      fontWeight: '800',
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem'
    },
    loadingSubtitle: {
      color: 'rgba(255, 255, 255, 0.9)',
      fontSize: '1rem',
      marginBottom: '2rem'
    },
    progressBar: {
      width: '100%',
      height: '8px',
      background: 'rgba(255, 255, 255, 0.2)',
      borderRadius: '999px',
      overflow: 'hidden',
      marginBottom: '1rem'
    },
    progressFill: {
      height: '100%',
      background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
      borderRadius: '999px',
      transition: 'width 0.3s ease',
      boxShadow: '0 0 20px rgba(251, 191, 36, 0.8)'
    },
    progressText: {
      color: '#fbbf24',
      fontSize: '1.5rem',
      fontWeight: '800',
      marginBottom: '1.5rem'
    },
    loadingSteps: {
      textAlign: 'left',
      marginTop: '2rem'
    },
    loadingStep: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: '0.9rem',
      marginBottom: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    activeStep: {
      color: 'white',
      fontWeight: '600'
    },
    spinner: {
      width: '80px',
      height: '80px',
      margin: '0 auto 2rem',
      border: '6px solid rgba(255, 255, 255, 0.2)',
      borderTop: '6px solid #fbbf24',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }
  };

  const getLoadingStep = () => {
    if (progress < 20) return 0;
    if (progress < 40) return 1;
    if (progress < 60) return 2;
    if (progress < 80) return 3;
    return 4;
  };

  const loadingSteps = [
    '🔍 Validating medicine data...',
    '🧠 Generating BioBERT embeddings (768 dimensions)...',
    '📊 Adding vector to FAISS index...',
    '💾 Updating JSON metadata...',
    '✅ Synchronizing database files...'
  ];

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideDown {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
          input:focus, textarea:focus {
            border-color: #667eea !important;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
          }
          button:hover:not(:disabled) {
            transform: translateY(-2px);
          }
        `}
      </style>

      {/* Cinematic Loading Overlay */}
      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingCard}>
            <div style={styles.spinner}></div>
            
            <div style={styles.loadingTitle}>
              <Sparkles size={28} />
              Processing Medicine
            </div>
            
            <div style={styles.loadingSubtitle}>
              Adding to vector database with semantic embeddings
            </div>

            <div style={styles.progressBar}>
              <div style={{...styles.progressFill, width: `${progress}%`}}></div>
            </div>

            <div style={styles.progressText}>
              {Math.round(progress)}%
            </div>

            <div style={styles.loadingSteps}>
              {loadingSteps.map((step, index) => (
                <div 
                  key={index}
                  style={{
                    ...styles.loadingStep,
                    ...(index === getLoadingStep() ? styles.activeStep : {}),
                    animation: index === getLoadingStep() ? 'pulse 1.5s ease-in-out infinite' : 'none'
                  }}
                >
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={styles.mainCard}>
        {/* Header */}
        <div style={styles.headerCard}>
          <div style={styles.headerContent}>
            <div>
              <h1 style={styles.title}>
                <Plus size={32} />
                Add Medicine to Vector Database
              </h1>
              <p style={styles.subtitle}>
                Add new medicine entries with semantic embeddings powered by BioBERT
              </p>
            </div>
            {dbStats && (
              <div style={styles.statsBox}>
                <div style={styles.statsTitle}>
                  <Database size={20} />
                  <span>Database Stats</span>
                </div>
                <div style={styles.statsItem}>
                  Total: <span style={styles.statsNumber}>{dbStats.total_medicines}</span> medicines
                </div>
                <div style={styles.statsItem}>
                  Normalized: {dbStats.normalized_count}
                </div>
                <div style={styles.statsItem}>
                  Enriched: {dbStats.enriched_count}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div style={{
            ...styles.messageBox,
            ...(message.type === 'success' ? styles.successBox : styles.errorBox)
          }}>
            {message.type === 'success' ? (
              <CheckCircle size={24} style={{flexShrink: 0}} />
            ) : (
              <AlertCircle size={24} style={{flexShrink: 0}} />
            )}
            <div style={{flex: 1}}>
              <p style={{margin: 0, fontWeight: '600', fontSize: '1rem'}}>
                {message.text}
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.formCard}>
          {/* Medicine Name */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Medicine Name <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Aspirin"
              required
              style={styles.input}
            />
            <p style={styles.hint}>Primary name of the medicine</p>
          </div>

          {/* Brand Names */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Brand Names</label>
            <input
              type="text"
              name="brand_name"
              value={formData.brand_name}
              onChange={handleChange}
              placeholder="e.g., Bayer Aspirin, Ecotrin"
              style={styles.input}
            />
            <p style={styles.hint}>Comma-separated list of brand names</p>
          </div>

          {/* Generic Names */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Generic Names</label>
            <input
              type="text"
              name="generic_name"
              value={formData.generic_name}
              onChange={handleChange}
              placeholder="e.g., aspirin, acetylsalicylic acid"
              style={styles.input}
            />
            <p style={styles.hint}>Comma-separated list of generic names</p>
          </div>

          {/* Active Ingredients */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Active Ingredients</label>
            <textarea
              name="active_ingredient"
              value={formData.active_ingredient}
              onChange={handleChange}
              placeholder="e.g., aspirin 325mg, aspirin 81mg"
              rows="2"
              style={styles.textarea}
            />
            <p style={styles.hint}>Comma-separated list of active ingredients with dosages</p>
          </div>

          {/* Indications */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Indications & Usage</label>
            <textarea
              name="indications"
              value={formData.indications}
              onChange={handleChange}
              placeholder="e.g., pain relief, fever reduction, anti-inflammatory"
              rows="3"
              style={styles.textarea}
            />
            <p style={styles.hint}>What conditions this medicine treats (comma-separated)</p>
          </div>

          {/* Warnings */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Warnings & Precautions</label>
            <textarea
              name="warnings"
              value={formData.warnings}
              onChange={handleChange}
              placeholder="e.g., GI bleeding risk, avoid with blood thinners, not for children"
              rows="3"
              style={styles.textarea}
            />
            <p style={styles.hint}>Important safety information (comma-separated)</p>
          </div>

          {/* Dosage */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Dosage & Administration</label>
            <textarea
              name="dosage"
              value={formData.dosage}
              onChange={handleChange}
              placeholder="e.g., 325mg orally every 4-6 hours as needed, 81mg daily for prevention"
              rows="2"
              style={styles.textarea}
            />
            <p style={styles.hint}>How to take the medicine (comma-separated)</p>
          </div>

          {/* Buttons */}
          <div style={styles.buttonContainer}>
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitButton,
                ...(loading ? styles.submitButtonDisabled : {})
              }}
            >
              <Save size={20} />
              Add to Vector Database
            </button>
            
            <button
              type="button"
              onClick={() => setFormData({
                name: '',
                brand_name: '',
                generic_name: '',
                active_ingredient: '',
                indications: '',
                warnings: '',
                dosage: ''
              })}
              disabled={loading}
              style={styles.clearButton}
            >
              Clear Form
            </button>
          </div>
        </form>

        {/* Info Panel */}
        <div style={styles.infoPanel}>
          <h3 style={styles.infoTitle}>ℹ️ How it works</h3>
          <ul style={styles.infoList}>
            <li style={styles.infoItem}>
              <span style={styles.infoNumber}>1.</span>
              <span>Your medicine data is converted to text and embedded using BioBERT (768-dimensional vectors)</span>
            </li>
            <li style={styles.infoItem}>
              <span style={styles.infoNumber}>2.</span>
              <span>The vector is added to the FAISS index (.ann file) for fast similarity search</span>
            </li>
            <li style={styles.infoItem}>
              <span style={styles.infoNumber}>3.</span>
              <span>The complete medicine profile is saved to the JSON metadata file</span>
            </li>
            <li style={styles.infoItem}>
              <span style={styles.infoNumber}>4.</span>
              <span>Both files remain synchronized - no need to rebuild existing medicines!</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
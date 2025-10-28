import React, { useState, useEffect } from 'react';
import { User, Heart, AlertTriangle, CheckCircle, Sparkles, Shield, Activity, Brain, Pill, Zap } from 'lucide-react';

export default function PatientRecommendation() {
  const [patientData, setPatientData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    weight_kg: '',
    height_cm: '',
    chief_complaint: '',
    diagnosis: '',
    symptoms: '',
    medical_history: '',
    current_medications: '',
    drug_allergies: '',
    adverse_reactions: '',
    blood_pressure: '',
    renal_creatinine: '',
    renal_gfr: '',
    liver_alt: '',
    liver_ast: '',
    pregnancy_status: 'Not applicable',
    smoking_status: 'never',
    alcohol_use: '',
    preferred_route: 'oral'
  });

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [step, setStep] = useState('input');
  const [recommendations, setRecommendations] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (loading) {
      setProgress(0);
      setLoadingPhase(0);
      
      // Generate particles for animation
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        duration: Math.random() * 3 + 2
      }));
      setParticles(newParticles);

      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) return 100;
          const increment = Math.random() * 8 + 2;
          const newProgress = prev + increment;
          
          // Update phase based on progress
          if (newProgress < 20) setLoadingPhase(0);
          else if (newProgress < 40) setLoadingPhase(1);
          else if (newProgress < 60) setLoadingPhase(2);
          else if (newProgress < 80) setLoadingPhase(3);
          else setLoadingPhase(4);
          
          return Math.min(newProgress, 95);
        });
      }, 300);

      return () => clearInterval(interval);
    }
  }, [loading]);

  const handleChange = (e) => {
    setPatientData({
      ...patientData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async () => {
    // Validate
    if (!patientData.name || !patientData.age || !patientData.chief_complaint || !patientData.diagnosis) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setLoading(true);
    setProgress(0);
    setStep('processing');
    setMessage({ type: '', text: '' });

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + Math.random() * 10, 85));
      }, 400);

      // Step 1: Add patient
      const patientPayload = {
        name: patientData.name,
        age: parseInt(patientData.age),
        gender: patientData.gender,
        weight_kg: patientData.weight_kg ? parseFloat(patientData.weight_kg) : null,
        height_cm: patientData.height_cm ? parseFloat(patientData.height_cm) : null,
        chief_complaint: patientData.chief_complaint,
        diagnosis: patientData.diagnosis,
        symptoms: patientData.symptoms.split(',').map(s => s.trim()).filter(s => s),
        medical_history: patientData.medical_history.split(',').map(s => s.trim()).filter(s => s),
        current_medications: patientData.current_medications.split(',').map(s => s.trim()).filter(s => s),
        drug_allergies: patientData.drug_allergies.split(',').map(s => s.trim()).filter(s => s),
        adverse_reactions: patientData.adverse_reactions.split(',').map(s => s.trim()).filter(s => s),
        blood_pressure: patientData.blood_pressure,
        renal_function: {
          creatinine_mg_dl: patientData.renal_creatinine ? parseFloat(patientData.renal_creatinine) : null,
          GFR_ml_min: patientData.renal_gfr ? parseFloat(patientData.renal_gfr) : null
        },
        liver_function: {
          ALT_U_L: patientData.liver_alt ? parseFloat(patientData.liver_alt) : null,
          AST_U_L: patientData.liver_ast ? parseFloat(patientData.liver_ast) : null
        },
        pregnancy_status: patientData.pregnancy_status,
        smoking_status: patientData.smoking_status,
        alcohol_use: patientData.alcohol_use,
        preferred_route: patientData.preferred_route
      };

      const patientResponse = await fetch('http://192.168.56.1:8000/api/patients/add/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientPayload)
      });

      const patientResult = await patientResponse.json();
      
      if (!patientResult.success) {
        throw new Error(patientResult.error);
      }

      setProgress(50);

      // Step 2: Generate recommendations
      const recResponse = await fetch('http://192.168.56.1:8000/api/patients/recommend/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientResult.data.patient_id,
          top_k: 10,
          similarity_threshold: 0.75
        })
      });

      const recResult = await recResponse.json();
      
      clearInterval(progressInterval);
      setProgress(100);

      if (recResult.success) {
        setRecommendations(recResult.data);
        setStep('results');
        setMessage({ type: 'success', text: `Successfully generated ${recResult.data.recommendations.length} recommendations` });
      } else {
        throw new Error(recResult.error);
      }

      setLoading(false);

    } catch (error) {
      setLoading(false);
      setStep('input');
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    }
  };

   const phases = [
    { icon: Brain, title: 'Analyzing Patient Data', desc: 'Processing clinical information with BioBERT' },
    { icon: Activity, title: 'Generating Embeddings', desc: 'Creating 768-dimensional semantic vectors' },
    { icon: Zap, title: 'Matching Medicines', desc: 'Searching 1000+ medicines using FAISS index' },
    { icon: Shield, title: 'Safety Validation', desc: 'Checking allergies and contraindications' },
    { icon: Pill, title: 'Finalizing Results', desc: 'Ranking by confidence and safety scores' }
  ];

  const getSafetyColor = (isSafe) => isSafe ? '#10b981' : '#ef4444';
  const getConfidenceColor = (confidence) => {
    const conf = confidence.toLowerCase();
    if (conf === 'high' || conf.includes('high')) return '#10b981';
    if (conf === 'medium' || conf.includes('medium')) return '#f59e0b';
    return '#ef4444';
  };

  const s = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    card: {
      background: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '20px',
      boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
      padding: '2.5rem',
      maxWidth: '1400px',
      margin: '0 auto'
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: '900',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    },
    subtitle: {
      color: '#6b7280',
      marginBottom: '2rem',
      fontSize: '1.1rem'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '4rem',
      marginBottom: '2rem',
      paddingRight: '1.5rem'
    },
    formGroup: {
      marginBottom: '1.5rem'
    },
    label: {
      display: 'block',
      fontSize: '0.875rem',
      fontWeight: '700',
      color: '#374151',
      marginBottom: '0.5rem'
    },
    required: {
      color: '#ef4444',
      marginLeft: '0.25rem'
    },
    input: {
      width: '100%',
      padding: '0.875rem',
      border: '2px solid #e5e7eb',
      borderRadius: '10px',
      fontSize: '0.95rem',
      transition: 'all 0.2s',
      outline: 'none'
    },
    select: {
      width: '100%',
      padding: '0.875rem',
      border: '2px solid #e5e7eb',
      borderRadius: '10px',
      fontSize: '0.95rem',
      transition: 'all 0.2s',
      outline: 'none',
      background: 'white'
    },
    textarea: {
      width: '100%',
      padding: '0.875rem',
      border: '2px solid #e5e7eb',
      borderRadius: '10px',
      fontSize: '0.95rem',
      minHeight: '80px',
      resize: 'vertical',
      fontFamily: 'inherit',
      outline: 'none'
    },
    hint: {
      fontSize: '0.75rem',
      color: '#9ca3af',
      marginTop: '0.25rem'
    },
    button: {
      width: '100%',
      padding: '1.25rem 2rem',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '1.1rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s',
      boxShadow: '0 10px 30px rgba(30, 58, 138, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem'
    },
    loadingOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(10px)'
    },
    loadingCard: {
      background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.95) 0%, rgba(124, 58, 237, 0.95) 100%)',
      borderRadius: '24px',
      padding: '3rem',
      maxWidth: '600px',
      textAlign: 'center',
      boxShadow: '0 30px 100px rgba(30, 58, 138, 0.6)',
      border: '2px solid rgba(255, 255, 255, 0.2)'
    },
    spinner: {
      width: '100px',
      height: '100px',
      margin: '0 auto 2rem',
      border: '8px solid rgba(255, 255, 255, 0.2)',
      borderTop: '8px solid #fbbf24',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    loadingTitle: {
      color: 'white',
      fontSize: '2rem',
      fontWeight: '800',
      marginBottom: '1rem'
    },
    loadingSubtitle: {
      color: 'rgba(255, 255, 255, 0.9)',
      fontSize: '1rem',
      marginBottom: '2rem'
    },
    progressBar: {
      width: '100%',
      height: '10px',
      background: 'rgba(255, 255, 255, 0.2)',
      borderRadius: '999px',
      overflow: 'hidden',
      marginBottom: '1rem'
    },
    progressFill: {
      height: '100%',
      background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
      transition: 'width 0.5s',
      boxShadow: '0 0 20px rgba(251, 191, 36, 0.8)'
    },
    progressText: {
      color: '#fbbf24',
      fontSize: '1.5rem',
      fontWeight: '800',
      marginBottom: '1.5rem'
    },
    recCard: {
      background: 'white',
      border: '2px solid #e5e7eb',
      borderRadius: '16px',
      padding: '1.5rem',
      marginBottom: '1rem',
      transition: 'all 0.3s'
    },
    recHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '1rem'
    },
    medicineName: {
      fontSize: '1.5rem',
      fontWeight: '800',
      color: '#1f2937',
      marginBottom: '0.5rem'
    },
    scoreBox: {
      padding: '0.5rem 1rem',
      borderRadius: '8px',
      fontWeight: '700',
      fontSize: '0.95rem',
      textAlign: 'center'
    },
    warningBox: {
      background: '#fef3c7',
      border: '2px solid #fbbf24',
      borderRadius: '10px',
      padding: '1rem',
      marginTop: '1rem'
    },
    warningItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.5rem',
      fontSize: '0.875rem',
      color: '#92400e',
      marginBottom: '0.5rem'
    },
    detailRow: {
      marginBottom: '0.75rem',
      fontSize: '0.9rem'
    },
    detailLabel: {
      fontWeight: '700',
      color: '#4b5563',
      display: 'inline-block',
      minWidth: '140px'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem',
      marginBottom: '2rem'
    },
    statCard: {
      background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)',
      borderRadius: '12px',
      padding: '1.5rem',
      color: 'white'
    },
    statValue: {
      fontSize: '2rem',
      fontWeight: '800',
      marginBottom: '0.5rem'
    },
    statLabel: {
      fontSize: '0.875rem',
      opacity: 0.9
    }
  };

  return (
    <div style={s.container}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          input:focus, textarea:focus, select:focus {
            border-color: #7c3aed !important;
            box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1) !important;
          }
          button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 15px 40px rgba(30, 58, 138, 0.6);
          }
        `}
      </style>

      {/* Cinematic Loading Screen */}
      {loading && (
        <div style={s.loadingOverlay}>
          {/* Animated particles */}
          {particles.map(p => (
            <div
              key={p.id}
              style={{
                ...s.particle,
                left: `${p.x}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDuration: `${p.duration}s`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}

          {/* Glow orb */}
          <div style={s.glowOrb} />

          <div style={s.loadingContent}>
            {/* Main icon */}
            <div style={s.mainIcon}>
              <div style={s.iconRing} />
              <div style={s.iconCircle}>
                {React.createElement(phases[loadingPhase].icon, {
                  size: 70,
                  color: 'white',
                  strokeWidth: 2.5
                })}
              </div>
            </div>

            {/* Phase info */}
            <div style={s.phaseTitle}>
              {phases[loadingPhase].title}
            </div>
            <div style={s.phaseDesc}>
              {phases[loadingPhase].desc}
            </div>

            {/* Progress bar */}
            <div style={s.progressContainer}>
              <div style={s.progressBar}>
                <div style={{...s.progressFill, width: `${progress}%`}} />
              </div>
              <div style={s.progressText}>{Math.round(progress)}%</div>
            </div>

            {/* Phase indicators */}
            <div style={s.phaseIndicators}>
              {phases.map((phase, idx) => {
                const PhaseIcon = phase.icon;
                const isActive = idx === loadingPhase;
                const isDone = idx < loadingPhase;
                
                return (
                  <div
                    key={idx}
                    style={{
                      ...s.phaseBox,
                      ...(isActive ? s.phaseBoxActive : {})
                    }}
                  >
                    <div style={{
                      ...s.phaseIcon,
                      ...(isActive ? s.phaseIconActive : {})
                    }}>
                      <PhaseIcon
                        size={24}
                        color={isDone ? '#10b981' : isActive ? '#a78bfa' : 'rgba(255,255,255,0.3)'}
                        strokeWidth={isActive ? 3 : 2}
                      />
                    </div>
                    <div style={{
                      ...s.phaseName,
                      ...(isActive ? s.phaseNameActive : {}),
                      ...(isDone ? {color: '#10b981'} : {})
                    }}>
                      {isDone ? '✓ ' : ''}{phase.title.split(' ')[0]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div style={s.card}>
        {/* Input Form */}
        {step === 'input' && (
          <>
            <h1 style={s.title}>
              <User size={40} />
              Patient Information & Medicine Recommendation
            </h1>
            <p style={s.subtitle}>
              Enter patient details to generate personalized medicine recommendations using AI-powered semantic matching
            </p>

            {message.text && (
              <div style={{
                background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                border: `2px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1.5rem',
                color: message.type === 'success' ? '#065f46' : '#991b1b',
                fontWeight: '600'
              }}>
                {message.text}
              </div>
            )}

            {/* Basic Information */}
            <h3 style={{fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', color: '#1f2937'}}>
              Basic Information
            </h3>
            <div style={s.grid}>
              <div style={s.formGroup}>
                <label style={s.label}>Full Name<span style={s.required}>*</span></label>
                <input type="text" name="name" value={patientData.name} onChange={handleChange} 
                  placeholder="Juan Dela Cruz" style={s.input} required />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Age<span style={s.required}>*</span></label>
                <input type="number" name="age" value={patientData.age} onChange={handleChange} 
                  placeholder="45" style={s.input} required />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Gender<span style={s.required}>*</span></label>
                <select name="gender" value={patientData.gender} onChange={handleChange} style={s.select}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Weight (kg)</label>
                <input type="number" name="weight_kg" value={patientData.weight_kg} onChange={handleChange} 
                  placeholder="70" style={s.input} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Height (cm)</label>
                <input type="number" name="height_cm" value={patientData.height_cm} onChange={handleChange} 
                  placeholder="170" style={s.input} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Blood Pressure</label>
                <input type="text" name="blood_pressure" value={patientData.blood_pressure} onChange={handleChange} 
                  placeholder="120/80" style={s.input} />
              </div>
            </div>

            {/* Clinical Information */}
            <h3 style={{fontSize: '1.25rem', fontWeight: '700', marginTop: '2rem', marginBottom: '1rem', color: '#1f2937'}}>
              Clinical Information
            </h3>
            <div style={s.formGroup}>
              <label style={s.label}>Chief Complaint<span style={s.required}>*</span></label>
              <textarea name="chief_complaint" value={patientData.chief_complaint} onChange={handleChange}
                placeholder="Persistent dry cough and shortness of breath" style={s.textarea} required />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Diagnosis<span style={s.required}>*</span></label>
              <textarea name="diagnosis" value={patientData.diagnosis} onChange={handleChange}
                placeholder="Chronic Obstructive Pulmonary Disease (COPD)" style={s.textarea} required />
            </div>
            <div style={s.grid}>
              <div style={s.formGroup}>
                <label style={s.label}>Symptoms</label>
                <textarea name="symptoms" value={patientData.symptoms} onChange={handleChange}
                  placeholder="cough, wheezing, fatigue, shortness of breath" style={s.textarea} />
                <p style={s.hint}>Comma-separated</p>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Medical History</label>
                <textarea name="medical_history" value={patientData.medical_history} onChange={handleChange}
                  placeholder="hypertension, asthma" style={s.textarea} />
                <p style={s.hint}>Comma-separated</p>
              </div>
            </div>

            {/* Medications & Allergies */}
            <h3 style={{fontSize: '1.25rem', fontWeight: '700', marginTop: '2rem', marginBottom: '1rem', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <Shield size={20} />
              Medications & Allergies (Critical for Safety)
            </h3>
            <div style={s.formGroup}>
              <label style={s.label}>Current Medications</label>
              <textarea name="current_medications" value={patientData.current_medications} onChange={handleChange}
                placeholder="Salbutamol inhaler 100mcg as needed, Lisinopril 10mg once daily" style={s.textarea} />
              <p style={s.hint}>Comma-separated</p>
            </div>
            <div style={s.grid}>
              <div style={s.formGroup}>
                <label style={s.label}>Drug Allergies ⚠️</label>
                <input type="text" name="drug_allergies" value={patientData.drug_allergies} onChange={handleChange}
                  placeholder="penicillin" style={{...s.input, borderColor: '#fca5a5'}} />
                <p style={s.hint}>Comma-separated - CRITICAL for safety</p>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Adverse Reactions</label>
                <input type="text" name="adverse_reactions" value={patientData.adverse_reactions} onChange={handleChange}
                  placeholder="nausea from metformin" style={s.input} />
                <p style={s.hint}>Comma-separated</p>
              </div>
            </div>

            {/* Lab Results */}
            <h3 style={{fontSize: '1.25rem', fontWeight: '700', marginTop: '2rem', marginBottom: '1rem', color: '#1f2937'}}>
              Lab Results (Optional but Recommended)
            </h3>
            <div style={s.grid}>
              <div style={s.formGroup}>
                <label style={s.label}>Renal: Creatinine (mg/dL)</label>
                <input type="number" step="0.1" name="renal_creatinine" value={patientData.renal_creatinine} 
                  onChange={handleChange} placeholder="1.1" style={s.input} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Renal: GFR (ml/min)</label>
                <input type="number" name="renal_gfr" value={patientData.renal_gfr} 
                  onChange={handleChange} placeholder="85" style={s.input} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Liver: ALT (U/L)</label>
                <input type="number" name="liver_alt" value={patientData.liver_alt} 
                  onChange={handleChange} placeholder="25" style={s.input} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Liver: AST (U/L)</label>
                <input type="number" name="liver_ast" value={patientData.liver_ast} 
                  onChange={handleChange} placeholder="22" style={s.input} />
              </div>
            </div>

            {/* Lifestyle & Preferences */}
            <h3 style={{fontSize: '1.25rem', fontWeight: '700', marginTop: '2rem', marginBottom: '1rem', color: '#1f2937'}}>
              Lifestyle & Preferences
            </h3>
            <div style={s.grid}>
              <div style={s.formGroup}>
                <label style={s.label}>Pregnancy Status</label>
                <select name="pregnancy_status" value={patientData.pregnancy_status} onChange={handleChange} style={s.select}>
                  <option value="Not applicable">Not applicable</option>
                  <option value="Not pregnant">Not pregnant</option>
                  <option value="Pregnant - First Trimester">Pregnant - First Trimester</option>
                  <option value="Pregnant - Second Trimester">Pregnant - Second Trimester</option>
                  <option value="Pregnant - Third Trimester">Pregnant - Third Trimester</option>
                  <option value="Breastfeeding">Breastfeeding</option>
                </select>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Smoking Status</label>
                <select name="smoking_status" value={patientData.smoking_status} onChange={handleChange} style={s.select}>
                  <option value="never">Never Smoked</option>
                  <option value="former">Former Smoker</option>
                  <option value="current">Current Smoker</option>
                </select>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Alcohol Use</label>
                <input type="text" name="alcohol_use" value={patientData.alcohol_use} onChange={handleChange}
                  placeholder="Occasional" style={s.input} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Preferred Route</label>
                <select name="preferred_route" value={patientData.preferred_route} onChange={handleChange} style={s.select}>
                  <option value="oral">Oral</option>
                  <option value="iv">Intravenous (IV)</option>
                  <option value="im">Intramuscular (IM)</option>
                  <option value="topical">Topical</option>
                  <option value="inhaled">Inhaled</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <button onClick={handleSubmit} style={s.button} disabled={loading}>
              <Sparkles size={24} />
              Generate Medicine Recommendations
            </button>
          </>
        )}

        {/* Results View */}
        {step === 'results' && recommendations && (
          <>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
              <div>
                <h1 style={s.title}>
                  <Heart size={40} />
                  Medicine Recommendations
                </h1>
                <p style={s.subtitle}>
                  Personalized recommendations for {recommendations.patient.name}
                </p>
              </div>
              <button onClick={() => {
                setStep('input');
                setRecommendations(null);
                setPatientData({
                  name: '', age: '', gender: 'Male', weight_kg: '', height_cm: '',
                  chief_complaint: '', diagnosis: '', symptoms: '', medical_history: '',
                  current_medications: '', drug_allergies: '', adverse_reactions: '',
                  blood_pressure: '', renal_creatinine: '', renal_gfr: '', liver_alt: '',
                  liver_ast: '', pregnancy_status: 'Not applicable', smoking_status: 'never',
                  alcohol_use: '', preferred_route: 'oral'
                });
              }} style={{...s.button, width: 'auto', padding: '0.75rem 1.5rem', fontSize: '0.95rem'}}>
                New Patient
              </button>
            </div>

            {/* Patient Summary */}
            <div style={{background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem'}}>
                <User size={24} color="#7c3aed" />
                <div>
                  <div style={{fontSize: '1.25rem', fontWeight: '800', color: '#1f2937'}}>
                    {recommendations.patient.name}, {recommendations.patient.age} years old
                  </div>
                  <div style={{color: '#6b7280', fontSize: '0.95rem'}}>
                    Diagnosis: {recommendations.patient.diagnosis}
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div style={s.statsGrid}>
              <div style={s.statCard}>
                <div style={s.statValue}>{recommendations.statistics.total_evaluated}</div>
                <div style={s.statLabel}>Medicines Evaluated</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statValue}>{recommendations.statistics.safe_recommendations}</div>
                <div style={s.statLabel}>Safe Recommendations</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statValue}>{(recommendations.statistics.average_similarity * 100).toFixed(1)}%</div>
                <div style={s.statLabel}>Avg Similarity Score</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statValue}>{recommendations.statistics.processing_time_seconds}s</div>
                <div style={s.statLabel}>Processing Time</div>
              </div>
            </div>

            {/* Recommendations List */}
            <h2 style={{fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.5rem', color: '#1f2937'}}>
              Top Recommendations ({recommendations.recommendations.length})
            </h2>

            {recommendations.recommendations.map((rec, index) => (
              <div key={index} style={{
                ...s.recCard,
                borderLeft: `6px solid ${getSafetyColor(rec.is_safe)}`
              }}>
                <div style={s.recHeader}>
                  <div style={{flex: 1}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem'}}>
                      <span style={{
                        background: getSafetyColor(rec.is_safe),
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '700'
                      }}>
                        #{index + 1}
                      </span>
                      {rec.is_safe ? (
                        <CheckCircle size={20} color="#10b981" />
                      ) : (
                        <AlertTriangle size={20} color="#ef4444" />
                      )}
                    </div>
                    <div style={s.medicineName}>{rec.medicine_name}</div>
                  </div>
                  <div>
                    <div style={{
                      ...s.scoreBox,
                      background: getConfidenceColor(rec.confidence_level),
                      color: 'white'
                    }}>
                      {rec.confidence_level}
                    </div>
                    <div style={{
                      ...s.scoreBox,
                      background: '#ede9fe',
                      color: '#7c3aed',
                      marginTop: '0.5rem'
                    }}>
                      {(rec.similarity_score * 100).toFixed(1)}% Match
                    </div>
                  </div>
                </div>

                {/* Medicine Details */}
                <div style={s.detailRow}>
                  <span style={s.detailLabel}>Brand Names:</span>
                  <span>{rec.medicine_details.brand_name?.slice(0, 3).join(', ') || 'N/A'}</span>
                </div>
                <div style={s.detailRow}>
                  <span style={s.detailLabel}>Generic Names:</span>
                  <span>{rec.medicine_details.generic_name?.slice(0, 3).join(', ') || 'N/A'}</span>
                </div>
                <div style={s.detailRow}>
                  <span style={s.detailLabel}>Active Ingredients:</span>
                  <span>{rec.medicine_details.active_ingredient?.slice(0, 2).join(', ') || 'N/A'}</span>
                </div>
                <div style={s.detailRow}>
                  <span style={s.detailLabel}>Indications:</span>
                  <span>{rec.medicine_details.indications?.slice(0, 100) || 'N/A'}</span>
                </div>
                <div style={s.detailRow}>
                  <span style={s.detailLabel}>Dosage:</span>
                  <span>{rec.medicine_details.dosage?.slice(0, 100) || 'N/A'}</span>
                </div>

                {/* Warnings */}
                {rec.warnings && rec.warnings.length > 0 && (
                  <div style={s.warningBox}>
                    <div style={{fontWeight: '700', color: '#92400e', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                      <AlertTriangle size={18} />
                      Safety Considerations
                    </div>
                    {rec.warnings.map((warning, wIndex) => (
                      <div key={wIndex} style={s.warningItem}>
                        <span>•</span>
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Footer Info */}
            <div style={{background: '#f3f4f6', borderRadius: '12px', padding: '1.5rem', marginTop: '2rem'}}>
              <div style={{fontWeight: '700', marginBottom: '0.75rem', color: '#1f2937'}}>
                ℹ️ Important Notes:
              </div>
              <ul style={{margin: 0, paddingLeft: '1.5rem', color: '#4b5563', fontSize: '0.9rem', lineHeight: '1.8'}}>
                <li>Recommendations are generated using AI-powered semantic similarity (BioBERT embeddings)</li>
                <li>Multi-pass filtering includes allergy checks, contraindication screening, and safety validation</li>
                <li>Minimum similarity threshold: {recommendations.statistics.threshold_used * 100}%</li>
                <li>Always consult with a licensed healthcare professional before making treatment decisions</li>
                <li>This system is designed to assist, not replace, clinical judgment</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

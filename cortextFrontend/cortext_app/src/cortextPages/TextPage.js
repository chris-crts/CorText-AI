import React, { useState, useEffect } from 'react';
import { Heart, AlertTriangle, CheckCircle, TrendingUp, Sparkles, Shield, Activity, Brain, Pill, Zap } from 'lucide-react';

export default function PatientRecommendation() {
  const [patientData, setPatientData] = useState({
    name: '', age: '', gender: 'Male', weight_kg: '', height_cm: '',
    chief_complaint: '', diagnosis: '', symptoms: '', medical_history: '',
    current_medications: '', drug_allergies: '', adverse_reactions: '',
    blood_pressure: '', renal_creatinine: '', renal_gfr: '', liver_alt: '',
    liver_ast: '', pregnancy_status: 'Not applicable', smoking_status: 'never',
    alcohol_use: '', preferred_route: 'oral'
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
    setPatientData({ ...patientData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!patientData.name || !patientData.age || !patientData.chief_complaint || !patientData.diagnosis) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setLoading(true);
    setStep('processing');
    setMessage({ type: '', text: '' });

    try {
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

      const patientResponse = await fetch('/api/patients/add/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientPayload)
      });

      const patientResult = await patientResponse.json();
      if (!patientResult.success) throw new Error(patientResult.error);

      const recResponse = await fetch('/api/patients/recommend/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientResult.data.patient_id,
          top_k: 10,
          similarity_threshold: 0.75
        })
      });

      const recResult = await recResponse.json();
      setProgress(100);

      setTimeout(() => {
        if (recResult.success) {
          setRecommendations(recResult.data);
          setStep('results');
          setMessage({ type: 'success', text: `Generated ${recResult.data.recommendations.length} recommendations` });
        } else {
          throw new Error(recResult.error);
        }
        setLoading(false);
      }, 800);

    } catch (error) {
      setLoading(false);
      setStep('input');
      setProgress(0);
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
    const c = confidence?.toLowerCase() || '';
    if (c.includes('high')) return '#10b981';
    if (c.includes('medium')) return '#f59e0b';
    return '#ef4444';
  };

  const s = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    },
    card: {
      background: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '24px',
      boxShadow: '0 30px 100px rgba(0,0,0,0.5)',
      padding: '3rem',
      maxWidth: '1400px',
      margin: '0 auto',
      position: 'relative',
      zIndex: 1
    },
    title: {
      fontSize: '2.75rem',
      fontWeight: '900',
      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    },
    loadingOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 50%, rgba(49, 46, 129, 0.98) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(20px)'
    },
    loadingContent: {
      textAlign: 'center',
      maxWidth: '800px',
      padding: '3rem',
      position: 'relative',
      zIndex: 2
    },
    glowOrb: {
      position: 'absolute',
      width: '400px',
      height: '400px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)',
      filter: 'blur(60px)',
      animation: 'pulse 3s ease-in-out infinite',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 0
    },
    mainIcon: {
      margin: '0 auto 2rem',
      position: 'relative'
    },
    iconCircle: {
      width: '160px',
      height: '160px',
      margin: '0 auto',
      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 20px 60px rgba(139, 92, 246, 0.6), 0 0 80px rgba(139, 92, 246, 0.4)',
      animation: 'float 3s ease-in-out infinite',
      position: 'relative'
    },
    iconRing: {
      position: 'absolute',
      width: '180px',
      height: '180px',
      border: '3px solid rgba(139, 92, 246, 0.3)',
      borderRadius: '50%',
      animation: 'rotate 4s linear infinite'
    },
    phaseTitle: {
      color: 'white',
      fontSize: '2.5rem',
      fontWeight: '800',
      marginBottom: '1rem',
      textShadow: '0 2px 20px rgba(139, 92, 246, 0.5)'
    },
    phaseDesc: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: '1.2rem',
      marginBottom: '3rem'
    },
    progressContainer: {
      marginBottom: '2rem'
    },
    progressBar: {
      width: '100%',
      height: '6px',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '999px',
      overflow: 'hidden',
      marginBottom: '1rem',
      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3)'
    },
    progressFill: {
      height: '100%',
      background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)',
      transition: 'width 0.3s ease',
      boxShadow: '0 0 20px rgba(139, 92, 246, 0.8)',
      borderRadius: '999px'
    },
    progressText: {
      color: '#a78bfa',
      fontSize: '2rem',
      fontWeight: '800',
      textShadow: '0 0 20px rgba(167, 139, 250, 0.6)'
    },
    phaseIndicators: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '3rem',
      gap: '1rem'
    },
    phaseBox: {
      flex: 1,
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '1rem',
      transition: 'all 0.3s ease'
    },
    phaseBoxActive: {
      background: 'rgba(139, 92, 246, 0.2)',
      border: '2px solid rgba(139, 92, 246, 0.5)',
      boxShadow: '0 0 30px rgba(139, 92, 246, 0.3)',
      transform: 'scale(1.05)'
    },
    phaseIcon: {
      marginBottom: '0.5rem',
      opacity: 0.6
    },
    phaseIconActive: {
      opacity: 1,
      animation: 'bounce 0.6s ease-in-out'
    },
    phaseName: {
      fontSize: '0.75rem',
      color: 'rgba(255, 255, 255, 0.6)',
      fontWeight: '600'
    },
    phaseNameActive: {
      color: '#a78bfa',
      fontWeight: '700'
    },
    particle: {
      position: 'absolute',
      background: 'rgba(167, 139, 250, 0.6)',
      borderRadius: '50%',
      pointerEvents: 'none',
      animation: 'float-particle 5s infinite'
    }
  };

  return (
    <div style={s.container}>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 0.8; transform: translate(-50%, -50%) scale(1); }
            50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          @keyframes float-particle {
            0% { transform: translateY(100vh) scale(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100vh) scale(1); opacity: 0; }
          }
          input:focus, textarea:focus, select:focus {
            border-color: #8b5cf6 !important;
            box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2) !important;
          }
          button:hover:not(:disabled) {
            transform: translateY(-3px);
            box-shadow: 0 20px 50px rgba(139, 92, 246, 0.6);
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

      {/* Main content */}
      <div style={s.card}>
        {step === 'input' && (
          <>
            <h1 style={s.title}>
              <Heart size={44} />
              AI Medicine Recommendation
            </h1>
            <p style={{color: '#6b7280', marginBottom: '2.5rem', fontSize: '1.15rem'}}>
              Advanced semantic matching powered by BioBERT • Multi-pass safety validation • Real-time contraindication checking
            </p>

            {message.text && (
              <div style={{
                background: message.type === 'success' ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                border: `2px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '2rem',
                color: message.type === 'success' ? '#065f46' : '#991b1b',
                fontWeight: '600',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
              }}>
                {message.text}
              </div>
            )}

            {/* Form sections with improved styling */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '4rem',
              marginBottom: '2rem',
              paddingRight: '2rem'
            }}>
              <div>
                <label style={{display: 'block', fontSize: '0.875rem', fontWeight: '700', color: '#374151', marginBottom: '0.5rem'}}>
                  Full Name <span style={{color: '#ef4444'}}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={patientData.name}
                  onChange={handleChange}
                  placeholder="Juan Dela Cruz"
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{display: 'block', fontSize: '0.875rem', fontWeight: '700', color: '#374151', marginBottom: '0.5rem'}}>
                  Age <span style={{color: '#ef4444'}}>*</span>
                </label>
                <input
                  type="number"
                  name="age"
                  value={patientData.age}
                  onChange={handleChange}
                  placeholder="45"
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{display: 'block', fontSize: '0.875rem', fontWeight: '700', color: '#374151', marginBottom: '0.5rem'}}>
                  Gender
                </label>
                <select
                  name="gender"
                  value={patientData.gender}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    outline: 'none',
                    background: 'white'
                  }}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Clinical info */}
            <div style={{marginBottom: '2rem'}}>
              <label style={{display: 'block', fontSize: '0.875rem', fontWeight: '700', color: '#374151', marginBottom: '0.5rem'}}>
                Chief Complaint <span style={{color: '#ef4444'}}>*</span>
              </label>
              <textarea
                name="chief_complaint"
                value={patientData.chief_complaint}
                onChange={handleChange}
                placeholder="Persistent dry cough and shortness of breath"
                style={{
                  width: '97%',
                  padding: '0.875rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  minHeight: '80px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none'
                }}
                required
              />
            </div>

            <div style={{marginBottom: '2rem'}}>
              <label style={{display: 'block', fontSize: '0.875rem', fontWeight: '700', color: '#374151', marginBottom: '0.5rem'}}>
                Diagnosis <span style={{color: '#ef4444'}}>*</span>
              </label>
              <textarea
                name="diagnosis"
                value={patientData.diagnosis}
                onChange={handleChange}
                placeholder="Chronic Obstructive Pulmonary Disease (COPD)"
                style={{
                  width: '97%',
                  padding: '0.875rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  minHeight: '80px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none'
                }}
                required
              />
            </div>

            {/* Allergy section with warning styling */}
            <div style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '2px solid #f59e0b',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem'}}>
                <Shield size={24} color="#f59e0b" />
                <h3 style={{fontSize: '1.1rem', fontWeight: '800', color: '#92400e', margin: 0}}>
                  Critical Safety Information
                </h3>
              </div>
              <label style={{display: 'block', fontSize: '0.875rem', fontWeight: '700', color: '#78350f', marginBottom: '0.5rem'}}>
                Drug Allergies ⚠️
              </label>
              <input
                type="text"
                name="drug_allergies"
                value={patientData.drug_allergies}
                onChange={handleChange}
                placeholder="penicillin, aspirin"
                style={{
                  width: '96%',
                  padding: '0.875rem',
                  border: '2px solid #f59e0b',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  outline: 'none',
                  background: 'white'
                }}
              />
              <p style={{fontSize: '0.75rem', color: '#92400e', marginTop: '0.5rem', margin: 0}}>
                Comma-separated • CRITICAL for safety checks
              </p>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%',
                padding: '1.5rem 2rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontSize: '1.2rem',
                fontWeight: '800',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 10px 40px rgba(139, 92, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                opacity: loading ? 0.6 : 1
              }}
            >
              <Sparkles size={28} />
              Generate AI Recommendations
            </button>
          </>
        )}

        {/* Results View */}
        {step === 'results' && recommendations && (
          <>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
              <div>
                <h1 style={s.title}>
                  <CheckCircle size={44} />
                  Recommendations Ready
                </h1>
                <p style={{color: '#6b7280', fontSize: '1.1rem'}}>
                  {recommendations.patient.name}, {recommendations.patient.age} years • {recommendations.patient.diagnosis}
                </p>
              </div>
              <button
                onClick={() => {
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
                }}
                style={{
                  padding: '0.875rem 1.75rem',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
                }}
              >
                New Patient
              </button>
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem',
              marginBottom: '3rem'
            }}>
              {[
                { label: 'Evaluated', value: recommendations.statistics.total_evaluated, icon: Activity },
                { label: 'Safe Options', value: recommendations.statistics.safe_recommendations, icon: Shield },
                { label: 'Avg Match', value: `${(recommendations.statistics.average_similarity * 100).toFixed(1)}%`, icon: TrendingUp },
                { label: 'Time', value: `${recommendations.statistics.processing_time_seconds}s`, icon: Zap }
              ].map((stat, idx) => (
                <div key={idx} style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  color: 'white',
                  boxShadow: '0 10px 30px rgba(139, 92, 246, 0.3)'
                }}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem'}}>
                    {React.createElement(stat.icon, { size: 24, strokeWidth: 2.5 })}
                    <span style={{fontSize: '0.875rem', opacity: 0.9}}>{stat.label}</span>
                  </div>
                  <div style={{fontSize: '2.25rem', fontWeight: '900'}}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Recommendations list */}
            <h2 style={{fontSize: '1.75rem', fontWeight: '800', marginBottom: '1.5rem', color: '#1f2937'}}>
              Personalized Recommendations ({recommendations.recommendations.length})
            </h2>

            {recommendations.recommendations.map((rec, index) => {
              const isSafe = rec.is_safe;
              const confidence = rec.confidence_level || 'low';
              
              return (
                <div
                  key={index}
                  style={{
                    background: 'white',
                    border: `3px solid ${getSafetyColor(isSafe)}`,
                    borderRadius: '20px',
                    padding: '2rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    transition: 'all 0.3s'
                  }}
                >
                  {/* Header */}
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem'}}>
                    <div style={{flex: 1}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem'}}>
                        <span style={{
                          background: getSafetyColor(isSafe),
                          color: 'white',
                          padding: '0.5rem 1rem',
                          borderRadius: '10px',
                          fontSize: '0.875rem',
                          fontWeight: '800'
                        }}>
                          #{index + 1}
                        </span>
                        {isSafe ? (
                          <CheckCircle size={28} color="#10b981" strokeWidth={2.5} />
                        ) : (
                          <AlertTriangle size={28} color="#ef4444" strokeWidth={2.5} />
                        )}
                        <span style={{
                          fontSize: '0.9rem',
                          fontWeight: '700',
                          color: isSafe ? '#10b981' : '#ef4444'
                        }}>
                          {isSafe ? 'SAFE TO PRESCRIBE' : 'NOT RECOMMENDED'}
                        </span>
                      </div>
                      <h3 style={{
                        fontSize: '2rem',
                        fontWeight: '900',
                        color: '#1f2937',
                        margin: 0
                      }}>
                        {rec.medicine_name}
                      </h3>
                    </div>
                    <div style={{textAlign: 'right'}}>
                      <div style={{
                        background: getConfidenceColor(confidence),
                        color: 'white',
                        padding: '0.75rem 1.25rem',
                        borderRadius: '12px',
                        fontSize: '0.95rem',
                        fontWeight: '800',
                        marginBottom: '0.75rem',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                      }}>
                        {confidence.toUpperCase()}
                      </div>
                      <div style={{
                        background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                        color: '#7c3aed',
                        padding: '0.75rem 1.25rem',
                        borderRadius: '12px',
                        fontSize: '1.1rem',
                        fontWeight: '800'
                      }}>
                        {(rec.similarity_score * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Medicine details */}
                  <div style={{
                    background: '#f9fafb',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr',
                      gap: '1rem',
                      fontSize: '0.95rem'
                    }}>
                      <div style={{fontWeight: '700', color: '#4b5563'}}>Brand Names:</div>
                      <div style={{color: '#1f2937'}}>
                        {rec.medicine_details.brand_name?.slice(0, 3).join(', ') || 'N/A'}
                      </div>

                      <div style={{fontWeight: '700', color: '#4b5563'}}>Generic Names:</div>
                      <div style={{color: '#1f2937'}}>
                        {rec.medicine_details.generic_name?.slice(0, 3).join(', ') || 'N/A'}
                      </div>

                      <div style={{fontWeight: '700', color: '#4b5563'}}>Active Ingredients:</div>
                      <div style={{color: '#1f2937'}}>
                        {rec.medicine_details.active_ingredient?.slice(0, 2).join(', ') || 'N/A'}
                      </div>

                      <div style={{fontWeight: '700', color: '#4b5563'}}>Indications:</div>
                      <div style={{color: '#1f2937'}}>
                        {Array.isArray(rec.medicine_details.indications)
                          ? rec.medicine_details.indications.join(' ').slice(0, 150)
                          : rec.medicine_details.indications?.slice(0, 150) || 'N/A'}
                        {((rec.medicine_details.indications?.length || 0) > 150) && '...'}
                      </div>

                      <div style={{fontWeight: '700', color: '#4b5563'}}>Dosage:</div>
                      <div style={{color: '#1f2937'}}>
                        {Array.isArray(rec.medicine_details.dosage)
                          ? rec.medicine_details.dosage.join(' ').slice(0, 150)
                          : rec.medicine_details.dosage?.slice(0, 150) || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Warnings */}
                  {rec.warnings && rec.warnings.length > 0 && (
                    <div style={{
                      background: isSafe 
                        ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                        : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                      border: `2px solid ${isSafe ? '#f59e0b' : '#ef4444'}`,
                      borderRadius: '12px',
                      padding: '1.5rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '1rem'
                      }}>
                        <AlertTriangle size={24} color={isSafe ? '#f59e0b' : '#ef4444'} strokeWidth={2.5} />
                        <span style={{
                          fontSize: '1.1rem',
                          fontWeight: '800',
                          color: isSafe ? '#92400e' : '#991b1b'
                        }}>
                          Safety Considerations
                        </span>
                      </div>
                      {rec.warnings.map((warning, wIdx) => (
                        <div
                          key={wIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            marginBottom: '0.5rem',
                            fontSize: '0.95rem',
                            color: isSafe ? '#92400e' : '#991b1b',
                            lineHeight: '1.6'
                          }}
                        >
                          <span style={{fontWeight: '900', fontSize: '1.2rem'}}>•</span>
                          <span style={{fontWeight: warning.includes('CRITICAL') ? '800' : '600'}}>
                            {warning}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Footer information */}
            <div style={{
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              border: '2px solid #3b82f6',
              borderRadius: '16px',
              padding: '2rem',
              marginTop: '3rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}>
                <Brain size={32} color="#3b82f6" strokeWidth={2.5} />
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  color: '#1e3a8a',
                  margin: 0
                }}>
                  AI-Powered Clinical Decision Support
                </h3>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <div>
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    color: '#1e3a8a',
                    marginBottom: '0.5rem'
                  }}>
                    🧠 Semantic Matching
                  </div>
                  <div style={{fontSize: '0.875rem', color: '#475569', lineHeight: '1.6'}}>
                    BioBERT embeddings (768 dimensions) capture clinical context beyond keyword matching
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    color: '#1e3a8a',
                    marginBottom: '0.5rem'
                  }}>
                    🛡️ Multi-Pass Safety
                  </div>
                  <div style={{fontSize: '0.875rem', color: '#475569', lineHeight: '1.6'}}>
                    Allergy checks, contraindication screening, renal/hepatic function validation
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    color: '#1e3a8a',
                    marginBottom: '0.5rem'
                  }}>
                    ⚡ FAISS Optimization
                  </div>
                  <div style={{fontSize: '0.875rem', color: '#475569', lineHeight: '1.6'}}>
                    Millisecond search across 1000+ medicines using vector similarity
                  </div>
                </div>
              </div>

              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '10px',
                padding: '1.25rem',
                fontSize: '0.875rem',
                color: '#1e3a8a',
                lineHeight: '1.7'
              }}>
                <strong>⚠️ Important:</strong> This system provides clinical decision support and should be used by licensed healthcare professionals. 
                Recommendations are based on semantic similarity with a minimum threshold of {(recommendations.statistics.threshold_used * 100).toFixed(0)}%. 
                Always verify drug interactions, dosing, and contraindications before prescribing. This tool assists, but does not replace, professional clinical judgment.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
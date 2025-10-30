import React, { useState, useEffect } from 'react';
import { Heart, AlertTriangle, CheckCircle, TrendingUp, Sparkles, Shield, Activity, Brain, Pill, Zap } from 'lucide-react';

export default function PatientRecommendation() {
  const [patientData, setPatientData] = useState({
    name: '', age: '', gender: 'Male', weight_kg: '', height_cm: '',
    chief_complaint: '', diagnosis: '', 
    symptoms: '', medical_history: '', family_history: '',
    current_medications: '', recent_medications: '',
    drug_allergies: '', adverse_reactions: '',
    blood_pressure: '', 
    renal_creatinine: '', renal_gfr: '', 
    liver_alt: '', liver_ast: '',
    recent_labs_wbc: '', recent_labs_hemoglobin: '', recent_labs_glucose: '',
    pregnancy_status: 'Not applicable', 
    smoking_status: 'never',
    alcohol_use: '', 
    dietary_restrictions: '',
    financial_constraints: '',
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
      
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i, x: Math.random() * 100, y: Math.random() * 100,
        size: Math.random() * 4 + 2, duration: Math.random() * 3 + 2
      }));
      setParticles(newParticles);

      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) return 100;
          const increment = Math.random() * 8 + 2;
          const newProgress = prev + increment;
          
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
      setMessage({ type: 'error', text: 'Please fill in all required fields (Name, Age, Chief Complaint, Diagnosis)' });
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
        family_history: patientData.family_history.split(',').map(s => s.trim()).filter(s => s),
        current_medications: patientData.current_medications.split(',').map(s => s.trim()).filter(s => s),
        recent_medications: patientData.recent_medications.split(',').map(s => s.trim()).filter(s => s),
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
        recent_labs: {
          CBC: {
            WBC: patientData.recent_labs_wbc ? parseFloat(patientData.recent_labs_wbc) : null,
            Hemoglobin: patientData.recent_labs_hemoglobin ? parseFloat(patientData.recent_labs_hemoglobin) : null
          },
          Blood_Glucose: {
            Fasting: patientData.recent_labs_glucose ? parseFloat(patientData.recent_labs_glucose) : null
          }
        },
        pregnancy_status: patientData.pregnancy_status,
        smoking_status: patientData.smoking_status,
        alcohol_use: patientData.alcohol_use,
        dietary_restrictions: patientData.dietary_restrictions.split(',').map(s => s.trim()).filter(s => s),
        financial_constraints: patientData.financial_constraints,
        preferred_route: patientData.preferred_route
      };

      const patientResponse = await fetch('http://192.168.56.1:8000/api/patients/add/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientPayload)
      });

      const patientResult = await patientResponse.json();
      if (!patientResult.success) throw new Error(patientResult.error);

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

  const resetForm = () => {
    setStep('input');
    setRecommendations(null);
    setPatientData({
      name: '', age: '', gender: 'Male', weight_kg: '', height_cm: '',
      chief_complaint: '', diagnosis: '', symptoms: '', medical_history: '',
      family_history: '', current_medications: '', recent_medications: '',
      drug_allergies: '', adverse_reactions: '', blood_pressure: '',
      renal_creatinine: '', renal_gfr: '', liver_alt: '', liver_ast: '',
      recent_labs_wbc: '', recent_labs_hemoglobin: '', recent_labs_glucose: '',
      pregnancy_status: 'Not applicable', smoking_status: 'never',
      alcohol_use: '', dietary_restrictions: '', financial_constraints: '',
      preferred_route: 'oral'
    });
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

  const inputStyle = {
    width: '100%', padding: '0.875rem', border: '2px solid #e5e7eb',
    borderRadius: '10px', fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s'
  };

  const labelStyle = {
    display: 'block', fontSize: '0.875rem', fontWeight: '700',
    color: '#374151', marginBottom: '0.5rem'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>
        {`
          @keyframes pulse { 0%, 100% { opacity: 0.8; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); } }
          @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
          @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
          @keyframes float-particle { 0% { transform: translateY(100vh) scale(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(-100vh) scale(1); opacity: 0; } }
          input:focus, textarea:focus, select:focus { border-color: #8b5cf6 !important; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2) !important; }
          button:hover:not(:disabled) { transform: translateY(-3px); }
        `}
      </style>

      {/* Cinematic Loading Screen */}
      {loading && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 50%, rgba(49, 46, 129, 0.98) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(20px)'
        }}>
          {particles.map(p => (
            <div key={p.id} style={{
              position: 'absolute', left: `${p.x}%`, width: `${p.size}px`, height: `${p.size}px`,
              background: 'rgba(167, 139, 250, 0.6)', borderRadius: '50%', pointerEvents: 'none',
              animation: `float-particle ${p.duration}s infinite`, animationDelay: `${Math.random() * 2}s`
            }} />
          ))}

          <div style={{
            position: 'absolute', width: '400px', height: '400px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)',
            filter: 'blur(60px)', animation: 'pulse 3s ease-in-out infinite',
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)'
          }} />

          <div style={{ textAlign: 'center', maxWidth: '800px', padding: '3rem', position: 'relative', zIndex: 2 }}>
            <div style={{ margin: '0 auto 2rem', position: 'relative' }}>
              <div style={{
                position: 'absolute', width: '180px', height: '180px',
                border: '3px solid rgba(139, 92, 246, 0.3)', borderRadius: '50%',
                animation: 'rotate 4s linear infinite'
              }} />
              <div style={{
                width: '160px', height: '160px', margin: '0 auto',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 20px 60px rgba(139, 92, 246, 0.6), 0 0 80px rgba(139, 92, 246, 0.4)',
                animation: 'float 3s ease-in-out infinite'
              }}>
                {React.createElement(phases[loadingPhase].icon, { size: 70, color: 'white', strokeWidth: 2.5 })}
              </div>
            </div>

            <div style={{
              color: 'white', fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem',
              textShadow: '0 2px 20px rgba(139, 92, 246, 0.5)'
            }}>
              {phases[loadingPhase].title}
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '1.2rem', marginBottom: '3rem' }}>
              {phases[loadingPhase].desc}
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '999px', overflow: 'hidden', marginBottom: '1rem',
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3)'
              }}>
                <div style={{
                  height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)',
                  width: `${progress}%`, transition: 'width 0.3s ease',
                  boxShadow: '0 0 20px rgba(139, 92, 246, 0.8)', borderRadius: '999px'
                }} />
              </div>
              <div style={{
                color: '#a78bfa', fontSize: '2rem', fontWeight: '800',
                textShadow: '0 0 20px rgba(167, 139, 250, 0.6)'
              }}>
                {Math.round(progress)}%
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', gap: '1rem' }}>
              {phases.map((phase, idx) => {
                const PhaseIcon = phase.icon;
                const isActive = idx === loadingPhase;
                const isDone = idx < loadingPhase;
                
                return (
                  <div key={idx} style={{
                    flex: 1, background: isActive ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: isActive ? '2px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px', padding: '1rem', transition: 'all 0.3s ease',
                    boxShadow: isActive ? '0 0 30px rgba(139, 92, 246, 0.3)' : 'none',
                    transform: isActive ? 'scale(1.05)' : 'scale(1)'
                  }}>
                    <div style={{
                      marginBottom: '0.5rem', opacity: isActive ? 1 : 0.6,
                      animation: isActive ? 'bounce 0.6s ease-in-out' : 'none'
                    }}>
                      <PhaseIcon size={24} color={isDone ? '#10b981' : isActive ? '#a78bfa' : 'rgba(255,255,255,0.3)'} strokeWidth={isActive ? 3 : 2} />
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: isDone ? '#10b981' : isActive ? '#a78bfa' : 'rgba(255, 255, 255, 0.6)',
                      fontWeight: isActive ? '700' : '600'
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

      {/* Main Content */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.98)', borderRadius: '24px',
        boxShadow: '0 30px 100px rgba(0,0,0,0.5)', padding: '3rem',
        maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1, paddingRight: '4.4rem'
      }}>
        {step === 'input' && (
          <>
            <h1 style={{
              fontSize: '2.75rem', fontWeight: '900',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem'
            }}>
              <Heart size={44} />
              AI Medicine Recommendation
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '2.5rem', fontSize: '1.15rem' }}>
              Advanced semantic matching powered by BioBERT • Multi-pass safety validation • Real-time contraindication checking
            </p>

            {message.text && (
              <div style={{
                background: message.type === 'success' ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                border: `2px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
                borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem',
                color: message.type === 'success' ? '#065f46' : '#991b1b',
                fontWeight: '600', boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
              }}>
                {message.text}
              </div>
            )}

            {/* Basic Information */}
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '1.5rem', color: '#1f2937', borderBottom: '3px solid #8b5cf6', paddingBottom: '0.5rem' }}>
              📋 Basic Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '3rem', marginBottom: '2.5rem' }}>
              <div>
                <label style={labelStyle}>Full Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" name="name" value={patientData.name} onChange={handleChange} placeholder="Juan Dela Cruz" style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Age <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="number" name="age" value={patientData.age} onChange={handleChange} placeholder="45" style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Gender</label>
                <select name="gender" value={patientData.gender} onChange={handleChange} style={{ ...inputStyle, background: 'white' }}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Weight (kg)</label>
                <input type="number" step="0.1" name="weight_kg" value={patientData.weight_kg} onChange={handleChange} placeholder="70" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Height (cm)</label>
                <input type="number" step="0.1" name="height_cm" value={patientData.height_cm} onChange={handleChange} placeholder="170" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Blood Pressure</label>
                <input type="text" name="blood_pressure" value={patientData.blood_pressure} onChange={handleChange} placeholder="120/80" style={inputStyle} />
              </div>
            </div>

            {/* Clinical Information */}
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginTop: '2rem', marginBottom: '1.5rem', color: '#1f2937', borderBottom: '3px solid #8b5cf6', paddingBottom: '0.5rem' }}>
              🏥 Clinical Information
            </h3>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Chief Complaint <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea name="chief_complaint" value={patientData.chief_complaint} onChange={handleChange}
                placeholder="Persistent dry cough and shortness of breath"
                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }} required />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Diagnosis <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea name="diagnosis" value={patientData.diagnosis} onChange={handleChange}
                placeholder="Chronic Obstructive Pulmonary Disease (COPD)"
                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', marginBottom: '2.5rem' }}>
              <div>
                <label style={labelStyle}>Symptoms</label>
                <textarea name="symptoms" value={patientData.symptoms} onChange={handleChange}
                  placeholder="cough, wheezing, fatigue, shortness of breath"
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }} />
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>Comma-separated</p>
              </div>
              <div>
                <label style={labelStyle}>Medical History</label>
                <textarea name="medical_history" value={patientData.medical_history} onChange={handleChange}
                  placeholder="hypertension, asthma, diabetes"
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }} />
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>Comma-separated</p>
              </div>
              <div>
                <label style={labelStyle}>Family History</label>
                <textarea name="family_history" value={patientData.family_history} onChange={handleChange}
                  placeholder="father had lung cancer, mother has diabetes"
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }} />
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>Comma-separated</p>
              </div>
            </div>

            {/* Medications & Allergies */}
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginTop: '2rem', marginBottom: '1.5rem', color: '#1f2937', borderBottom: '3px solid #f59e0b', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={24} color="#f59e0b" />
              Medications & Allergies (Critical for Safety)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={labelStyle}>Current Medications</label>
                <textarea name="current_medications" value={patientData.current_medications} onChange={handleChange}
                  placeholder="Salbutamol inhaler 100mcg as needed, Lisinopril 10mg once daily"
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }} />
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>Comma-separated</p>
              </div>
              <div>
                <label style={labelStyle}>Recent Medications</label>
                <textarea name="recent_medications" value={patientData.recent_medications} onChange={handleChange}
                  placeholder="Prednisone 20mg for 5 days (last month)"
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }} />
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>Comma-separated</p>
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '2px solid #f59e0b', borderRadius: '16px', padding: '1.5rem', marginBottom: '2.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <AlertTriangle size={24} color="#f59e0b" />
                <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#92400e', margin: 0 }}>
                  Critical Safety Information
                </h4>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem', paddingRight: '2rem' }}>
                <div>
                  <label style={{ ...labelStyle, color: '#78350f' }}>Drug Allergies ⚠️</label>
                  <input type="text" name="drug_allergies" value={patientData.drug_allergies} onChange={handleChange}
                    placeholder="penicillin, aspirin"
                    style={{ ...inputStyle, border: '2px solid #f59e0b', background: 'white' }} />
                  <p style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '0.25rem' }}>Comma-separated • CRITICAL for safety</p>
                </div>
                <div>
                  <label style={{ ...labelStyle, color: '#78350f' }}>Adverse Reactions</label>
                  <input type="text" name="adverse_reactions" value={patientData.adverse_reactions} onChange={handleChange}
                    placeholder="nausea from metformin"
                    style={{ ...inputStyle, border: '2px solid #f59e0b', background: 'white' }} />
                  <p style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '0.25rem' }}>Comma-separated</p>
                </div>
              </div>
            </div>

            {/* Lab Results */}
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginTop: '2rem', marginBottom: '1.5rem', color: '#1f2937', borderBottom: '3px solid #8b5cf6', paddingBottom: '0.5rem' }}>
              🧪 Lab Results (Optional but Recommended)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', marginBottom: '2.5rem' }}>
              <div>
                <label style={labelStyle}>Renal: Creatinine (mg/dL)</label>
                <input type="number" step="0.1" name="renal_creatinine" value={patientData.renal_creatinine} onChange={handleChange} placeholder="1.1" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Renal: GFR (ml/min)</label>
                <input type="number" name="renal_gfr" value={patientData.renal_gfr} onChange={handleChange} placeholder="85" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Liver: ALT (U/L)</label>
                <input type="number" name="liver_alt" value={patientData.liver_alt} onChange={handleChange} placeholder="25" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Liver: AST (U/L)</label>
                <input type="number" name="liver_ast" value={patientData.liver_ast} onChange={handleChange} placeholder="22" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>CBC: WBC</label>
                <input type="number" step="0.1" name="recent_labs_wbc" value={patientData.recent_labs_wbc} onChange={handleChange} placeholder="6.2" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>CBC: Hemoglobin</label>
                <input type="number" step="0.1" name="recent_labs_hemoglobin" value={patientData.recent_labs_hemoglobin} onChange={handleChange} placeholder="13.5" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Fasting Blood Glucose</label>
                <input type="number" name="recent_labs_glucose" value={patientData.recent_labs_glucose} onChange={handleChange} placeholder="92" style={inputStyle} />
              </div>
            </div>

            {/* Lifestyle & Preferences */}
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginTop: '2rem', marginBottom: '1.5rem', color: '#1f2937', borderBottom: '3px solid #8b5cf6', paddingBottom: '0.5rem' }}>
              🌟 Lifestyle & Preferences
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem', marginBottom: '4rem' }}>
              <div>
                <label style={labelStyle}>Pregnancy Status</label>
                <select name="pregnancy_status" value={patientData.pregnancy_status} onChange={handleChange} style={{ ...inputStyle, background: 'white' }}>
                  <option value="Not applicable">Not applicable</option>
                  <option value="Not pregnant">Not pregnant</option>
                  <option value="Pregnant - First Trimester">Pregnant - First Trimester</option>
                  <option value="Pregnant - Second Trimester">Pregnant - Second Trimester</option>
                  <option value="Pregnant - Third Trimester">Pregnant - Third Trimester</option>
                  <option value="Breastfeeding">Breastfeeding</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Smoking Status</label>
                <select name="smoking_status" value={patientData.smoking_status} onChange={handleChange} style={{ ...inputStyle, background: 'white' }}>
                  <option value="never">Never Smoked</option>
                  <option value="former">Former Smoker</option>
                  <option value="current">Current Smoker</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Alcohol Use</label>
                <input type="text" name="alcohol_use" value={patientData.alcohol_use} onChange={handleChange} placeholder="Occasional" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Dietary Restrictions</label>
                <input type="text" name="dietary_restrictions" value={patientData.dietary_restrictions} onChange={handleChange} placeholder="low sodium, gluten-free" style={inputStyle} />
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>Comma-separated</p>
              </div>
              <div>
                <label style={labelStyle}>Financial Constraints</label>
                <input type="text" name="financial_constraints" value={patientData.financial_constraints} onChange={handleChange} placeholder="prefers generics" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Preferred Route</label>
                <select name="preferred_route" value={patientData.preferred_route} onChange={handleChange} style={{ ...inputStyle, background: 'white' }}>
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
            <button onClick={handleSubmit} disabled={loading} style={{
              width: '100%', padding: '1.5rem 2rem',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
              color: 'white', border: 'none', borderRadius: '16px',
              fontSize: '1.2rem', fontWeight: '800',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 10px 40px rgba(139, 92, 246, 0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
              opacity: loading ? 0.6 : 1
            }}>
              <Sparkles size={28} />
              Generate AI Recommendations
            </button>
          </>
        )}

        {/* Results View */}
        {step === 'results' && recommendations && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h1 style={{
                  fontSize: '2.75rem', fontWeight: '900',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem'
                }}>
                  <CheckCircle size={44} />
                  Recommendations Ready
                </h1>
                <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
                  {recommendations.patient.name}, {recommendations.patient.age} years • {recommendations.patient.diagnosis}
                </p>
              </div>
              <button onClick={resetForm} style={{
                padding: '0.875rem 1.75rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                color: 'white', border: 'none', borderRadius: '12px',
                fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
              }}>
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
                  borderRadius: '16px', padding: '1.5rem', color: 'white',
                  boxShadow: '0 10px 30px rgba(139, 92, 246, 0.3)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    {React.createElement(stat.icon, { size: 24, strokeWidth: 2.5 })}
                    <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>{stat.label}</span>
                  </div>
                  <div style={{ fontSize: '2.25rem', fontWeight: '900' }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Recommendations list */}
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '1.5rem', color: '#1f2937' }}>
              Personalized Recommendations ({recommendations.recommendations.length})
            </h2>

            {recommendations.recommendations.map((rec, index) => {
              const isSafe = rec.is_safe;
              const confidence = rec.confidence_level || 'low';
              
              return (
                <div key={index} style={{
                  background: 'white', border: `3px solid ${getSafetyColor(isSafe)}`,
                  borderRadius: '20px', padding: '2rem', marginBottom: '1.5rem',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.1)', transition: 'all 0.3s'
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                        <span style={{
                          background: getSafetyColor(isSafe), color: 'white',
                          padding: '0.5rem 1rem', borderRadius: '10px',
                          fontSize: '0.875rem', fontWeight: '800'
                        }}>
                          #{index + 1}
                        </span>
                        {isSafe ? (
                          <CheckCircle size={28} color="#10b981" strokeWidth={2.5} />
                        ) : (
                          <AlertTriangle size={28} color="#ef4444" strokeWidth={2.5} />
                        )}
                        <span style={{
                          fontSize: '0.9rem', fontWeight: '700',
                          color: isSafe ? '#10b981' : '#ef4444'
                        }}>
                          {isSafe ? 'SAFE TO PRESCRIBE' : 'NOT RECOMMENDED'}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '2rem', fontWeight: '900', color: '#1f2937', margin: 0 }}>
                        {rec.medicine_name}
                      </h3>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        background: getConfidenceColor(confidence), color: 'white',
                        padding: '0.75rem 1.25rem', borderRadius: '12px',
                        fontSize: '0.95rem', fontWeight: '800', marginBottom: '0.75rem',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                      }}>
                        {confidence.toUpperCase()}
                      </div>
                      <div style={{
                        background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                        color: '#7c3aed', padding: '0.75rem 1.25rem', borderRadius: '12px',
                        fontSize: '1.1rem', fontWeight: '800'
                      }}>
                        {(rec.similarity_score * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Medicine details */}
                  <div style={{
                    background: '#f9fafb', borderRadius: '12px',
                    padding: '1.5rem', marginBottom: '1.5rem'
                  }}>
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'auto 1fr',
                      gap: '1rem', fontSize: '0.95rem'
                    }}>
                      <div style={{ fontWeight: '700', color: '#4b5563' }}>Brand Names:</div>
                      <div style={{ color: '#1f2937' }}>
                        {rec.medicine_details.brand_name?.slice(0, 3).join(', ') || 'N/A'}
                      </div>

                      <div style={{ fontWeight: '700', color: '#4b5563' }}>Generic Names:</div>
                      <div style={{ color: '#1f2937' }}>
                        {rec.medicine_details.generic_name?.slice(0, 3).join(', ') || 'N/A'}
                      </div>

                      <div style={{ fontWeight: '700', color: '#4b5563' }}>Active Ingredients:</div>
                      <div style={{ color: '#1f2937' }}>
                        {rec.medicine_details.active_ingredient?.slice(0, 2).join(', ') || 'N/A'}
                      </div>

                      <div style={{ fontWeight: '700', color: '#4b5563' }}>Indications:</div>
                      <div style={{ color: '#1f2937' }}>
                        {Array.isArray(rec.medicine_details.indications)
                          ? rec.medicine_details.indications.join(' ').slice(0, 150)
                          : rec.medicine_details.indications?.slice(0, 150) || 'N/A'}
                        {((rec.medicine_details.indications?.length || 0) > 150) && '...'}
                      </div>

                      <div style={{ fontWeight: '700', color: '#4b5563' }}>Dosage:</div>
                      <div style={{ color: '#1f2937' }}>
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
                      borderRadius: '12px', padding: '1.5rem'
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem'
                      }}>
                        <AlertTriangle size={24} color={isSafe ? '#f59e0b' : '#ef4444'} strokeWidth={2.5} />
                        <span style={{
                          fontSize: '1.1rem', fontWeight: '800',
                          color: isSafe ? '#92400e' : '#991b1b'
                        }}>
                          Safety Considerations
                        </span>
                      </div>
                      {rec.warnings.map((warning, wIdx) => (
                        <div key={wIdx} style={{
                          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                          marginBottom: '0.5rem', fontSize: '0.95rem',
                          color: isSafe ? '#92400e' : '#991b1b', lineHeight: '1.6'
                        }}>
                          <span style={{ fontWeight: '900', fontSize: '1.2rem' }}>•</span>
                          <span style={{ fontWeight: warning.includes('CRITICAL') ? '800' : '600' }}>
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
              border: '2px solid #3b82f6', borderRadius: '16px',
              padding: '2rem', marginTop: '3rem'
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem'
              }}>
                <Brain size={32} color="#3b82f6" strokeWidth={2.5} />
                <h3 style={{
                  fontSize: '1.5rem', fontWeight: '800', color: '#1e3a8a', margin: 0
                }}>
                  AI-Powered Clinical Decision Support
                </h3>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem', marginBottom: '1.5rem'
              }}>
                <div>
                  <div style={{
                    fontSize: '0.95rem', fontWeight: '700',
                    color: '#1e3a8a', marginBottom: '0.5rem'
                  }}>
                    🧠 Semantic Matching
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.6' }}>
                    BioBERT embeddings (768 dimensions) capture clinical context beyond keyword matching
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: '0.95rem', fontWeight: '700',
                    color: '#1e3a8a', marginBottom: '0.5rem'
                  }}>
                    🛡️ Multi-Pass Safety
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.6' }}>
                    Allergy checks, contraindication screening, renal/hepatic function validation
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: '0.95rem', fontWeight: '700',
                    color: '#1e3a8a', marginBottom: '0.5rem'
                  }}>
                    ⚡ FAISS Optimization
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.6' }}>
                    Millisecond search across 1000+ medicines using vector similarity
                  </div>
                </div>
              </div>

              <div style={{
                background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px',
                padding: '1.25rem', fontSize: '0.875rem',
                color: '#1e3a8a', lineHeight: '1.7'
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
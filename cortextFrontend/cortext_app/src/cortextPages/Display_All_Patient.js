import React, { useState, useEffect } from 'react';

const PatientProfile = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch('http://192.168.56.1:8000/api/patients/all/');
        if (!response.ok) throw new Error('Failed to fetch patients');
        const data = await response.json();
        setPatients(data.data.patients);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const renderList = (items) => items?.length > 0 ? items.join(', ') : 'None';
  const renderJson = (obj) => Object.keys(obj || {}).length > 0 ? JSON.stringify(obj, null, 2) : 'None';

  if (loading) return <div style={styles.center}>Loading patients...</div>;
  if (error) return <div style={{ ...styles.center, color: '#d9534f' }}>Error: {error}</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>All Patients (Full Details + Recommendations)</h1>
      <div style={styles.grid}>
        {patients.map((patient) => (
          <div key={patient.id} style={styles.card}>
            <h3 style={styles.cardTitle}>{patient.name} ({patient.id})</h3>

            {/* Sections */}
            {renderSection('Demographics', [
              ['Age', patient.age],
              ['Gender', patient.gender],
              ['Weight (kg)', patient.weight_kg || 'N/A'],
              ['Height (cm)', patient.height_cm || 'N/A']
            ])}

            {renderSection('Clinical Information', [
              ['Chief Complaint', patient.chief_complaint],
              ['Diagnosis', patient.diagnosis],
              ['Symptoms', renderList(patient.symptoms)],
              ['Medical History', renderList(patient.medical_history)],
              ['Family History', renderList(patient.family_history)]
            ])}

            {renderSection('Medications', [
              ['Current Medications', renderList(patient.current_medications)],
              ['Recent Medications', renderList(patient.recent_medications)]
            ])}

            {renderSection('Allergies & Reactions', [
              ['Drug Allergies', renderList(patient.drug_allergies)],
              ['Adverse Reactions', renderList(patient.adverse_reactions)]
            ])}

            {renderSection('Vital Signs & Labs', [
              ['Blood Pressure', patient.blood_pressure || 'N/A'],
              ['Renal Function', renderJson(patient.renal_function)],
              ['Liver Function', renderJson(patient.liver_function)],
              ['Recent Labs', renderJson(patient.recent_labs)]
            ])}

            {renderSection('Reproductive & Lifestyle', [
              ['Pregnancy Status', patient.pregnancy_status || 'N/A'],
              ['Smoking Status', patient.smoking_status],
              ['Alcohol Use', patient.alcohol_use || 'N/A'],
              ['Dietary Restrictions', renderList(patient.dietary_restrictions)]
            ])}

            {renderSection('Preferences & Constraints', [
              ['Financial Constraints', patient.financial_constraints || 'None'],
              ['Preferred Route', patient.preferred_route]
            ])}

            {renderSection('Vector Embedding', [
              ['Vector Dimension', patient.vector_dim],
              ['Embedding (Preview)', `[${patient.embedding.slice(0, 5).join(', ')}...] (${patient.embedding.length} values)`]
            ])}

            {/* Medicine Recommendations */}
            <details style={styles.details}>
              <summary style={styles.summary}>Medicine Recommendations</summary>
              {patient.recommendations?.length > 0 ? (
                patient.recommendations.map((rec) => (
                  <div key={rec.id} style={styles.recBox}>
                    <p><strong>Medicine:</strong> {rec.medicine_name} (ID: {rec.medicine_id})</p>
                    <p><strong>Similarity Score:</strong> {rec.similarity_score}</p>
                    <p><strong>Confidence Level:</strong> {rec.confidence_level}</p>
                    <p><strong>Is Safe:</strong> {rec.is_safe ? 'Yes' : 'No'}</p>
                    <p><strong>Warnings:</strong> {renderList(rec.warnings)}</p>
                    <p><strong>Status:</strong> {rec.status}</p>
                    <p><strong>Clinician Approved:</strong> {rec.clinician_approved !== null ? (rec.clinician_approved ? 'Yes' : 'No') : 'Pending'}</p>
                    <p><strong>Reviewed By:</strong> {rec.reviewed_by || 'N/A'}</p>
                    <p><strong>Created At:</strong> {new Date(rec.created_at).toLocaleString()}</p>

                    <details style={{ marginTop: '10px' }}>
                      <summary style={{ fontWeight: 'bold', color: '#6c757d' }}>Medicine Details (JSON)</summary>
                      <pre style={styles.jsonBlock}>{renderJson(rec.medicine_details)}</pre>
                    </details>
                  </div>
                ))
              ) : (
                <p>No recommendations available.</p>
              )}
            </details>

            {/* Metadata */}
            {renderSection('Metadata', [
              ['Created At', new Date(patient.timestamp).toLocaleString()],
              ['Updated At', new Date(patient.updated_at || patient.timestamp).toLocaleString()]
            ])}
          </div>
        ))}
      </div>
      <div style={styles.footer}>Total Patients: {patients.length}</div>
    </div>
  );
};

export default PatientProfile;

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    fontFamily: 'Arial, sans-serif'
  },
  header: {
    textAlign: 'center',
    color: '#343a40',
    marginBottom: '30px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))',
    gap: '20px',
    maxWidth: '1600px',
    margin: '0 auto'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    padding: '20px',
    transition: 'transform 0.2s',
    cursor: 'pointer'
  },
  cardTitle: {
    margin: '0 0 15px 0',
    color: '#007bff'
  },
  details: {
    marginBottom: '10px'
  },
  summary: {
    cursor: 'pointer',
    fontWeight: 'bold',
    color: '#495057'
  },
  recBox: {
    border: '1px solid #dee2e6',
    borderRadius: '5px',
    padding: '10px',
    marginBottom: '10px',
    backgroundColor: '#f8f9fa'
  },
  jsonBlock: {
    backgroundColor: '#fff',
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #ccc',
    whiteSpace: 'pre-wrap',
    fontSize: '14px',
    marginTop: '10px'
  },
  footer: {
    textAlign: 'center',
    marginTop: '30px',
    color: '#6c757d',
    fontSize: '16px'
  },
  center: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#666'
  }
};

const renderSection = (title, rows) => (
  <details style={styles.details}>
    <summary style={styles.summary}>{title}</summary>
    {rows.map(([label, value], i) => (
      <p key={i}><strong>{label}:</strong> {value}</p>
    ))}
  </details>
);

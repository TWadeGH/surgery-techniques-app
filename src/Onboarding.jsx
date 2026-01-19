import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

export default function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [userType, setUserType] = useState('')
  const [specialties, setSpecialties] = useState([])
  const [subspecialties, setSubspecialties] = useState([])
  const [selectedSpecialty, setSelectedSpecialty] = useState('')
  const [selectedSubspecialty, setSelectedSubspecialty] = useState('')

  // Fetch specialties on mount
  useEffect(() => {
    fetchSpecialties()
  }, [])

  // Fetch subspecialties when specialty is selected
  useEffect(() => {
    if (selectedSpecialty) {
      fetchSubspecialties(selectedSpecialty)
    }
  }, [selectedSpecialty])

  async function fetchSpecialties() {
    const { data } = await supabase
      .from('specialties')
      .select('*')
      .order('order')
    if (data) setSpecialties(data)
  }

  async function fetchSubspecialties(specialtyId) {
    const { data } = await supabase
      .from('subspecialties')
      .select('*')
      .eq('specialty_id', specialtyId)
      .order('order')
    if (data) setSubspecialties(data)
  }

  async function handleComplete() {
    setLoading(true)
    
    const { error } = await supabase
      .from('profiles')
      .update({
        user_type: userType,
        primary_specialty_id: selectedSpecialty,
        primary_subspecialty_id: selectedSubspecialty
      })
      .eq('id', user.id)

    if (error) {
      console.error('Error updating profile:', error)
      alert('Error saving profile. Please try again.')
    } else {
      onComplete()
    }
    
    setLoading(false)
  }

  const styles = {
    container: {
      maxWidth: '600px',
      margin: '50px auto',
      padding: '40px',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    },
    header: {
      textAlign: 'center',
      marginBottom: '40px'
    },
    title: {
      fontSize: '32px',
      fontWeight: 'bold',
      marginBottom: '10px',
      color: '#1a1a1a'
    },
    subtitle: {
      fontSize: '16px',
      color: '#666'
    },
    stepIndicator: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: '40px',
      gap: '10px'
    },
    stepDot: (isActive) => ({
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: isActive ? '#0066cc' : '#ddd',
      transition: 'background-color 0.3s'
    }),
    card: {
      padding: '20px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      marginBottom: '15px'
    },
    cardSelected: {
      border: '2px solid #0066cc',
      backgroundColor: '#f0f7ff'
    },
    cardTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      marginBottom: '8px',
      color: '#1a1a1a'
    },
    cardDescription: {
      fontSize: '14px',
      color: '#666'
    },
    button: {
      width: '100%',
      padding: '12px',
      fontSize: '16px',
      fontWeight: 'bold',
      backgroundColor: '#0066cc',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      marginTop: '20px'
    },
    buttonDisabled: {
      backgroundColor: '#ccc',
      cursor: 'not-allowed'
    },
    backButton: {
      width: '100%',
      padding: '12px',
      fontSize: '16px',
      backgroundColor: 'transparent',
      color: '#0066cc',
      border: '2px solid #0066cc',
      borderRadius: '8px',
      cursor: 'pointer',
      marginTop: '10px'
    }
  }

  return (
    <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh', padding: '20px' }}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Welcome to Surgical Techniques</h1>
          <p style={styles.subtitle}>Let's set up your account</p>
        </div>

        <div style={styles.stepIndicator}>
          <div style={styles.stepDot(step === 1)} />
          <div style={styles.stepDot(step === 2)} />
          <div style={styles.stepDot(step === 3)} />
        </div>

        {/* Step 1: User Type */}
        {step === 1 && (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>What describes you best?</h2>
            
            <div
              style={{
                ...styles.card,
                ...(userType === 'surgeon' ? styles.cardSelected : {})
              }}
              onClick={() => setUserType('surgeon')}
            >
              <div style={styles.cardTitle}>👨‍⚕️ Surgeon</div>
              <div style={styles.cardDescription}>
                Practicing surgeon looking for surgical techniques and resources
              </div>
            </div>

            <div
              style={{
                ...styles.card,
                ...(userType === 'industry' ? styles.cardSelected : {})
              }}
              onClick={() => setUserType('industry')}
            >
              <div style={styles.cardTitle}>🏢 Medical Device Industry</div>
              <div style={styles.cardDescription}>
                Device company representative, product specialist, or industry professional
              </div>
            </div>

            <div
              style={{
                ...styles.card,
                ...(userType === 'student' ? styles.cardSelected : {})
              }}
              onClick={() => setUserType('student')}
            >
              <div style={styles.cardTitle}>📚 Student</div>
              <div style={styles.cardDescription}>
                Medical student, resident, or fellow learning surgical techniques
              </div>
            </div>

            <button
              style={{
                ...styles.button,
                ...(userType ? {} : styles.buttonDisabled)
              }}
              disabled={!userType}
              onClick={() => setStep(2)}
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Specialty */}
        {step === 2 && (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>
              {userType === 'surgeon' ? 'What is your specialty?' : 'Which specialty interests you?'}
            </h2>
            
            {specialties.map(specialty => (
              <div
                key={specialty.id}
                style={{
                  ...styles.card,
                  ...(selectedSpecialty === specialty.id ? styles.cardSelected : {})
                }}
                onClick={() => {
                  setSelectedSpecialty(specialty.id)
                  setSelectedSubspecialty('')
                }}
              >
                <div style={styles.cardTitle}>{specialty.name}</div>
                {specialty.description && (
                  <div style={styles.cardDescription}>{specialty.description}</div>
                )}
              </div>
            ))}

            <button
              style={{
                ...styles.button,
                ...(selectedSpecialty ? {} : styles.buttonDisabled)
              }}
              disabled={!selectedSpecialty}
              onClick={() => setStep(3)}
            >
              Continue
            </button>

            <button
              style={styles.backButton}
              onClick={() => setStep(1)}
            >
              Back
            </button>
          </div>
        )}

        {/* Step 3: Subspecialty */}
        {step === 3 && (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>
              {userType === 'surgeon' ? 'What is your subspecialty?' : 'Which subspecialty interests you?'}
            </h2>
            
            {subspecialties.length === 0 ? (
              <p>Loading subspecialties...</p>
            ) : (
              subspecialties.map(subspecialty => (
                <div
                  key={subspecialty.id}
                  style={{
                    ...styles.card,
                    ...(selectedSubspecialty === subspecialty.id ? styles.cardSelected : {})
                  }}
                  onClick={() => setSelectedSubspecialty(subspecialty.id)}
                >
                  <div style={styles.cardTitle}>{subspecialty.name}</div>
                  {subspecialty.description && (
                    <div style={styles.cardDescription}>{subspecialty.description}</div>
                  )}
                </div>
              ))
            )}

            <button
              style={{
                ...styles.button,
                ...(selectedSubspecialty && !loading ? {} : styles.buttonDisabled)
              }}
              disabled={!selectedSubspecialty || loading}
              onClick={handleComplete}
            >
              {loading ? 'Saving...' : 'Complete Setup'}
            </button>

            <button
              style={styles.backButton}
              onClick={() => setStep(2)}
              disabled={loading}
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

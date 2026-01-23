import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

export default function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [userType, setUserType] = useState('')
  const [specialties, setSpecialties] = useState([])
  const [subspecialties, setSubspecialties] = useState([])
  const [loadingSubspecialties, setLoadingSubspecialties] = useState(false)
  const [subspecialtiesError, setSubspecialtiesError] = useState(null)
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
    } else {
      // Clear subspecialties when no specialty is selected
      setSubspecialties([])
      setLoadingSubspecialties(false)
      setSubspecialtiesError(null)
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
    try {
      setLoadingSubspecialties(true)
      setSubspecialtiesError(null)
      setSubspecialties([]) // Clear previous subspecialties
      
      console.log('Fetching subspecialties for specialty:', specialtyId)
      
      const { data, error } = await supabase
        .from('subspecialties')
        .select('*')
        .eq('specialty_id', specialtyId)
        .order('order')
      
      if (error) {
        console.error('Error fetching subspecialties:', error)
        setSubspecialtiesError(error.message)
        setSubspecialties([])
      } else {
        console.log('Subspecialties fetched:', data?.length || 0)
        setSubspecialties(data || [])
        if (!data || data.length === 0) {
          setSubspecialtiesError('No subspecialties found for this specialty')
        }
      }
    } catch (err) {
      console.error('Exception fetching subspecialties:', err)
      setSubspecialtiesError(err.message)
      setSubspecialties([])
    } finally {
      setLoadingSubspecialties(false)
    }
  }

  async function handleComplete() {
    try {
      console.log('handleComplete called', { userType, selectedSpecialty, selectedSubspecialty, userId: user?.id });
      setLoading(true)
      
      const updateData = {
        user_type: userType,
        onboarding_completed: true
      };
      
      // Only set specialty/subspecialty for surgeons
      if (userType === 'surgeon') {
        if (!selectedSpecialty) {
          alert('Please select a specialty.');
          setLoading(false);
          return;
        }
        if (!selectedSubspecialty) {
          alert('Please select a subspecialty. This is required for surgeons.');
          setLoading(false);
          return;
        }
        updateData.primary_specialty_id = selectedSpecialty;
        updateData.primary_subspecialty_id = selectedSubspecialty;
      }
      
      console.log('Updating profile with:', updateData);
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()

      if (error) {
        console.error('Error updating profile:', error)
        alert('Error saving profile: ' + error.message + '. Please try again.')
        setLoading(false)
      } else {
        console.log('Profile updated successfully:', data);
        onComplete()
      }
    } catch (err) {
      console.error('Exception in handleComplete:', err);
      alert('An error occurred: ' + err.message);
      setLoading(false);
    }
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
          {userType === 'surgeon' && (
            <>
              <div style={styles.stepDot(step === 2)} />
              <div style={styles.stepDot(step === 3)} />
            </>
          )}
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
              <div style={styles.cardTitle}>👨‍⚕️ Surgeon (Attending / Consultant)</div>
              <div style={styles.cardDescription}>
                Primary decision-makers with NPI numbers and OR privileges. Your data contributes to "Upcoming Cases" volume reports.
              </div>
            </div>

            <div
              style={{
                ...styles.card,
                ...(userType === 'trainee' ? styles.cardSelected : {})
              }}
              onClick={() => setUserType('trainee')}
            >
              <div style={styles.cardTitle}>🏥 Surgical Trainee (Resident/Fellow)</div>
              <div style={styles.cardDescription}>
                Doctors in training who are still refining their brand preferences. Your favorites help create the "Adoption Pipeline" report.
              </div>
            </div>

            <div
              style={{
                ...styles.card,
                ...(userType === 'industry' ? styles.cardSelected : {})
              }}
              onClick={() => setUserType('industry')}
            >
              <div style={styles.cardTitle}>🏢 Medical Industry (Device Rep / Clinical Specialist)</div>
              <div style={styles.cardDescription}>
                Sales reps from Stryker, Arthrex, etc., or clinical trainers. Your viewing data helps identify what products are being pushed in the field.
              </div>
            </div>

            <div
              style={{
                ...styles.card,
                ...(userType === 'student' ? styles.cardSelected : {})
              }}
              onClick={() => setUserType('student')}
            >
              <div style={styles.cardTitle}>📚 Medical Student / Other Healthcare Professional</div>
              <div style={styles.cardDescription}>
                Non-surgeons, PAs, or students. This category helps keep core analytics pure by filtering out users without a "Case Dashboard."
              </div>
            </div>

            <button
              style={{
                ...styles.button,
                ...(userType ? {} : styles.buttonDisabled)
              }}
              disabled={!userType}
              onClick={() => {
                // Only show specialty/subspecialty steps for surgeons
                if (userType === 'surgeon') {
                  setStep(2);
                } else {
                  // Skip to completion for non-surgeons
                  handleComplete();
                }
              }}
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
            
            {loadingSubspecialties ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p>Loading subspecialties...</p>
              </div>
            ) : subspecialtiesError ? (
              <div style={{ 
                padding: '20px', 
                backgroundColor: '#fee', 
                borderRadius: '8px',
                color: '#c33',
                marginBottom: '15px'
              }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Error loading subspecialties</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>{subspecialtiesError}</p>
                <button
                  onClick={() => fetchSubspecialties(selectedSpecialty)}
                  style={{
                    marginTop: '10px',
                    padding: '8px 16px',
                    backgroundColor: '#0066cc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Retry
                </button>
              </div>
            ) : subspecialties.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p style={{ color: '#666' }}>No subspecialties available for this specialty.</p>
                <p style={{ color: '#999', fontSize: '14px', marginTop: '10px' }}>
                  You can still complete setup without selecting a subspecialty.
                </p>
                <button
                  onClick={handleComplete}
                  style={{
                    ...styles.button,
                    marginTop: '20px'
                  }}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Complete Setup Without Subspecialty'}
                </button>
              </div>
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

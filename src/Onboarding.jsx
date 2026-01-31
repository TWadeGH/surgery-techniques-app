import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { SPECIALTY_SUBSPECIALTY } from './utils/constants'

// Helper function to map Podiatry to Orthopedic Surgery + Foot and Ankle
async function mapPodiatryToFootAnkle() {
  try {
    // Find Orthopedic Surgery specialty - try multiple name variations
    let orthoSurgery = null;
    const orthoVariations = [
      SPECIALTY_SUBSPECIALTY.ORTHOPAEDIC_SURGERY,
      SPECIALTY_SUBSPECIALTY.ORTHOPEDIC_SURGERY,
      'orthopedic surgery',
      'orthopaedic surgery',
      'Orthopedic Surgery',
      'Orthopaedic Surgery'
    ];
    
    for (const orthoName of orthoVariations) {
      const { data, error } = await supabase
        .from('specialties')
        .select('id, name')
        .ilike('name', `%${orthoName}%`)
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.warn('Error querying specialties:', error);
        continue;
      }
      
      if (data?.id) {
        orthoSurgery = data;
        console.log('Found Orthopedic Surgery:', { id: data.id, name: data.name });
        break;
      }
    }
    
    // If still not found, try exact match
    if (!orthoSurgery) {
      const { data, error } = await supabase
        .from('specialties')
        .select('id, name')
        .or('name.ilike.orthopedic surgery,name.ilike.orthopaedic surgery')
        .limit(1)
        .maybeSingle();
      
      if (!error && data?.id) {
        orthoSurgery = data;
        console.log('Found Orthopedic Surgery (exact match):', { id: data.id, name: data.name });
      }
    }
    
    if (!orthoSurgery) {
      // Security: Don't expose internal details - log for debugging but show user-friendly error
      console.error('Orthopedic Surgery specialty not found in database');
      throw new Error('Unable to map Podiatry specialty. Please contact support.');
    }
    
    // Find Foot and Ankle subspecialty - try multiple name variations
    const footAnkleVariations = [
      SPECIALTY_SUBSPECIALTY.FOOT_AND_ANKLE,
      'foot and ankle',
      'Foot and Ankle',
      'foot & ankle',
      'Foot & Ankle'
    ];
    
    let footAnkle = null;
    for (const faName of footAnkleVariations) {
      const { data, error } = await supabase
        .from('subspecialties')
        .select('id, name')
        .eq('specialty_id', orthoSurgery.id)
        .ilike('name', `%${faName}%`)
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.warn('Error querying subspecialties:', error);
        continue;
      }
      
      if (data?.id) {
        footAnkle = data;
        console.log('Found Foot and Ankle:', { id: data.id, name: data.name, specialty_id: orthoSurgery.id });
        break;
      }
    }
    
    // If still not found, try broader search
    if (!footAnkle) {
      const { data, error } = await supabase
        .from('subspecialties')
        .select('id, name')
        .eq('specialty_id', orthoSurgery.id)
        .or('name.ilike.foot and ankle,name.ilike.foot & ankle')
        .limit(1)
        .maybeSingle();
      
      if (!error && data?.id) {
        footAnkle = data;
        console.log('Found Foot and Ankle (broader search):', { id: data.id, name: data.name });
      }
    }
    
    if (!footAnkle) {
      // Security: Don't expose internal details
      console.error('Foot and Ankle subspecialty not found for specialty:', orthoSurgery.id);
      throw new Error('Unable to map Podiatry to Foot and Ankle. Please contact support.');
    }
    
    console.log('Podiatry mapping successful:', {
      orthoSurgeryId: orthoSurgery.id,
      footAnkleId: footAnkle.id
    });
    
    return {
      specialtyId: orthoSurgery.id,
      subspecialtyId: footAnkle.id
    };
  } catch (error) {
    console.error('Error mapping Podiatry to Foot and Ankle:', error);
    // Re-throw with user-friendly message if it's our custom error
    if (error.message && error.message.includes('Unable to map')) {
      throw error;
    }
    // Otherwise wrap in user-friendly error
    throw new Error('Unable to complete Podiatry mapping. Please try again or contact support.');
  }
}

export default function Onboarding({ user, onComplete }) {
  // Security: Validate props
  if (!user || !user.id) {
    console.error('Onboarding: Invalid user prop');
    return <div>Error: Invalid user data</div>;
  }
  if (typeof onComplete !== 'function') {
    console.error('Onboarding: Invalid onComplete prop');
    return <div>Error: Invalid onComplete callback</div>;
  }

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [userType, setUserType] = useState('')
  const [specialties, setSpecialties] = useState([])
  const [subspecialties, setSubspecialties] = useState([])
  const [selectedSpecialty, setSelectedSpecialty] = useState('')
  const [selectedSubspecialty, setSelectedSubspecialty] = useState('')
  const [isPodiatry, setIsPodiatry] = useState(false)

  // Fetch specialties on mount
  useEffect(() => {
    fetchSpecialties().catch(err => {
      console.error('Error fetching specialties:', err);
    });
  }, [])

  // Fetch subspecialties when specialty is selected
  useEffect(() => {
    if (selectedSpecialty && specialties.length > 0) {
      // Check if selected specialty is Podiatry
      const specialty = specialties.find(s => s.id === selectedSpecialty);
      const isPodiatrySpecialty = specialty && (
        specialty.name.toLowerCase().includes(SPECIALTY_SUBSPECIALTY.PODIATRY) ||
        specialty.name.toLowerCase() === 'podiatry'
      );
      
      if (isPodiatrySpecialty) {
        console.log('Podiatry detected - skipping subspecialty step');
        setIsPodiatry(true);
        setSubspecialties([]); // Clear any previous subspecialties
        // Podiatry doesn't have subspecialties, will skip to completion
      } else {
        setIsPodiatry(false);
        fetchSubspecialties(selectedSpecialty);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpecialty, specialties])

  async function fetchSpecialties() {
    try {
      const { data, error } = await supabase
        .from('specialties')
        .select('*')
        .order('order');
      if (error) {
        console.error('Error fetching specialties:', error);
        return;
      }
      if (data) setSpecialties(data);
    } catch (err) {
      console.error('Error in fetchSpecialties:', err);
    }
  }

  async function fetchSubspecialties(specialtyId) {
    try {
      // Security: Validate specialtyId
      if (!specialtyId) {
        console.error('fetchSubspecialties: Invalid specialtyId');
        return;
      }
      const { data, error } = await supabase
        .from('subspecialties')
        .select('*')
        .eq('specialty_id', specialtyId)
        .order('order');
      if (error) {
        console.error('Error fetching subspecialties:', error);
        return;
      }
      if (data) {
        // Security: Log count and validation without PII (no IDs, no names)
        console.log('Fetched subspecialties:', data.length, 'items');
        if (data.length > 0) {
          const sampleId = data[0].id;
          const isValidId = sampleId && String(sampleId).length >= 10 && !String(sampleId).startsWith('00000000');
          console.log('Sample subspecialty validation:', { 
            idLength: sampleId ? String(sampleId).length : 0, 
            idType: typeof sampleId,
            isValid: isValidId
          });
        }
        setSubspecialties(data);
      } else {
        console.warn('No subspecialties data returned for specialty:', specialtyId);
      }
    } catch (err) {
      console.error('Error in fetchSubspecialties:', err);
    }
  }

  async function handleComplete() {
    setLoading(true)
    
    try {
      let specialtyId = selectedSpecialty;
      let subspecialtyId = selectedSubspecialty;
      
      // Special case: Podiatry maps to Orthopedic Surgery + Foot and Ankle
      if (isPodiatry) {
        const mapping = await mapPodiatryToFootAnkle();
        specialtyId = mapping.specialtyId;
        subspecialtyId = mapping.subspecialtyId;
      }
      
      // Security: Validate IDs before saving
      if (!specialtyId || !subspecialtyId) {
        throw new Error('Specialty and subspecialty are required');
      }
      
      // Security: Validate user_type
      if (!userType) {
        throw new Error('User type is required');
      }
      
      // Security note:
      // - These IDs come from trusted database lookups (not raw user input)
      // - We only enforce that they are present, not that they follow a specific UUID shape
      //   because this project currently uses all-zero UUIDs in Seed data.
      const specialtyIdStr = String(specialtyId).trim();
      const subspecialtyIdStr = String(subspecialtyId).trim();
      
      // Security: Validate user_type against allowlist (prevent injection)
      const allowedUserTypes = ['surgeon', 'industry', 'student', 'trainee'];
      if (!allowedUserTypes.includes(userType)) {
        throw new Error('Invalid user type selected.');
      }
      
      // Prepare update data - ensure IDs are properly formatted
      const updateData = {
        user_type: userType, // Should be: 'surgeon', 'industry', 'student', etc.
        primary_specialty_id: specialtyIdStr, // UUID as string
        primary_subspecialty_id: subspecialtyIdStr, // UUID as string
        // Note: onboarding_complete column may not exist in all database schemas
        // The presence of specialty/subspecialty IDs is sufficient to determine onboarding status
        // onboarding_complete: true  // Commented out - column doesn't exist in current schema
      };
      
      // Security: Log validation info without PII (no user IDs, no specialty names)
      console.log('Updating profile - validation:', { 
        userType, 
        specialtyIdLength: specialtyIdStr.length,
        subspecialtyIdLength: subspecialtyIdStr.length,
        specialtyIdType: typeof specialtyId,
        subspecialtyIdType: typeof subspecialtyId,
        isPodiatryMapping: isPodiatry
      });
      
      // Security: Validate specialty/subspecialty exist without logging PII
      // Note: For Podiatry mapping, the IDs won't be in the specialties/subspecialties arrays
      // because we're mapping to Orthopedic Surgery + Foot and Ankle
      // So we skip this validation for Podiatry and trust the mapping function
      if (!isPodiatry) {
        const selectedSpecialtyObj = specialties.find(s => s.id === specialtyId);
        const selectedSubspecialtyObj = subspecialties.find(s => s.id === subspecialtyId);
        if (!selectedSpecialtyObj) {
          throw new Error('Selected specialty not found. Please try again.');
        }
        if (!selectedSubspecialtyObj) {
          throw new Error('Selected subspecialty not found. Please try again.');
        }
      } else {
        // For Podiatry, verify the mapped IDs are valid (not null/empty)
        if (!specialtyIdStr || specialtyIdStr === 'null' || specialtyIdStr === 'undefined') {
          throw new Error('Podiatry mapping failed. Please try again.');
        }
        if (!subspecialtyIdStr || subspecialtyIdStr === 'null' || subspecialtyIdStr === 'undefined') {
          throw new Error('Podiatry mapping failed. Please try again.');
        }
        console.log('Podiatry mapping validated - IDs are present');
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select(); // Select to verify update

      if (error) {
        console.error('Error updating profile:', error);
        // Security: Sanitize error message - don't expose internal details or PII
        let errorMessage = 'Error saving profile. Please try again.';
        if (error.message) {
          const msg = error.message.toLowerCase();
          // Only show user-friendly error messages
          if (msg.includes('foreign key') || msg.includes('constraint')) {
            errorMessage = 'Invalid specialty or subspecialty selected. Please try again.';
          } else if (msg.includes('permission') || msg.includes('policy')) {
            errorMessage = 'Permission denied. Please contact support.';
          } else if (msg.includes('network') || msg.includes('fetch')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          }
        }
        alert(errorMessage);
      } else {
        // Security: Log success without PII
        console.log('Profile updated successfully');
        onComplete();
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Security: Sanitize error message - don't expose internal details
      let errorMessage = 'Error saving profile. Please try again.';
      if (error.message) {
        // Only show user-friendly messages, not technical details
        const msg = error.message.toLowerCase();
        if (msg.includes('invalid') || msg.includes('required')) {
          errorMessage = error.message; // User-friendly validation messages are okay
        }
      }
      alert(errorMessage);
    } finally {
      setLoading(false)
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
            
            {specialties.map(specialty => {
              const isPodiatrySpecialty = specialty.name.toLowerCase().includes(SPECIALTY_SUBSPECIALTY.PODIATRY) ||
                                          specialty.name.toLowerCase() === 'podiatry';
              
              return (
                <div
                  key={specialty.id}
                  style={{
                    ...styles.card,
                    ...(selectedSpecialty === specialty.id ? styles.cardSelected : {})
                  }}
                  onClick={() => {
                    setSelectedSpecialty(specialty.id);
                    setSelectedSubspecialty('');
                    // Immediately set Podiatry flag when clicked
                    if (isPodiatrySpecialty) {
                      console.log('Podiatry selected - setting flag immediately');
                      setIsPodiatry(true);
                      setSubspecialties([]); // Clear subspecialties
                    } else {
                      setIsPodiatry(false);
                    }
                  }}
                >
                  <div style={styles.cardTitle}>{specialty.name}</div>
                  {specialty.description && (
                    <div style={styles.cardDescription}>{specialty.description}</div>
                  )}
                  {isPodiatrySpecialty && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '8px', fontStyle: 'italic' }}>
                      (No subspecialty selection needed)
                    </div>
                  )}
                </div>
              );
            })}

            <button
              style={{
                ...styles.button,
                ...(selectedSpecialty ? {} : styles.buttonDisabled)
              }}
              disabled={!selectedSpecialty}
              onClick={async () => {
                // Double-check if Podiatry before proceeding
                const specialty = specialties.find(s => s.id === selectedSpecialty);
                const isPodiatrySpecialty = specialty && (
                  specialty.name.toLowerCase().includes(SPECIALTY_SUBSPECIALTY.PODIATRY) ||
                  specialty.name.toLowerCase() === 'podiatry'
                );
                
                if (isPodiatrySpecialty) {
                  console.log('Podiatry detected on Continue - completing onboarding directly');
                  setIsPodiatry(true);
                  setSubspecialties([]);
                  // Skip subspecialty step and go directly to completion
                  await handleComplete();
                } else {
                  setIsPodiatry(false);
                  setStep(3);
                }
              }}
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

        {/* Step 3: Subspecialty (skipped for Podiatry) */}
        {/* Double-check Podiatry to prevent showing this step even if step === 3 */}
        {step === 3 && (() => {
          // Additional safety check - if selected specialty is Podiatry, don't show this step
          const specialty = specialties.find(s => s.id === selectedSpecialty);
          const isPodiatrySpecialty = specialty && (
            specialty.name.toLowerCase().includes(SPECIALTY_SUBSPECIALTY.PODIATRY) ||
            specialty.name.toLowerCase() === 'podiatry'
          );
          
          if (isPodiatrySpecialty || isPodiatry) {
            console.log('Preventing step 3 display - Podiatry detected, completing onboarding');
            setIsPodiatry(true);
            // Automatically complete onboarding if we somehow got to step 3 with Podiatry
            handleComplete().catch(err => {
              console.error('Error completing Podiatry onboarding:', err);
            });
            return null;
          }
          
          return (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>
              {userType === 'surgeon' ? 'What is your subspecialty?' : 'Which subspecialty interests you?'}
            </h2>
            
            {subspecialties.length === 0 ? (
              <div style={{ 
                padding: '20px', 
                backgroundColor: '#fee', 
                border: '2px solid #fcc', 
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <p style={{ color: '#c00', fontWeight: 'bold', marginBottom: '10px' }}>
                  Error loading subspecialties
                </p>
                <p style={{ color: '#800', marginBottom: '15px' }}>
                  No subspecialties found for this specialty
                </p>
                <button
                  onClick={() => fetchSubspecialties(selectedSpecialty)}
                  style={{
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
          );
        })()}
      </div>
    </div>
  )
}

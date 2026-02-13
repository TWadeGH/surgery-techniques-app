import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { SPECIALTY_SUBSPECIALTY } from './utils/constants'
import { TermsAcceptanceModal } from './components/legal'

// Surgeon-only onboarding options (single-select)
const PRACTICE_SETTING_OPTIONS = [
  { value: 'academic', label: 'Academic / Teaching Hospital' },
  { value: 'private_practice', label: 'Private Practice' },
  { value: 'hospital_employed', label: 'Hospital-employed' },
  { value: 'asc', label: 'Ambulatory Surgery Center (ASC)' },
  { value: 'government_military', label: 'Government / Military' },
  { value: 'industry_non_clinical', label: 'Industry / Non-clinical' },
  { value: 'other', label: 'Other' },
]
const PRIMARY_OR_OPTIONS = [
  { value: 'hospital_or', label: 'Hospital OR' },
  { value: 'asc', label: 'Ambulatory Surgery Center (ASC)' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'not_applicable', label: 'Not applicable (industry/academic)' },
]
const YEARS_PRACTICING_OPTIONS = [
  { value: '0_2', label: '0–2 years' },
  { value: '3_5', label: '3–5 years' },
  { value: '6_10', label: '6–10 years' },
  { value: '11_20', label: '11–20 years' },
  { value: '21_plus', label: '21+ years' },
]
const ANNUAL_CASE_VOLUME_OPTIONS = [
  { value: '0_50', label: '0–50' },
  { value: '51_100', label: '51–100' },
  { value: '101_200', label: '101–200' },
  { value: '201_400', label: '201–400' },
  { value: '401_plus', label: '401+' },
]

// Helper function to map Podiatry to Orthopedic Surgery + Foot and Ankle
async function mapPodiatryToFootAnkle() {
  try {
    let orthoSurgery = null;
    for (const orthoName of [SPECIALTY_SUBSPECIALTY.ORTHOPAEDIC_SURGERY, SPECIALTY_SUBSPECIALTY.ORTHOPEDIC_SURGERY]) {
      const { data } = await supabase
        .from('specialties')
        .select('id')
        .ilike('name', `%${orthoName}%`)
        .limit(1)
        .maybeSingle();
      if (data?.id) {
        orthoSurgery = data;
        break;
      }
    }
    if (!orthoSurgery) throw new Error('Orthopedic Surgery specialty not found');
    const { data: footAnkle } = await supabase
      .from('subspecialties')
      .select('id')
      .eq('specialty_id', orthoSurgery.id)
      .ilike('name', `%${SPECIALTY_SUBSPECIALTY.FOOT_AND_ANKLE}%`)
      .limit(1)
      .maybeSingle();
    if (!footAnkle) throw new Error('Foot and Ankle subspecialty not found');
    return { specialtyId: orthoSurgery.id, subspecialtyId: footAnkle.id };
  } catch (error) {
    console.error('Error mapping Podiatry to Foot and Ankle:', error);
    throw error;
  }
}

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
  const [isPodiatry, setIsPodiatry] = useState(false)
  const [practiceSetting, setPracticeSetting] = useState('')
  const [primaryORSetting, setPrimaryORSetting] = useState('')
  const [yearsPracticing, setYearsPracticing] = useState('')
  const [annualCaseVolume, setAnnualCaseVolume] = useState('')
  const [showTermsAcceptance, setShowTermsAcceptance] = useState(false)

  useEffect(() => {
    fetchSpecialties()
  }, [])

  useEffect(() => {
    if (selectedSpecialty) {
      const specialty = specialties.find(s => s.id === selectedSpecialty);
      if (specialty && specialty.name.toLowerCase().includes(SPECIALTY_SUBSPECIALTY.PODIATRY)) {
        setIsPodiatry(true);
        setSubspecialties([]);
        setSubspecialtiesError(null);
        setLoadingSubspecialties(false);
      } else {
        setIsPodiatry(false);
        fetchSubspecialties(selectedSpecialty);
      }
    } else {
      setSubspecialties([]);
      setLoadingSubspecialties(false);
      setSubspecialtiesError(null);
      setIsPodiatry(false);
    }
  }, [selectedSpecialty, specialties])

  async function fetchSpecialties() {
    const { data } = await supabase.from('specialties').select('*').order('order');
    if (data) setSpecialties(data)
  }

  async function fetchSubspecialties(specialtyId) {
    try {
      setLoadingSubspecialties(true);
      setSubspecialtiesError(null);
      setSubspecialties([]);
      const { data, error } = await supabase
        .from('subspecialties')
        .select('*')
        .eq('specialty_id', specialtyId)
        .order('order');
      if (error) {
        setSubspecialtiesError(error.message);
        setSubspecialties([]);
      } else {
        setSubspecialties(data || []);
        if (!data?.length) setSubspecialtiesError('No subspecialties found for this specialty');
      }
    } catch (err) {
      setSubspecialtiesError(err.message);
      setSubspecialties([]);
    } finally {
      setLoadingSubspecialties(false);
    }
  }

  async function handleComplete(caseVolumeOverride) {
    try {
      setLoading(true);
      let specialtyId = selectedSpecialty;
      let subspecialtyId = selectedSubspecialty;
      if (isPodiatry) {
        const mapping = await mapPodiatryToFootAnkle();
        specialtyId = mapping.specialtyId;
        subspecialtyId = mapping.subspecialtyId;
      }
      const updateData = {
        user_type: userType,
        onboarding_complete: true
      };
      // Require specialty/subspecialty for surgeon and app
      if (userType === 'surgeon' || userType === 'app') {
        if (!specialtyId) {
          alert('Please select a specialty.');
          setLoading(false);
          return;
        }
        if (!subspecialtyId && !isPodiatry) {
          alert('Please select a subspecialty. This is required for this role.');
          setLoading(false);
          return;
        }
      }
      // Save specialty/subspecialty for all user types when provided
      if (specialtyId) updateData.primary_specialty_id = specialtyId;
      if (subspecialtyId) updateData.primary_subspecialty_id = subspecialtyId;
      if (userType === 'surgeon') {
        // Use caseVolumeOverride if provided (avoids stale closure when called directly from onClick)
        const resolvedCaseVolume = caseVolumeOverride || annualCaseVolume;
        if (!practiceSetting || !primaryORSetting || !yearsPracticing || !resolvedCaseVolume) {
          alert('Please answer all practice and volume questions.');
          setLoading(false);
          return;
        }
        // Security: allowlist check — reject values not in the hardcoded options
        const validCaseVolumes = ANNUAL_CASE_VOLUME_OPTIONS.map(o => o.value);
        const validPracticeSettings = PRACTICE_SETTING_OPTIONS.map(o => o.value);
        const validORSettings = PRIMARY_OR_OPTIONS.map(o => o.value);
        const validYears = YEARS_PRACTICING_OPTIONS.map(o => o.value);
        if (!validCaseVolumes.includes(resolvedCaseVolume) ||
            !validPracticeSettings.includes(practiceSetting) ||
            !validORSettings.includes(primaryORSetting) ||
            !validYears.includes(yearsPracticing)) {
          alert('Invalid selection. Please try again.');
          setLoading(false);
          return;
        }
        updateData.practice_setting = practiceSetting;
        updateData.primary_or_setting = primaryORSetting;
        updateData.years_practicing = yearsPracticing;
        updateData.annual_case_volume = resolvedCaseVolume;
      }
      console.log('Onboarding update:', { userId: user.id, updateData });
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select();
      console.log('Onboarding update result:', { data, error });
      if (error) {
        console.error('Onboarding update error:', error);
        alert('Error saving profile: ' + (error.message || 'Unknown error'));
        setLoading(false);
        return;
      }
      setLoading(false);
      setShowTermsAcceptance(true);
    } catch (err) {
      alert('An error occurred. Please try again.');
      setLoading(false);
    }
  }

  const styles = {
    container: { maxWidth: '600px', margin: '50px auto', padding: '40px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' },
    header: { textAlign: 'center', marginBottom: '40px' },
    title: { fontSize: '32px', fontWeight: 'bold', marginBottom: '10px', color: '#1a1a1a' },
    subtitle: { fontSize: '16px', color: '#666' },
    stepIndicator: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '40px', gap: '10px' },
    stepDot: (isActive) => ({ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: isActive ? '#0066cc' : '#ddd' }),
    card: { padding: '20px', border: '2px solid #e0e0e0', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '15px' },
    cardSelected: { border: '2px solid #0066cc', backgroundColor: '#f0f7ff' },
    cardTitle: { fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', color: '#1a1a1a' },
    cardDescription: { fontSize: '14px', color: '#666' },
    button: { width: '100%', padding: '12px', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '20px' },
    buttonDisabled: { backgroundColor: '#ccc', cursor: 'not-allowed' },
    backButton: { width: '100%', padding: '12px', fontSize: '16px', backgroundColor: 'transparent', color: '#0066cc', border: '2px solid #0066cc', borderRadius: '8px', cursor: 'pointer', marginTop: '10px' },
  }

  return (
    <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh', padding: '20px' }}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Welcome to Surgical Techniques</h1>
          <p style={styles.subtitle}>Let&apos;s set up your account</p>
        </div>
        <div style={styles.stepIndicator}>
          <div style={styles.stepDot(step === 1)} />
          {userType && (
            <>
              <div style={styles.stepDot(step === 2)} />
              <div style={styles.stepDot(step === 3)} />
              {userType === 'surgeon' && (
                <>
                  <div style={styles.stepDot(step === 4)} />
                  <div style={styles.stepDot(step === 5)} />
                  <div style={styles.stepDot(step === 6)} />
                  <div style={styles.stepDot(step === 7)} />
                </>
              )}
            </>
          )}
        </div>

        {step === 1 && (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>What describes you best?</h2>
            {[
              { id: 'surgeon', title: '👨‍⚕️ Surgeon', desc: 'Primary decision-makers with NPI numbers and OR privileges. Your data contributes to "Upcoming Cases" volume reports.' },
              { id: 'trainee', title: '🏥 Resident/Fellow', desc: 'Doctors in training who are still refining their brand preferences. Your favorites help create the "Adoption Pipeline" report.' },
              { id: 'app', title: '🩺 Advanced Practice Provider', desc: 'PAs, NPs, and other advanced practice clinicians. Select your specialty and subspecialty to see relevant resources.' },
              { id: 'industry', title: '🏢 Medical Industry', desc: 'Sales reps from Stryker, Arthrex, etc., or clinical trainers. Your viewing data helps identify what products are being pushed in the field.' },
              { id: 'student', title: '📚 Student/Other', desc: 'Medical students or other healthcare professionals. This category helps keep core analytics pure by filtering out users without a "Case Dashboard."' },
            ].map(({ id, title, desc }) => (
              <div key={id} style={{ ...styles.card, ...(userType === id ? styles.cardSelected : {}) }} onClick={() => {
                setUserType(id);
                setTimeout(() => setStep(2), 200);
              }}>
                <div style={styles.cardTitle}>{title}</div>
                <div style={styles.cardDescription}>{desc}</div>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>
              {userType === 'surgeon' || userType === 'app' ? 'What is your specialty?' : 'Which specialty interests you?'}
            </h2>
            {specialties.map(specialty => {
              const isPod = specialty.name.toLowerCase().includes(SPECIALTY_SUBSPECIALTY.PODIATRY);
              return (
                <div key={specialty.id} style={{ ...styles.card, ...(selectedSpecialty === specialty.id ? styles.cardSelected : {}) }}
                  onClick={() => {
                    setSelectedSpecialty(specialty.id);
                    setSelectedSubspecialty('');
                    if (isPod) {
                      setIsPodiatry(true);
                      setTimeout(() => { if (userType === 'surgeon') setStep(4); else handleComplete(); }, 200);
                    } else {
                      setIsPodiatry(false);
                      setTimeout(() => setStep(3), 200);
                    }
                  }}>
                  <div style={styles.cardTitle}>
                    {isPod ? 'Podiatric Surgery' : specialty.name}
                  </div>
                  {isPod && (
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                      Shared resources with Orthopedic Foot &amp; Ankle Surgery
                    </div>
                  )}
                </div>
              );
            })}
            <button style={styles.backButton} onClick={() => setStep(1)}>Back</button>
          </div>
        )}

        {step === 3 && !isPodiatry && (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>
              {userType === 'surgeon' || userType === 'app' ? 'What is your subspecialty?' : 'Which subspecialty interests you?'}
            </h2>
            {loadingSubspecialties ? <p style={{ textAlign: 'center', padding: '20px' }}>Loading subspecialties...</p> :
              subspecialtiesError ? (
                <div style={{ padding: '20px', backgroundColor: '#fee', borderRadius: '8px', color: '#c33', marginBottom: '15px' }}>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>Error loading subspecialties</p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>{subspecialtiesError}</p>
                  <button style={{ marginTop: '10px', padding: '8px 16px', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => fetchSubspecialties(selectedSpecialty)}>Retry</button>
                </div>
              ) : subspecialties.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p style={{ color: '#666' }}>No subspecialties available for this specialty.</p>
                  <p style={{ color: '#999', fontSize: '14px', marginTop: '10px' }}>{userType === 'surgeon' || userType === 'app' ? 'Continue to answer a few more questions.' : 'You can still complete setup without selecting a subspecialty.'}</p>
                  <button style={{ ...styles.button, marginTop: '20px' }} disabled={loading} onClick={() => (userType === 'surgeon' ? setStep(4) : handleComplete())}>
                    {loading ? 'Saving...' : userType === 'surgeon' ? 'Continue' : 'Complete Setup Without Subspecialty'}
                  </button>
                </div>
              ) : (
                subspecialties.map(subspecialty => (
                  <div key={subspecialty.id} style={{ ...styles.card, ...(selectedSubspecialty === subspecialty.id ? styles.cardSelected : {}) }} onClick={() => {
                    setSelectedSubspecialty(subspecialty.id);
                    if (userType === 'surgeon') { setTimeout(() => setStep(4), 200); }
                    else { setTimeout(() => handleComplete(), 200); }
                  }}>
                    <div style={styles.cardTitle}>{subspecialty.name}</div>
                  </div>
                ))
              )}
            <button style={styles.backButton} onClick={() => setStep(2)} disabled={loading}>Back</button>
          </div>
        )}

        {step === 4 && userType === 'surgeon' && (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>What is your practice setting?</h2>
            {PRACTICE_SETTING_OPTIONS.map((opt) => (
              <div key={opt.value} style={{ ...styles.card, ...(practiceSetting === opt.value ? styles.cardSelected : {}) }} onClick={() => {
                setPracticeSetting(opt.value);
                setTimeout(() => setStep(5), 200);
              }}>
                <div style={styles.cardTitle}>{opt.label}</div>
              </div>
            ))}
            <button style={styles.backButton} onClick={() => setStep(isPodiatry ? 2 : 3)}>Back</button>
          </div>
        )}

        {step === 5 && userType === 'surgeon' && (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>What is your primary OR setting?</h2>
            <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>Sponsors use this to understand where procedures happen and what devices are feasible.</p>
            {PRIMARY_OR_OPTIONS.map((opt) => (
              <div key={opt.value} style={{ ...styles.card, ...(primaryORSetting === opt.value ? styles.cardSelected : {}) }} onClick={() => {
                setPrimaryORSetting(opt.value);
                setTimeout(() => setStep(6), 200);
              }}>
                <div style={styles.cardTitle}>{opt.label}</div>
              </div>
            ))}
            <button style={styles.backButton} onClick={() => setStep(4)}>Back</button>
          </div>
        )}

        {step === 6 && userType === 'surgeon' && (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>How many years have you been practicing?</h2>
            {YEARS_PRACTICING_OPTIONS.map((opt) => (
              <div key={opt.value} style={{ ...styles.card, ...(yearsPracticing === opt.value ? styles.cardSelected : {}) }} onClick={() => {
                setYearsPracticing(opt.value);
                setTimeout(() => setStep(7), 200);
              }}>
                <div style={styles.cardTitle}>{opt.label}</div>
              </div>
            ))}
            <button style={styles.backButton} onClick={() => setStep(5)}>Back</button>
          </div>
        )}

        {step === 7 && userType === 'surgeon' && (
          <div>
            <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>What is your approximate annual case volume?</h2>
            {ANNUAL_CASE_VOLUME_OPTIONS.map((opt) => (
              <div key={opt.value} style={{ ...styles.card, ...(annualCaseVolume === opt.value ? styles.cardSelected : {}), ...(loading ? { pointerEvents: 'none', opacity: 0.6 } : {}) }} onClick={() => {
                if (loading) return;
                setAnnualCaseVolume(opt.value);
                handleComplete(opt.value);
              }}>
                <div style={styles.cardTitle}>{opt.label}</div>
              </div>
            ))}
            <button style={styles.backButton} onClick={() => setStep(6)} disabled={loading}>Back</button>
          </div>
        )}

        {showTermsAcceptance && (
          <TermsAcceptanceModal
            isOpen={true}
            loading={loading}
            onAccept={async () => {
              const { error } = await supabase.from('profiles').update({ terms_accepted_at: new Date().toISOString() }).eq('id', user.id);
              if (error) {
                alert('Failed to save. Please try again.');
                return;
              }
              setShowTermsAcceptance(false);
              onComplete();
            }}
            onBack={() => setShowTermsAcceptance(false)}
          />
        )}
      </div>
    </div>
  )
}

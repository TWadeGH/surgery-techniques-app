import { useState } from 'react';
import { supabase } from './lib/supabase';
import { X } from 'lucide-react';

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'
];

const PRACTICE_MODELS = [
  { value: 'private_practice', label: 'Private Practice (Solo/Group)' },
  { value: 'hospital_employed', label: 'Hospital-Employed' },
  { value: 'academic', label: 'Academic/University-Based' },
  { value: 'military_va', label: 'Military/VA' }
];

const TERMS_AND_CONDITIONS = `TWH SYSTEMS, LLC: TERMS AND CONDITIONS

These Terms and Conditions ("Terms") govern your access to and use of the Surgery Techniques application (the "App"), website, and any related services (collectively, the "Services") provided by TWH Systems, LLC, a Texas Limited Liability Company ("we," "us," or "our").

BY CLICKING "I ACCEPT," REGISTERING AN ACCOUNT, OR OTHERWISE ACCESSING OR USING THE SERVICES, YOU AGREE TO BE BOUND BY THESE TERMS. IF YOU DO NOT AGREE, DO NOT ACCESS OR USE THE SERVICES.

1. User Classifications and Eligibility
The Services are intended for two distinct classes of Users:

Healthcare Providers (HCPs): Licensed physicians, surgeons, residents, fellows, and medical students.

Industry Professionals: Medical device employees, clinical specialists, sales representatives, and healthcare consultants.

Verification: You agree to provide accurate identification. HCPs may be verified via NPI registry. Industry Professionals may be required to verify via a valid corporate email address or professional credential. We reserve the right to restrict certain content or dashboard features based on your User Classification.

2. No Medical Advice; No Practice of Medicine
THIS SECTION APPLIES TO ALL USERS.

Educational Intent: Content is provided for informational and educational purposes only.

Industry User Restriction: Industry Professionals are strictly prohibited from using the Content to provide clinical advice, diagnosis, or medical recommendations to HCPs or patients. The App is a resource for technical product familiarity and procedure flow, not a clinical directive.

Independent Judgment: HCPs must exercise independent professional judgment. TWH Systems, LLC is not responsible for any clinical decisions, regardless of whether a User is an HCP or an Industry Professional.

3. User Accounts and Data Privacy
Prohibited Content: Users are strictly prohibited from uploading or entering Protected Health Information (PHI) as defined by HIPAA. In the "Upcoming Cases" dashboard, only use generic procedure names and dates.

Credential Security: You are responsible for all activity under your account.

4. User-Generated Content and Admin Curation
Curation License: If you share or curate content within the App, you grant TWH Systems, LLC a worldwide, perpetual, royalty-free license to host and display that content.

Copyright (DMCA): TWH Systems, LLC operates as a service provider under the Digital Millennium Copyright Act. If you believe any curated link or video infringes on a copyright, please notify our agent at legal@twhsystems.com.

5. Sponsored Content and Anonymized Analytics
Industry Transparency: You acknowledge that the Services are supported by medical device manufacturers. Some content is Sponsored Content.

Data Rights: By using the Services, you grant TWH Systems, LLC the right to anonymize and aggregate your usage data (including search history, case volume trends, and content engagement).

Commercial Use: We may share this Aggregated Anonymized Data with third-party medical device companies for market research, supply chain optimization, and educational development. Personally Identifiable Information (PII) is never sold.

6. Disclaimers and Limitation of Liability
"As-Is" Provision: The Services are provided without any warranty of accuracy or safety.

Liability Cap: To the maximum extent permitted by Texas law, TWH Systems, LLC and its officers shall not be liable for any surgical complications, malpractice claims, or loss of data. Our total liability for any claim is capped at $100.00 USD.

7. Indemnification
You agree to indemnify and hold harmless TWH Systems, LLC from any third-party claims (including patient litigation or employment disputes) arising from your use of the App or your breach of these Terms.

8. Governing Law and Venue
These Terms are governed by the laws of the State of Texas. Any legal action must be filed exclusively in the state or federal courts located in [Insert Your County, e.g., Harris County], Texas.

9. Miscellaneous
If any portion of these Terms is found unenforceable, the remaining provisions remain in full effect. This is the entire agreement between you and TWH Systems, LLC.`;

export default function OnboardingFlow({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Role selection
  const [userRole, setUserRole] = useState('');

  // Step 2-5: Surgeon questions (only if userRole === 'surgeon')
  const [primaryState, setPrimaryState] = useState('');
  const [residencyYear, setResidencyYear] = useState('');
  const [practiceModel, setPracticeModel] = useState('');
  const [supervisesResidents, setSupervisesResidents] = useState(null);

  // Step 6: Terms and Conditions
  const [termsAccepted, setTermsAccepted] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 60 }, (_, i) => currentYear - i);

  const canProceedFromStep1 = userRole !== '';
  const canProceedFromStep2 = primaryState !== '';
  const canProceedFromStep3 = residencyYear !== '';
  const canProceedFromStep4 = practiceModel !== '';
  const canProceedFromStep5 = supervisesResidents !== null;
  const canProceedFromStep6 = termsAccepted;

  async function handleComplete() {
    if (!termsAccepted) {
      setError('You must accept the Terms and Conditions to continue.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const updateData = {
        user_role: userRole,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        onboarding_completed: true
      };

      // Add surgeon-specific fields if role is surgeon
      if (userRole === 'surgeon') {
        updateData.primary_state_of_practice = primaryState;
        updateData.residency_completion_year = parseInt(residencyYear);
        updateData.practice_model = practiceModel;
        updateData.supervises_residents = supervisesResidents;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) throw updateError;

      onComplete();
    } catch (err) {
      console.error('Error completing onboarding:', err);
      setError(err.message || 'Error saving your information. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const nextStep = () => {
    if (step === 1 && !canProceedFromStep1) return;
    if (step === 2 && !canProceedFromStep2) return;
    if (step === 3 && !canProceedFromStep3) return;
    if (step === 4 && !canProceedFromStep4) return;
    if (step === 5 && !canProceedFromStep5) return;
    
    setStep(step + 1);
    setError('');
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
    }
  };

  const totalSteps = userRole === 'surgeon' ? 6 : 2; // Role + Terms (surgeon has 4 extra questions)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 sm:p-12">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Step {step} of {totalSteps}</span>
            <span className="text-sm font-medium text-gray-600">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Surgical Techniques</h2>
            <p className="text-gray-600 mb-8">Let's get started. What best describes you?</p>

            <div className="space-y-4">
              {['surgeon', 'student', 'other'].map((role) => (
                <button
                  key={role}
                  onClick={() => setUserRole(role)}
                  className={`w-full p-6 text-left rounded-xl border-2 transition-all ${
                    userRole === role
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      userRole === role ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                    }`}>
                      {userRole === role && (
                        <div className="w-3 h-3 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-lg text-gray-900 capitalize">
                        {role === 'surgeon' ? '👨‍⚕️ Surgeon' : role === 'student' ? '📚 Student' : '👤 Other'}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {role === 'surgeon' && 'Licensed practicing surgeon'}
                        {role === 'student' && 'Medical student, resident, or fellow'}
                        {role === 'other' && 'Other healthcare professional'}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={nextStep}
              disabled={!canProceedFromStep1}
              className="w-full mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Primary State of Practice (Surgeon only) */}
        {step === 2 && userRole === 'surgeon' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Primary State of Practice</h2>
            <p className="text-gray-600 mb-6">Which state do you primarily practice in?</p>

            <select
              value={primaryState}
              onChange={(e) => setPrimaryState(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-gray-900"
            >
              <option value="">Select your state...</option>
              {US_STATES.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4 mt-8">
              <button
                onClick={prevStep}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                disabled={!canProceedFromStep2}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Year of Residency/Fellowship Completion (Surgeon only) */}
        {step === 3 && userRole === 'surgeon' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Year of Residency/Fellowship Completion</h2>
            <p className="text-gray-600 mb-6">What year did you complete your residency or fellowship?</p>

            <select
              value={residencyYear}
              onChange={(e) => setResidencyYear(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-gray-900"
            >
              <option value="">Select year...</option>
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4 mt-8">
              <button
                onClick={prevStep}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                disabled={!canProceedFromStep3}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Current Practice Model (Surgeon only) */}
        {step === 4 && userRole === 'surgeon' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Current Practice Model</h2>
            <p className="text-gray-600 mb-6">Which best describes your professional setting?</p>

            <div className="space-y-3">
              {PRACTICE_MODELS.map((model) => (
                <button
                  key={model.value}
                  onClick={() => setPracticeModel(model.value)}
                  className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                    practiceModel === model.value
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      practiceModel === model.value ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                    }`}>
                      {practiceModel === model.value && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="font-medium text-gray-900">{model.label}</span>
                  </div>
                </button>
              ))}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4 mt-8">
              <button
                onClick={prevStep}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                disabled={!canProceedFromStep4}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Supervise Residents (Surgeon only) */}
        {step === 5 && userRole === 'surgeon' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Do you currently supervise Residents or Fellows?</h2>
            <p className="text-gray-600 mb-6">This helps us understand your role as an educator and mentor.</p>

            <div className="space-y-4">
              <button
                onClick={() => setSupervisesResidents(true)}
                className={`w-full p-6 text-left rounded-xl border-2 transition-all ${
                  supervisesResidents === true
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    supervisesResidents === true ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                  }`}>
                    {supervisesResidents === true && (
                      <div className="w-3 h-3 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="font-semibold text-lg text-gray-900">Yes</span>
                </div>
              </button>

              <button
                onClick={() => setSupervisesResidents(false)}
                className={`w-full p-6 text-left rounded-xl border-2 transition-all ${
                  supervisesResidents === false
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    supervisesResidents === false ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                  }`}>
                    {supervisesResidents === false && (
                      <div className="w-3 h-3 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="font-semibold text-lg text-gray-900">No</span>
                </div>
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4 mt-8">
              <button
                onClick={prevStep}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                disabled={!canProceedFromStep5}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 6 (or Step 2 for non-surgeons): Terms and Conditions */}
        {((step === 6 && userRole === 'surgeon') || (step === 2 && userRole !== 'surgeon')) && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Terms and Conditions</h2>
            <p className="text-gray-600 mb-6">Please read and accept our Terms and Conditions to continue.</p>

            <div className="border-2 border-gray-200 rounded-xl p-6 max-h-96 overflow-y-auto mb-6 bg-gray-50">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {TERMS_AND_CONDITIONS}
              </pre>
            </div>

            <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-purple-300 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">
                I have read and agree to the Terms and Conditions
              </span>
            </label>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4 mt-8">
              {userRole === 'surgeon' && (
                <button
                  onClick={prevStep}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleComplete}
                disabled={!canProceedFromStep6 || loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Completing Setup...' : 'I Accept & Continue'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

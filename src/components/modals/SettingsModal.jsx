/**
 * SettingsModal Component
 * User settings modal for dark mode and specialty/subspecialty selection
 * 
 * Extracted from App.jsx as part of refactoring effort
 */

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Info, Lock, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { validateUuid } from '../../utils/validators';
import { useCalendarConnection } from '../../hooks';

/**
 * SettingsModal Component
 * 
 * @param {Object} props
 * @param {Object} props.currentUser - Current user object
 * @param {boolean} props.darkMode - Current dark mode state
 * @param {Function} props.onDarkModeToggle - Callback to toggle dark mode
 * @param {Function} props.onUpdateProfile - Callback to update user profile
 * @param {Function} props.onClose - Callback to close modal
 */
export default function SettingsModal({ 
  currentUser, 
  darkMode, 
  onDarkModeToggle, 
  onUpdateProfile, 
  onClose 
}) {
  const USER_TYPE_OPTIONS = [
    { value: 'surgeon', label: 'Surgeon / Attending' },
    { value: 'trainee', label: 'Resident / Fellow' },
    { value: 'app', label: 'Advanced Practice Provider (APP)' },
    { value: 'industry', label: 'Medical Industry' },
    { value: 'student', label: 'Student / Other' },
  ];

  const [specialties, setSpecialties] = useState([]);
  const [subspecialties, setSubspecialties] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(currentUser?.specialtyId || '');
  const [selectedSubspecialty, setSelectedSubspecialty] = useState(currentUser?.subspecialtyId || '');
  const [selectedUserType, setSelectedUserType] = useState(currentUser?.userType || '');
  const [loadingSubspecialties, setLoadingSubspecialties] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Password management state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showSpecialtySection, setShowSpecialtySection] = useState(false);

  // Calendar connection state
  const [showCalendarSection, setShowCalendarSection] = useState(false);
  const [calendarMessage, setCalendarMessage] = useState('');
  const {
    connections,
    loading: calendarLoading,
    isConnected,
    getConnection,
    connectGoogle,
    connectMicrosoft,
    disconnect
  } = useCalendarConnection(currentUser?.id);

  useEffect(() => {
    loadSpecialties();
    checkPasswordStatus();
    // Initialize from currentUser
    if (currentUser?.specialtyId) {
      setSelectedSpecialty(String(currentUser.specialtyId));
      loadSubspecialties(currentUser.specialtyId);
      if (currentUser?.subspecialtyId) {
        setSelectedSubspecialty(String(currentUser.subspecialtyId));
      }
    } else {
      setSelectedSpecialty('');
      setSelectedSubspecialty('');
    }

    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const calendarParam = urlParams.get('calendar');
    const providerParam = urlParams.get('provider');
    const reasonParam = urlParams.get('reason');

    if (calendarParam === 'connected' && providerParam) {
      setCalendarMessage(`✅ ${providerParam.charAt(0).toUpperCase() + providerParam.slice(1)} Calendar connected successfully!`);
      setShowCalendarSection(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (calendarParam === 'error') {
      setCalendarMessage(`Error connecting calendar: ${reasonParam || 'Unknown error'}`);
      setShowCalendarSection(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [currentUser]);

  // Check if user has password authentication method
  async function checkPasswordStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if user has email provider (password auth)
        const providers = user.app_metadata?.providers || [];
        setHasPassword(providers.includes('email'));
      }
    } catch (error) {
      console.error('Error checking password status:', error);
    }
  }

  async function loadSpecialties() {
    try {
      const { data, error } = await supabase
        .from('specialties')
        .select('*')
        .order('order');
      
      if (error) {
        console.error('Error loading specialties:', error);
        setMessage('Error loading specialties. Please try again.');
        return;
      }
      
      if (data) {
        // Security: Validate all specialty IDs
        const validatedSpecialties = data.filter(spec => {
          const uuidValidation = validateUuid(spec.id);
          if (!uuidValidation.valid) {
            console.warn('Invalid specialty ID format, skipping:', spec.id?.substring(0, 8) + '...');
            return false;
          }
          return true;
        });
        setSpecialties(validatedSpecialties);
      }
    } catch (error) {
      console.error('Error loading specialties:', error);
      setMessage('Error loading specialties. Please try again.');
    }
  }

  async function loadSubspecialties(specialtyId) {
    if (!specialtyId) {
      setSubspecialties([]);
      return Promise.resolve();
    }
    
    // Security: Validate specialty ID format
    const uuidValidation = validateUuid(specialtyId);
    if (!uuidValidation.valid) {
      console.error('Invalid specialty ID format:', uuidValidation.error);
      setMessage('Invalid specialty selection. Please try again.');
      return;
    }
    
    setLoadingSubspecialties(true);
    try {
      const { data, error } = await supabase
        .from('subspecialties')
        .select('*')
        .eq('specialty_id', specialtyId)
        .order('order');
      
      if (error) {
        console.error('Error loading subspecialties:', error);
        setMessage('Error loading subspecialties. Please try again.');
        return;
      }
      
      if (data) {
        // Security: Validate all subspecialty IDs
        const validatedSubspecialties = data.filter(sub => {
          const uuidValidation = validateUuid(sub.id);
          if (!uuidValidation.valid) {
            console.warn('Invalid subspecialty ID format, skipping:', sub.id?.substring(0, 8) + '...');
            return false;
          }
          return true;
        });
        setSubspecialties(validatedSubspecialties);
        
        // Clear subspecialty if it doesn't belong to new specialty
        if (selectedSubspecialty && validatedSubspecialties) {
          const exists = validatedSubspecialties.some(s => String(s.id) === String(selectedSubspecialty));
          if (!exists) {
            setSelectedSubspecialty('');
          }
        }
      }
    } catch (error) {
      console.error('Error loading subspecialties:', error);
      setMessage('Error loading subspecialties. Please try again.');
    } finally {
      setLoadingSubspecialties(false);
    }
  }

  const handleSpecialtyChange = (specialtyId) => {
    // Security: Validate specialty ID before processing
    if (specialtyId && specialtyId !== '') {
      const uuidValidation = validateUuid(specialtyId);
      if (!uuidValidation.valid) {
        console.error('Invalid specialty ID format:', uuidValidation.error);
        setMessage('Invalid specialty selection. Please try again.');
        return;
      }
    }
    
    setSelectedSpecialty(specialtyId);
    setSelectedSubspecialty('');
    if (specialtyId) {
      loadSubspecialties(specialtyId);
    } else {
      setSubspecialties([]);
    }
  };

  async function handlePasswordUpdate() {
    setPasswordMessage('');

    // Validation
    if (!newPassword) {
      setPasswordMessage('Error: Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage('Error: Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage('Error: Passwords do not match.');
      return;
    }

    setPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPasswordMessage(`Success: Password ${hasPassword ? 'changed' : 'set'} successfully!`);
      setNewPassword('');
      setConfirmPassword('');

      // Update hasPassword state if it was just set
      if (!hasPassword) {
        setHasPassword(true);
      }
    } catch (error) {
      console.error('Error updating password:', error);
      const sanitizedMessage = error.message ?
        error.message.replace(/[<>]/g, '').substring(0, 200) :
        'Failed to update password';
      setPasswordMessage('Error: ' + sanitizedMessage);
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleSave() {
    // Security: Validate user ID
    if (!currentUser?.id) {
      setMessage('Error: No user logged in.');
      return;
    }
    
    const userIdValidation = validateUuid(currentUser.id);
    if (!userIdValidation.valid) {
      console.error('Invalid user ID format:', userIdValidation.error);
      setMessage('Error: Invalid user session. Please log out and log back in.');
      return;
    }
    
    setSaving(true);
    setMessage('');
    
    try {
      // Security: Validate specialty ID if provided
      if (selectedSpecialty && selectedSpecialty !== '') {
        const specialtyValidation = validateUuid(selectedSpecialty);
        if (!specialtyValidation.valid) {
          setMessage('Error: Invalid specialty selection. Please try again.');
          setSaving(false);
          return;
        }
        
        // Security: Verify specialty exists in available list (defense in depth)
        const specialtyExists = specialties.some(s => s.id === selectedSpecialty);
        if (!specialtyExists) {
          setMessage('Error: Selected specialty not found. Please refresh and try again.');
          setSaving(false);
          return;
        }
      }
      
      // Security: Validate subspecialty ID if provided
      if (selectedSubspecialty && selectedSubspecialty !== '') {
        const subspecialtyValidation = validateUuid(selectedSubspecialty);
        if (!subspecialtyValidation.valid) {
          setMessage('Error: Invalid subspecialty selection. Please try again.');
          setSaving(false);
          return;
        }
        
        // Security: Verify subspecialty exists in available list and belongs to selected specialty
        const subspecialtyExists = subspecialties.some(s => s.id === selectedSubspecialty);
        if (!subspecialtyExists) {
          setMessage('Error: Selected subspecialty not found. Please refresh and try again.');
          setSaving(false);
          return;
        }
        
        // Security: Verify subspecialty belongs to selected specialty
        if (selectedSpecialty) {
          const subspecialtyBelongsToSpecialty = subspecialties.some(
            s => s.id === selectedSubspecialty && s.specialty_id === selectedSpecialty
          );
          if (!subspecialtyBelongsToSpecialty) {
            setMessage('Error: Subspecialty does not belong to selected specialty.');
            setSaving(false);
            return;
          }
        }
      }
      
      // Security: Validate user type against allowlist before including in update
      if (selectedUserType && !USER_TYPE_OPTIONS.map(o => o.value).includes(selectedUserType)) {
        setMessage('Error: Invalid user type selection. Please try again.');
        setSaving(false);
        return;
      }

      // Prepare update data
      const updateData = {
        specialtyId: selectedSpecialty || null,
        subspecialtyId: selectedSubspecialty || null,
        ...(selectedUserType && { userType: selectedUserType }),
      };
      
      // Security: Mask user ID in logs
      console.log('🔵 Updating profile:', {
        userId: currentUser.id.substring(0, 8) + '...',
        specialtyId: selectedSpecialty?.substring(0, 8) + '...' || 'null',
        subspecialtyId: selectedSubspecialty?.substring(0, 8) + '...' || 'null'
      });
      
      // Update profile via callback (which calls updateProfile from useAuth)
      // This will update Supabase and reload the profile
      const result = await onUpdateProfile(updateData);
      
      if (result?.success === false) {
        throw new Error(result.error || 'Failed to update profile');
      }
      
      setMessage('Profile updated successfully! Your specialty/subspecialty has been permanently changed.');
      setTimeout(() => {
        onClose();
        // Reload page to ensure all data refreshes with new specialty/subspecialty
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error saving settings:', error);
      // Security: Sanitize error message to prevent information leakage
      const sanitizedMessage = error.message ? 
        error.message.replace(/[<>]/g, '').substring(0, 200) : 
        'Failed to update profile';
      setMessage('Error: ' + sanitizedMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close settings modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Dark Mode Toggle */}
        <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Dark Mode</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Toggle dark mode theme</p>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const newValue = !darkMode;
                console.log('Toggle clicked, current:', darkMode, 'new:', newValue);
                onDarkModeToggle(newValue);
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                darkMode ? 'bg-purple-600' : 'bg-gray-300'
              }`}
              aria-label={darkMode ? 'Disable dark mode' : 'Enable dark mode'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* User Type */}
        <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">User Type</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Update your role — for example, if you've transitioned from resident to attending.</p>
          <select
            value={selectedUserType}
            onChange={(e) => setSelectedUserType(e.target.value)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none transition-colors"
            disabled={saving}
          >
            <option value="">— No change —</option>
            {USER_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Password Management */}
        <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="w-full flex items-start gap-3 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
          >
            <Lock size={20} className="text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {hasPassword ? 'Change Password' : 'Set Password'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {hasPassword
                  ? 'Update your password for email/password login'
                  : 'Add password login to your account (you signed up with Google)'}
              </p>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 mt-1 ${showPasswordSection ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showPasswordSection && (
            <div className="space-y-3 mt-4 px-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="Enter new password"
                disabled={passwordLoading}
                minLength={6}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Must be at least 6 characters
              </p>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="Confirm new password"
                disabled={passwordLoading}
                minLength={6}
              />
            </div>

            {passwordMessage && (
              <div className={`p-3 rounded-lg text-sm ${
                passwordMessage.includes('Error')
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                  : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
              }`}>
                {passwordMessage}
              </div>
            )}

            <button
              onClick={handlePasswordUpdate}
              disabled={passwordLoading || !newPassword || !confirmPassword}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordLoading ? 'Updating...' : (hasPassword ? 'Change Password' : 'Set Password')}
            </button>
            </div>
          )}
        </div>

        {/* Calendar Connection */}
        <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowCalendarSection(!showCalendarSection)}
            className="w-full flex items-start gap-3 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
          >
            <Calendar size={20} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Calendar Integration
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {isConnected('google') && isConnected('microsoft')
                  ? 'Google Calendar and Microsoft Outlook connected'
                  : isConnected('google')
                  ? 'Your Google Calendar is connected'
                  : isConnected('microsoft')
                  ? 'Your Microsoft Outlook is connected'
                  : 'Connect your calendar to schedule technique reviews'}
              </p>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 mt-1 ${showCalendarSection ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showCalendarSection && (
            <div className="space-y-4 mt-4 px-4">
              {/* Privacy Notice */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Privacy Notice:</strong> We only use calendar access to <strong>add</strong> events for your technique reviews.
                    We never read, view, or access your existing calendar entries.
                  </span>
                </p>
              </div>

              {/* Connected Calendars */}
              {calendarLoading ? (
                <div className="text-center py-4">
                  <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading calendars...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Google Calendar — connected row or connect button */}
                  {isConnected('google') ? (
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-sm">
                          <svg className="w-6 h-6" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Google Calendar</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {getConnection('google')?.calendar_email || 'Connected'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure you want to disconnect Google Calendar?')) {
                            try {
                              await disconnect('google');
                              setCalendarMessage('Google Calendar disconnected successfully');
                            } catch (error) {
                              setCalendarMessage(`Error: ${error.message}`);
                            }
                          }
                        }}
                        className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          setCalendarMessage('');
                          await connectGoogle();
                        } catch (error) {
                          setCalendarMessage(`Error: ${error.message}`);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span className="text-gray-700 dark:text-gray-200">Connect Google Calendar</span>
                    </button>
                  )}

                  {/* Microsoft Outlook — connected row or connect button */}
                  {isConnected('microsoft') ? (
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-sm">
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                            <rect width="11" height="11" x="1" y="1" fill="#F25022"/>
                            <rect width="11" height="11" x="13" y="1" fill="#7FBA00"/>
                            <rect width="11" height="11" x="1" y="13" fill="#00A4EF"/>
                            <rect width="11" height="11" x="13" y="13" fill="#FFB900"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Microsoft Outlook</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {getConnection('microsoft')?.calendar_email || 'Connected'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure you want to disconnect Microsoft Outlook?')) {
                            try {
                              await disconnect('microsoft');
                              setCalendarMessage('Microsoft Outlook disconnected successfully');
                            } catch (error) {
                              setCalendarMessage(`Error: ${error.message}`);
                            }
                          }
                        }}
                        className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          setCalendarMessage('');
                          await connectMicrosoft();
                        } catch (error) {
                          setCalendarMessage(`Error: ${error.message}`);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <rect width="11" height="11" x="1" y="1" fill="#F25022"/>
                        <rect width="11" height="11" x="13" y="1" fill="#7FBA00"/>
                        <rect width="11" height="11" x="1" y="13" fill="#00A4EF"/>
                        <rect width="11" height="11" x="13" y="13" fill="#FFB900"/>
                      </svg>
                      <span className="text-gray-700 dark:text-gray-200">Connect Microsoft Outlook</span>
                    </button>
                  )}
                </div>
              )}

              {/* Message */}
              {calendarMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  calendarMessage.includes('Error')
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                    : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                }`}>
                  {calendarMessage}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Specialty/Subspecialty - Permanent Change (Available to all users) */}
        <div className="space-y-6">
          <button
            onClick={() => setShowSpecialtySection(!showSpecialtySection)}
            className="w-full flex items-start gap-3 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
          >
            <Info size={20} className="text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Change Specialty/Subspecialty</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Permanently change your default specialty/subspecialty view
              </p>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 mt-1 ${showSpecialtySection ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showSpecialtySection && (
            <div className="px-4">
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Permanent Change:</strong> Your default view will change to the selected specialty/subspecialty.
                    You can still temporarily browse other subspecialties using the "Browse by Subspecialty" dropdown on the main page.
                    You can change this again as needed.
                  </span>
                </p>
              </div>

              <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Specialty
                </label>
                <select
                  value={selectedSpecialty || ''}
                  onChange={(e) => handleSpecialtyChange(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none transition-colors"
                  disabled={saving}
                >
                  <option value="">Select Specialty</option>
                  {specialties.map(specialty => {
                    const isPod = specialty.name.toLowerCase().includes('podiatry');
                    return (
                      <option key={specialty.id} value={specialty.id}>
                        {isPod ? 'Podiatric Surgery' : specialty.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedSpecialty && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    Subspecialty <span className="text-gray-500 dark:text-gray-400 text-xs">(Optional - leave blank to reset)</span>
                  </label>
                  <select
                    value={selectedSubspecialty || ''}
                    onChange={(e) => {
                      // Security: Validate before setting state
                      const value = e.target.value;
                      if (value === '' || validateUuid(value).valid) {
                        setSelectedSubspecialty(value);
                      } else {
                        setMessage('Invalid subspecialty selection. Please try again.');
                      }
                    }}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none transition-colors"
                    disabled={loadingSubspecialties || saving}
                  >
                    <option value="">No Subspecialty (Reset)</option>
                    {subspecialties.map(subspecialty => (
                      <option key={subspecialty.id} value={subspecialty.id}>{subspecialty.name}</option>
                    ))}
                  </select>
                  {loadingSubspecialties && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Loading subspecialties...</p>}
                  {selectedSubspecialty && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Leave blank to reset subspecialty (useful when rotating through different subspecialties)
                    </p>
                  )}
                </div>
              )}
              </div>
            </div>
          )}
        </div>

        {/* Message */}
        {message && (
          <div className={`mt-4 p-3 rounded-lg ${
            message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            {message}
          </div>
        )}

        {/* Buttons */}
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-3 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedSpecialty}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

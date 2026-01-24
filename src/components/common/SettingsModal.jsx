/**
 * SettingsModal Component
 * User settings modal for dark mode and specialty/subspecialty selection
 * 
 * Extracted from App.jsx as part of refactoring effort
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { canRateOrFavorite, isSurgeon } from '../../utils/helpers';

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
  const [specialties, setSpecialties] = useState([]);
  const [subspecialties, setSubspecialties] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(currentUser?.specialtyId || '');
  const [selectedSubspecialty, setSelectedSubspecialty] = useState(currentUser?.subspecialtyId || '');
  const [loadingSubspecialties, setLoadingSubspecialties] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSpecialties();
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
  }, [currentUser]);

  async function loadSpecialties() {
    const { data } = await supabase
      .from('specialties')
      .select('*')
      .order('order');
    if (data) setSpecialties(data);
  }

  async function loadSubspecialties(specialtyId) {
    if (!specialtyId) {
      setSubspecialties([]);
      return Promise.resolve();
    }
    setLoadingSubspecialties(true);
    try {
      const { data } = await supabase
        .from('subspecialties')
        .select('*')
        .eq('specialty_id', specialtyId)
        .order('order');
      setSubspecialties(data || []);
      // Clear subspecialty if it doesn't belong to new specialty
      if (selectedSubspecialty && data) {
        const exists = data.some(s => String(s.id) === String(selectedSubspecialty));
        if (!exists) {
          setSelectedSubspecialty('');
        }
      }
    } finally {
      setLoadingSubspecialties(false);
    }
  }

  const handleSpecialtyChange = (specialtyId) => {
    setSelectedSpecialty(specialtyId);
    setSelectedSubspecialty('');
    loadSubspecialties(specialtyId);
  };

  async function handleSave() {
    if (!currentUser?.id) return;
    
    setSaving(true);
    setMessage('');
    
    try {
      const updateData = {};
      
      // Only allow surgeons and trainees to update specialty/subspecialty
      if (canRateOrFavorite(currentUser)) {
        if (selectedSpecialty) {
          updateData.primary_specialty_id = selectedSpecialty;
        }
        if (selectedSubspecialty) {
          updateData.primary_subspecialty_id = selectedSubspecialty;
        } else if (isSurgeon(currentUser)) {
          // Surgeons must have a subspecialty
          setMessage('Surgeons must select a subspecialty.');
          setSaving(false);
          return;
        }
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', currentUser.id);
      
      if (error) throw error;
      
      setMessage('Settings saved successfully!');
      setTimeout(() => {
        onUpdateProfile(updateData);
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close settings modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Dark Mode Toggle */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Dark Mode</h3>
              <p className="text-sm text-gray-600">Toggle dark mode theme</p>
            </div>
            <button
              onClick={() => onDarkModeToggle(!darkMode)}
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

        {/* Specialty/Subspecialty (only for surgeons and trainees) */}
        {canRateOrFavorite(currentUser) && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Specialty & Subspecialty</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Specialty</label>
                  <select
                    value={selectedSpecialty || ''}
                    onChange={(e) => handleSpecialtyChange(e.target.value)}
                    className="w-full px-4 py-3 bg-white text-gray-900 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                  >
                    <option value="">Select Specialty</option>
                    {specialties.map(specialty => (
                      <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
                    ))}
                  </select>
                </div>

                {selectedSpecialty && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Subspecialty {isSurgeon(currentUser) && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={selectedSubspecialty || ''}
                      onChange={(e) => setSelectedSubspecialty(e.target.value)}
                      className="w-full px-4 py-3 bg-white text-gray-900 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                      disabled={loadingSubspecialties}
                    >
                      <option value="">Select Subspecialty</option>
                      {subspecialties.map(subspecialty => (
                        <option key={subspecialty.id} value={subspecialty.id}>{subspecialty.name}</option>
                      ))}
                    </select>
                    {loadingSubspecialties && <p className="text-sm text-gray-500 mt-1">Loading subspecialties...</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
            className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          {canRateOrFavorite(currentUser) && (
            <button
              onClick={handleSave}
              disabled={saving || (isSurgeon(currentUser) && !selectedSubspecialty)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

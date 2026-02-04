/**
 * AddResourceModal Component
 * Admin modal for adding new resources
 * 
 * Extracted from App.jsx as part of refactoring effort
 */

import React, { useState, useEffect, useRef } from 'react';
import { Edit, Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { processResourceImage, createImagePreview, validateImageFile } from '../../lib/imageUtils';
import { useToast } from '../common';

/**
 * AddResourceModal Component
 * 
 * @param {Object} props
 * @param {Object} props.currentUser - Current user object
 * @param {Function} props.onSubmit - Callback when form is submitted (receives formData and imageFile)
 * @param {Function} props.onClose - Callback to close modal
 */
export default function AddResourceModal({ currentUser, onSubmit, onClose }) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    type: 'video',
    description: '',
    duration_seconds: null,
    keywords: '',
    implant_info_url: ''
  });
  const [durationHours, setDurationHours] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  // Specialty/Subspecialty/Category selection
  const [specialties, setSpecialties] = useState([]);
  const [subspecialties, setSubspecialties] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [selectedSubspecialty, setSelectedSubspecialty] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [canEditSpecialty, setCanEditSpecialty] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const isInitialLoad = useRef(true);

  // Initialize with user's specialty/subspecialty
  useEffect(() => {
    loadInitialData();
  }, [currentUser]);

  useEffect(() => {
    if (selectedSpecialty && !isInitialLoad.current) {
      loadSubspecialties(selectedSpecialty);
    }
  }, [selectedSpecialty]);

  useEffect(() => {
    if (selectedSubspecialty && !isInitialLoad.current) {
      loadCategories(selectedSubspecialty);
    }
  }, [selectedSubspecialty]);

  async function loadInitialData() {
    try {
      setLoadingData(true);
      setImageError('');
      
      // Load all specialties
      const { data: specialtiesData, error: specialtiesError } = await supabase
        .from('specialties')
        .select('*')
        .order('order');
      
      if (specialtiesError) {
        throw new Error(`Failed to load specialties: ${specialtiesError.message}`);
      }
      
      setSpecialties(specialtiesData || []);

      // Pre-populate with user's specialty/subspecialty if available
      if (currentUser?.specialtyId) {
        // Load subspecialties for this specialty first
        const { data: subspecialtiesData, error: subspecialtiesError } = await supabase
          .from('subspecialties')
          .select('*')
          .eq('specialty_id', currentUser.specialtyId)
          .order('order');
        
        if (subspecialtiesError) {
          throw new Error(`Failed to load subspecialties: ${subspecialtiesError.message}`);
        }
        
        setSubspecialties(subspecialtiesData || []);
        setSelectedSpecialty(String(currentUser.specialtyId));
        
        if (currentUser?.subspecialtyId) {
          // Load categories for the subspecialty first
          const { data: categoriesData, error: categoriesError } = await supabase
            .from('categories')
            .select('*')
            .eq('subspecialty_id', currentUser.subspecialtyId)
            .is('parent_category_id', null)
            .order('order');
          
          if (categoriesError) {
            throw new Error(`Failed to load categories: ${categoriesError.message}`);
          }
          
          setCategories(categoriesData || []);
          setSelectedSubspecialty(String(currentUser.subspecialtyId));
        }
      }
      
      isInitialLoad.current = false;
    } catch (error) {
      console.error('Error loading initial data:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      setImageError(`Error loading form data: ${errorMessage}`);
      toast.error(`Error loading form data: ${errorMessage}. Please check the browser console for more details.`);
    } finally {
      setLoadingData(false);
      isInitialLoad.current = false;
    }
  }

  async function loadSubspecialties(specialtyId) {
    if (!specialtyId) return;
    const { data } = await supabase
      .from('subspecialties')
      .select('*')
      .eq('specialty_id', specialtyId)
      .order('order');
    
    setSubspecialties(data || []);
    // Only clear if specialty actually changed (not on initial load)
    if (selectedSpecialty && selectedSpecialty !== String(specialtyId)) {
      setSelectedCategory(null);
    }
  }

  async function loadCategories(subspecialtyId) {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('subspecialty_id', subspecialtyId)
      .is('parent_category_id', null)
      .order('order');
    
    setCategories(data || []);
  }

  const handleSpecialtyChange = (specialtyId) => {
    setSelectedSpecialty(specialtyId);
    setSelectedSubspecialty(null);
    setSelectedCategory(null);
    loadSubspecialties(specialtyId);
  };

  const handleSubspecialtyChange = (subspecialtyId) => {
    setSelectedSubspecialty(subspecialtyId);
    setSelectedCategory(null);
    loadCategories(subspecialtyId);
  };

  const handleCategoryChange = (categoryId) => {
    if (categoryId === 'add_new') {
      setShowNewCategoryInput(true);
      setSelectedCategory(null);
      return;
    }
    setShowNewCategoryInput(false);
    setSelectedCategory(categoryId);
  };

  async function handleAddNewCategory() {
    if (!newCategoryName.trim() || !selectedSubspecialty) return;

    try {
      setAddingCategory(true);
      const maxOrder = categories.length > 0 
        ? Math.max(...categories.map(c => c.order || 0)) 
        : 0;

      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: newCategoryName.trim(),
          subspecialty_id: selectedSubspecialty,
          parent_category_id: null,
          order: maxOrder + 1,
          depth: 0
        }])
        .select()
        .single();

      if (error) throw error;

      setCategories([...categories, data]);
      setSelectedCategory(data.id);
      setShowNewCategoryInput(false);
      setNewCategoryName('');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Error adding category: ' + error.message);
    } finally {
      setAddingCategory(false);
    }
  }

  const processImageFile = async (file) => {
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      setImageError('');
      return;
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setImageError(validation.error);
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    setImageError('');
    setProcessingImage(true);

    try {
      const processedFile = await processResourceImage(file);
      setImageFile(processedFile);
      
      const preview = await createImagePreview(processedFile);
      setImagePreview(preview);
    } catch (error) {
      setImageError(error.message);
      setImageFile(null);
      setImagePreview(null);
    } finally {
      setProcessingImage(false);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    await processImageFile(file);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await processImageFile(file);
    } else {
      setImageError('Please drop an image file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!imageFile) {
      setImageError('Image is required');
      return;
    }

    setImageError('');
    // Include category_id in the submission
    onSubmit({ ...formData, category_id: selectedCategory }, imageFile);
  };

  if (!currentUser) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="glass rounded-2xl max-w-2xl w-full p-8 shadow-2xl">
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-slide-up">
      <div className="glass rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Add New Resource</h2>
              <p className="text-gray-600">Add a surgical technique resource to the library</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close add resource modal"
            >
              <X size={24} />
            </button>
          </div>
          
          {imageError && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <p className="text-sm text-red-700 font-medium">{imageError}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Specialty/Subspecialty Selection */}
            <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Specialty & Subspecialty
                </label>
                {!canEditSpecialty && (selectedSpecialty || selectedSubspecialty) && (
                  <button
                    type="button"
                    onClick={() => setCanEditSpecialty(true)}
                    className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Edit size={12} className="inline mr-1" />
                    Edit
                  </button>
                )}
              </div>
              
              {loadingData ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Specialty</label>
                    <select
                      value={selectedSpecialty || ''}
                      onChange={(e) => handleSpecialtyChange(e.target.value)}
                      disabled={!canEditSpecialty && !!selectedSpecialty}
                      className="w-full px-3 py-2 text-sm bg-white text-gray-900 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:text-gray-700 disabled:cursor-not-allowed"
                      required
                    >
                      <option value="">Select specialty...</option>
                      {specialties.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Subspecialty</label>
                    <select
                      value={selectedSubspecialty || ''}
                      onChange={(e) => handleSubspecialtyChange(e.target.value)}
                      disabled={(!canEditSpecialty && !!selectedSubspecialty) || !selectedSpecialty}
                      className="w-full px-3 py-2 text-sm bg-white text-gray-900 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:text-gray-700 disabled:cursor-not-allowed"
                      required
                    >
                      <option value="">Select subspecialty...</option>
                      {subspecialties.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Category Selection */}
            {selectedSubspecialty && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                {showNewCategoryInput ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddNewCategory()}
                      placeholder="Enter new category name..."
                      className="w-full px-4 py-3 border-2 border-purple-500 rounded-xl focus:border-purple-600 focus:outline-none transition-colors"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddNewCategory}
                        disabled={addingCategory || !newCategoryName.trim()}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingCategory ? 'Adding...' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCategoryInput(false);
                          setNewCategoryName('');
                        }}
                        className="px-4 py-2 border-2 border-gray-200 rounded-lg font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    required
                    value={selectedCategory || ''}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                  >
                    <option value="">Select category...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                    <option value="add_new" className="font-semibold text-purple-600">
                      + Add new category
                    </option>
                  </select>
                )}
              </div>
            )}

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Resource Image * 
                <span className="text-xs font-normal text-gray-500 ml-2">(Max 2MB, will be resized to 800x800px - square format)</span>
              </label>
              
              {processingImage ? (
                <div className="flex flex-col items-center justify-center w-full border-2 border-dashed border-purple-300 rounded-xl bg-purple-50" style={{ aspectRatio: '1/1', minHeight: '180px' }}>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
                  <span className="text-sm text-gray-600">Processing image...</span>
                </div>
              ) : imagePreview ? (
                <div className="relative" style={{ aspectRatio: '1/1' }}>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-xl border-2 border-gray-200" />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      setImageError('');
                      const fileInput = document.querySelector('input[type="file"]');
                      if (fileInput) fileInput.value = '';
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    aria-label="Remove image"
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                    800x800px (1:1)
                  </div>
                </div>
              ) : (
                <label 
                  className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    isDragging 
                      ? 'border-purple-500 bg-purple-100 scale-105' 
                      : 'border-gray-300 hover:border-purple-500 bg-gray-50'
                  }`}
                  style={{ aspectRatio: '1/1', minHeight: '180px' }}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload size={32} className={`${isDragging ? 'text-purple-600' : 'text-gray-400'} mb-2 transition-colors`} />
                  <span className={`text-sm font-medium transition-colors ${isDragging ? 'text-purple-700' : 'text-gray-600'}`}>
                    {isDragging ? 'Drop image here' : 'Click to upload or drag & drop'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">Square format (1:1)</span>
                  <span className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP (Max 2MB)</span>
                  <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-200">
                    <p className="font-medium mb-1">How to screenshot:</p>
                    <p className="mb-0.5">Windows: Press <span className="font-mono bg-gray-100 px-1 rounded">Windows + Shift + S</span> or use Snipping Tool</p>
                    <p>Mac: Press <span className="font-mono bg-gray-100 px-1 rounded">Cmd + Shift + 4</span> to capture selected area</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageChange}
                    required
                  />
                </label>
              )}
              
              {imageError && (
                <p className="mt-2 text-sm text-red-600">{imageError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Resource Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="e.g., Ankle Arthroscopy Technique"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">URL *</label>
              <input
                type="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Implant Info Link
                <span className="text-xs font-normal text-gray-500 ml-2">(Optional)</span>
              </label>
              <input
                type="url"
                value={formData.implant_info_url || ''}
                onChange={(e) => setFormData({ ...formData, implant_info_url: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="https://... (link to implant specifications)"
              />
              <p className="text-xs text-gray-500 mt-1">Link to manufacturer implant or device specifications</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Resource Type *</label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value, duration_seconds: e.target.value !== 'video' ? null : formData.duration_seconds })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              >
                <option value="video">Video</option>
                <option value="pdf">PDF / Technique Guide</option>
                <option value="article">Article</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Duration field - only for videos */}
            {formData.type === 'video' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Video Duration *</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={durationHours}
                    onChange={(e) => {
                      const hrs = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                      setDurationHours(e.target.value);
                      const totalSeconds = (hrs === '' ? 0 : hrs) * 3600 + 
                                         (parseInt(durationMinutes) || 0) * 60 + 
                                         (parseInt(durationSeconds) || 0);
                      setFormData({ ...formData, duration_seconds: totalSeconds || null });
                    }}
                    className="w-20 px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-center"
                    placeholder="H"
                  />
                  <span className="text-gray-600 font-semibold">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={durationMinutes}
                    onChange={(e) => {
                      const mins = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                      setDurationMinutes(e.target.value);
                      const totalSeconds = (parseInt(durationHours) || 0) * 3600 + 
                                         (mins === '' ? 0 : mins) * 60 + 
                                         (parseInt(durationSeconds) || 0);
                      setFormData({ ...formData, duration_seconds: totalSeconds || null });
                    }}
                    className="w-20 px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-center"
                    placeholder="MM"
                  />
                  <span className="text-gray-600 font-semibold">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={durationSeconds}
                    onChange={(e) => {
                      const secs = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                      setDurationSeconds(e.target.value);
                      const totalSeconds = (parseInt(durationHours) || 0) * 3600 + 
                                         (parseInt(durationMinutes) || 0) * 60 + 
                                         (secs === '' ? 0 : secs);
                      setFormData({ ...formData, duration_seconds: totalSeconds || null });
                    }}
                    className="w-20 px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-center"
                    placeholder="SS"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Format: H:MM:SS (e.g., 0:05:30 for 5 minutes 30 seconds)</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                rows="4"
                placeholder="Brief description of the resource..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Key Words</label>
              <input
                type="text"
                value={formData.keywords || ''}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="Enter key words separated by commas (e.g., bunion, MIS, osteotomy)"
              />
              <p className="text-xs text-gray-500 mt-1">Optional: Add key words to help with searchability</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-900 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!imageFile || (formData.type === 'video' && !formData.duration_seconds)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium glow-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Resource
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

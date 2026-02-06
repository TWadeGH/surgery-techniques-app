/**
 * EditResourceModal Component
 * Admin modal for editing existing resources
 * 
 * Extracted from App.jsx as part of refactoring effort
 */

import React, { useState, useEffect, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { processResourceImage, createImagePreview, validateImageFile } from '../../lib/imageUtils';
import { useToast, CompanyProductSelector } from '../common';

/**
 * EditResourceModal Component
 * 
 * @param {Object} props
 * @param {Object} props.resource - Resource object to edit
 * @param {Object} props.currentUser - Current user object
 * @param {Function} props.onSubmit - Callback when form is submitted (receives resourceData and imageFile)
 * @param {Function} props.onClose - Callback to close modal
 */
export default function EditResourceModal({ resource, currentUser, onSubmit, onClose }) {
  const toast = useToast();
  // Parse duration_seconds into hours, minutes, seconds
  const parseDuration = (seconds) => {
    if (!seconds) return { hours: '', minutes: '', seconds: '' };
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return { hours: hrs.toString(), minutes: mins.toString(), seconds: secs.toString() };
  };

  const initialDuration = parseDuration(resource.duration_seconds);
  
  const [formData, setFormData] = useState({
    title: resource.title || '',
    url: resource.url || '',
    type: resource.resource_type || 'video',
    description: resource.description || '',
    keywords: resource.keywords || '',
    duration_seconds: resource.duration_seconds || null,
    implant_info_url: resource.implant_info_url || '',
    company_name: resource.company_name || '',
    product_name: resource.product_name || '',
    year_of_publication: resource.year_of_publication || null
  });
  const [durationHours, setDurationHours] = useState(initialDuration.hours);
  const [durationMinutes, setDurationMinutes] = useState(initialDuration.minutes);
  const [durationSeconds, setDurationSeconds] = useState(initialDuration.seconds);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Specialty/Subspecialty/Category selection
  const [specialties, setSpecialties] = useState([]);
  const [subspecialties, setSubspecialties] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [selectedSubspecialty, setSelectedSubspecialty] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const isInitialLoad = useRef(true);

  // Load initial data - get category, subspecialty hierarchy for prepopulation
  useEffect(() => {
    loadInitialData();
  }, [resource.id]);

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

  // Initialize preview with existing image if available
  useEffect(() => {
    if (resource.image_url && !imagePreview && !imageFile) {
      setImagePreview(resource.image_url);
    }
  }, [resource.image_url]);

  async function loadInitialData() {
    try {
      isInitialLoad.current = true;
      setLoadingData(true);
      
      // Load all specialties
      const { data: specialtiesData } = await supabase
        .from('specialties')
        .select('*')
        .order('order');
      setSpecialties(specialtiesData || []);

      let didPrepopulate = false;

      // 1) If resource has procedure_id, use procedure -> category -> subspecialty -> specialty
      if (resource.procedure_id) {
        const { data: procedureRow, error: procErr } = await supabase
          .from('procedures')
          .select('id, category_id')
          .eq('id', resource.procedure_id)
          .single();
        
        if (!procErr && procedureRow) {
          const { data: categoryRow, error: catErr } = await supabase
            .from('categories')
            .select('id, subspecialty_id')
            .eq('id', procedureRow.category_id)
            .single();
          
          if (!catErr && categoryRow) {
            const { data: subspecialtyRow, error: subErr } = await supabase
              .from('subspecialties')
              .select('id, specialty_id')
              .eq('id', categoryRow.subspecialty_id)
              .single();
            
            if (!subErr && subspecialtyRow) {
              didPrepopulate = true;
              const [
                { data: subspecialtiesData, error: subsErr },
                { data: categoriesData, error: catsErr },
              ] = await Promise.all([
                supabase.from('subspecialties').select('*').eq('specialty_id', subspecialtyRow.specialty_id).order('order'),
                supabase.from('categories').select('*').eq('subspecialty_id', subspecialtyRow.id).is('parent_category_id', null).order('order'),
              ]);
              if (subsErr || catsErr) throw subsErr || catsErr;
              setSubspecialties(subspecialtiesData || []);
              setCategories(categoriesData || []);
              setSelectedSpecialty(String(subspecialtyRow.specialty_id));
              setSelectedSubspecialty(String(subspecialtyRow.id));
              setSelectedCategory(String(categoryRow.id));
            }
          }
        }
      }

      // 2) Else if resource has category_id, use category -> subspecialty -> specialty
      if (!didPrepopulate && resource.category_id) {
        const { data: categoryRow, error: catErr } = await supabase
          .from('categories')
          .select('id, subspecialty_id, parent_category_id')
          .eq('id', resource.category_id)
          .single();
        if (!catErr && categoryRow) {
          const { data: subspecialtyRow, error: subErr } = await supabase
            .from('subspecialties')
            .select('id, specialty_id')
            .eq('id', categoryRow.subspecialty_id)
            .single();
          if (!subErr && subspecialtyRow) {
            didPrepopulate = true;
            const [
              { data: subspecialtiesData, error: subsErr },
              { data: categoriesData, error: catsErr },
            ] = await Promise.all([
              supabase.from('subspecialties').select('*').eq('specialty_id', subspecialtyRow.specialty_id).order('order'),
              supabase.from('categories').select('*').eq('subspecialty_id', subspecialtyRow.id).is('parent_category_id', null).order('order'),
            ]);
            if (subsErr || catsErr) throw subsErr || catsErr;
            setSubspecialties(subspecialtiesData || []);
            setCategories(categoriesData || []);
            setSelectedSpecialty(String(subspecialtyRow.specialty_id));
            setSelectedSubspecialty(String(subspecialtyRow.id));
            
            // Check if the selected category is a subcategory
            const isSubcategory = categoryRow.parent_category_id !== null;
            if (isSubcategory) {
              // It's a subcategory - set parent category and load subcategories
              setSelectedCategory(String(categoryRow.parent_category_id));
              await loadSubcategories(categoryRow.parent_category_id);
              setSelectedSubcategory(String(categoryRow.id));
            } else {
              // It's a top-level category
              setSelectedCategory(String(categoryRow.id));
              await loadSubcategories(categoryRow.id);
            }
          }
        }
      }

      // 3) Else use currentUser's specialty/subspecialty (admin profile)
      if (!didPrepopulate && currentUser?.specialtyId) {
        const { data: subspecialtiesData, error: subsErr } = await supabase
          .from('subspecialties')
          .select('*')
          .eq('specialty_id', currentUser.specialtyId)
          .order('order');
        if (!subsErr && subspecialtiesData?.length) {
          setSubspecialties(subspecialtiesData);
          setSelectedSpecialty(String(currentUser.specialtyId));
          if (currentUser.subspecialtyId) {
            const { data: categoriesData, error: catsErr } = await supabase
              .from('categories')
              .select('*')
              .eq('subspecialty_id', currentUser.subspecialtyId)
              .order('depth')
              .order('order');
            if (!catsErr) {
              setCategories(categoriesData || []);
              setSelectedSubspecialty(String(currentUser.subspecialtyId));
            }
          }
        }
      }
      
      isInitialLoad.current = false;
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Error loading category data: ' + error.message);
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
    if (selectedSubspecialty && !data?.find(s => String(s.id) === String(selectedSubspecialty))) {
      setSelectedSubspecialty(null);
      setSelectedCategory(null);
    }
  }

  async function loadCategories(subspecialtyId) {
    if (!subspecialtyId) return;
    // Load ONLY top-level categories (no subcategories)
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('subspecialty_id', subspecialtyId)
      .is('parent_category_id', null)
      .order('order');
    setCategories(data || []);
    // Clear subcategories when subspecialty changes
    setSubcategories([]);
    setSelectedSubcategory(null);
    // Only clear selectedCategory if it doesn't belong to this subspecialty
    if (selectedCategory && data) {
      const categoryExists = data.some(c => String(c.id) === String(selectedCategory));
      if (!categoryExists) {
        setSelectedCategory(null);
      }
    }
  }

  async function loadSubcategories(categoryId) {
    if (!categoryId) {
      setSubcategories([]);
      setSelectedSubcategory(null);
      return;
    }
    // Load subcategories for the selected category
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('parent_category_id', categoryId)
      .order('order');
    setSubcategories(data || []);
    // Clear selected subcategory if it's not in the new list
    if (selectedSubcategory && data) {
      const subcategoryExists = data.some(c => String(c.id) === String(selectedSubcategory));
      if (!subcategoryExists) {
        setSelectedSubcategory(null);
      }
    }
  }

  const handleSpecialtyChange = (specialtyId) => {
    setSelectedSpecialty(specialtyId);
    setSelectedSubspecialty(null);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSubcategories([]);
    loadSubspecialties(specialtyId);
  };

  const handleSubspecialtyChange = (subspecialtyId) => {
    setSelectedSubspecialty(subspecialtyId);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSubcategories([]);
    loadCategories(subspecialtyId);
  };

  const handleCategoryChange = (categoryId) => {
    const newCategoryId = categoryId && categoryId !== '' ? categoryId : null;
    setSelectedCategory(newCategoryId);
    setSelectedSubcategory(null); // Clear subcategory when category changes
    loadSubcategories(newCategoryId);
  };

  const handleSubcategoryChange = (subcategoryId) => {
    setSelectedSubcategory(subcategoryId && subcategoryId !== '' ? subcategoryId : null);
  };

  const processImageFile = async (file) => {
    if (!file) {
      // If no file selected, keep existing image
      return;
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setImageError(validation.error);
      setImageFile(null);
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

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageError('');
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setImageError('');
    setSubmitting(true);
    
    try {
      // Determine image URL:
      // - If new image uploaded, it will be handled in handleEditResource
      // - If image removed (no preview and no file), set to null
      // - Otherwise keep existing image
      let imageUrl = resource.image_url;
      if (!imagePreview && !imageFile) {
        // User removed the image
        imageUrl = null;
      }
      
      // Use subcategory if selected, otherwise use category
      // Ensure we convert to string and handle empty strings properly
      let finalCategoryId = null;
      if (selectedSubcategory && selectedSubcategory !== '' && selectedSubcategory !== 'null') {
        finalCategoryId = String(selectedSubcategory);
      } else if (selectedCategory && selectedCategory !== '' && selectedCategory !== 'null') {
        finalCategoryId = String(selectedCategory);
      }
      
      console.log('🔵 EditResourceModal submit:', {
        selectedCategory,
        selectedSubcategory,
        finalCategoryId: finalCategoryId?.substring(0, 8) + '...' || 'null',
        resourceId: resource.id?.substring(0, 8) + '...'
      });
      
      const resourceData = {
        ...formData,
        image_url: imageUrl,
        category_id: finalCategoryId // Always include, even if null (to clear category if needed)
      };
      
      await onSubmit(resourceData, imageFile); // imageFile will be null if not changed
    } catch (error) {
      console.error('Error updating resource:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-slide-up">
      <div className="glass rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Edit Resource</h2>
              <p className="text-gray-600">Update resource details. Upload a new image to replace the existing one.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close edit resource modal"
            >
              <X size={24} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload/Preview */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Resource Image
                <span className="text-xs font-normal text-gray-500 ml-2">(Max 2MB, will be resized to 800x450px)</span>
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
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    aria-label="Remove image"
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                    800x800px (1:1)
                  </div>
                  <label className="absolute bottom-2 right-2 px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg cursor-pointer hover:bg-purple-700 transition-colors">
                    Change Image
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              ) : (
                <label 
                  className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                    isDragging 
                      ? 'border-purple-500 bg-purple-100 scale-105 shadow-lg' 
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
                  />
                </label>
              )}
              
              {imageError && (
                <p className="mt-2 text-sm text-red-600">{imageError}</p>
              )}
            </div>

            {/* Specialty/Subspecialty/Category Selection */}
            {loadingData ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading categories...</p>
              </div>
            ) : (
              <>
                <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Specialty & Subspecialty
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Specialty */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Specialty</label>
                      <select
                        value={selectedSpecialty || ''}
                        onChange={(e) => handleSpecialtyChange(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white text-gray-900 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                      >
                        <option value="">Select specialty...</option>
                        {specialties.map(s => (
                          <option key={s.id} value={String(s.id)}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Subspecialty */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Subspecialty</label>
                      <select
                        value={selectedSubspecialty || ''}
                        onChange={(e) => handleSubspecialtyChange(e.target.value)}
                        disabled={!selectedSpecialty}
                        className="w-full px-3 py-2 text-sm bg-white text-gray-900 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:text-gray-700 disabled:cursor-not-allowed"
                      >
                        <option value="">Select subspecialty...</option>
                        {subspecialties.map(s => (
                          <option key={s.id} value={String(s.id)}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Category Selection */}
                {selectedSubspecialty && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                    <select
                      value={selectedCategory || ''}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full px-4 py-3 bg-white text-gray-900 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                    >
                      <option value="">Select category...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Subcategory Selection - only show if category has subcategories */}
                {selectedCategory && subcategories.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Subcategory (Optional)</label>
                    <select
                      value={selectedSubcategory || ''}
                      onChange={(e) => handleSubcategoryChange(e.target.value)}
                      className="w-full px-4 py-3 bg-white text-gray-900 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                    >
                      <option value="">No subcategory</option>
                      {subcategories.map(subcat => (
                        <option key={subcat.id} value={String(subcat.id)}>{subcat.name}</option>
                      ))}
                    </select>
                  </div>
                )}

              </>
            )}

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

            {/* Company & Product Selection */}
            <CompanyProductSelector
              companyName={formData.company_name}
              productName={formData.product_name}
              onCompanyChange={(value) => setFormData({ ...formData, company_name: value })}
              onProductChange={(value) => setFormData({ ...formData, product_name: value })}
              subspecialtyId={selectedSubspecialty}
            />

            {/* Year of Publication */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Year of Publication
                <span className="text-xs font-normal text-gray-500 ml-2">(Optional)</span>
              </label>
              <input
                type="number"
                min="1900"
                max="2100"
                value={formData.year_of_publication || ''}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  setFormData({ ...formData, year_of_publication: val ? parseInt(val, 10) : null });
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="e.g., 2024"
              />
              <p className="text-xs text-gray-500 mt-1">Year this resource was published or created</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (formData.type === 'video' && !formData.duration_seconds)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium glow-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Updating...' : 'Update Resource'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

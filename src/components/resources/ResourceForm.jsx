/**
 * ResourceForm Component  
 * Form for adding/editing resources
 * 
 * Extracted and simplified from App.jsx as part of refactoring effort
 * TODO: This is a simplified version - full form logic can be added incrementally
 */

import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { RESOURCE_TYPES } from '../../utils/constants';
import { validateResourceForm } from '../../utils/validators';

/**
 * ResourceForm Component
 * 
 * @param {Object} props
 * @param {Object} props.resource - Existing resource (for edit mode)
 * @param {Function} props.onSubmit - Callback when form is submitted
 * @param {Function} props.onCancel - Callback when form is cancelled
 * @param {boolean} props.isEdit - Whether this is edit mode
 * @param {Array} props.categories - Available categories
 * @param {boolean} props.loading - Whether form is submitting
 */
export default function ResourceForm({
  resource = null,
  onSubmit,
  onCancel,
  isEdit = false,
  categories = [],
  loading = false,
}) {
  const [formData, setFormData] = useState({
    title: resource?.title || '',
    url: resource?.url || '',
    description: resource?.description || '',
    resource_type: resource?.resource_type || RESOURCE_TYPES.VIDEO,
    category_id: resource?.category_id || '',
    keywords: resource?.keywords || '',
    duration_seconds: resource?.duration_seconds || null,
  });

  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(resource?.image_url || null);
  const [isDragging, setIsDragging] = useState(false);

  // Duration state (for videos)
  const [durationHours, setDurationHours] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');

  /**
   * Handle form submission
   */
  async function handleSubmit(e) {
    e.preventDefault();
    
    // Validate form
    const validation = validateResourceForm(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    // Clear errors
    setErrors({});

    // Prepare data
    const submitData = {
      ...formData,
      imageFile: imageFile,
    };

    // Call parent submit handler
    if (onSubmit) {
      await onSubmit(submitData);
    }
  }

  /**
   * Handle input change
   */
  function handleChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }

  /**
   * Handle image selection
   */
  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, image: 'Image must be less than 5MB' }));
      return;
    }

    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    
    // Clear any image errors
    if (errors.image) {
      setErrors(prev => ({ ...prev, image: undefined }));
    }
  }

  /**
   * Handle image drag and drop
   */
  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      // Simulate file input change
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const fileInput = e.currentTarget.querySelector('input[type="file"]');
      if (fileInput) {
        fileInput.files = dataTransfer.files;
        handleImageChange({ target: { files: [file] } });
      }
    }
  }

  /**
   * Remove image
   */
  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview(null);
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
  }

  /**
   * Calculate duration in seconds from H:MM:SS inputs
   */
  function updateDuration(hours, minutes, seconds) {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const s = parseInt(seconds) || 0;
    const total = h * 3600 + m * 60 + s;
    handleChange('duration_seconds', total || null);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isEdit ? 'Edit Resource' : 'Add New Resource'}
              </h2>
              <p className="text-gray-600">
                {isEdit ? 'Update resource details' : 'Add a surgical technique resource to the library'}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category *
              </label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => handleChange('category_id', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              >
                <option value="">Select category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category}</p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Resource Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="e.g., Ankle Arthroscopy Technique"
                maxLength={200}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                URL *
              </label>
              <input
                type="url"
                required
                value={formData.url}
                onChange={(e) => handleChange('url', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="https://..."
              />
              {errors.url && (
                <p className="mt-1 text-sm text-red-600">{errors.url}</p>
              )}
            </div>

            {/* Resource Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Resource Type *
              </label>
              <select
                required
                value={formData.resource_type}
                onChange={(e) => handleChange('resource_type', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              >
                <option value={RESOURCE_TYPES.VIDEO}>Video</option>
                <option value={RESOURCE_TYPES.ARTICLE}>Article</option>
                <option value={RESOURCE_TYPES.DOCUMENT}>Document</option>
                <option value={RESOURCE_TYPES.IMAGE}>Image</option>
              </select>
            </div>

            {/* Duration (for videos only) */}
            {formData.resource_type === RESOURCE_TYPES.VIDEO && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Video Duration (optional)
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={durationHours}
                    onChange={(e) => {
                      setDurationHours(e.target.value);
                      updateDuration(e.target.value, durationMinutes, durationSeconds);
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
                      setDurationMinutes(e.target.value);
                      updateDuration(durationHours, e.target.value, durationSeconds);
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
                      setDurationSeconds(e.target.value);
                      updateDuration(durationHours, durationMinutes, e.target.value);
                    }}
                    className="w-20 px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-center"
                    placeholder="SS"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Format: H:MM:SS (e.g., 0:05:30 for 5 minutes 30 seconds)</p>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                rows="4"
                placeholder="Brief description of the resource..."
                maxLength={1000}
              />
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Keywords (optional)
              </label>
              <input
                type="text"
                value={formData.keywords || ''}
                onChange={(e) => handleChange('keywords', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="e.g., bunion, MIS, osteotomy"
              />
              <p className="text-xs text-gray-500 mt-1">Separate keywords with commas</p>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Resource Image {!isEdit && '*'}
              </label>
              
              {imagePreview ? (
                <div className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-gray-200">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label 
                  className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    isDragging 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-300 hover:border-purple-500 bg-gray-50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload size={32} className={`${isDragging ? 'text-purple-600' : 'text-gray-400'} mb-2`} />
                  <span className={`text-sm font-medium ${isDragging ? 'text-purple-700' : 'text-gray-600'}`}>
                    {isDragging ? 'Drop image here' : 'Click to upload or drag & drop'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP (Max 5MB)</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageChange}
                    required={!isEdit && !imagePreview}
                  />
                </label>
              )}
              
              {errors.image && (
                <p className="mt-1 text-sm text-red-600">{errors.image}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-100">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : (isEdit ? 'Update Resource' : 'Add Resource')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

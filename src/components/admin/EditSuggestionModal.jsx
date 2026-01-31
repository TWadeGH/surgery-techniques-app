import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { processResourceImage, createImagePreview, validateImageFile } from '../../lib/imageUtils';

export default function EditSuggestionModal({ suggestion, onSave, onClose }) {
  // Parse duration_seconds into hours, minutes, seconds if it exists
  const parseDuration = (totalSeconds) => {
    if (!totalSeconds || totalSeconds === 0) return { hours: 0, minutes: 0, seconds: 0 };
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { hours, minutes, seconds };
  };

  const initialDuration = parseDuration(suggestion.duration_seconds);

  const [title, setTitle] = useState(suggestion.title || '');
  const [description, setDescription] = useState(suggestion.description || '');
  const [url, setUrl] = useState(suggestion.url || '');
  const [resourceType, setResourceType] = useState(suggestion.resource_type || 'video');
  const [keywords, setKeywords] = useState(suggestion.keywords || '');
  
  const [currentImageUrl, setCurrentImageUrl] = useState(suggestion.image_url || '');
  const [newImageFile, setNewImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  
  const [durationHours, setDurationHours] = useState(initialDuration.hours);
  const [durationMinutes, setDurationMinutes] = useState(initialDuration.minutes);
  const [durationSeconds, setDurationSeconds] = useState(initialDuration.seconds);
  
  const [specialties, setSpecialties] = useState([]);
  const [subspecialties, setSubspecialties] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  
  // Use user_specialty_id/user_subspecialty_id for suggestions (not specialty_id/subspecialty_id)
  const [selectedSpecialty, setSelectedSpecialty] = useState(suggestion.user_specialty_id || suggestion.specialty_id || '');
  const [selectedSubspecialty, setSelectedSubspecialty] = useState(suggestion.user_subspecialty_id || suggestion.subspecialty_id || '');
  const [selectedCategory, setSelectedCategory] = useState(suggestion.category_id || '');
  const [selectedSubcategory, setSelectedSubcategory] = useState(suggestion.subcategory_id || '');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSpecialties();
  }, []);

  useEffect(() => {
    if (selectedSpecialty) {
      loadSubspecialties(selectedSpecialty);
    }
  }, [selectedSpecialty]);

  useEffect(() => {
    if (selectedSubspecialty) {
      loadCategories(selectedSubspecialty);
    }
  }, [selectedSubspecialty]);

  useEffect(() => {
    if (selectedCategory) {
      loadSubcategories(selectedCategory);
    }
  }, [selectedCategory]);

  async function loadSpecialties() {
    try {
      const { data, error } = await supabase
        .from('specialties')
        .select('*')
        .order('order');
      if (error) throw error;
      setSpecialties(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading specialties:', error);
      setLoading(false);
    }
  }

  async function loadSubspecialties(specialtyId) {
    try {
      const { data, error } = await supabase
        .from('subspecialties')
        .select('*')
        .eq('specialty_id', specialtyId)
        .order('order');
      if (error) throw error;
      setSubspecialties(data || []);
    } catch (error) {
      console.error('Error loading subspecialties:', error);
    }
  }

  async function loadCategories(subspecialtyId) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('subspecialty_id', subspecialtyId)
        .is('parent_category_id', null)
        .order('order');
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  async function loadSubcategories(categoryId) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('parent_category_id', categoryId)
        .order('order');
      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error loading subcategories:', error);
    }
  }

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError('');
    setProcessingImage(true);

    try {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setImageError(validation.error);
        setProcessingImage(false);
        return;
      }

      const processedImage = await processResourceImage(file);
      setNewImageFile(processedImage);

      const preview = await createImagePreview(processedImage);
      setImagePreview(preview);
    } catch (error) {
      console.error('Error processing image:', error);
      setImageError(error.message || 'Failed to process image');
    } finally {
      setProcessingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      let finalImageUrl = currentImageUrl;

      if (newImageFile) {
        const timestamp = Date.now();
        const fileExt = newImageFile.name.split('.').pop();
        const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `resource-images/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('resources')
          .upload(filePath, newImageFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('resources')
          .getPublicUrl(filePath);

        finalImageUrl = publicUrl;
      }

      // Calculate total duration_seconds for video type
      let totalDurationSeconds = null;
      if (resourceType === 'video') {
        const hours = parseInt(durationHours) || 0;
        const minutes = parseInt(durationMinutes) || 0;
        const seconds = parseInt(durationSeconds) || 0;
        totalDurationSeconds = hours * 3600 + minutes * 60 + seconds;
      }

      await onSave({
        title,
        description,
        url,
        resource_type: resourceType,
        keywords: keywords || null,
        duration_seconds: totalDurationSeconds,
        specialty_id: selectedSpecialty || null,
        subspecialty_id: selectedSubspecialty || null,
        category_id: selectedCategory || null,
        image_url: finalImageUrl,
      });
    } catch (error) {
      console.error('Error saving:', error);
      setImageError(error.message || 'Failed to save');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading form data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            Edit Suggested Resource
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Resource Type *
            </label>
            <select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
              required
            >
              <option value="video">Video</option>
              <option value="article">Article</option>
              <option value="link">Link</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
              required
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Keywords (Optional)
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
              placeholder="e.g., bunion, MIS, osteotomy"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Separate keywords with commas
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Resource Image
            </label>
            
            <div className="mb-3">
              {(imagePreview || currentImageUrl) && (
                <div className="relative inline-block">
                  <img
                    src={imagePreview || currentImageUrl}
                    alt="Resource preview"
                    className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600"
                  />
                  {imagePreview && (
                    <span className="absolute top-1 right-1 bg-green-500 text-white text-xs px-2 py-1 rounded">
                      New
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex-1 cursor-pointer">
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {newImageFile ? '✓ Image Selected' : 'Choose New Image'}
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={processingImage}
                />
              </label>
              
              {newImageFile && (
                <button
                  type="button"
                  onClick={() => {
                    setNewImageFile(null);
                    setImagePreview(null);
                    setImageError('');
                  }}
                  className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm font-medium"
                >
                  Remove
                </button>
              )}
            </div>

            {processingImage && (
              <div className="text-sm text-blue-600 dark:text-blue-400 mt-2 flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 inline-block"></span>
                Processing image...
              </div>
            )}

            {imageError && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                {imageError}
              </p>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Max 2MB • Will be resized to 800x800px • JPG, PNG, WebP
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              URL *
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
              required
            />
          </div>

          {resourceType === 'video' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duration
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Seconds</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Specialty
            </label>
            <select
              value={selectedSpecialty}
              onChange={(e) => {
                setSelectedSpecialty(e.target.value);
                setSelectedSubspecialty('');
                setSelectedCategory('');
                setSelectedSubcategory('');
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Select Specialty</option>
              {specialties.map(spec => (
                <option key={spec.id} value={spec.id}>{spec.name}</option>
              ))}
            </select>
          </div>

          {selectedSpecialty && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subspecialty
              </label>
              <select
                value={selectedSubspecialty}
                onChange={(e) => {
                  setSelectedSubspecialty(e.target.value);
                  setSelectedCategory('');
                  setSelectedSubcategory('');
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Select Subspecialty</option>
                {subspecialties.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>
          )}

          {selectedSubspecialty && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubcategory('');
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          )}

          {selectedCategory && subcategories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subcategory (Optional)
              </label>
              <select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="">None</option>
                {subcategories.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
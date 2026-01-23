/**
 * ResourceCard Component
 * Displays a single resource with actions (favorite, note, rating, upcoming cases)
 * 
 * Extracted from App.jsx as part of refactoring effort
 * Uses utilities from utils/ for cleaner code
 */

import React, { useState, useEffect } from 'react';
import { 
  Video, 
  FileText, 
  Link, 
  Edit, 
  StickyNote, 
  Heart, 
  Plus, 
  Star, 
  Sparkles, 
  ArrowRight 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { trackResourceCoview, trackRatingEvent } from '../../lib/analytics';
import { USER_TYPES } from '../../utils/constants';

/**
 * Format duration in seconds to HH:MM:SS or MM:SS
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
function formatDuration(seconds) {
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get icon for resource type
 * @param {string} type - Resource type
 * @returns {JSX.Element} Icon component
 */
function getTypeIcon(type) {
  switch(type) {
    case 'video': return <Video size={20} />;
    case 'pdf': return <FileText size={20} />;
    case 'article': return <FileText size={20} />;
    default: return <Link size={20} />;
  }
}

/**
 * Get Tailwind gradient color for resource type
 * @param {string} type - Resource type
 * @returns {string} Tailwind gradient classes
 */
function getTypeColor(type) {
  switch(type) {
    case 'video': return 'from-red-500 to-pink-500';
    case 'pdf': return 'from-blue-500 to-cyan-500';
    case 'article': return 'from-green-500 to-emerald-500';
    default: return 'from-gray-500 to-slate-500';
  }
}

/**
 * Get display label for resource type
 * @param {string} type - Resource type
 * @returns {string} Display label
 */
function getTypeLabel(type) {
  switch(type) {
    case 'pdf': return 'PDF / Guide';
    default: return type;
  }
}

/**
 * Check if user can rate resources
 * @param {Object} user - User object
 * @returns {boolean}
 */
function canUserRate(user) {
  return user?.userType === USER_TYPES.SURGEON || user?.userType === USER_TYPES.TRAINEE;
}

/**
 * ResourceCard Component
 * 
 * @param {Object} props
 * @param {Object} props.resource - Resource object
 * @param {boolean} props.isFavorited - Whether resource is favorited
 * @param {string} props.note - User's personal note
 * @param {Function} props.onToggleFavorite - Callback for toggling favorite
 * @param {Function} props.onUpdateNote - Callback for updating note
 * @param {Function} props.onToggleUpcomingCase - Callback for toggling upcoming case
 * @param {boolean} props.isUpcomingCase - Whether resource is in upcoming cases
 * @param {number} props.index - Index for animation delay
 * @param {Object} props.currentUser - Current user object
 */
export default function ResourceCard({ 
  resource, 
  isFavorited, 
  note, 
  onToggleFavorite, 
  onUpdateNote, 
  onToggleUpcomingCase, 
  isUpcomingCase, 
  index, 
  currentUser 
}) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState(note || '');
  const [viewTracked, setViewTracked] = useState(false);
  const [rating, setRating] = useState(null);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [loadingRating, setLoadingRating] = useState(false);

  // Track view when card is visible
  useEffect(() => {
    if (!viewTracked && resource.id) {
      trackResourceCoview(resource.id);
      setViewTracked(true);
    }
  }, [resource.id, viewTracked]);

  // Load user's rating
  useEffect(() => {
    if (!resource.id || !currentUser?.id) return;
    
    async function loadRating() {
      try {
        const { data: userRating, error } = await supabase
          .from('resource_ratings')
          .select('rating')
          .eq('resource_id', resource.id)
          .eq('user_id', currentUser.id)
          .maybeSingle();

        // PGRST116 = no rows returned, this is expected
        if (error && error.code !== 'PGRST116') {
          console.error('Error loading rating:', error);
          return;
        }
        
        if (userRating) {
          setRating(userRating.rating);
        }
      } catch (error) {
        console.error('Error loading rating:', error);
      }
    }

    loadRating();
  }, [resource.id, currentUser?.id]);

  /**
   * Handle rating submission
   * @param {number} starRating - Rating value (1-5)
   */
  async function handleRateResource(starRating) {
    if (!currentUser?.id || loadingRating) return;
    
    if (!canUserRate(currentUser)) {
      alert('Only Surgeons and Trainees can rate resources.');
      return;
    }

    try {
      setLoadingRating(true);
      
      // Check if user already rated
      const { data: existingRating } = await supabase
        .from('resource_ratings')
        .select('id')
        .eq('resource_id', resource.id)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (existingRating) {
        // Update existing rating
        const { error } = await supabase
          .from('resource_ratings')
          .update({ rating: starRating })
          .eq('id', existingRating.id);

        if (error) throw error;
      } else {
        // Insert new rating
        const { error } = await supabase
          .from('resource_ratings')
          .insert({
            resource_id: resource.id,
            user_id: currentUser.id,
            rating: starRating
          });

        if (error) throw error;
      }

      setRating(starRating);
      trackRatingEvent(currentUser.id, resource.id, starRating, resource.category_id);
    } catch (error) {
      console.error('Error rating resource:', error);
      alert('Error submitting rating: ' + error.message);
    } finally {
      setLoadingRating(false);
    }
  }

  /**
   * Handle saving note
   */
  function handleSaveNote() {
    onUpdateNote(resource.id, noteText);
    setShowNoteInput(false);
  }

  /**
   * Handle canceling note edit
   */
  function handleCancelNote() {
    setShowNoteInput(false);
    setNoteText(note || '');
  }

  const canRate = canUserRate(currentUser);
  const canFavorite = currentUser?.userType === USER_TYPES.SURGEON || currentUser?.userType === USER_TYPES.TRAINEE;

  return (
    <div 
      className={`glass rounded-2xl p-6 shadow-lg card-hover animate-slide-up ${
        resource.is_sponsored ? 'border-l-4 border-yellow-400' : ''
      }`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        {/* Resource Image */}
        <div className="w-24 h-24 sm:w-48 sm:h-48 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 mx-auto sm:mx-0">
          {resource.image_url ? (
            <img 
              src={resource.image_url} 
              alt={resource.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <FileText size={24} className="text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Badges */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {resource.is_sponsored && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-xs font-medium">
                <Sparkles size={12} />
                <span>Sponsored</span>
              </div>
            )}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${getTypeColor(resource.resource_type)} text-white text-sm font-medium`}>
              {getTypeIcon(resource.resource_type)}
              <span className="capitalize">{getTypeLabel(resource.resource_type)}</span>
              {resource.resource_type === 'video' && resource.duration_seconds && (
                <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded">
                  {formatDuration(resource.duration_seconds)}
                </span>
              )}
            </div>
          </div>

          {/* Title and Description */}
          <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-2">
            {resource.title}
          </h4>
          <p className="text-gray-600 dark:text-gray-300 mb-3">
            {resource.description}
          </p>
          
          {/* Resource Link */}
          <a 
            href={resource.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-purple-600 hover:text-purple-700 text-sm break-all flex items-center gap-1 mb-4"
          >
            <span>{resource.url}</span>
            <ArrowRight size={14} />
          </a>

          {/* Personal Rating */}
          {canRate && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  My Rating:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = hoveredStar ? star <= hoveredStar : (rating ? star <= rating : false);
                    return (
                      <button
                        key={star}
                        onClick={() => handleRateResource(star)}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        disabled={loadingRating}
                        className="focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Rate ${star} stars`}
                      >
                        <Star 
                          size={18} 
                          fill={isFilled ? '#FBBF24' : 'none'} 
                          stroke={isFilled ? '#FBBF24' : '#D1D5DB'} 
                          className={`transition-colors ${!loadingRating ? 'hover:scale-110' : ''}`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Note Display */}
          {note && !showNoteInput && (
            <div className="mb-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl">
              <div className="flex justify-between items-start gap-2">
                <p className="text-gray-700 text-sm flex-1">{note}</p>
                <button
                  onClick={() => {
                    setNoteText(note);
                    setShowNoteInput(true);
                  }}
                  className="text-purple-600 hover:text-purple-700 transition-colors"
                  aria-label="Edit note"
                >
                  <Edit size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Note Input */}
          {showNoteInput && (
            <div className="mb-4">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add your personal note..."
                className="w-full p-3 border-2 border-purple-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none transition-colors"
                rows="3"
                maxLength={5000}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveNote}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelNote}
                  className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end pt-4 border-t border-gray-100">
            <div className="flex gap-2">
              {/* Note Button */}
              <button
                onClick={() => setShowNoteInput(!showNoteInput)}
                className={`p-2.5 rounded-lg transition-all ${
                  note 
                    ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title={note ? 'Edit Note' : 'Add Note'}
                aria-label={note ? 'Edit Note' : 'Add Note'}
              >
                <StickyNote size={18} fill={note ? 'currentColor' : 'none'} />
              </button>

              {/* Favorite Button */}
              {canFavorite && (
                <button
                  onClick={() => onToggleFavorite(resource.id)}
                  className={`p-2.5 rounded-lg transition-all ${
                    isFavorited 
                      ? 'bg-red-100 text-red-500 hover:bg-red-200' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  title={isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
                  aria-label={isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
                >
                  <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} />
                </button>
              )}

              {/* Upcoming Case Button */}
              {onToggleUpcomingCase && canFavorite && (
                <button
                  onClick={() => onToggleUpcomingCase(resource.id)}
                  className={`p-2.5 rounded-lg transition-all ${
                    isUpcomingCase 
                      ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  title={isUpcomingCase ? 'Remove from Upcoming Cases' : 'Add to Upcoming Cases'}
                  aria-label={isUpcomingCase ? 'Remove from Upcoming Cases' : 'Add to Upcoming Cases'}
                >
                  <Plus size={18} className={isUpcomingCase ? 'rotate-45' : ''} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

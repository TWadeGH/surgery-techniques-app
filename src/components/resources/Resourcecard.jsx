
/**
 * ResourceCard Component
 * Displays a single resource with actions (favorite, note, rating, upcoming cases)
 * 
 * Extracted from App.jsx as part of refactoring effort
 * Uses utilities from utils/ for cleaner code
 */

import React, { useState, useEffect, memo } from 'react';
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
  ArrowRight,
  X,
  Flag
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { trackResourceCoview, trackRatingEvent, trackResourceLinkClick } from '../../lib/analytics';
import { USER_TYPES, SOURCE_DISPLAY, CONTENT_TYPE_LABELS, EXTERNAL_LINK_DISCLOSURE } from '../../utils/constants';
import ExternalLinkModal from '../modals/ExternalLinkModal';
import { includeInAnalytics } from '../../utils/helpers';
import { useToast } from '../common';

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
  if (type && CONTENT_TYPE_LABELS[type]) return CONTENT_TYPE_LABELS[type];
  switch(type) {
    case 'pdf': return 'PDF / Guide';
    default: return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Link';
  }
}

/**
 * Check if user can rate resources
 * Security: Uses allowlist to prevent injection attacks
 * @param {Object} user - User object
 * @returns {boolean}
 */
function canUserRate(user) {
  if (!user?.userType) return false;
  
  // Security: Validate userType is a string and use allowlist
  if (typeof user.userType !== 'string') return false;
  
  const userType = user.userType.toLowerCase().trim();
  
  // Security: Allowlist of valid user types (all 4 onboarding options can rate)
  const ALLOWED_USER_TYPES = ['surgeon', 'attending', 'trainee', 'resident', 'fellow', 'industry', 'student', 'other'];
  
  return ALLOWED_USER_TYPES.includes(userType);
}

/** Character limit for description preview; longer descriptions show "... read more" */
const DESCRIPTION_PREVIEW_LENGTH = 200;

/**
 * Return URL only if it is http/https to prevent javascript: or data: etc.
 * @param {string} url - Raw URL from resource
 * @returns {string|null} Safe href or null
 */
function getSafeResourceHref(url) {
  if (!url || typeof url !== 'string') return null;
  const u = url.trim();
  return /^https?:\/\//i.test(u) ? u : null;
}

/** "View on [Source]" button label from source_type or source_name */
function getViewOnLabel(resource) {
  const st = resource?.source_type;
  if (st && SOURCE_DISPLAY[st]) return `View on ${SOURCE_DISPLAY[st]}`;
  if (resource?.source_name) return `View on ${resource.source_name}`;
  return 'View on External Site';
}

/** Source line: "Source: YouTube • Video • 9:12" */
function getSourceLine(resource) {
  const st = resource?.source_type;
  const sourceLabel = (st && SOURCE_DISPLAY[st]) || resource?.source_name || 'External';
  const typeKey = resource?.content_type || resource?.resource_type;
  const typeLabel = (typeKey && CONTENT_TYPE_LABELS[typeKey]) || (typeKey && typeKey.charAt(0).toUpperCase() + typeKey.slice(1)) || 'Link';
  const parts = [`Source: ${sourceLabel}`, typeLabel];
  if (resource?.resource_type === 'video' && resource?.duration_seconds) {
    parts.push(formatDuration(resource.duration_seconds));
  }
  return parts.join(' · ');
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
 * @param {Function} props.onReportResource - Callback to open report modal for this resource
 */
function ResourceCard({
  resource, 
  isFavorited, 
  note, 
  onToggleFavorite, 
  onUpdateNote, 
  onToggleUpcomingCase, 
  isUpcomingCase, 
  index, 
  currentUser,
  onReportResource
}) {
  const toast = useToast();
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState(note || '');
  const [viewTracked, setViewTracked] = useState(false);
  const [rating, setRating] = useState(null);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [loadingRating, setLoadingRating] = useState(false);
  const [showFullDescriptionPopover, setShowFullDescriptionPopover] = useState(false);
  const [showExternalLinkModal, setShowExternalLinkModal] = useState(false);

  // Track view when card is visible (analytics: Surgeon and Resident/Fellow only)
  useEffect(() => {
    if (!viewTracked && resource.id && includeInAnalytics(currentUser)) {
      trackResourceCoview(resource.id);
      setViewTracked(true);
    }
  }, [resource.id, viewTracked, currentUser]);

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
          // Security: Don't log PII (user IDs, resource IDs) in console
          console.error('Error loading rating:', error?.code || 'Unknown error');
          return;
        }
        
        if (userRating) {
          // Security: Validate rating is within valid range (1-5)
          const validRating = Number.isInteger(userRating.rating) && 
                             userRating.rating >= 1 && 
                             userRating.rating <= 5;
          if (validRating) {
            setRating(userRating.rating);
          }
        }
      } catch (error) {
        // Security: Don't log PII in console
        console.error('Error loading rating:', error?.code || 'Unknown error');
      }
    }

    loadRating();
  }, [resource.id, currentUser?.id]);

  /**
   * Handle rating submission
   * Security: Validates rating input, enforces permissions, sanitizes errors
   * @param {number} starRating - Rating value (1-5)
   */
  async function handleRateResource(starRating) {
    // Security: Input validation - ensure starRating is valid
    if (!Number.isInteger(starRating) || starRating < 1 || starRating > 5) {
      toast.error('Invalid rating value.');
      return;
    }
    
    if (!currentUser?.id || loadingRating) return;
    
    // Security: Client-side permission check (server-side RLS also enforces)
    if (!canUserRate(currentUser)) {
      toast.error('Only Surgeons and Trainees can rate resources.');
      return;
    }

    try {
      setLoadingRating(true);
      
      // Security: Server-side validation via Supabase RLS ensures user can only rate once per resource
      // Check if user already rated
      const { data: existingRating, error: checkError } = await supabase
        .from('resource_ratings')
        .select('id')
        .eq('resource_id', resource.id)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingRating) {
        // Update existing rating
        // Security: RLS ensures user can only update their own ratings
        const { error } = await supabase
          .from('resource_ratings')
          .update({ rating: starRating })
          .eq('id', existingRating.id);

        if (error) throw error;
      } else {
        // Insert new rating
        // Security: RLS ensures user can only insert ratings for themselves
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
      if (includeInAnalytics(currentUser)) {
        trackRatingEvent(currentUser.id, resource.id, starRating, resource.category_id);
      }
    } catch (error) {
      // Security: Sanitize error message to prevent XSS and information leakage
      const sanitizedMessage = error?.message ? 
        error.message.replace(/[<>]/g, '').substring(0, 100) : 
        'An error occurred';
      console.error('Error rating resource:', error?.code || 'Unknown error');
      toast.error('Error submitting rating: ' + sanitizedMessage);
    } finally {
      setLoadingRating(false);
    }
  }

  /**
   * Handle saving note
   * Security: Saves note immediately (not debounced) when user clicks Save button
   */
  async function handleSaveNote() {
    try {
      // Save immediately (bypasses debounce) - pass true for immediate flag
      // Note: updateNote signature is (resourceId, noteText, immediate)
      await onUpdateNote(resource.id, noteText, true);
      setShowNoteInput(false);
      toast.success('Note saved');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Error saving note. Please try again.');
    }
  }

  /**
   * Handle canceling note edit
   */
  function handleCancelNote() {
    setShowNoteInput(false);
    setNoteText(note || '');
  }

  const canRate = canUserRate(currentUser);
  // Allow favorites for surgeons (surgeon/attending) and trainees (trainee/resident/fellow)
  const canFavorite = canUserRate(currentUser); // Same logic as canRate
  const safeResourceHref = getSafeResourceHref(resource?.url);

  const handleViewExternalClick = () => setShowExternalLinkModal(true);
  const handleExternalContinue = () => {
    const href = getSafeResourceHref(resource?.url);
    if (href) {
      trackResourceLinkClick(resource.id, currentUser?.id, resource?.source_type);
      window.open(href, '_blank', 'noopener,noreferrer');
    }
    setShowExternalLinkModal(false);
  };

  return (
    <div 
      className={`glass rounded-lg p-3 shadow-md card-hover animate-slide-up ${
        resource.is_sponsored ? 'border-l-4 border-yellow-400' : ''
      }`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        {/* Resource Image */}
        <div className="w-16 h-16 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 mx-auto sm:mx-0">
          {resource.image_url ? (
            <img 
              src={resource.image_url} 
              alt={resource.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <FileText size={20} className="text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Badges */}
          <div className="flex gap-1.5 mb-1.5 flex-wrap">
            {resource.is_sponsored && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-300 text-xs font-medium">
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
          <h4 className="font-bold text-base text-gray-900 dark:text-white mb-1">
            {resource.title}
          </h4>
          <div className="text-gray-600 dark:text-gray-300 text-xs mb-1.5">
            {(() => {
              const description = typeof resource.description === 'string' ? resource.description : (resource.description ? String(resource.description) : '');
              if (!description) return null;
              if (description.length > DESCRIPTION_PREVIEW_LENGTH) {
                return (
                  <>
                    <span>{description.slice(0, DESCRIPTION_PREVIEW_LENGTH).trim()}... </span>
                    <button
                      type="button"
                      onClick={() => setShowFullDescriptionPopover(true)}
                      className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-normal align-baseline hover:underline"
                    >
                      read more
                    </button>
                  </>
                );
              }
              return description;
            })()}
          </div>

          {/* Full description popover — only when "read more" clicked */}
          {showFullDescriptionPopover && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/50"
                aria-hidden="true"
                onClick={() => setShowFullDescriptionPopover(false)}
              />
              <div
                className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white dark:bg-gray-800 shadow-xl p-5 max-h-[70vh] flex flex-col"
                role="dialog"
                aria-modal="true"
                aria-labelledby="full-desc-title"
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 id="full-desc-title" className="font-bold text-lg text-gray-900 dark:text-white">
                    {resource.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowFullDescriptionPopover(false)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {typeof resource.description === 'string' ? resource.description : (resource.description ? String(resource.description) : '')}
                </div>
              </div>
            </>
          )}

          {/* Source line: Source • Type • Duration */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {getSourceLine(resource)}
          </p>

          {/* View on [Source] button — opens confirmation modal then external link */}
          {safeResourceHref ? (
            <>
              <button
                type="button"
                onClick={handleViewExternalClick}
                className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors mb-2"
              >
                <ArrowRight size={14} />
                {getViewOnLabel(resource)}
              </button>
              {/* Disclaimer moved to bottom bar next to icons */}
            </>
          ) : resource?.url ? (
            <span className="text-gray-500 dark:text-gray-400 text-xs break-all flex items-center gap-1 mb-2">
              {resource.url}
            </span>
          ) : null}

          {/* Personal Rating - Show if user can rate OR if they have an existing rating */}
          {(canRate || rating) && (
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
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
                        onClick={() => canRate && handleRateResource(star)}
                        onMouseEnter={() => canRate && setHoveredStar(star)}
                        onMouseLeave={() => canRate && setHoveredStar(0)}
                        disabled={loadingRating || !canRate}
                        className="focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={canRate ? `Rate ${star} stars` : `${star} stars`}
                      >
                        <Star 
                          size={18} 
                          fill={isFilled ? '#FBBF24' : 'none'} 
                          stroke={isFilled ? '#FBBF24' : '#9CA3AF'} 
                          className={`transition-colors ${!loadingRating && canRate ? 'hover:scale-110' : ''} ${!canRate ? 'opacity-75' : ''}`}
                        />
                      </button>
                    );
                  })}
                </div>
                {rating && !canRate && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({rating}/5)</span>
                )}
              </div>
            </div>
          )}

          {/* Note Display */}
          {note && !showNoteInput && (
            <div className="mb-3 p-2.5 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex justify-between items-start gap-2">
                <p className="text-gray-700 dark:text-gray-200 text-sm flex-1">{note}</p>
                <button
                  onClick={() => {
                    setNoteText(note);
                    setShowNoteInput(true);
                  }}
                  className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                  aria-label="Edit note"
                >
                  <Edit size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Note Input */}
          {showNoteInput && (
            <div className="mb-3">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add your personal note..."
                className="w-full p-2.5 border-2 border-purple-200 dark:border-purple-700 rounded-lg text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                rows="2"
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
                  className="px-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-900 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Bottom bar: disclaimer + action buttons */}
          <div className="flex items-end justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 overflow-visible">
            {safeResourceHref ? (
              <p className="text-[10px] leading-tight text-gray-400 dark:text-gray-500 max-w-[260px] flex-shrink">
                {EXTERNAL_LINK_DISCLOSURE.CARD_DISCLAIMER}
              </p>
            ) : <div />}
            <div className="flex gap-2 flex-shrink-0 overflow-visible">
              {/* Note Button */}
              <div className="group relative">
                <button
                  onClick={() => setShowNoteInput(!showNoteInput)}
                  className={`p-2.5 rounded-lg transition-all ${
                    note 
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  aria-label={note ? 'Edit note' : 'Add note'}
                >
                  <StickyNote size={18} fill={note ? 'currentColor' : 'none'} strokeWidth={note ? 0 : 2} />
                </button>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50">
                  {note ? 'Edit your personal note for this resource' : 'Add a personal note for this resource'}
                </span>
              </div>

              {/* Favorite Button - Show for all users, but only allow interaction for surgeons/trainees */}
              {/* Security: Client-side disabled state + server-side RLS enforces permissions */}
              {onToggleFavorite && (
                <div className="group relative">
                  <button
                    onClick={() => canFavorite && onToggleFavorite && onToggleFavorite(resource.id)}
                    disabled={!canFavorite}
                    className={`p-2.5 rounded-lg transition-all ${
                      isFavorited 
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    } ${!canFavorite ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-label={canFavorite ? (isFavorited ? 'Remove from Favorites' : 'Add to Favorites') : 'Favorites not available'}
                  >
                    <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} strokeWidth={isFavorited ? 0 : 2} />
                  </button>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50">
                    {canFavorite ? (isFavorited ? 'Remove this resource from your Favorites list' : 'Save this resource to your Favorites list') : 'Favorites available for Surgeons and Trainees'}
                  </span>
                </div>
              )}

              {/* Upcoming Case Button - Show for all users, but only allow interaction for surgeons/trainees */}
              {/* Security: Client-side disabled state + server-side RLS enforces permissions */}
              {onToggleUpcomingCase && (
                <div className="group relative">
                <button
                  onClick={() => canFavorite && onToggleUpcomingCase(resource.id)}
                  disabled={!canFavorite}
                  className={`p-2.5 rounded-lg transition-all ${
                    isUpcomingCase 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  } ${!canFavorite ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label={canFavorite ? (isUpcomingCase ? 'Remove from Upcoming Cases' : 'Add to Upcoming Cases') : 'Upcoming Cases not available'}
                >
                  <Plus size={18} className={isUpcomingCase ? 'rotate-45' : ''} strokeWidth={2} />
                </button>
                <span className="absolute bottom-full right-0 mb-2 px-2 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg max-w-48 text-center opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50">
                  {canFavorite ? (isUpcomingCase ? 'Remove from Upcoming Cases' : 'Add to Upcoming Cases') : 'Upcoming Cases available for Surgeons and Trainees'}
                </span>
                </div>
              )}

              {/* Report Link — flag only */}
              <div className="group relative">
                <button
                  type="button"
                  onClick={() => onReportResource?.(resource)}
                  className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/20 dark:hover:text-amber-400 transition-all"
                  aria-label="Report link"
                >
                  <Flag size={18} />
                </button>
                <span className="absolute bottom-full right-0 mb-2 px-2 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg max-w-48 text-center opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50">
                  Report a problem or copyright concern
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ExternalLinkModal
        isOpen={showExternalLinkModal}
        onClose={() => setShowExternalLinkModal(false)}
        onContinue={handleExternalContinue}
        resourceTitle={resource?.title}
        sourceLabel={(resource?.source_type && SOURCE_DISPLAY[resource.source_type]) || resource?.source_name}
      />
    </div>
  );
}

// Memoize ResourceCard to prevent unnecessary re-renders
export default memo(ResourceCard, (prevProps, nextProps) => (
  prevProps.resource?.id === nextProps.resource?.id &&
  prevProps.isFavorited === nextProps.isFavorited &&
  prevProps.note === nextProps.note &&
  prevProps.isUpcomingCase === nextProps.isUpcomingCase &&
  prevProps.index === nextProps.index &&
  prevProps.currentUser?.id === nextProps.currentUser?.id &&
  prevProps.onReportResource === nextProps.onReportResource
));

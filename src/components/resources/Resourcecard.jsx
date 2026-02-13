
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
  Flag,
  MessageSquare,
  Calendar,
  Trash2,
  Package
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { trackResourceCoview, trackRatingEvent, trackResourceLinkClick } from '../../lib/analytics';
import { USER_TYPES, SOURCE_DISPLAY, CONTENT_TYPE_LABELS, EXTERNAL_LINK_DISCLOSURE } from '../../utils/constants';
import ExternalLinkModal from '../modals/ExternalLinkModal';
import CalendarEventModal from '../modals/CalendarEventModal';
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
  
  // Security: Allowlist of valid user types (all onboarding options can rate)
  const ALLOWED_USER_TYPES = ['surgeon', 'attending', 'trainee', 'resident', 'fellow', 'app', 'industry', 'student', 'other'];
  
  return ALLOWED_USER_TYPES.includes(userType);
}

/**
 * Check if user can favorite resources
 * @param {Object} user - User object
 * @returns {boolean}
 */
function canUserFavorite(user) {
  return !!user?.id;
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
  
  // Block dangerous protocols
  if (/^(javascript|data|vbscript|file|about):/i.test(u)) {
    return null;
  }
  
  // Block chrome-extension:// and other browser-specific protocols
  if (/^(chrome-extension|moz-extension|ms-browser-extension|edge):/i.test(u)) {
    return null;
  }
  
  // If it already has http:// or https://, return as-is
  if (/^https?:\/\//i.test(u)) {
    return u;
  }
  
  // If it looks like a URL without protocol (starts with www. or contains a domain), add https://
  if (/^(www\.|[a-z0-9-]+\.[a-z]{2,})/i.test(u)) {
    return `https://${u}`;
  }
  
  return null;
}

/** "View on [Source]" button label from source_type or source_name */
function getViewOnLabel(resource) {
  const st = resource?.source_type;
  if (st && SOURCE_DISPLAY[st]) return `View on ${SOURCE_DISPLAY[st]}`;
  if (resource?.source_name) return `View on ${resource.source_name}`;
  return 'View on External Site';
}

/** Source line segments for display */
function getSourceLineSegments(resource) {
  const st = resource?.source_type;
  const sourceLabel = (st && SOURCE_DISPLAY[st]) || resource?.source_name || 'External';
  const typeKey = resource?.content_type || resource?.resource_type;
  const typeLabel = (typeKey && CONTENT_TYPE_LABELS[typeKey]) || (typeKey && typeKey.charAt(0).toUpperCase() + typeKey.slice(1)) || 'Link';
  const duration = resource?.resource_type === 'video' && resource?.duration_seconds
    ? formatDuration(resource.duration_seconds)
    : null;
  const year = resource?.year_of_publication ? String(resource.year_of_publication) : null;
  return { sourceLabel, typeLabel, duration, year };
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
 * @param {Function} props.onContactRep - Callback to contact company rep
 * @param {boolean} props.companyIsActive - Whether the resource's company has active contacts
 * @param {Object} props.calendarEvent - Calendar event for this resource (if exists)
 * @param {Function} props.onCreateCalendarEvent - Callback to create calendar event
 * @param {Function} props.onDeleteCalendarEvent - Callback to delete calendar event
 * @param {boolean} props.isCalendarConnected - Whether user has connected calendar
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
  onReportResource,
  onContactRep,
  companyIsActive = false,
  calendarEvent = null,
  onCreateCalendarEvent,
  onDeleteCalendarEvent,
  isCalendarConnected = false,
  calendarConnections = []
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
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [deletingCalendarEvent, setDeletingCalendarEvent] = useState(false);

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
  const canFavorite = canUserFavorite(currentUser); // All logged-in users can favorite
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

  /**
   * Handle deleting calendar event
   */
  const handleDeleteCalendarEvent = async () => {
    if (!calendarEvent || !onDeleteCalendarEvent) return;

    try {
      setDeletingCalendarEvent(true);
      await onDeleteCalendarEvent(calendarEvent.id);
      toast.success('Calendar event removed');
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      toast.error('Failed to remove calendar event');
    } finally {
      setDeletingCalendarEvent(false);
    }
  };

  /**
   * Format calendar event date/time for display
   */
  const formatCalendarEventDisplay = () => {
    if (!calendarEvent) return '';
    try {
      // Parse as local time by splitting parts — new Date('YYYY-MM-DDTHH:MM:SS')
      // treats the string as UTC, which shifts the displayed time by timezone offset.
      const [datePart, timePart] = calendarEvent.event_start.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      const eventDate = new Date(year, month - 1, day, hours, minutes);
      const options = {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      return eventDate.toLocaleString('en-US', options);
    } catch {
      return 'Scheduled';
    }
  };

  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border border-gray-200 dark:border-gray-700 animate-slide-up ${
        resource.is_sponsored ? 'border-l-4 border-yellow-400' : ''
      }`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        {/* Resource Image */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 mx-auto sm:mx-0">
          {resource.image_url ? (
            <img 
              src={resource.image_url} 
              alt={resource.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <FileText size={20} className="text-gray-400 dark:text-gray-500" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Badges */}
          <div className="flex gap-2 mb-2 flex-wrap">
            {resource.is_sponsored && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 rounded-full text-sm font-normal">
                <Sparkles size={14} />
                <span>Sponsored</span>
              </div>
            )}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-normal">
              {getTypeIcon(resource.resource_type)}
              <span className="capitalize">{getTypeLabel(resource.resource_type)}</span>
              {resource.resource_type === 'video' && resource.duration_seconds && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  · {formatDuration(resource.duration_seconds)}
                </span>
              )}
            </div>
          </div>

          {/* Title and Description */}
          <h4 className="font-semibold text-xl text-gray-900 dark:text-white mb-2 leading-snug">
            {resource.title}
          </h4>
          <div className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-2">
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
                      className="inline-flex items-center text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-normal hover:underline focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 rounded px-1 py-0.5"
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
                className="fixed inset-0 z-40 bg-black/50 animate-fade-in"
                aria-hidden="true"
                onClick={() => setShowFullDescriptionPopover(false)}
              />
              <div
                className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white dark:bg-gray-800 shadow-xl p-5 max-h-[70vh] flex flex-col animate-scale-in"
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

          {/* Source line: Source / Type / Duration / Year (duration and year slightly emphasized) */}
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            {(() => {
              const { sourceLabel, typeLabel, duration, year } = getSourceLineSegments(resource);
              return (
                <>
                  Source: {sourceLabel} / {typeLabel}
                  {duration && (
                    <> / <span className="text-gray-600 dark:text-gray-300 font-semibold">{duration}</span></>
                  )}
                  {year && (
                    <> / <span className="text-gray-600 dark:text-gray-300 font-semibold">{year}</span></>
                  )}
                </>
              );
            })()}
          </p>

          {/* View on [Source] button — opens confirmation modal then external link */}
          {safeResourceHref ? (
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                type="button"
                onClick={handleViewExternalClick}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                <ArrowRight size={16} />
                {getViewOnLabel(resource)}
              </button>
              {/* Additional Implant Information - optional 2nd button, only when implant_info_url exists */}
              {resource.implant_info_url && (
                <a
                  href={resource.implant_info_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all active:scale-95"
                >
                  <Package size={16} />
                  Additional Implant Information
                </a>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 italic">
              External link not available for this resource
            </p>
          )}

          {/* Disclaimer - Always shown for all resources */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {EXTERNAL_LINK_DISCLOSURE.CARD_DISCLAIMER} {EXTERNAL_LINK_DISCLOSURE.COPYRIGHT_REPORT}
          </p>

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
                        className="focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 rounded disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        aria-label={canRate ? `Rate ${star} stars` : `${star} stars`}
                      >
                        <Star 
                          size={18} 
                          fill={isFilled ? '#FBBF24' : 'none'} 
                          stroke={isFilled ? '#FBBF24' : '#9CA3AF'} 
                          className={`transition-all duration-200 ${!loadingRating && canRate ? 'hover:scale-110' : ''} ${!canRate ? 'opacity-75' : ''}`}
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
            <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
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
                  <Edit size={16} />
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
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelNote}
                  className="px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons — overflow-visible so tooltips show */}
          <div className="flex items-center justify-end pt-4 border-t border-gray-100 dark:border-gray-700 overflow-visible">
            <div className="flex gap-2 flex-wrap overflow-visible">
              {/* Note Button */}
              <div className="group relative">
                <button
                  onClick={() => setShowNoteInput(!showNoteInput)}
                  className={`p-3 rounded-lg transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    note 
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  aria-label={note ? 'Edit note' : 'Add note'}
                >
                  <StickyNote size={20} fill={note ? 'currentColor' : 'none'} strokeWidth={note ? 0 : 2} />
                </button>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50">
                  {note ? 'Edit your personal note for this resource' : 'Add a personal note for this resource'}
                </span>
              </div>

              {/* Favorite Button - Available to all logged-in users */}
              {onToggleFavorite && (
                <div className="group relative">
                  <button
                    onClick={() => onToggleFavorite(resource.id)}
                    className={`p-3 rounded-lg transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                      isFavorited 
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-label={isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
                  >
                    <Heart 
                      size={20} 
                      fill={isFavorited ? 'currentColor' : 'none'} 
                      strokeWidth={isFavorited ? 0 : 2}
                      className="transition-transform duration-200 hover:scale-110"
                    />
                  </button>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50">
                    {isFavorited ? 'Remove this resource from your Favorites list' : 'Save this resource to your Favorites list'}
                  </span>
                </div>
              )}

              {/* Upcoming Case Button - Available to all logged-in users */}
              {onToggleUpcomingCase && (
                <div className="group relative">
                <button
                  onClick={() => onToggleUpcomingCase(resource.id)}
                  className={`p-3 rounded-lg transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    isUpcomingCase
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  aria-label={isUpcomingCase ? 'Remove from Upcoming Cases' : 'Add to Upcoming Cases'}
                >
                  <Plus size={20} className={`transition-transform ${isUpcomingCase ? 'rotate-45' : ''}`} strokeWidth={2} />
                </button>
                <span className="absolute bottom-full right-0 mb-2 px-2 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50">
                  {isUpcomingCase ? 'Remove this resource from your Upcoming Cases list' : 'Add this resource to your Upcoming Cases for a future procedure'}
                </span>
                </div>
              )}

              {/* Add to Calendar Button - Available to all logged-in users with calendar connected */}
              {currentUser && isCalendarConnected && (
                <div className="group relative">
                  {calendarEvent ? (
                    // Show scheduled state with delete option
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShowCalendarModal(true)}
                        className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                        aria-label="View calendar event"
                      >
                        <Calendar size={20} fill="currentColor" />
                      </button>
                      <button
                        onClick={handleDeleteCalendarEvent}
                        disabled={deletingCalendarEvent}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
                        aria-label="Remove from calendar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    // Show add to calendar button
                    <button
                      onClick={() => setShowCalendarModal(true)}
                      className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                      aria-label="Add to calendar"
                    >
                      <Calendar size={20} />
                    </button>
                  )}
                  <span className="absolute bottom-full right-0 mb-2 px-2 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50">
                    {calendarEvent ? `On calendar: ${formatCalendarEventDisplay()}` : 'Schedule this resource review on your calendar'}
                  </span>
                </div>
              )}

              {/* Contact Rep Button - Shows when resource has product_name AND company is active */}
              {resource.product_name && resource.company_name && companyIsActive && onContactRep && (
                <div className="group relative">
                  <button
                    type="button"
                    onClick={() => onContactRep(resource)}
                    className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    aria-label="Contact company representative"
                  >
                    <MessageSquare size={20} />
                  </button>
                  <span className="absolute bottom-full right-0 mb-2 px-2 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50">
                    Contact {resource.company_name} rep about {resource.product_name}
                  </span>
                </div>
              )}

              {/* Report Link — flag only */}
              <div className="group relative">
                <button
                  type="button"
                  onClick={() => onReportResource?.(resource)}
                  className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/20 dark:hover:text-amber-400 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  aria-label="Report link"
                >
                  <Flag size={20} />
                </button>
                <span className="absolute bottom-full right-0 mb-2 px-2 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50">
                  Report this link — report a problem or copyright concern
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

      {showCalendarModal && (
        <CalendarEventModal
          resource={resource}
          userNote={note}
          onClose={() => setShowCalendarModal(false)}
          onSuccess={() => {
            // Modal will close automatically on success
          }}
          onCreateEvent={onCreateCalendarEvent}
          connections={calendarConnections}
        />
      )}
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
  prevProps.onReportResource === nextProps.onReportResource &&
  prevProps.onContactRep === nextProps.onContactRep &&
  prevProps.companyIsActive === nextProps.companyIsActive &&
  prevProps.calendarEvent?.id === nextProps.calendarEvent?.id &&
  prevProps.isCalendarConnected === nextProps.isCalendarConnected &&
  prevProps.calendarConnections?.length === nextProps.calendarConnections?.length
));

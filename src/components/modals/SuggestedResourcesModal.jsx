/**
 * SuggestedResourcesModal Component
 * Admin modal for reviewing and approving/rejecting resource suggestions
 * 
 * Extracted from App.jsx as part of refactoring effort
 */

import { useState } from 'react';
import { Video, FileText, Link, X, Sparkles, ArrowRight, Edit } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../utils/helpers';
import { RESOURCE_TYPES } from '../../utils/constants';
import EditSuggestionModal from '../admin/EditSuggestionModal';

/**
 * SuggestedResourcesModal Component
 * 
 * @param {Object} props
 * @param {Array} props.suggestions - Array of resource suggestions
 * @param {Function} props.onApprove - Callback to approve a suggestion
 * @param {Function} props.onReject - Callback to reject a suggestion
 * @param {Function} props.onUpdate - Callback to update a suggestion
 * @param {Function} props.onClose - Callback to close modal
 * @param {Object} props.currentUser - Current user object
 */
function groupSuggestions(suggestions, role) {
  // Group by specialty → subspecialty for super_admin
  // Group by subspecialty only for specialty_admin
  const groups = {};

  suggestions.forEach(s => {
    const specialtyName = s.user_specialty?.name || 'Unknown Specialty';
    const subspecialtyName = s.user_subspecialty?.name || 'Unknown Subspecialty';

    if (role === 'super_admin') {
      if (!groups[specialtyName]) groups[specialtyName] = {};
      if (!groups[specialtyName][subspecialtyName]) groups[specialtyName][subspecialtyName] = [];
      groups[specialtyName][subspecialtyName].push(s);
    } else {
      // specialty_admin: flat by subspecialty
      if (!groups[subspecialtyName]) groups[subspecialtyName] = [];
      groups[subspecialtyName].push(s);
    }
  });

  return groups;
}

export default function SuggestedResourcesModal({
  suggestions,
  onApprove,
  onReject,
  onUpdate,
  onClose,
  currentUser
}) {
  const [editingSuggestion, setEditingSuggestion] = useState(null);
  const pendingSuggestions = suggestions?.filter(s => s.status === 'pending') || [];
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const grouped = groupSuggestions(pendingSuggestions, currentUser?.role);

  const handleEdit = (suggestion) => {
    setEditingSuggestion(suggestion);
  };

  const handleSaveEdit = async (updatedData) => {
    try {
      await onUpdate(editingSuggestion.id, updatedData);
      setEditingSuggestion(null);
    } catch (error) {
      // Error already handled in onUpdate, just close modal on success
      console.error('Error saving edit:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingSuggestion(null);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case RESOURCE_TYPES.VIDEO: return <Video size={16} />;
      case RESOURCE_TYPES.ARTICLE: return <FileText size={16} />;
      case RESOURCE_TYPES.LINK: return <Link size={16} />;
      default: return <FileText size={16} />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case RESOURCE_TYPES.VIDEO: return 'from-red-500 to-pink-500';
      case RESOURCE_TYPES.ARTICLE: return 'from-blue-500 to-cyan-500';
      case RESOURCE_TYPES.LINK: return 'from-green-500 to-emerald-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Suggested Resources
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {pendingSuggestions.length} {pendingSuggestions.length === 1 ? 'resource' : 'resources'} pending review
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close suggested resources modal"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {pendingSuggestions.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">No pending suggestions</p>
          </div>
        ) : isSuperAdmin ? (
          // Super admin: grouped by specialty → subspecialty
          <div className="space-y-6">
            {Object.entries(grouped).map(([specialtyName, subspecialties]) => {
              const specialtyTotal = Object.values(subspecialties).reduce((sum, arr) => sum + arr.length, 0);
              return (
                <div key={specialtyName}>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    {specialtyName}
                    <span className="text-sm font-normal px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full">{specialtyTotal}</span>
                  </h3>
                  {Object.entries(subspecialties).map(([subspecialtyName, subs]) => (
                    <div key={subspecialtyName} className="mb-4 ml-4">
                      <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                        {subspecialtyName}
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs">{subs.length}</span>
                      </h4>
                      <div className="space-y-4">
                        {subs.map((suggestion) => (
              <div
                key={suggestion.id}
                className="glass rounded-xl p-4 sm:p-6 border-2 border-purple-200 dark:border-purple-800"
              >
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  {/* Image */}
                  <div className="w-full sm:w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                    {suggestion.image_url ? (
                      <img
                        src={suggestion.image_url}
                        alt={suggestion.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <FileText size={32} className="text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r ${getTypeColor(suggestion.resource_type)} rounded-lg text-white text-xs font-medium`}>
                            {getTypeIcon(suggestion.resource_type)}
                            <span className="capitalize">{suggestion.resource_type}</span>
                          </div>
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                          {suggestion.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                          {suggestion.description}
                        </p>
                        <a
                          href={suggestion.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm break-all flex items-center gap-1 mb-3"
                        >
                          <span>{suggestion.url}</span>
                          <ArrowRight size={14} />
                        </a>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Suggested by: {suggestion.suggested_by_profile?.email || 'Unknown'} • {formatDate(suggestion.created_at)}
                        </div>
                        {suggestion.suggested_category_name && (
                          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                              📝 Suggested Category:
                            </p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                              "{suggestion.suggested_category_name}"
                            </p>
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                              Admin: Create this category if you approve the resource
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleEdit(suggestion)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                        aria-label={`Edit suggestion: ${suggestion.title}`}
                      >
                        <Edit size={16} />
                        Edit
                      </button>
                      <button
                        onClick={() => onApprove(suggestion.id)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        aria-label={`Approve suggestion: ${suggestion.title}`}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onReject(suggestion.id)}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                        aria-label={`Reject suggestion: ${suggestion.title}`}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          // Specialty admin: grouped by subspecialty
          <div className="space-y-6">
            {Object.entries(grouped).map(([subspecialtyName, subs]) => (
              <div key={subspecialtyName}>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  {subspecialtyName}
                  <span className="text-sm font-normal px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full">{subs.length}</span>
                </h3>
                <div className="space-y-4">
                  {subs.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="glass rounded-xl p-4 sm:p-6 border-2 border-purple-200 dark:border-purple-800"
                    >
                      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                        <div className="w-full sm:w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                          {suggestion.image_url ? (
                            <img src={suggestion.image_url} alt={suggestion.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                              <FileText size={32} className="text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r ${getTypeColor(suggestion.resource_type)} rounded-lg text-white text-xs font-medium`}>
                                  {getTypeIcon(suggestion.resource_type)}
                                  <span className="capitalize">{suggestion.resource_type}</span>
                                </div>
                              </div>
                              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">{suggestion.title}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{suggestion.description}</p>
                              <a href={suggestion.url} target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm break-all flex items-center gap-1 mb-3">
                                <span>{suggestion.url}</span>
                                <ArrowRight size={14} />
                              </a>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                Suggested by: {suggestion.suggested_by_profile?.email || 'Unknown'} • {formatDate(suggestion.created_at)}
                              </div>
                              {suggestion.suggested_category_name && (
                                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                  <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-1">📝 Suggested Category:</p>
                                  <p className="text-sm text-yellow-700 dark:text-yellow-300">"{suggestion.suggested_category_name}"</p>
                                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Admin: Create this category if you approve the resource</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <button onClick={() => handleEdit(suggestion)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2" aria-label={`Edit suggestion: ${suggestion.title}`}>
                              <Edit size={16} />
                              Edit
                            </button>
                            <button onClick={() => onApprove(suggestion.id)} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium" aria-label={`Approve suggestion: ${suggestion.title}`}>
                              Approve
                            </button>
                            <button onClick={() => onReject(suggestion.id)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium" aria-label={`Reject suggestion: ${suggestion.title}`}>
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingSuggestion && (
        <EditSuggestionModal
          suggestion={editingSuggestion}
          onSave={handleSaveEdit}
          onClose={handleCancelEdit}
        />
      )}
    </div>
  );
}

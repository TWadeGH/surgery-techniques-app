/**
 * ReportResourceModal (Report Link)
 * DMCA-friendly: report general concerns or copyright infringement.
 * Auto-fills resource title and URL; report type and comment stored.
 */

import { useState } from 'react';
import { X, Flag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { VALIDATION } from '../../utils/constants';

const REPORT = VALIDATION.REPORT;
import { useToast } from '../common';

const REPORT_TYPES = [
  { value: 'general', label: 'General concern' },
  { value: 'copyright', label: 'Copyright infringement' },
];

export default function ReportResourceModal({ resource, onClose, onSuccess, currentUser }) {
  const toast = useToast();
  const [reportType, setReportType] = useState('general');
  const [reportText, setReportText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = reportText.trim();
    if (!trimmed) {
      toast.error('Please enter a description of your concern.');
      return;
    }
    if (trimmed.length > REPORT.MAX_LENGTH) {
      toast.error(REPORT.MESSAGE);
      return;
    }
    if (!currentUser?.id || !resource?.id) {
      toast.error('Unable to submit report. Please try again.');
      return;
    }

    const prefix = reportType === 'copyright' ? '[Copyright infringement] ' : '[General concern] ';
    const fullText = prefix + trimmed;

    setSubmitting(true);
    try {
      let resourceSpecialtyId = null;
      let resourceSubspecialtyId = null;

      if (resource.category_id) {
        const { data: category } = await supabase
          .from('categories')
          .select('subspecialty_id')
          .eq('id', resource.category_id)
          .maybeSingle();
        if (category?.subspecialty_id) {
          resourceSubspecialtyId = category.subspecialty_id;
          const { data: sub } = await supabase
            .from('subspecialties')
            .select('specialty_id')
            .eq('id', category.subspecialty_id)
            .maybeSingle();
          if (sub?.specialty_id) resourceSpecialtyId = sub.specialty_id;
        }
      }

      const { error } = await supabase.from('resource_reports').insert({
        resource_id: resource.id,
        reported_by: currentUser.id,
        report_text: fullText,
        status: 'pending',
        resource_specialty_id: resourceSpecialtyId,
        resource_subspecialty_id: resourceSubspecialtyId,
      });

      if (error) throw error;
      toast.success('Report submitted. An admin will review it.');
      onSuccess?.();
      onClose();
    } catch {
      toast.error('Unable to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="report-link-title">
      <div className="glass rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 id="report-link-title" className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Flag size={22} className="text-amber-500" />
            Report Link
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm">
          <p className="font-medium text-gray-700 dark:text-gray-200 mb-1">Resource</p>
          {resource?.title && <p className="text-gray-600 dark:text-gray-300 break-words">{resource.title}</p>}
          {resource?.url && <p className="text-gray-500 dark:text-gray-400 break-all mt-1 text-xs">{resource.url}</p>}
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Report type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full p-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-white mb-4"
          >
            {REPORT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <label htmlFor="report-concerns" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Please describe your concern (required)
          </label>
          <textarea
            id="report-concerns"
            value={reportText}
            onChange={(e) => setReportText(e.target.value.slice(0, REPORT.MAX_LENGTH))}
            placeholder={reportType === 'copyright' ? 'Describe the copyright concern…' : 'Describe the issue…'}
            className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:border-purple-500 focus:outline-none transition-colors dark:bg-gray-800 dark:text-white"
            rows={4}
            maxLength={REPORT.MAX_LENGTH}
            disabled={submitting}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-500">{reportText.length} / {REPORT.MAX_LENGTH}</span>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reportText.trim()}
              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

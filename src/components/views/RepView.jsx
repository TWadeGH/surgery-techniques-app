/**
 * RepView Component
 *
 * Main view for company representatives (Rep Platform).
 * Shows inquiries for the rep's company(s).
 */

import React, { useState, useMemo, memo } from 'react';
import { MessageSquare, Filter, Calendar, Building2, RefreshCw } from 'lucide-react';
import { useRepPlatform } from '../../hooks/useRepPlatform';
import { INQUIRY_STATUSES } from '../../utils/constants';
import RepInquiriesList from '../rep/RepInquiriesList';
import InquiryDetailModal from '../rep/InquiryDetailModal';

/**
 * RepView Component
 *
 * @param {Object} props
 * @param {Object} props.currentUser - Current user object
 * @param {Array} props.repCompanies - Array of companies the user represents
 */
function RepView({ currentUser, repCompanies = [] }) {
  const [selectedInquiry, setSelectedInquiry] = useState(null);

  const {
    inquiries,
    loading,
    error,
    filters,
    inquiryCounts,
    loadInquiries,
    updateInquiryStatus,
    updateInquiryNotes,
    updateFilter,
    resetFilters
  } = useRepPlatform(repCompanies);

  // Get unique company names for display
  const companyNames = useMemo(() =>
    repCompanies.map(c => c.companyName).join(', '),
    [repCompanies]
  );

  const handleInquiryClick = (inquiry) => {
    setSelectedInquiry(inquiry);
  };

  const handleStatusChange = async (inquiryId, status) => {
    const result = await updateInquiryStatus(inquiryId, status);
    if (!result.success) {
      console.error('Failed to update status:', result.error);
    }
  };

  const handleNotesChange = async (inquiryId, notes) => {
    const result = await updateInquiryNotes(inquiryId, notes);
    if (!result.success) {
      console.error('Failed to update notes:', result.error);
    }
  };

  return (
    <div className="animate-slide-up">
      {/* Welcome Header */}
      <div className="glass rounded-2xl p-6 shadow-lg mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Building2 size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Rep Platform
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Welcome, {currentUser?.email?.split('@')[0] || 'Rep'}
                {companyNames && (
                  <span className="ml-1">({companyNames})</span>
                )}
              </p>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadInquiries}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {inquiryCounts.total}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
          </div>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl text-center">
            <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">
              {inquiryCounts.new}
            </p>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">New</p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
              {inquiryCounts.in_progress}
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400">In Progress</p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
            <p className="text-3xl font-bold text-green-700 dark:text-green-300">
              {inquiryCounts.completed}
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">Completed</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 shadow-lg mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
            <Filter size={18} />
            <span className="font-medium">Filters:</span>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="px-3 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value={INQUIRY_STATUSES.NEW}>New</option>
              <option value={INQUIRY_STATUSES.IN_PROGRESS}>In Progress</option>
              <option value={INQUIRY_STATUSES.COMPLETED}>Completed</option>
              <option value={INQUIRY_STATUSES.DISMISSED}>Dismissed</option>
            </select>

            {/* Company Filter (if rep has multiple companies) */}
            {repCompanies.length > 1 && (
              <select
                value={filters.companyId}
                onChange={(e) => updateFilter('companyId', e.target.value)}
                className="px-3 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
              >
                <option value="all">All Companies</option>
                {repCompanies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.companyName}
                  </option>
                ))}
              </select>
            )}

            {/* Date Range Filter */}
            <select
              value={filters.dateRange}
              onChange={(e) => updateFilter('dateRange', e.target.value)}
              className="px-3 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>

            {/* Reset Filters */}
            {(filters.status !== 'all' || filters.companyId !== 'all' || filters.dateRange !== 'all') && (
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-purple-600 dark:text-purple-400 text-sm font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inquiries List */}
      <div className="glass rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare size={20} className="text-purple-600 dark:text-purple-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Your Inquiries
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({inquiries.length})
          </span>
        </div>

        {error ? (
          <div className="text-center py-12">
            <p className="text-red-500 dark:text-red-400">Error loading inquiries: {error}</p>
            <button
              onClick={loadInquiries}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <RepInquiriesList
            inquiries={inquiries}
            loading={loading}
            onInquiryClick={handleInquiryClick}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      {/* Inquiry Detail Modal */}
      {selectedInquiry && (
        <InquiryDetailModal
          inquiry={selectedInquiry}
          onClose={() => setSelectedInquiry(null)}
          onStatusChange={handleStatusChange}
          onNotesChange={handleNotesChange}
        />
      )}
    </div>
  );
}

export default memo(RepView);

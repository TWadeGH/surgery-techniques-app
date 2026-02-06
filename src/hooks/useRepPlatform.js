/**
 * useRepPlatform Hook
 *
 * Manages the Rep Platform view for company representatives.
 * Loads and manages inquiries for the rep's company(s).
 *
 * @example
 * const { inquiries, loading, updateInquiryStatus } = useRepPlatform(repCompanies);
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { INQUIRY_STATUSES } from '../utils/constants';

/**
 * Hook for managing rep platform functionality
 * @param {Array} repCompanies - Array of companies the rep has access to
 * @param {Object} options - Configuration options
 * @returns {Object} Rep platform state and methods
 */
export function useRepPlatform(repCompanies = [], options = {}) {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all', // 'all', 'new', 'in_progress', 'completed', 'dismissed'
    companyId: 'all', // 'all' or specific company UUID
    dateRange: 'all' // 'all', 'today', 'week', 'month'
  });

  // Get company IDs from repCompanies
  const companyIds = useMemo(() =>
    repCompanies.map(c => c.id),
    [repCompanies]
  );

  /**
   * Load inquiries for the rep's companies
   */
  const loadInquiries = useCallback(async () => {
    if (companyIds.length === 0) {
      setInquiries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('rep_inquiries')
        .select(`
          *,
          subspecialty_companies(
            id,
            company_name,
            subspecialty_id
          ),
          resources(
            id,
            title,
            product_name,
            company_name
          )
        `)
        .in('subspecialty_company_id', companyIds)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform data
      const transformedInquiries = (data || []).map(inquiry => ({
        ...inquiry,
        companyName: inquiry.subspecialty_companies?.company_name,
        resourceTitle: inquiry.resources?.title,
        productName: inquiry.product_name || inquiry.resources?.product_name
      }));

      setInquiries(transformedInquiries);
    } catch (err) {
      console.error('Error loading inquiries:', err);
      setError(err.message);
      setInquiries([]);
    } finally {
      setLoading(false);
    }
  }, [companyIds]);

  // Load inquiries when companies change
  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  /**
   * Filter inquiries based on current filters
   */
  const filteredInquiries = useMemo(() => {
    let result = [...inquiries];

    // Filter by status
    if (filters.status !== 'all') {
      result = result.filter(i => i.status === filters.status);
    }

    // Filter by company
    if (filters.companyId !== 'all') {
      result = result.filter(i => i.subspecialty_company_id === filters.companyId);
    }

    // Filter by date range
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let startDate;

      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        result = result.filter(i => new Date(i.created_at) >= startDate);
      }
    }

    return result;
  }, [inquiries, filters]);

  /**
   * Get inquiry counts by status
   */
  const inquiryCounts = useMemo(() => {
    const counts = {
      total: inquiries.length,
      new: 0,
      in_progress: 0,
      completed: 0,
      dismissed: 0
    };

    inquiries.forEach(inquiry => {
      if (counts[inquiry.status] !== undefined) {
        counts[inquiry.status]++;
      }
    });

    return counts;
  }, [inquiries]);

  /**
   * Update inquiry status
   * @param {string} inquiryId - Inquiry UUID
   * @param {string} status - New status
   */
  const updateInquiryStatus = useCallback(async (inquiryId, status) => {
    try {
      // Validate status
      const validStatuses = Object.values(INQUIRY_STATUSES);
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
      }

      const { error } = await supabase
        .from('rep_inquiries')
        .update({ status })
        .eq('id', inquiryId);

      if (error) throw error;

      // Update local state
      setInquiries(prev =>
        prev.map(i => i.id === inquiryId ? { ...i, status } : i)
      );

      return { success: true };
    } catch (err) {
      console.error('Error updating inquiry status:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Add notes to an inquiry
   * @param {string} inquiryId - Inquiry UUID
   * @param {string} notes - Rep notes
   */
  const updateInquiryNotes = useCallback(async (inquiryId, notes) => {
    try {
      const { error } = await supabase
        .from('rep_inquiries')
        .update({ rep_notes: notes })
        .eq('id', inquiryId);

      if (error) throw error;

      // Update local state
      setInquiries(prev =>
        prev.map(i => i.id === inquiryId ? { ...i, rep_notes: notes } : i)
      );

      return { success: true };
    } catch (err) {
      console.error('Error updating inquiry notes:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Get a single inquiry by ID
   * @param {string} inquiryId - Inquiry UUID
   */
  const getInquiry = useCallback(async (inquiryId) => {
    try {
      const { data, error } = await supabase
        .from('rep_inquiries')
        .select(`
          *,
          subspecialty_companies(
            id,
            company_name,
            subspecialty_id
          ),
          resources(
            id,
            title,
            product_name,
            company_name,
            url
          )
        `)
        .eq('id', inquiryId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          ...data,
          companyName: data.subspecialty_companies?.company_name,
          resourceTitle: data.resources?.title,
          productName: data.product_name || data.resources?.product_name,
          resourceUrl: data.resources?.url
        }
      };
    } catch (err) {
      console.error('Error getting inquiry:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Update filter
   * @param {string} filterKey - Filter key
   * @param {any} value - Filter value
   */
  const updateFilter = useCallback((filterKey, value) => {
    setFilters(prev => ({ ...prev, [filterKey]: value }));
  }, []);

  /**
   * Reset all filters
   */
  const resetFilters = useCallback(() => {
    setFilters({
      status: 'all',
      companyId: 'all',
      dateRange: 'all'
    });
  }, []);

  return {
    // State
    inquiries: filteredInquiries,
    allInquiries: inquiries,
    loading,
    error,
    filters,
    inquiryCounts,

    // Methods
    loadInquiries,
    updateInquiryStatus,
    updateInquiryNotes,
    getInquiry,
    updateFilter,
    resetFilters
  };
}

export default useRepPlatform;

/**
 * useSubspecialtyCompanies Hook
 *
 * Manages subspecialty companies and their contacts for admin users.
 * Provides CRUD operations for companies and contacts.
 *
 * @example
 * const { companies, contacts, loading, addContact, removeContact } = useSubspecialtyCompanies(subspecialtyId);
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook for managing subspecialty companies and contacts
 * @param {string} subspecialtyId - Filter companies by subspecialty (optional)
 * @param {Object} options - Configuration options
 * @returns {Object} Companies state and methods
 */
export function useSubspecialtyCompanies(subspecialtyId = null, options = {}) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Load companies with contact counts and inquiry stats
   */
  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('subspecialty_companies')
        .select(`
          id,
          subspecialty_id,
          company_name,
          created_at,
          updated_at,
          subspecialties(id, name),
          subspecialty_company_contacts(id, email, name, phone)
        `)
        .order('company_name');

      if (subspecialtyId) {
        query = query.eq('subspecialty_id', subspecialtyId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transform data to include computed fields
      const companiesWithStats = await Promise.all((data || []).map(async (company) => {
        // Get inquiry count for this company
        const { count: inquiryCount } = await supabase
          .from('rep_inquiries')
          .select('id', { count: 'exact', head: true })
          .eq('subspecialty_company_id', company.id);

        return {
          ...company,
          contactCount: company.subspecialty_company_contacts?.length || 0,
          contacts: company.subspecialty_company_contacts || [],
          isActive: (company.subspecialty_company_contacts?.length || 0) > 0,
          inquiryCount: inquiryCount || 0,
          subspecialtyName: company.subspecialties?.name
        };
      }));

      setCompanies(companiesWithStats);
    } catch (err) {
      console.error('Error loading companies:', err);
      setError(err.message);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, [subspecialtyId]);

  // Load companies on mount and when subspecialtyId changes
  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  /**
   * Add a new contact to a company
   * @param {string} companyId - Company UUID
   * @param {Object} contactData - Contact data { email, name?, phone? }
   */
  const addContact = useCallback(async (companyId, contactData) => {
    try {
      const { email, name, phone } = contactData;

      if (!email || !email.trim()) {
        throw new Error('Email is required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        throw new Error('Invalid email format');
      }

      const { data, error } = await supabase
        .from('subspecialty_company_contacts')
        .insert({
          subspecialty_company_id: companyId,
          email: email.trim().toLowerCase(),
          name: name?.trim() || null,
          phone: phone?.trim() || null
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('This email is already a contact for this company');
        }
        throw error;
      }

      // Reload companies to update counts
      await loadCompanies();

      return { success: true, data };
    } catch (err) {
      console.error('Error adding contact:', err);
      return { success: false, error: err.message };
    }
  }, [loadCompanies]);

  /**
   * Update an existing contact
   * @param {string} contactId - Contact UUID
   * @param {Object} contactData - Updated contact data
   */
  const updateContact = useCallback(async (contactId, contactData) => {
    try {
      const { name, phone } = contactData;

      const { data, error } = await supabase
        .from('subspecialty_company_contacts')
        .update({
          name: name?.trim() || null,
          phone: phone?.trim() || null
        })
        .eq('id', contactId)
        .select()
        .single();

      if (error) throw error;

      // Reload companies to update
      await loadCompanies();

      return { success: true, data };
    } catch (err) {
      console.error('Error updating contact:', err);
      return { success: false, error: err.message };
    }
  }, [loadCompanies]);

  /**
   * Remove a contact from a company
   * @param {string} contactId - Contact UUID
   */
  const removeContact = useCallback(async (contactId) => {
    try {
      const { error } = await supabase
        .from('subspecialty_company_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      // Reload companies to update counts
      await loadCompanies();

      return { success: true };
    } catch (err) {
      console.error('Error removing contact:', err);
      return { success: false, error: err.message };
    }
  }, [loadCompanies]);

  /**
   * Create a new company manually (usually auto-created via trigger)
   * @param {Object} companyData - { subspecialty_id, company_name }
   */
  const createCompany = useCallback(async (companyData) => {
    try {
      const { subspecialty_id, company_name } = companyData;

      if (!company_name?.trim()) {
        throw new Error('Company name is required');
      }

      const { data, error } = await supabase
        .from('subspecialty_companies')
        .insert({
          subspecialty_id,
          company_name: company_name.trim()
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('This company already exists for this subspecialty');
        }
        throw error;
      }

      await loadCompanies();

      return { success: true, data };
    } catch (err) {
      console.error('Error creating company:', err);
      return { success: false, error: err.message };
    }
  }, [loadCompanies]);

  /**
   * Delete a company (cascades to contacts)
   * @param {string} companyId - Company UUID
   */
  const deleteCompany = useCallback(async (companyId) => {
    try {
      const { error } = await supabase
        .from('subspecialty_companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;

      await loadCompanies();

      return { success: true };
    } catch (err) {
      console.error('Error deleting company:', err);
      return { success: false, error: err.message };
    }
  }, [loadCompanies]);

  /**
   * Get contacts for a specific company
   * @param {string} companyId - Company UUID
   */
  const getCompanyContacts = useCallback(async (companyId) => {
    try {
      const { data, error } = await supabase
        .from('subspecialty_company_contacts')
        .select('*')
        .eq('subspecialty_company_id', companyId)
        .order('created_at');

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (err) {
      console.error('Error getting contacts:', err);
      return { success: false, error: err.message, data: [] };
    }
  }, []);

  /**
   * Get inquiry history for a company
   * @param {string} companyId - Company UUID
   */
  const getCompanyInquiries = useCallback(async (companyId) => {
    try {
      const { data, error } = await supabase
        .from('rep_inquiries')
        .select('*')
        .eq('subspecialty_company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (err) {
      console.error('Error getting inquiries:', err);
      return { success: false, error: err.message, data: [] };
    }
  }, []);

  /**
   * Check if a company is active (has at least one contact)
   * @param {string} companyId - Company UUID
   */
  const isCompanyActive = useCallback((companyId) => {
    const company = companies.find(c => c.id === companyId);
    return company?.isActive || false;
  }, [companies]);

  /**
   * Search companies by name
   * @param {string} searchTerm - Search term
   */
  const searchCompanies = useCallback((searchTerm) => {
    if (!searchTerm?.trim()) return companies;
    const term = searchTerm.toLowerCase().trim();
    return companies.filter(c =>
      c.company_name.toLowerCase().includes(term)
    );
  }, [companies]);

  return {
    // State
    companies,
    loading,
    error,

    // Methods
    loadCompanies,
    createCompany,
    deleteCompany,
    addContact,
    updateContact,
    removeContact,
    getCompanyContacts,
    getCompanyInquiries,
    isCompanyActive,
    searchCompanies
  };
}

export default useSubspecialtyCompanies;

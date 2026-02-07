/**
 * ContactRepModal Component
 *
 * Modal for submitting an inquiry to a company representative.
 */

import React, { useState, useEffect, memo } from 'react';
import { X, MessageSquare, Send, User, Mail, MapPin, Package, Building2, Globe, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../common';

// Common countries list
const COUNTRIES = [
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Netherlands',
  'Belgium',
  'Switzerland',
  'Austria',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Poland',
  'Czech Republic',
  'Ireland',
  'Portugal',
  'Greece',
  'Mexico',
  'Brazil',
  'Argentina',
  'Chile',
  'Japan',
  'South Korea',
  'China',
  'India',
  'Singapore',
  'New Zealand',
  'South Africa',
  'Israel',
  'United Arab Emirates',
  'Saudi Arabia',
  'Turkey',
  'Other'
];

/**
 * ContactRepModal Component
 *
 * @param {Object} props
 * @param {Object} props.resource - Resource object being inquired about
 * @param {Object} props.currentUser - Current user object
 * @param {Function} props.onClose - Callback when modal closes
 * @param {Function} props.onSuccess - Callback on successful submission
 */
function ContactRepModal({
  resource,
  currentUser,
  onClose,
  onSuccess
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState(null);
  const [formData, setFormData] = useState({
    userName: '',
    userEmail: currentUser?.email || '',
    country: 'United States',
    city: '',
    state: '',
    cellPhone: '',
    message: 'Please have a rep from your company contact me about this product.'
  });

  // Look up the subspecialty_company_id when modal opens
  useEffect(() => {
    async function lookupCompany() {
      if (!resource?.company_name || !resource?.category_id) return;

      try {
        // Get the subspecialty_id from the resource's category
        const { data: category } = await supabase
          .from('categories')
          .select('subspecialty_id')
          .eq('id', resource.category_id)
          .single();

        if (!category?.subspecialty_id) return;

        // Look up the company in subspecialty_companies
        const { data: company } = await supabase
          .from('subspecialty_companies')
          .select('id')
          .eq('subspecialty_id', category.subspecialty_id)
          .eq('company_name', resource.company_name)
          .single();

        if (company?.id) {
          setCompanyId(company.id);
        }
      } catch (error) {
        console.error('Error looking up company:', error);
      }
    }

    lookupCompany();
  }, [resource?.company_name, resource?.category_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!companyId) {
      toast.error('Company information not found. Please try again later.');
      return;
    }

    if (!formData.userName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!formData.userEmail.trim()) {
      toast.error('Please enter your email');
      return;
    }

    // Validate US-specific fields if country is United States
    if (formData.country === 'United States') {
      if (!formData.city.trim()) {
        toast.error('Please enter your city');
        return;
      }
      if (!formData.state.trim()) {
        toast.error('Please enter your state');
        return;
      }
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('rep_inquiries')
        .insert({
          subspecialty_company_id: companyId,
          resource_id: resource.id,
          user_id: currentUser.id,
          user_name: formData.userName.trim(),
          user_email: formData.userEmail.trim(),
          user_country: formData.country,
          user_city: formData.city.trim() || null,
          user_state: formData.state.trim() || null,
          user_phone: formData.cellPhone.trim() || null,
          product_name: resource.product_name,
          message: formData.message.trim() || null,
          status: 'new'
        });

      if (error) throw error;

      toast.success('Your inquiry has been sent to the company representative!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      toast.error('Failed to submit inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-rep-modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <MessageSquare size={20} className="text-white" />
              </div>
              <div>
                <h2 id="contact-rep-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                  Contact Rep
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Send inquiry to {resource?.company_name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Product Info */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div className="flex items-center gap-3">
                <Package size={20} className="text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {resource?.product_name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {resource?.company_name}
                  </p>
                </div>
              </div>
            </div>

            {/* Your Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Your Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.userName}
                  onChange={(e) => setFormData(prev => ({ ...prev, userName: e.target.value }))}
                  placeholder="Dr. John Smith"
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={formData.userEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, userEmail: e.target.value }))}
                  placeholder="john.smith@hospital.com"
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Country <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Globe size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value, city: '', state: '' }))}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none appearance-none"
                  required
                >
                  {COUNTRIES.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* City and State - Only for United States */}
            {formData.country === 'United States' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Denver"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="CO"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
                    required
                  />
                </div>
              </div>
            )}

            {/* Cell Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cell Phone <span className="text-gray-400">(optional)</span>
              </label>
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={formData.cellPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, cellPhone: e.target.value }))}
                  placeholder="(555) 123-4567"
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Message <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="I'm interested in learning more about this product for use in my practice..."
                rows={4}
                className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none resize-none"
              />
            </div>

            {/* Privacy note */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your contact information will be shared with the company representative to respond to your inquiry.
            </p>
          </form>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || !companyId}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send Inquiry
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ContactRepModal);

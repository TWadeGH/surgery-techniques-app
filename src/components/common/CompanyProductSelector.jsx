/**
 * CompanyProductSelector Component
 *
 * Provides autocomplete for company names and input for product names
 * Used in Add/Edit/Suggest Resource modals
 *
 * Features:
 * - Autocomplete company names from subspecialty_companies table
 * - Free text input for product name
 * - Optional - fields can be left empty
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function CompanyProductSelector({
  companyName = '',
  productName = '',
  onCompanyChange,
  onProductChange,
  subspecialtyId = null,
}) {
  const [companySuggestions, setCompanySuggestions] = useState([]);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Load company suggestions when subspecialty changes or user types
  useEffect(() => {
    if (subspecialtyId && companyName.length >= 2) {
      loadCompanySuggestions(subspecialtyId, companyName);
    } else {
      setCompanySuggestions([]);
    }
  }, [subspecialtyId, companyName]);

  async function loadCompanySuggestions(subspecialtyId, searchTerm) {
    try {
      setLoadingSuggestions(true);
      const { data, error } = await supabase
        .from('subspecialty_companies')
        .select('company_name')
        .eq('subspecialty_id', subspecialtyId)
        .ilike('company_name', `%${searchTerm}%`)
        .order('company_name')
        .limit(10);

      if (error) throw error;

      setCompanySuggestions(data || []);
    } catch (err) {
      console.error('Error loading company suggestions:', err);
      setCompanySuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  function handleCompanySelect(selectedCompany) {
    onCompanyChange(selectedCompany);
    setShowCompanySuggestions(false);
  }

  return (
    <div className="space-y-4">
      {/* Company Name - Optional with Autocomplete */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Company Name (Optional)
        </label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => {
            onCompanyChange(e.target.value);
            setShowCompanySuggestions(true);
          }}
          onFocus={() => setShowCompanySuggestions(true)}
          onBlur={() => {
            // Delay to allow click on suggestion
            setTimeout(() => setShowCompanySuggestions(false), 200);
          }}
          placeholder="e.g., Stryker, Arthrex, Smith & Nephew"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />

        {/* Autocomplete Suggestions */}
        {showCompanySuggestions && companySuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {companySuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleCompanySelect(suggestion.company_name)}
                className="w-full px-4 py-2 text-left hover:bg-purple-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
              >
                {suggestion.company_name}
              </button>
            ))}
          </div>
        )}

        {loadingSuggestions && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Loading suggestions...
          </p>
        )}

        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          If this resource features a specific company's product, enter the company name. This enables the "Contact Rep" feature.
        </p>
      </div>

      {/* Product Name - Optional Free Text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Product Name (Optional)
        </label>
        <input
          type="text"
          value={productName}
          onChange={(e) => onProductChange(e.target.value)}
          placeholder="e.g., Mako System, Neptune 3, FiberWire Suture"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Specific product or implant featured in this resource.
        </p>
      </div>
    </div>
  );
}

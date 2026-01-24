/**
 * Input Component
 * Reusable form input with validation and error states
 * 
 * Production-grade form input component
 */

import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Input Component
 * 
 * @param {Object} props
 * @param {string} props.label - Input label
 * @param {string} props.error - Error message
 * @param {string} props.helperText - Helper text below input
 * @param {string} props.type - Input type
 * @param {boolean} props.required - Whether input is required
 * @param {boolean} props.disabled - Whether input is disabled
 * @param {string} props.placeholder - Placeholder text
 * @param {*} props.value - Input value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.icon - Icon to display (left side)
 * @param {React.ReactNode} props.rightIcon - Icon to display (right side)
 * @param {...Object} props - Additional HTML input props
 * @param {React.Ref} ref - Forwarded ref
 */
const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    type = 'text',
    required = false,
    disabled = false,
    placeholder,
    value,
    onChange,
    className = '',
    icon = null,
    rightIcon = null,
    ...props
  },
  ref
) {
  const hasError = !!error;
  
  const inputClasses = `
    w-full px-4 py-3 
    border-2 rounded-xl
    transition-colors
    focus:outline-none
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${icon ? 'pl-12' : ''}
    ${rightIcon ? 'pr-12' : ''}
    ${hasError 
      ? 'border-red-500 focus:border-red-600 text-red-900' 
      : 'border-gray-200 dark:border-gray-700 focus:border-purple-500'
    }
    bg-white dark:bg-gray-800
    text-gray-900 dark:text-white
    placeholder-gray-400 dark:placeholder-gray-500
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Left Icon */}
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}

        {/* Input */}
        <input
          ref={ref}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={inputClasses}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${props.id}-error` : 
            helperText ? `${props.id}-helper` : 
            undefined
          }
          {...props}
        />

        {/* Right Icon or Error Icon */}
        {hasError ? (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500">
            <AlertCircle size={20} />
          </div>
        ) : rightIcon ? (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        ) : null}
      </div>

      {/* Error Message */}
      {hasError && (
        <p
          id={`${props.id}-error`}
          className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Helper Text */}
      {!hasError && helperText && (
        <p
          id={`${props.id}-helper`}
          className="mt-1 text-xs text-gray-500 dark:text-gray-400"
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

export default Input;

/**
 * Textarea Component
 * Reusable textarea with similar styling to Input
 */
export const Textarea = forwardRef(function Textarea(
  {
    label,
    error,
    helperText,
    required = false,
    disabled = false,
    placeholder,
    value,
    onChange,
    rows = 4,
    className = '',
    maxLength,
    showCharCount = false,
    ...props
  },
  ref
) {
  const hasError = !!error;
  const charCount = value?.length || 0;
  
  const textareaClasses = `
    w-full px-4 py-3
    border-2 rounded-xl
    transition-colors
    focus:outline-none
    disabled:bg-gray-100 disabled:cursor-not-allowed
    resize-none
    ${hasError 
      ? 'border-red-500 focus:border-red-600 text-red-900' 
      : 'border-gray-200 dark:border-gray-700 focus:border-purple-500'
    }
    bg-white dark:bg-gray-800
    text-gray-900 dark:text-white
    placeholder-gray-400 dark:placeholder-gray-500
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {showCharCount && maxLength && (
            <span className="text-xs text-gray-500">
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={ref}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={textareaClasses}
        aria-invalid={hasError}
        aria-describedby={
          hasError ? `${props.id}-error` : 
          helperText ? `${props.id}-helper` : 
          undefined
        }
        {...props}
      />

      {/* Error Message */}
      {hasError && (
        <p
          id={`${props.id}-error`}
          className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
          role="alert"
        >
          <AlertCircle size={16} />
          {error}
        </p>
      )}

      {/* Helper Text */}
      {!hasError && helperText && (
        <p
          id={`${props.id}-helper`}
          className="mt-1 text-xs text-gray-500 dark:text-gray-400"
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

/**
 * Select Component
 * Reusable select dropdown with similar styling
 */
export const Select = forwardRef(function Select(
  {
    label,
    error,
    helperText,
    required = false,
    disabled = false,
    value,
    onChange,
    options = [],
    placeholder = 'Select an option...',
    className = '',
    ...props
  },
  ref
) {
  const hasError = !!error;
  
  const selectClasses = `
    w-full px-4 py-3
    border-2 rounded-xl
    transition-colors
    focus:outline-none
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${hasError 
      ? 'border-red-500 focus:border-red-600 text-red-900' 
      : 'border-gray-200 dark:border-gray-700 focus:border-purple-500'
    }
    bg-white dark:bg-gray-800
    text-gray-900 dark:text-white
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Select */}
      <select
        ref={ref}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={selectClasses}
        aria-invalid={hasError}
        {...props}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Error Message */}
      {hasError && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1" role="alert">
          <AlertCircle size={16} />
          {error}
        </p>
      )}

      {/* Helper Text */}
      {!hasError && helperText && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
});

/**
 * Button Component
 * Reusable button with multiple variants and states
 * 
 * Production-grade component with full customization
 */

import React from 'react';

/**
 * Button variants
 */
const VARIANTS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  DANGER: 'danger',
  GHOST: 'ghost',
  GRADIENT: 'gradient',
};

/**
 * Button sizes
 */
const SIZES = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
};

/**
 * Get variant styles
 */
function getVariantStyles(variant) {
  const styles = {
    [VARIANTS.PRIMARY]: 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500',
    [VARIANTS.SECONDARY]: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-400',
    [VARIANTS.DANGER]: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    [VARIANTS.GHOST]: 'bg-transparent border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400',
    [VARIANTS.GRADIENT]: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg focus:ring-purple-500',
  };
  
  return styles[variant] || styles[VARIANTS.PRIMARY];
}

/**
 * Get size styles
 */
function getSizeStyles(size) {
  const styles = {
    [SIZES.SM]: 'px-3 py-1.5 text-sm',
    [SIZES.MD]: 'px-4 py-2 text-base',
    [SIZES.LG]: 'px-6 py-3 text-lg',
  };
  
  return styles[size] || styles[SIZES.MD];
}

/**
 * Button Component
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.variant - Button variant (primary, secondary, danger, ghost, gradient)
 * @param {string} props.size - Button size (sm, md, lg)
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {boolean} props.loading - Whether button is in loading state
 * @param {boolean} props.fullWidth - Whether button takes full width
 * @param {Function} props.onClick - Click handler
 * @param {string} props.type - Button type (button, submit, reset)
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.icon - Icon component to display
 * @param {string} props.iconPosition - Icon position (left, right)
 * @param {...Object} props - Additional HTML button props
 */
export default function Button({
  children,
  variant = VARIANTS.PRIMARY,
  size = SIZES.MD,
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
  icon = null,
  iconPosition = 'left',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);
  const widthStyles = fullWidth ? 'w-full' : '';
  
  const allStyles = `${baseStyles} ${variantStyles} ${sizeStyles} ${widthStyles} ${className}`;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={allStyles}
      {...props}
    >
      {/* Loading Spinner */}
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      
      {/* Icon (Left) */}
      {!loading && icon && iconPosition === 'left' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
      
      {/* Children */}
      {children}
      
      {/* Icon (Right) */}
      {!loading && icon && iconPosition === 'right' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </button>
  );
}

// Export variants and sizes for external use
export { VARIANTS, SIZES };

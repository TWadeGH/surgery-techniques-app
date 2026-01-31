/**
 * LoginView Component
 * Authentication view with email/password sign-in/sign-up and Google OAuth login
 * 
 * Features:
 * - Sign in with email/password
 * - Sign up with email/password (new users)
 * - Google OAuth login
 * - Password reset flow
 * 
 * Security: All inputs validated per SECURITY_CHECKLIST.md
 * 
 * Extracted from App.jsx as part of refactoring effort
 */

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { validateEmail, validatePassword } from '../../utils/validators';
import { checkRateLimit, recordAttempt, clearRateLimit, formatTimeUntilReset } from '../../utils/rateLimiter';

/**
 * LoginView Component
 * 
 * @param {Object} props
 * @param {Function} props.onLogin - Callback when login is successful
 */
export default function LoginView({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);


  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Security: Input validation before sending to server (allowlist approach)
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        setError(emailValidation.error || 'Please enter a valid email address');
        setLoading(false);
        return;
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        setError(passwordValidation.error || 'Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      // Security: Rate limiting - check before processing
      const sanitizedEmail = email.trim().toLowerCase();
      const rateLimitCheck = checkRateLimit('LOGIN', sanitizedEmail);
      
      if (!rateLimitCheck.allowed) {
        const timeUntilReset = formatTimeUntilReset(rateLimitCheck.resetAt);
        setError(`Too many login attempts. Please try again in ${timeUntilReset}.`);
        setLoading(false);
        return;
      }

      // Security: Additional length checks to prevent DoS
      if (email.length > 254) { // RFC 5321 max length
        setError('Email address is too long');
        setLoading(false);
        return;
      }
      
      if (password.length > 1000) { // Prevent extremely long passwords
        setError('Password is too long');
        setLoading(false);
        return;
      }

      // Record attempt (before API call)
      recordAttempt('LOGIN', sanitizedEmail);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(), // Sanitize: trim whitespace
        password
      });

      if (error) throw error;
      
      // Login successful - clear rate limit for this email
      clearRateLimit('LOGIN', sanitizedEmail);
      
      // Login successful - call onLogin callback to trigger session refresh
      // This ensures the useAuth hook updates the user state
      setLoading(false);
      console.log('Login credentials accepted - triggering session refresh');
      
      // Call onLogin callback which will trigger refreshSession in useAuth
      if (onLogin) {
        onLogin();
      }
      
      // Also manually check session as fallback
      setTimeout(async () => {
        const { data: { session: newSession } } = await supabase.auth.getSession();
        if (newSession?.user) {
          console.log('✅ Session confirmed after login');
        }
      }, 300);
    } catch (error) {
      // Security: Sanitize error messages - don't expose internal details
      let errorMessage = 'Login failed. Please check your credentials.';
      
      // Only show specific errors for user-friendly cases
      if (error.message) {
        const msg = error.message.toLowerCase();
        if (msg.includes('invalid login') || msg.includes('wrong password')) {
          errorMessage = 'Invalid email or password';
        } else if (msg.includes('email not confirmed')) {
          errorMessage = 'Please verify your email address';
        } else if (msg.includes('too many requests')) {
          // Rate limit from server - show remaining time if available
          const rateLimitCheck = checkRateLimit('LOGIN', sanitizedEmail);
          if (!rateLimitCheck.allowed && rateLimitCheck.resetAt) {
            const timeUntilReset = formatTimeUntilReset(rateLimitCheck.resetAt);
            errorMessage = `Too many login attempts. Please try again in ${timeUntilReset}.`;
          } else {
            errorMessage = 'Too many login attempts. Please try again later.';
          }
        }
        // Don't log full error with potential PII
        console.error('Login error (sanitized)');
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    console.log('Google login button clicked');
    setGoogleLoading(true);
    setError('');

    try {
      console.log('Initiating Google OAuth...');
      console.log('Redirect URL will be:', window.location.origin);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account', // Force account selection every time
          },
        },
      });

      if (error) {
        console.error('Google OAuth error:', error);
        throw error;
      }
      
      console.log('Google OAuth initiated, redirecting...', data);
      // Note: This will redirect away, so we won't return here
      // Don't set loading to false - let the redirect handle it
    } catch (error) {
      console.error('Google login error:', error);
      setError(error.message || 'Failed to sign in with Google');
      setGoogleLoading(false);
    }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Security: Input validation before sending to server (allowlist approach)
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        setError(emailValidation.error || 'Please enter a valid email address');
        setLoading(false);
        return;
      }

      // Security: Rate limiting - check before processing
      const sanitizedEmail = email.trim().toLowerCase();
      const rateLimitCheck = checkRateLimit('SIGN_UP', sanitizedEmail);
      
      if (!rateLimitCheck.allowed) {
        const timeUntilReset = formatTimeUntilReset(rateLimitCheck.resetAt);
        setError(`Too many sign-up attempts. Please try again in ${timeUntilReset}.`);
        setLoading(false);
        return;
      }

      // Security: Password strength validation (requireStrength = true for sign-up)
      const passwordValidation = validatePassword(password, true);
      if (!passwordValidation.valid) {
        setError(passwordValidation.error || 'Password does not meet requirements');
        setLoading(false);
        return;
      }

      // Security: Additional length checks to prevent DoS
      if (email.length > 254) { // RFC 5321 max length
        setError('Email address is too long');
        setLoading(false);
        return;
      }
      
      if (password.length > 1000) { // Prevent extremely long passwords
        setError('Password is too long');
        setLoading(false);
        return;
      }

      // Record attempt (before API call)
      recordAttempt('SIGN_UP', sanitizedEmail);

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(), // Sanitize: trim whitespace
        password,
        options: {
          emailRedirectTo: `${window.location.origin}`,
        }
      });

      if (signUpError) throw signUpError;
      
      // Sign up successful - clear rate limit for this email
      clearRateLimit('SIGN_UP', sanitizedEmail);
      
      // Sign up successful - show success message
      setSignUpSuccess(true);
      setLoading(false);
      
      // If email confirmation is required, show message
      if (data.user && !data.session) {
        // Email confirmation required
        console.log('Sign up successful - email confirmation required');
      } else if (data.session) {
        // Auto-logged in (if email confirmation disabled)
        console.log('Sign up successful - auto-logged in');
        if (onLogin) {
          onLogin();
        }
      }
    } catch (error) {
      // Security: Sanitize error messages - don't expose internal details
      // CRITICAL: Never reveal if account exists (prevents account enumeration)
      let errorMessage = 'If this email is not already registered, you will receive a confirmation link shortly.';
      
      // Only show specific errors for user-friendly cases (but don't reveal account existence)
      if (error.message) {
        const msg = error.message.toLowerCase();
        // Security: Don't reveal if account exists - always show same message
        if (msg.includes('user already registered') || msg.includes('already exists')) {
          // Show generic message to prevent account enumeration
          errorMessage = 'If this email is not already registered, you will receive a confirmation link shortly.';
        } else if (msg.includes('invalid email')) {
          errorMessage = 'Please enter a valid email address';
        } else if (msg.includes('password')) {
          errorMessage = 'Password does not meet requirements';
        } else if (msg.includes('too many requests')) {
          errorMessage = 'Too many sign-up attempts. Please try again later.';
        }
        // Don't log full error with potential PII
        console.error('Sign up error (sanitized)');
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setResetLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;
      
      setResetSuccess(true);
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetSuccess(false);
        setResetEmail('');
      }, 3000);
    } catch (error) {
      setError(error.message);
    } finally {
      setResetLoading(false);
    }
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Reset Password</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">Enter your email to receive a password reset link</p>

          {resetSuccess ? (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-green-700 text-sm mb-4">
              <p className="font-semibold mb-1">✅ Check your email!</p>
              <p>We've sent you a password reset link. Please check your inbox and spam folder.</p>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email</label>
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="your@email.com"
                />
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium glow-button disabled:opacity-50"
              >
                {resetLoading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError('');
                  setResetEmail('');
                }}
                className="w-full px-6 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Show success message after sign-up
  if (signUpSuccess) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Check Your Email</h1>
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-green-700 text-sm mb-6">
            <p className="font-semibold mb-2">✅ Account Created Successfully!</p>
            <p className="mb-2">We've sent a confirmation email to:</p>
            <p className="font-mono text-xs bg-white p-2 rounded mb-2">{email}</p>
            <p>Please check your inbox and click the confirmation link to activate your account.</p>
          </div>
          <button
            onClick={() => {
              setSignUpSuccess(false);
              setIsSignUp(false);
              setEmail('');
              setPassword('');
            }}
            className="w-full px-6 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Surgical Techniques</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          {isSignUp ? 'Create an account to get started' : 'Sign in to access the resource library'}
        </p>

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="w-full px-6 py-3 mb-6 bg-white border-2 border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-sm"
          aria-label="Sign in with Google"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {googleLoading ? 'Signing in with Google...' : 'Continue with Google'}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or</span>
          </div>
        </div>

        <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="login-password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Password</label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="••••••••"
            />
            {isSignUp && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                <p className="font-semibold mb-1">Password requirements:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>At least 8 characters</li>
                  <li>One uppercase letter</li>
                  <li>One lowercase letter</li>
                  <li>One number</li>
                  <li>Special characters recommended</li>
                </ul>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium glow-button disabled:opacity-50"
          >
            {loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setEmail('');
                setPassword('');
              }}
              className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

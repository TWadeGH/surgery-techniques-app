import { useState } from 'react'
import { supabase } from './lib/supabase'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email,
              user_type: 'student',
              role: 'user'
            })
          
          if (profileError) {
            console.error('Profile creation error:', profileError)
          }
        }
        
        setMessage('Account created! You can now log in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-bg-tertiary)',
      padding: 'var(--space-lg)'
    }}>
      <div style={{ 
        maxWidth: '400px',
        width: '100%',
        backgroundColor: 'var(--color-bg-primary)',
        padding: 'var(--space-xl)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <h1 style={{ 
            fontSize: '32px',
            fontWeight: 'bold',
            marginBottom: 'var(--space-sm)',
            color: 'var(--color-text-primary)'
          }}>
            Surgical Techniques
          </h1>
          <p style={{ 
            fontSize: '16px',
            color: 'var(--color-text-secondary)',
            margin: 0
          }}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>
        
        <form onSubmit={handleAuth}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              disabled={loading}
            />
            {isSignUp && (
              <p className="form-help">Must be at least 6 characters</p>
            )}
          </div>

          <button 
            type="submit" 
            className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? '' : (isSignUp ? 'Sign Up' : 'Log In')}
          </button>
        </form>

        <div style={{ 
          marginTop: 'var(--space-lg)',
          textAlign: 'center',
          fontSize: '14px',
          color: 'var(--color-text-secondary)'
        }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          {' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setMessage('')
              setEmail('')
              setPassword('')
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '14px',
              padding: 0
            }}
            disabled={loading}
          >
            {isSignUp ? 'Log In' : 'Sign Up'}
          </button>
        </div>

        {message && (
          <div 
            role="alert"
            style={{ 
              marginTop: 'var(--space-lg)',
              padding: 'var(--space-md)',
              backgroundColor: message.toLowerCase().includes('error') || message.toLowerCase().includes('incorrect') || message.toLowerCase().includes('invalid') 
                ? '#fee' 
                : '#e8f5e9',
              color: message.toLowerCase().includes('error') || message.toLowerCase().includes('incorrect') || message.toLowerCase().includes('invalid')
                ? 'var(--color-danger)'
                : 'var(--color-success)',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              border: `1px solid ${message.toLowerCase().includes('error') || message.toLowerCase().includes('incorrect') || message.toLowerCase().includes('invalid') ? 'var(--color-danger)' : 'var(--color-success)'}`
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

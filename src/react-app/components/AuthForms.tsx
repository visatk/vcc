import React, { useState, useEffect, useRef } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { authenticatePasskey, triggerConditionalCreate } from '../utils/passkeyUtils';

const TURNSTILE_SITE_KEY = '1x00000000000000000000AA'; // Dummy key for testing (always passes)

export function LoginForm({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Attempt Conditional UI (Autofill) on mount
    abortControllerRef.current = new AbortController();
    authenticatePasskey(abortControllerRef.current, true)
      .then((data) => {
        if (data && data.token) {
          localStorage.setItem('auth_token', data.token);
          onLoginSuccess();
        }
      })
      .catch((err) => console.log('Autofill failed or aborted:', err));

    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const handlePasskeyExplicit = async () => {
    try {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setLoading(true);
      const data = await authenticatePasskey(undefined, false);
      if (data && data.token) {
        localStorage.setItem('auth_token', data.token);
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Passkey login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) {
      setError('Please complete the CAPTCHA');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, 'cf-turnstile-response': turnstileToken })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('auth_token', data.token);
        // Post-login silent promotion for passkey creation
        if (abortControllerRef.current) {
          await triggerConditionalCreate(abortControllerRef.current);
        }
        onLoginSuccess();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('A network error occurred');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm mx-auto p-6 bg-base-200 rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold text-center mb-4 text-primary">Login</h2>
      {error && <div className="alert alert-error text-sm py-2">{error}</div>}
      
      <div className="form-control">
        <label className="label"><span className="label-text">Email</span></label>
        <input type="email" required className="input input-bordered w-full" value={email} onChange={e => setEmail(e.target.value)} />
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text">Password</span></label>
        <input type="password" required className="input input-bordered w-full" value={password} onChange={e => setPassword(e.target.value)} />
      </div>

      <div className="flex justify-center my-2">
        <Turnstile siteKey={TURNSTILE_SITE_KEY} onSuccess={(token) => setTurnstileToken(token)} />
      </div>

      <button type="submit" disabled={!turnstileToken || loading} className="btn btn-primary w-full">
        {loading ? <span className="loading loading-spinner"></span> : 'Login'}
      </button>

      <div className="divider text-xs opacity-50">OR</div>

      <button type="button" onClick={handlePasskeyExplicit} disabled={loading} className="btn btn-outline w-full gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
        Sign in with Passkey
      </button>
    </form>
  );
}

export function RegisterForm({ onRegisterSuccess }: { onRegisterSuccess: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) {
      setError('Please complete the CAPTCHA');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, 'cf-turnstile-response': turnstileToken })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('auth_token', data.token);
        onRegisterSuccess();
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('A network error occurred');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm mx-auto p-6 bg-base-200 rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold text-center mb-4 text-primary">Create Account</h2>
      {error && <div className="alert alert-error text-sm py-2">{error}</div>}
      
      <div className="form-control">
        <label className="label"><span className="label-text">Name</span></label>
        <input type="text" required minLength={2} className="input input-bordered w-full" value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text">Email</span></label>
        <input type="email" required className="input input-bordered w-full" value={email} onChange={e => setEmail(e.target.value)} />
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text">Password</span></label>
        <input type="password" required minLength={6} className="input input-bordered w-full" value={password} onChange={e => setPassword(e.target.value)} />
      </div>

      <div className="flex justify-center my-2">
        <Turnstile siteKey={TURNSTILE_SITE_KEY} onSuccess={(token) => setTurnstileToken(token)} />
      </div>

      <button type="submit" disabled={!turnstileToken || loading} className="btn btn-primary w-full">
        {loading ? <span className="loading loading-spinner"></span> : 'Register'}
      </button>
    </form>
  );
}

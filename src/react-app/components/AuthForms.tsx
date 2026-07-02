import React, { useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';

const TURNSTILE_SITE_KEY = '1x00000000000000000000AA'; // Dummy key for testing (always passes)

export function LoginForm({ onLoginSuccess }: { onLoginSuccess: () => void }) {
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, 'cf-turnstile-response': turnstileToken })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('auth_token', data.token);
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

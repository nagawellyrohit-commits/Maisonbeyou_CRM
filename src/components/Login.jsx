import React, { useState } from 'react';
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { setStoredToken, setStoredUser } from '../utils/api';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setStoredToken(data.token);
      setStoredUser(data.user);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    // Submit with selected credentials
    setTimeout(() => {
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail, password: demoPass })
      })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          setStoredToken(data.token);
          setStoredUser(data.user);
          onLoginSuccess(data.user);
        }
      })
      .catch(err => setError(err.message));
    }, 50);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, #FAF6F0 0%, #EFE8DE 100%)',
      padding: '24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 20px 40px -15px rgba(28, 25, 23, 0.1)',
        border: '1px solid var(--border-color)',
        padding: '40px 36px',
        position: 'relative'
      }}>
        {/* Luxury crest */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img 
            src="/logo.png" 
            alt="Maison BeYou Logo" 
            style={{
              width: '84px',
              height: '84px',
              objectFit: 'contain',
              marginBottom: '16px',
              filter: 'drop-shadow(0 4px 14px rgba(184, 139, 74, 0.25))'
            }}
          />
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '26px',
            letterSpacing: '0.04em',
            color: '#1C1917',
            marginBottom: '6px'
          }}>
            MAISON BEYOU
          </h1>
          <p style={{
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            color: '#B88B4A',
            fontWeight: '600'
          }}>
            Women's Aesthetic Studio CRM
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger-text)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
              Staff Email / Login ID
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={17} color="var(--text-light)" style={{ position: 'absolute', left: '14px', top: '13px' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. reception@maisonbeyou.com"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 40px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card-subtle)',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={17} color="var(--text-light)" style={{ position: 'absolute', left: '14px', top: '13px' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 40px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card-subtle)',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: '13px', fontSize: '15px', marginTop: '6px' }}
          >
            {loading ? 'Authenticating...' : (
              <>
                Sign In to Studio CRM
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Logins */}
        <div style={{ marginTop: '28px', paddingTop: '22px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            fontWeight: '700',
            color: 'var(--text-light)',
            textAlign: 'center',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
            <ShieldCheck size={14} color="#B88B4A" />
            Quick Demo Staff Access
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleDemoLogin('reception@maisonbeyou.com', 'reception123')}
              style={{
                padding: '8px 10px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>Reception</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Daily Desk Flow</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('admin@maisonbeyou.com', 'admin123')}
              style={{
                padding: '8px 10px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>Admin</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Full System Access</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('therapist@maisonbeyou.com', 'therapist123')}
              style={{
                padding: '8px 10px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>Therapist</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Assigned Services</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('manager@maisonbeyou.com', 'manager123')}
              style={{
                padding: '8px 10px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>Manager</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Reports & Analytics</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

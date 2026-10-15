import React, { useState } from 'react';
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { setStoredToken, setStoredUser } from '../utils/api';
import logoImg from '../assets/logo.png';
import brandLogoImg from '../assets/brand-logo.png';

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
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img 
            src={brandLogoImg} 
            alt="Maison BeYou Logo" 
            style={{
              height: '56px',
              width: 'auto',
              objectFit: 'contain'
            }}
          />
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
              Login ID
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={17} color="var(--text-light)" style={{ position: 'absolute', left: '14px', top: '13px' }} />
              <input
                type="text"
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
                Sign In to Studio
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => handleDemoLogin('admin@maisonbeyou.com', 'admin123')}
              style={{
                padding: '12px 14px',
                background: 'var(--bg-surface)',
                border: '1.5px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#B88B4A'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <div style={{ fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#B88B4A', display: 'inline-block' }} />
                Main Admin
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Full System & Edit Access</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('reception@maisonbeyou.com', 'reception123')}
              style={{
                padding: '12px 14px',
                background: 'var(--bg-surface)',
                border: '1.5px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#B88B4A'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <div style={{ fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6', display: 'inline-block' }} />
                Reception Desk
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Reception Dashboard & Queue</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('visitor@maisonbeyou.com', 'visitor123')}
              style={{
                gridColumn: '1 / -1',
                padding: '12px 14px',
                background: '#FAF6EE',
                border: '1.5px solid #DAC493',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#B88B4A';
                e.currentTarget.style.background = '#F5ECE0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#DAC493';
                e.currentTarget.style.background = '#FAF6EE';
              }}
            >
              <div>
                <div style={{ fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                  Visitor Desk
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Direct Visit Reception & Booking Flow</div>
              </div>
              <ArrowRight size={15} color="#B88B4A" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Mail, Phone, ArrowRight, Eye, EyeOff, Check, ShieldCheck, Sparkles, AlertCircle, RotateCw } from 'lucide-react';
import { setStoredToken, setStoredUser } from '../utils/api';
import brandLogoImg from '../assets/brand-logo.png';
import loginBg from '../assets/login-bg.jpg';

export default function Login({ onLoginSuccess }) {
  // Input states
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(true);

  // OTP flow states
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [maskedContact, setMaskedContact] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);

  // General states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const otpInputRef = useRef(null);

  // Countdown timer for OTP resend (60s)
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // Focus OTP input when otpSent becomes true
  useEffect(() => {
    if (otpSent && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [otpSent]);

  // Determine if input resembles a phone number
  const isPhoneInput = /^\+?[\d\s\-()]+$/.test(identifier.trim()) && identifier.trim().length >= 3;

  // Send OTP handler
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your Phone number or Email ID first');
      return;
    }

    setSendingOtp(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/send-login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP. Please check your Phone / Email.');
      }

      setOtpSent(true);
      setMaskedContact(data.maskedContact || identifier.trim());
      setDemoOtp(data.demoOtp || '');
      setOtpCooldown(60); // 60 seconds countdown
      setSuccessMsg(`OTP sent successfully to ${data.maskedContact || identifier.trim()}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingOtp(false);
    }
  };

  // Sign In submit handler
  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!identifier.trim()) {
      setError('Please enter your Phone number or Email ID');
      return;
    }

    if (!otpSent) {
      // Step 1: User hasn't requested OTP yet, clicking button sends OTP
      await handleSendOtp();
      return;
    }

    // Step 2: OTP was already sent, user submits entered OTP
    if (!otp.trim()) {
      setError('Please enter the 6-digit OTP code');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          otp: otp.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired OTP code');
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

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: `url(${loginBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      padding: '32px 20px',
      position: 'relative'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '430px',
        background: 'rgba(255, 252, 247, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '26px',
        boxShadow: '0 25px 60px -15px rgba(90, 60, 20, 0.16), 0 0 0 1px rgba(255, 255, 255, 0.8) inset, 0 10px 30px -5px rgba(0, 0, 0, 0.05)',
        border: '1.5px solid #DAC493',
        padding: '36px 32px 30px 32px',
        position: 'relative'
      }}>
        {/* Luxury Crest */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img 
            src={brandLogoImg} 
            alt="Maison BeYou Logo" 
            style={{
              height: '52px',
              width: 'auto',
              maxWidth: '220px',
              objectFit: 'contain'
            }}
          />
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div style={{
            background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
            border: '1px solid #86EFAC',
            color: '#166534',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '12.5px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '600',
            lineHeight: 1.4
          }}>
            <Check size={16} color="#16a34a" style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'var(--danger-bg, #FEF2F2)',
            border: '1px solid var(--danger-border, #FECACA)',
            color: 'var(--danger-text, #991B1B)',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 1. Phone Number / Email ID */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#1C1917' }}>
                Phone Number or Email
              </label>
              {otpSent && (
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp('');
                    setOtpCooldown(0);
                    setError('');
                    setSuccessMsg('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    color: '#8C6228',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Change
                </button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              {isPhoneInput ? (
                <Phone size={16} color="#9F7335" style={{ position: 'absolute', left: '14px', top: '13px', transition: 'color 0.2s' }} />
              ) : (
                <Mail size={16} color="#A89885" style={{ position: 'absolute', left: '14px', top: '13px', transition: 'color 0.2s' }} />
              )}
              <input
                type="text"
                value={identifier}
                disabled={otpSent}
                placeholder="Enter mobile number or email ID"
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setError('');
                }}
                required
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 40px',
                  borderRadius: '10px',
                  border: '1px solid #E2D7C5',
                  background: otpSent ? '#EFE9DE' : '#F6F1EA',
                  outline: 'none',
                  fontSize: '13.5px',
                  color: '#1C1917',
                  transition: 'all 0.2s ease',
                  cursor: otpSent ? 'not-allowed' : 'text'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#B88B4A';
                  e.target.style.boxShadow = '0 0 0 3px rgba(184, 139, 74, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E2D7C5';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* 2. OTP Verification (Only rendered AFTER Get OTP is clicked) */}
          {otpSent && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#1C1917' }}>
                  Enter OTP
                </label>
                {otpCooldown > 0 ? (
                  <span style={{
                    fontSize: '12px',
                    color: '#8C6228',
                    fontWeight: '600',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    Resend in <strong>{otpCooldown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#9F7335',
                      cursor: sendingOtp ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'none',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#B88B4A';
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#9F7335';
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    <RotateCw size={12} />
                    {sendingOtp ? 'Sending...' : 'Resend OTP'}
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <ShieldCheck size={16} color="#9F7335" style={{ position: 'absolute', left: '14px', top: '13px', pointerEvents: 'none' }} />
                <input
                  ref={otpInputRef}
                  type={showOtp ? 'text' : 'password'}
                  maxLength={6}
                  placeholder="------"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ''));
                    setError('');
                  }}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 42px 11px 40px',
                    borderRadius: '10px',
                    border: '1px solid #E2D7C5',
                    background: '#F6F1EA',
                    outline: 'none',
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#1C1917',
                    letterSpacing: '0.25em',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#B88B4A';
                    e.target.style.boxShadow = '0 0 0 3px rgba(184, 139, 74, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2D7C5';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {/* OTP Visibility Toggle */}
                <button
                  type="button"
                  onClick={() => setShowOtp(!showOtp)}
                  title={showOtp ? "Hide OTP" : "Show OTP"}
                  aria-label={showOtp ? "Hide OTP" : "Show OTP"}
                  style={{
                    position: 'absolute',
                    right: '9px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: '6px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: showOtp ? '#9F7335' : '#A89885',
                    borderRadius: '6px'
                  }}
                >
                  {showOtp ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Demo OTP Helper Badge with 1-click Auto Fill */}
              {demoOtp && (
                <div style={{
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#FAF3E3',
                  border: '1px dashed #DAC493',
                  padding: '7px 11px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  color: '#8C6228'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Sparkles size={13} color="#B88B4A" />
                    <span>Demo OTP: <strong>{demoOtp}</strong></span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtp(demoOtp);
                      setError('');
                    }}
                    style={{
                      background: '#9F7335',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Auto Fill
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || sendingOtp}
            style={{
              width: '100%',
              padding: '12px 18px',
              fontSize: '14.5px',
              fontWeight: '700',
              marginTop: '4px',
              background: 'linear-gradient(135deg, #A87B3E 0%, #8C6228 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: (loading || sendingOtp) ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(140, 98, 40, 0.25)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading && !sendingOtp) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #B88B4A 0%, #9F7335 100%)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #A87B3E 0%, #8C6228 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {loading ? 'Verifying OTP...' : sendingOtp ? 'Sending OTP...' : (
              <>
                {otpSent ? 'Verify & Sign In' : 'Get OTP'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

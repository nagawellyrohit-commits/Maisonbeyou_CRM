import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Store, 
  Laptop, 
  KeyRound, 
  Mail, 
  Phone, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle, 
  RotateCw,
  ChevronDown,
  UserCheck,
  ShieldAlert
} from 'lucide-react';
import { setStoredToken, setStoredUser, setStoredLocation } from '../utils/api';
import brandLogoImg from '../assets/brand-logo.png';
import loginBg from '../assets/login-bg.jpg';

export default function Login({ onLoginSuccess }) {
  // Login Mode: 'studio' (Studio & Desk Selector) vs 'direct' (Phone / Email / ID)
  const [loginMode, setLoginMode] = useState('studio');

  // Locations state
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(5); // Default to Gachibowli or first
  const [selectedDeskRole, setSelectedDeskRole] = useState('visitor'); // 'visitor' | 'reception' | 'admin'

  // Direct login state
  const [identifier, setIdentifier] = useState('');
  const [directRole, setDirectRole] = useState('visitor');

  // OTP flow states
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [maskedContact, setMaskedContact] = useState('');
  const [resolvedAccountName, setResolvedAccountName] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);

  // General states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const otpInputRef = useRef(null);

  // Fetch active studios list on load
  useEffect(() => {
    fetch('/api/auth/locations-list')
      .then(res => res.json())
      .then(data => {
        if (data.locations && data.locations.length > 0) {
          setLocations(data.locations);
          // Prefer Gachibowli (id: 5) if present, else first location
          const hasGachibowli = data.locations.find(l => l.location_id === 5 || (l.name || '').toLowerCase().includes('gachibowli'));
          if (hasGachibowli) {
            setSelectedLocationId(hasGachibowli.location_id);
          } else {
            setSelectedLocationId(data.locations[0].location_id);
          }
        }
      })
      .catch(err => console.error('Failed to load locations list:', err));
  }, []);

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

  const activeLocation = locations.find(l => l.location_id === Number(selectedLocationId)) || locations[0];
  const isPhoneInput = /^\+?[\d\s\-()]+$/.test(identifier.trim()) && identifier.trim().length >= 7;

  // Send OTP handler
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setSendingOtp(true);
    setError('');
    setSuccessMsg('');

    try {
      let payload = {};
      if (loginMode === 'studio') {
        if (!selectedLocationId) {
          throw new Error('Please select a studio branch');
        }
        payload = {
          location_id: Number(selectedLocationId),
          role: selectedDeskRole
        };
      } else {
        if (!identifier.trim()) {
          throw new Error('Please enter your Phone number, Email, or Desk ID');
        }
        payload = {
          identifier: identifier.trim(),
          role: isPhoneInput ? directRole : undefined
        };
      }

      const res = await fetch('/api/auth/send-login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP. Please check account details.');
      }

      setOtpSent(true);
      setMaskedContact(data.maskedContact || '');
      setResolvedAccountName(data.name || '');
      setDemoOtp(data.demoOtp || '784920');
      setOtpCooldown(60);
      setSuccessMsg(`OTP sent to authorized contact: ${data.maskedContact || 'Studio Contact'}`);
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

    if (!otpSent) {
      await handleSendOtp();
      return;
    }

    if (!otp.trim()) {
      setError('Please enter the 6-digit OTP code');
      return;
    }

    setLoading(true);
    try {
      let payload = { otp: otp.trim() };
      if (loginMode === 'studio') {
        payload.location_id = Number(selectedLocationId);
        payload.role = selectedDeskRole;
      } else {
        payload.identifier = identifier.trim();
        if (isPhoneInput) {
          payload.role = directRole;
        }
      }

      const res = await fetch('/api/auth/login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired OTP code');
      }

      setStoredToken(data.token);
      setStoredUser(data.user);
      if (data.location) {
        setStoredLocation(data.location);
      }
      onLoginSuccess(data.user, data.location);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deskRoles = [
    {
      id: 'visitor',
      title: 'Visitor Desk',
      subtitle: 'Client Intake Tablet',
      icon: Laptop,
      badge: 'Self Intake'
    },
    {
      id: 'reception',
      title: 'Reception Desk',
      subtitle: 'Staff & Front-Desk',
      icon: Store,
      badge: 'Billing & Visits'
    },
    {
      id: 'admin',
      title: 'Branch Admin',
      subtitle: 'Studio Operations',
      icon: Building2,
      badge: 'Admin Access'
    }
  ];

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
      padding: '24px 16px',
      position: 'relative'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: 'rgba(255, 252, 247, 0.95)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: '24px',
        boxShadow: '0 25px 60px -15px rgba(90, 60, 20, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.8) inset, 0 10px 30px -5px rgba(0, 0, 0, 0.05)',
        border: '1.5px solid #DAC493',
        padding: '32px 28px',
        position: 'relative'
      }}>
        {/* Brand Crest */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img 
            src={brandLogoImg} 
            alt="Maison BeYou Logo" 
            style={{
              height: '50px',
              width: 'auto',
              maxWidth: '220px',
              objectFit: 'contain'
            }}
          />
          <div style={{ 
            fontSize: '11px', 
            fontWeight: '700', 
            letterSpacing: '0.12em', 
            textTransform: 'uppercase', 
            color: '#8C6228', 
            marginTop: '6px' 
          }}>
            Studio Operations & Desk Portal
          </div>
        </div>

        {/* Login Mode Tabs */}
        {!otpSent && (
          <div style={{
            display: 'flex',
            background: '#F0E8D8',
            padding: '3px',
            borderRadius: '12px',
            marginBottom: '20px',
            border: '1px solid #E2D7C5'
          }}>
            <button
              type="button"
              onClick={() => {
                setLoginMode('studio');
                setError('');
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '9px',
                border: 'none',
                background: loginMode === 'studio' ? '#FFFFFF' : 'transparent',
                color: loginMode === 'studio' ? '#8C6228' : '#78716C',
                fontWeight: '700',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: loginMode === 'studio' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Store size={14} />
              <span>Studio Desk Access</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('direct');
                setError('');
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '9px',
                border: 'none',
                background: loginMode === 'direct' ? '#FFFFFF' : 'transparent',
                color: loginMode === 'direct' ? '#8C6228' : '#78716C',
                fontWeight: '700',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: loginMode === 'direct' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <KeyRound size={14} />
              <span>Direct ID / Mobile</span>
            </button>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div style={{
            background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
            border: '1px solid #86EFAC',
            color: '#166534',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '12px',
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
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '12.5px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '500'
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* TAB 1: STUDIO DESK ACCESS */}
          {loginMode === 'studio' && (
            <>
              {/* Studio Dropdown */}
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917', display: 'block', marginBottom: '6px' }}>
                  Select Studio Branch
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedLocationId}
                    disabled={otpSent}
                    onChange={(e) => {
                      setSelectedLocationId(Number(e.target.value));
                      setError('');
                    }}
                    style={{
                      width: '100%',
                      padding: '11px 36px 11px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #E2D7C5',
                      background: otpSent ? '#EFE9DE' : '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#1C1917',
                      outline: 'none',
                      cursor: otpSent ? 'not-allowed' : 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none'
                    }}
                  >
                    {locations.map((loc) => (
                      <option key={loc.location_id} value={loc.location_id}>
                        {loc.name} {loc.code ? `(${loc.code})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} color="#8C6228" style={{ position: 'absolute', right: '14px', top: '14px', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Desk Selection (Visitor / Reception / Admin) */}
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917', display: 'block', marginBottom: '8px' }}>
                  Select Desk
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {deskRoles.map((role) => {
                    const isSelected = selectedDeskRole === role.id;
                    const IconComp = role.icon;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        disabled={otpSent}
                        onClick={() => {
                          setSelectedDeskRole(role.id);
                          setError('');
                        }}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '10px',
                          border: isSelected ? '1.5px solid #B88B4A' : '1px solid #E2D7C5',
                          background: isSelected ? '#FAF3E3' : '#FFFFFF',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          gap: '4px',
                          cursor: otpSent ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? '0 2px 8px rgba(184, 139, 74, 0.2)' : 'none'
                        }}
                      >
                        <IconComp size={18} color={isSelected ? '#8C6228' : '#78716C'} />
                        <span style={{ fontSize: '12px', fontWeight: '700', color: isSelected ? '#1C1917' : '#44403C' }}>
                          {role.title}
                        </span>
                        <span style={{ fontSize: '9.5px', color: '#78716C' }}>
                          {role.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Studio Account Info Badge */}
              {activeLocation && (
                <div style={{
                  background: '#FBF8F2',
                  border: '1px solid #EADBBE',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  fontSize: '11.5px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  color: '#57534E'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', color: '#8C6228' }}>Target Studio Desk:</span>
                    <span style={{ fontWeight: '700', color: '#1C1917', textTransform: 'capitalize' }}>
                      {selectedDeskRole} Desk
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Studio Code:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#1C1917' }}>
                      {activeLocation.code || `MB-LOC-${activeLocation.location_id}`}
                    </span>
                  </div>
                  {resolvedAccountName && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #E2D7C5', paddingTop: '4px', marginTop: '2px' }}>
                      <span>Desk Account:</span>
                      <span style={{ fontWeight: '700', color: '#166534' }}>
                        {resolvedAccountName}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* TAB 2: DIRECT ID / MOBILE LOGIN */}
          {loginMode === 'direct' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917' }}>
                  Phone Number, Email, or Desk ID
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
                  <Phone size={16} color="#9F7335" style={{ position: 'absolute', left: '14px', top: '13px' }} />
                ) : (
                  <Mail size={16} color="#A89885" style={{ position: 'absolute', left: '14px', top: '13px' }} />
                )}
                <input
                  type="text"
                  value={identifier}
                  disabled={otpSent}
                  placeholder="e.g. 9840099887, gachibowli.visitor"
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError('');
                  }}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 40px',
                    borderRadius: '10px',
                    border: '1.5px solid #E2D7C5',
                    background: otpSent ? '#EFE9DE' : '#FFFFFF',
                    outline: 'none',
                    fontSize: '13.5px',
                    color: '#1C1917',
                    cursor: otpSent ? 'not-allowed' : 'text'
                  }}
                />
              </div>

              {/* If entering a phone number, ask which desk to access */}
              {isPhoneInput && !otpSent && (
                <div style={{ marginTop: '10px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: '700', color: '#78716C', display: 'block', marginBottom: '4px' }}>
                    Desk to Access for this Phone:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {deskRoles.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setDirectRole(role.id)}
                        style={{
                          padding: '6px 4px',
                          borderRadius: '8px',
                          border: directRole === role.id ? '1.5px solid #B88B4A' : '1px solid #E2D7C5',
                          background: directRole === role.id ? '#FAF3E3' : '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: directRole === role.id ? '#8C6228' : '#57534E',
                          cursor: 'pointer'
                        }}
                      >
                        {role.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OTP Input Section (Rendered when OTP is sent) */}
          {otpSent && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917' }}>
                  Enter 6-Digit OTP
                </label>
                {otpCooldown > 0 ? (
                  <span style={{ fontSize: '11.5px', color: '#8C6228', fontWeight: '600' }}>
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
                      fontSize: '11.5px',
                      fontWeight: '700',
                      color: '#9F7335',
                      cursor: sendingOtp ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
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
                    border: '1.5px solid #B88B4A',
                    background: '#FFFFFF',
                    outline: 'none',
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#1C1917',
                    letterSpacing: '0.25em'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowOtp(!showOtp)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: '6px',
                    cursor: 'pointer',
                    color: showOtp ? '#9F7335' : '#A89885'
                  }}
                >
                  {showOtp ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Demo Auto-Fill Badge */}
              {demoOtp && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#FAF3E3',
                  border: '1px dashed #DAC493',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  color: '#8C6228'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Sparkles size={13} color="#B88B4A" />
                    <span>Demo Code: <strong>{demoOtp}</strong></span>
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
              fontSize: '14px',
              fontWeight: '700',
              marginTop: '6px',
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
          >
            {loading ? 'Verifying...' : sendingOtp ? 'Sending OTP...' : (
              <>
                {otpSent ? 'Verify & Open Desk' : 'Get Login OTP'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Helper at Bottom */}
        <div style={{
          marginTop: '18px',
          paddingTop: '14px',
          borderTop: '1px solid #E2D7C5',
          textAlign: 'center',
          fontSize: '11px',
          color: '#78716C'
        }}>
          <span>Maison BeYou Luxury Salon & Clinic Management</span>
        </div>
      </div>
    </div>
  );
}

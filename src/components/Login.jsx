import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Store, 
  Laptop, 
  Phone, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Check, 
  ShieldCheck, 
  AlertCircle, 
  RotateCw,
  Crown,
  UserCheck
} from 'lucide-react';
import { setStoredToken, setStoredUser, setStoredLocation } from '../utils/api';
import { brandingCssVariables, DEFAULT_LOCATION_BRANDING } from '../utils/branding';
import brandLogoImg from '../assets/brand-logo.png';
import brandLogoIcon from '../assets/brand-logo-icon.png';
import brandLogoText from '../assets/brand-logo-text.png';
import loginBg from '../assets/login-studio-bg.jpg';

function getMsg91Phone(identifier) {
  const digits = String(identifier || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return null;
}

async function readApiResponse(res, action) {
  const body = await res.text();
  if (!body.trim()) {
    throw new Error(`${action} returned an empty response. Please check that the login service is running and try again.`);
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`${action} returned an invalid response. Please try again or contact support.`);
  }
}

export default function Login({ onLoginSuccess, masterPortalBranding }) {
  // Keep the reference composition at its designed size on large screens;
  // only scale down when the available viewport is smaller than the target.
  const getLoginScale = () => Math.min(1, window.innerWidth / 1319, window.innerHeight / 743);
  const [loginScale, setLoginScale] = useState(getLoginScale);

  useEffect(() => {
    const updateLoginScale = () => setLoginScale(getLoginScale());
    window.addEventListener('resize', updateLoginScale);
    return () => window.removeEventListener('resize', updateLoginScale);
  }, []);

  // Mobile / Phone or ID input
  const [identifier, setIdentifier] = useState('');
  
  // Auto-detected account state
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedAccount, setDetectedAccount] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  // OTP flow states
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [resolvedBranchName, setResolvedBranchName] = useState('');
  const [resolvedRoleLabel, setResolvedRoleLabel] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [msg91Phone, setMsg91Phone] = useState('');

  // General states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const otpInputRef = useRef(null);
  const selectedLoginAccount = detectedAccount?.type === 'multiple'
    ? detectedAccount.accounts?.find(account => account.user_id === selectedAccountId)
    : detectedAccount?.user;
  const getOtpRequestPayload = () => ({
    identifier: identifier.trim(),
    role: selectedLoginAccount?.role,
    location_id: selectedLoginAccount?.location_id,
    account_user_id: selectedAccountId
  });
  const selectedDetectedUser = detectedAccount?.type === 'multiple'
    ? detectedAccount.accounts?.find(account => account.user_id === selectedAccountId)
    : null;
  const accountBranding = selectedDetectedUser?.branding || detectedAccount?.branding;
  const loginBranding = accountBranding
    ? { ...accountBranding, ...masterPortalBranding }
    : { ...DEFAULT_LOCATION_BRANDING, ...masterPortalBranding };
  const isLegacyDefaultCardColor = !loginBranding.login_card_color || ['#FFFCF7', '#FFFFFF', '#FAF7F2', '#645243', '#F7EFE6', '#F2E3D3'].includes(String(loginBranding.login_card_color).toUpperCase());
  const loginCardOpacity = Math.min(100, Math.max(40, Number(loginBranding.login_card_opacity) || 36)) / 100;
  const loginCardColor = isLegacyDefaultCardColor ? 'transparent' : loginBranding.login_card_color;
  const loginCardBackground = isLegacyDefaultCardColor
    ? 'linear-gradient(155deg, rgba(255, 253, 250, 0.50) 0%, rgba(244, 229, 214, 0.34) 45%, rgba(226, 203, 181, 0.42) 82%, rgba(246, 234, 222, 0.46) 100%)'
    : (/^#[0-9a-f]{6}$/i.test(loginCardColor)
      ? `rgba(${parseInt(loginCardColor.slice(1, 3), 16)}, ${parseInt(loginCardColor.slice(3, 5), 16)}, ${parseInt(loginCardColor.slice(5, 7), 16)}, ${loginCardOpacity})`
      : loginCardColor);

  // Auto-detect account whenever phone number or identifier changes
  useEffect(() => {
    const trimmed = identifier.trim();
    if (!trimmed || trimmed.length < 5) {
      setDetectedAccount(null);
      setIsDetecting(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsDetecting(true);
        const res = await fetch('/api/auth/detect-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: trimmed })
        });
        const data = await readApiResponse(res, 'Account lookup');
        if (data.found) {
          setDetectedAccount(data);
          if (data.type === 'multiple' && data.accounts && data.accounts.length > 0) {
            setSelectedAccountId(data.accounts[0].user_id);
          } else if (data.type === 'single') {
            setSelectedAccountId(data.user.user_id);
          }
        } else {
          setDetectedAccount(null);
          setSelectedAccountId(null);
        }
      } catch (err) {
        console.error('Failed to detect account:', err);
      } finally {
        setIsDetecting(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [identifier]);

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

  // Send OTP handler
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setError('');
    setSuccessMsg('');

    const trimmed = identifier.trim();
    const phone = getMsg91Phone(trimmed);
    if (!phone) {
      setError('Please enter a valid registered Indian mobile number');
      return;
    }
    if (isDetecting) {
      setError('Please wait while we check the registered account.');
      return;
    }
    if (!detectedAccount?.found) {
      setError('No active account is registered with this mobile number.');
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getOtpRequestPayload())
      });
      const data = await readApiResponse(res, 'OTP request');
      if (!res.ok) throw new Error(data.error || 'Unable to send OTP.');

      setOtpSent(true);
      setMsg91Phone(phone);
      setResolvedBranchName(selectedLoginAccount?.branch_name || detectedAccount.branchName || '');
      setResolvedRoleLabel(
        selectedLoginAccount?.role === 'master_admin' ? 'Maison Master Admin' :
        selectedLoginAccount?.role === 'admin' ? 'Branch Main Admin' :
        selectedLoginAccount?.role === 'reception' ? 'Manager' : 'Visitor'
      );
      setOtpCooldown(60);
      setSuccessMsg(data.demoOtp
        ? `Demo OTP: ${data.demoOtp} (valid for 5 minutes)`
        : `Verification code sent to registered mobile: ${phone.slice(0, 2)}******${phone.slice(-3)}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setSendingOtp(true);
    try {
      const res = await fetch('/api/auth/otp/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getOtpRequestPayload())
      });
      const data = await readApiResponse(res, 'OTP resend');
      if (!res.ok) throw new Error(data.error || 'Unable to resend OTP.');
      setOtpCooldown(60);
      setSuccessMsg(data.demoOtp
        ? `Demo OTP: ${data.demoOtp} (valid for 5 minutes)`
        : `A new verification code was sent to ${msg91Phone.slice(0, 2)}******${msg91Phone.slice(-3)}.`);
    } catch (err) {
      setError(err.message || 'Unable to resend OTP. Please try again.');
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

    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...getOtpRequestPayload(), otp: otp.trim() })
      });

      const data = await readApiResponse(res, 'Login verification');
      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired verification code');
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

  const getRoleIcon = (role) => {
    switch (role) {
      case 'master_admin':
        return <Crown size={18} color="#9F7335" />;
      case 'admin':
        return <Building2 size={18} color="#9F7335" />;
      case 'reception':
        return <Store size={18} color="#9F7335" />;
      case 'visitor':
      default:
        return <Laptop size={18} color="#9F7335" />;
    }
  };

  const cardRadiusPx = (!loginBranding.login_card_radius || Number(loginBranding.login_card_radius) === 22)
    ? 36
    : Number(loginBranding.login_card_radius);
  const buttonRadiusPx = (!loginBranding.login_button_radius || Number(loginBranding.login_button_radius) === 12)
    ? 9999
    : Number(loginBranding.login_button_radius);
  const customBgImage = loginBranding.login_background_image_url || loginBranding.background_image_url || '';

  return (
    <div className="brand-login-shell" style={{
      ...brandingCssVariables(loginBranding),
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: customBgImage
        ? `url(${customBgImage})`
        : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      padding: 'clamp(20px, 3vh, 36px) clamp(16px, 3vw, 40px)',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#EFE1D3'
    }}>
      {/* Diffused studio light beams and tonal backdrop behind the glass card */}
      {!customBgImage && (
        <div
          aria-hidden="true"
          className="luxury-login-ambient-backdrop"
        />
      )}

      <div className="login-glass-card luxury-glass-card" style={{
        width: '100%',
        maxWidth: (Number(loginBranding.login_card_width) && Number(loginBranding.login_card_width) !== 520)
          ? `${Math.min(920, Math.max(320, Number(loginBranding.login_card_width)))}px`
          : 'clamp(480px, 44.5vw, 590px)',
        minHeight: 'clamp(395px, 36.5vw, 482px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: loginCardBackground,
        borderRadius: `${cardRadiusPx}px`,
        padding: (Number(loginBranding.login_card_padding) && Number(loginBranding.login_card_padding) !== 42)
          ? `${Math.min(100, Math.max(16, Number(loginBranding.login_card_padding)))}px`
          : 'clamp(48px, 4.1vw, 54px) clamp(40px, 3.83vw, 50.5px) clamp(30px, 2.95vw, 39px)',
        position: 'relative',
        zIndex: 1,
        color: '#382519',
        transform: `translateY(${-10.8 * loginScale}px) scale(${loginScale})`,
        transformOrigin: 'center center'
      }}>
        {/* Brand Crest */}
        <div style={{ textAlign: 'center', lineHeight: 0, marginBottom: 'clamp(32px, 4.05vw, 53px)', position: 'relative', zIndex: 2 }}>
          {loginBranding.login_logo_url || loginBranding.logo_url ? (
            <img 
              src={loginBranding.login_logo_url || loginBranding.logo_url || brandLogoImg}
              alt={loginBranding.brand_name || 'Maison BeYou Logo'}
              style={{
                height: (Number(loginBranding.login_logo_height) && Number(loginBranding.login_logo_height) !== 52)
                  ? `${Math.min(180, Math.max(24, Number(loginBranding.login_logo_height)))}px`
                  : 'clamp(60px, 5.6vw, 76px)',
                width: 'auto',
                maxWidth: '300px',
                objectFit: 'contain'
              }}
            />
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(18px, 2.05vw, 27px)' }}>
              <img
                src={brandLogoIcon}
                alt=""
                style={{
                  height: (Number(loginBranding.login_logo_height) && Number(loginBranding.login_logo_height) !== 52)
                    ? `${Math.min(180, Math.max(24, Number(loginBranding.login_logo_height)))}px`
                    : 'clamp(60px, 5.6vw, 74px)',
                  width: 'auto',
                  objectFit: 'contain'
                }}
              />
              <img
                src={brandLogoText}
                alt={loginBranding.brand_name || 'Maison BeYou'}
                style={{
                  height: (Number(loginBranding.login_logo_height) && Number(loginBranding.login_logo_height) !== 52)
                    ? `${Math.round(Math.min(180, Math.max(24, Number(loginBranding.login_logo_height))) * 0.78)}px`
                    : 'clamp(46px, 4.7vw, 62px)',
                  width: 'auto',
                  objectFit: 'contain',
                  filter: 'brightness(0) saturate(100%) invert(11%) sepia(32%) saturate(1380%) hue-rotate(342deg) brightness(93%) contrast(96%)'
                }}
              />
            </div>
          )}
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="login-success-alert" style={{
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
          <div className="login-error-alert" style={{
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative', zIndex: 1 }}>
          {/* STEP 1: Phone / Mobile Input */}
          {!otpSent ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '13px', paddingLeft: '11px' }}>
                <label htmlFor="login-mobile-input" style={{ fontSize: 'clamp(16px, 1.3vw, 18px)', fontWeight: '500', color: '#382519', letterSpacing: '-0.005em' }}>
                  {loginBranding.login_mobile_label || 'Registered Mobile Number'}
                </label>
              </div>

              <div style={{ position: 'relative' }}>
                <Phone size={20} strokeWidth={1.8} color="rgba(56, 37, 25, 0.82)" style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 2 }} />
                <span aria-hidden="true" style={{ position: 'absolute', left: '64px', top: '50%', transform: 'translateY(-50%)', height: '22px', borderLeft: '1px solid rgba(255, 255, 255, 0.78)', pointerEvents: 'none', zIndex: 2 }} />
                <input
                  id="login-mobile-input"
                  className="login-phone-input"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={identifier}
                  placeholder={loginBranding.login_mobile_placeholder || 'Enter phone number'}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setIdentifier(digitsOnly);
                    setError('');
                  }}
                  required
                  style={{
                    width: '100%',
                    padding: '18.5px 26px 18.5px 70px',
                    borderRadius: '9999px',
                    border: '1.5px solid rgba(255, 253, 250, 0.76)',
                    background: 'linear-gradient(90deg, rgba(255, 252, 248, 0.44) 0%, rgba(238, 222, 207, 0.34) 100%)',
                    outline: 'none',
                    fontSize: 'clamp(17px, 1.4vw, 20px)',
                    fontWeight: '400',
                    color: '#382519',
                    letterSpacing: '0.01em',
                    boxShadow: '0 4px 12px rgba(112, 82, 56, 0.06), inset 0 1px 3px rgba(128, 94, 64, 0.07), inset 0 -1px 1px rgba(255, 255, 255, 0.55)'
                  }}
                />
              </div>

              {/* Live Account Detection Badge */}
              {isDetecting && (
                <div style={{ fontSize: '11.5px', color: '#6E523B', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RotateCw size={12} className="spin" />
                  <span>Checking registered account...</span>
                </div>
              )}

              {detectedAccount?.found && detectedAccount.type === 'single' && (
                <div className="login-detected-account" style={{
                  marginTop: '14px',
                  background: 'rgba(255, 251, 246, 0.52)',
                  border: '1.5px solid rgba(255, 252, 248, 0.82)',
                  borderRadius: '18px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 4px 14px rgba(140, 108, 78, 0.08)'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '11px',
                    background: 'rgba(213, 164, 107, 0.18)',
                    border: '1px solid rgba(184, 139, 74, 0.36)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {getRoleIcon(detectedAccount.user?.role)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#382519' }}>
                        {detectedAccount.roleLabel}
                      </span>
                      <span style={{
                        fontSize: '9.5px',
                        fontWeight: '800',
                        background: 'linear-gradient(135deg, #F6E6CE 0%, #E7C89E 100%)',
                        color: '#46311C',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}>
                        Verified
                      </span>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6E523B',
                      fontWeight: '500',
                      marginTop: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {detectedAccount.branchName}
                    </div>
                  </div>
                </div>
              )}

              {detectedAccount?.found && detectedAccount.type === 'multiple' && (
                <div className="login-detected-account" style={{
                  marginTop: '14px',
                  background: 'rgba(255, 251, 246, 0.56)',
                  border: '1.5px solid rgba(255, 252, 248, 0.82)',
                  borderRadius: '18px',
                  padding: '14px 16px'
                }}>
                  <div style={{ fontSize: '10.5px', color: '#8C6228', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                    Identified Studio Branch
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#382519', marginBottom: '10px' }}>
                    {detectedAccount.branchName}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#6E523B', fontWeight: '500', marginBottom: '8px' }}>
                    Select desk to access for this session:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${detectedAccount.accounts?.length || 3}, 1fr)`, gap: '8px' }}>
                    {detectedAccount.accounts?.map((acc) => {
                      const isSelected = selectedAccountId === acc.user_id;
                      return (
                        <button
                          key={acc.user_id}
                          type="button"
                          onClick={() => {
                            setSelectedAccountId(acc.user_id);
                          }}
                          style={{
                            padding: '9px 6px',
                            borderRadius: '12px',
                            border: isSelected ? '1.5px solid #C89658' : '1px solid rgba(184, 139, 74, 0.25)',
                            background: isSelected ? 'rgba(246, 224, 194, 0.65)' : 'rgba(255, 255, 255, 0.45)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '3px',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#382519' }}>{acc.roleLabel}</span>
                          <span style={{ fontSize: '10px', color: '#6E523B' }}>{acc.name}</span>
                          <span style={{ fontSize: '9px', color: '#8A725E' }}>{acc.branch_name || detectedAccount.branchName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: OTP Verification */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Target Desk Summary Header */}
              <div style={{
                background: 'rgba(255, 251, 246, 0.56)',
                border: '1.5px solid rgba(255, 252, 248, 0.84)',
                borderRadius: '18px',
                padding: '13px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#8C6228', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Signing in as
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#382519', marginTop: '2px' }}>
                    {resolvedRoleLabel}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6E523B', fontWeight: '500' }}>
                    {resolvedBranchName}
                  </div>
                </div>
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
                    background: 'rgba(255, 255, 255, 0.65)',
                    border: '1px solid rgba(184, 139, 74, 0.38)',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#382519',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Change
                </button>
              </div>

              {/* OTP Input Field */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: '#382519' }}>
                    Enter 6-Digit OTP Code
                  </label>
                  {otpCooldown > 0 ? (
                    <span style={{ fontSize: '11.5px', color: '#8C6228', fontWeight: '600' }}>
                      Resend in <strong>{otpCooldown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={sendingOtp}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '0',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        color: '#8C6228',
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
                  <ShieldCheck size={16} color="#382519" style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 2 }} />
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
                      padding: '14px 44px 14px 46px',
                      borderRadius: '9999px',
                      border: '1.5px solid rgba(255, 253, 250, 0.88)',
                      background: 'rgba(255, 252, 249, 0.62)',
                      outline: 'none',
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#382519',
                      letterSpacing: '0.25em'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOtp(!showOtp)}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      padding: '6px',
                      cursor: 'pointer',
                      color: '#6E523B'
                    }}
                  >
                    {showOtp ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            className="luxury-gold-button"
            disabled={loading || sendingOtp}
            style={{
              width: '100%',
              padding: '17px 26px',
              fontSize: 'clamp(18px, 1.5vw, 20px)',
              fontWeight: '700',
              letterSpacing: '-0.01em',
              marginTop: '2px',
              borderRadius: `${buttonRadiusPx}px`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '9px',
              cursor: (loading || sendingOtp) ? 'not-allowed' : 'pointer',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease'
            }}
          >
            {loading ? 'Verifying...' : sendingOtp ? 'Sending Code...' : (
              <>
                {otpSent ? 'Verify & Open Desk' : ((!loginBranding.login_button_label || loginBranding.login_button_label === 'Continue to Studio Portal') ? 'Access Studio' : loginBranding.login_button_label)}
                <ArrowRight size={18} strokeWidth={2.2} />
              </>
            )}
          </button>
        </form>

        {/* Centered Bottom Line matching Reference */}
        <div style={{
          marginTop: 'clamp(25px, 2.6vw, 34px)',
          textAlign: 'center',
          fontSize: 'clamp(15px, 1.25vw, 16.5px)',
          fontWeight: '500',
          color: 'rgba(56, 37, 25, 0.88)',
          letterSpacing: '-0.005em',
          position: 'relative',
          zIndex: 2
        }}>
          <span>{loginBranding.login_footer_text || 'Maison BeYou Luxury Aesthetic Clinic & Salon'}</span>
        </div>
      </div>
    </div>
  );
}

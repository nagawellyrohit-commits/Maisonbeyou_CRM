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
  Sparkles, 
  AlertCircle, 
  RotateCw,
  Crown,
  UserCheck
} from 'lucide-react';
import { setStoredToken, setStoredUser, setStoredLocation } from '../utils/api';
import { brandingCssVariables, DEFAULT_LOCATION_BRANDING } from '../utils/branding';
import brandLogoImg from '../assets/brand-logo.png';
import loginBg from '../assets/login-bg.jpg';

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
  const [maskedContact, setMaskedContact] = useState('');
  const [resolvedAccountName, setResolvedAccountName] = useState('');
  const [resolvedBranchName, setResolvedBranchName] = useState('');
  const [resolvedRoleLabel, setResolvedRoleLabel] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);

  // General states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const otpInputRef = useRef(null);
  const selectedDetectedUser = detectedAccount?.type === 'multiple'
    ? detectedAccount.accounts?.find(account => account.user_id === selectedAccountId)
    : null;
  const accountBranding = selectedDetectedUser?.branding || detectedAccount?.branding;
  const loginBranding = accountBranding
    ? { ...accountBranding, ...masterPortalBranding }
    : { ...DEFAULT_LOCATION_BRANDING, ...masterPortalBranding };
  const loginCardOpacity = Math.min(100, Math.max(40, Number(loginBranding.login_card_opacity) || 96)) / 100;
  const loginCardColor = loginBranding.login_card_color || '#FFFCF7';
  const loginCardBackground = /^#[0-9a-f]{6}$/i.test(loginCardColor)
    ? `rgba(${parseInt(loginCardColor.slice(1, 3), 16)}, ${parseInt(loginCardColor.slice(3, 5), 16)}, ${parseInt(loginCardColor.slice(5, 7), 16)}, ${loginCardOpacity})`
    : loginCardColor;

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
    if (!trimmed) {
      setError('Please enter your registered mobile number');
      return;
    }

    setSendingOtp(true);
    try {
      const payload = {
        identifier: trimmed,
        role: detectedAccount?.type === 'multiple'
          ? detectedAccount.accounts?.find(account => account.user_id === selectedAccountId)?.role
          : detectedAccount?.user?.role,
        location_id: detectedAccount?.type === 'multiple'
          ? detectedAccount.accounts?.find(account => account.user_id === selectedAccountId)?.location_id
          : detectedAccount?.user?.location_id,
        account_user_id: selectedAccountId
      };

      const res = await fetch('/api/auth/send-login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await readApiResponse(res, 'OTP request');
      if (!res.ok) {
        throw new Error(data.error || 'No active account found. Please check your mobile number.');
      }

      setOtpSent(true);
      setMaskedContact(data.maskedContact || '');
      setResolvedAccountName(data.userName || '');
      setResolvedBranchName(data.locationName || '');
      setResolvedRoleLabel(
        data.userRole === 'master_admin' ? 'Maison Master Admin' :
        data.userRole === 'admin' ? 'Branch Main Admin' :
        data.userRole === 'reception' ? 'Manager' : 'Visitor'
      );
      setDemoOtp(data.demoOtp || '');
      setOtpCooldown(60);
      setSuccessMsg(data.smsSent
        ? `Verification code sent to registered mobile: ${data.maskedContact || 'Authorized contact'}`
        : `SMS delivery is not configured. Use the demo code shown below to continue.`);
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
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        identifier: identifier.trim(),
        otp: otp.trim(),
        role: detectedAccount?.type === 'multiple'
          ? detectedAccount.accounts?.find(account => account.user_id === selectedAccountId)?.role
          : detectedAccount?.user?.role,
        location_id: detectedAccount?.type === 'multiple'
          ? detectedAccount.accounts?.find(account => account.user_id === selectedAccountId)?.location_id
          : detectedAccount?.user?.location_id,
        account_user_id: selectedAccountId
      };

      const res = await fetch('/api/auth/login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
        return <Crown size={18} color="#FFFFFF" />;
      case 'admin':
        return <Building2 size={18} color="#FFFFFF" />;
      case 'reception':
        return <Store size={18} color="#FFFFFF" />;
      case 'visitor':
      default:
        return <Laptop size={18} color="#FFFFFF" />;
    }
  };


  return (
    <div className="brand-login-shell" style={{
      ...brandingCssVariables(loginBranding),
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: loginBranding.login_background_image_url || loginBranding.background_image_url
        ? `url(${loginBranding.login_background_image_url || loginBranding.background_image_url})`
        : `url(${loginBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      padding: '24px 16px',
      position: 'relative',
      backgroundColor: loginBranding.login_background_color || loginBranding.background_color
    }}>
      <div style={{
        width: '100%',
        maxWidth: `${Math.min(760, Math.max(320, Number(loginBranding.login_card_width) || 520))}px`,
        background: loginCardBackground,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: `${loginBranding.login_card_radius ?? loginBranding.card_radius}px`,
        boxShadow: '0 25px 60px -15px rgba(90, 60, 20, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.8) inset, 0 10px 30px -5px rgba(0, 0, 0, 0.05)',
        border: `${Math.max(0, Number(loginBranding.login_card_border_width ?? loginBranding.card_border_width) || 0)}px solid ${loginBranding.login_card_border_color || loginBranding.card_border_color}`,
        backgroundColor: loginCardBackground,
        padding: `${Math.min(80, Math.max(16, Number(loginBranding.login_card_padding) || 42))}px 40px`,
        position: 'relative',
        color: loginBranding.text_color
      }}>
        {/* Brand Crest */}
        <div style={{ textAlign: 'center', marginBottom: '34px' }}>
          <img 
            src={loginBranding.login_logo_url || loginBranding.logo_url || brandLogoImg}
            alt={loginBranding.brand_name || 'Maison BeYou Logo'}
            style={{
              height: `${Math.min(160, Math.max(24, Number(loginBranding.login_logo_height) || 52))}px`,
              width: 'auto',
              maxWidth: '220px',
              objectFit: 'contain'
            }}
          />
          {loginBranding.brand_name && detectedAccount?.found && (
            <div style={{ marginTop: 8, color: loginBranding.login_heading_color || loginBranding.heading_color, fontSize: 16, fontWeight: 700 }}>{loginBranding.brand_name}</div>
          )}
        </div>

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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* STEP 1: Phone / Mobile Input */}
          {!otpSent ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '11px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: loginBranding.login_subtext_color || loginBranding.subtext_color }}>
                  {loginBranding.login_mobile_label || 'Registered Mobile Number'}
                </label>
              </div>

              <div style={{ position: 'relative' }}>
                <Phone size={17} color={loginBranding.login_primary_color || loginBranding.primary_color} style={{ position: 'absolute', left: '14px', top: '14px' }} />
                <input
                  className="login-phone-input"
                  type="text"
                  value={identifier}
                  placeholder={loginBranding.login_mobile_placeholder || 'Enter phone number'}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError('');
                  }}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '15px 14px 15px 42px',
                    borderRadius: '12px',
                    border: `1.5px solid ${loginBranding.login_input_border_color || '#DAC493'}`,
                    background: '#FFFFFF',
                    outline: 'none',
                    fontSize: '14.5px',
                    fontWeight: '600',
                    color: loginBranding.login_text_color || loginBranding.text_color,
                    boxShadow: '0 2px 8px rgba(184, 139, 74, 0.08)'
                  }}
                />
              </div>

              {/* Live Account Detection Badge */}
              {isDetecting && (
                <div style={{ fontSize: '11.5px', color: '#8C6228', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RotateCw size={12} className="spin" />
                  <span>Checking registered account...</span>
                </div>
              )}

              {detectedAccount?.found && detectedAccount.type === 'single' && (
                <div style={{
                  marginTop: '12px',
                  background: detectedAccount.isMasterAdmin 
                    ? 'linear-gradient(135deg, #FAF4E6 0%, #F5E8D0 100%)' 
                    : 'linear-gradient(135deg, #FAF6EE 0%, #F3EDE0 100%)',
                  border: '1.5px solid #DAC493',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 3px 10px rgba(140, 98, 40, 0.08)'
                }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                  background: 'linear-gradient(135deg, #C9A56F 0%, #B88B4A 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(140, 98, 40, 0.25)'
                  }}>
                    {getRoleIcon(detectedAccount.user?.role)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#1C1917' }}>
                        {detectedAccount.roleLabel}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        background: '#EEDBBE',
                        color: '#6A491A',
                        padding: '1px 6px',
                        borderRadius: '6px',
                        textTransform: 'uppercase'
                      }}>
                        Verified
                      </span>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#8C6228',
                      fontWeight: '600',
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
                <div style={{
                  marginTop: '12px',
                  background: '#FAF6EE',
                  border: '1.5px solid #DAC493',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  boxShadow: '0 3px 10px rgba(140, 98, 40, 0.08)'
                }}>
                  <div style={{ fontSize: '11px', color: '#8C6228', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Identified Studio Branch
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#1C1917', marginBottom: '10px' }}>
                    {detectedAccount.branchName}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#57534E', fontWeight: '600', marginBottom: '8px' }}>
                    Select desk to access for this session:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${detectedAccount.accounts?.length || 3}, 1fr)`, gap: '6px' }}>
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
                            padding: '8px 4px',
                            borderRadius: '8px',
                            border: isSelected ? '1.5px solid #B88B4A' : '1px solid #E2D7C5',
                            background: isSelected ? '#FAF3E3' : '#FFFFFF',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '3px',
                            cursor: 'pointer',
                            boxShadow: isSelected ? '0 2px 6px rgba(184, 139, 74, 0.15)' : 'none'
                          }}
                        >
                          <span style={{ fontSize: '11.5px', fontWeight: '700', color: isSelected ? '#8C6228' : '#44403C' }}>{acc.roleLabel}</span>
                          <span style={{ fontSize: '10px', color: '#78716C' }}>{acc.name}</span>
                          <span style={{ fontSize: '9px', color: '#A8A29E' }}>{acc.branch_name || detectedAccount.branchName}</span>
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
                background: 'linear-gradient(135deg, #FAF6EE 0%, #F5E8D0 100%)',
                border: '1.5px solid #DAC493',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#8C6228', fontWeight: '700', textTransform: 'uppercase' }}>
                    Signing in as
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#1C1917', marginTop: '2px' }}>
                    {resolvedRoleLabel}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#57534E', fontWeight: '600' }}>
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
                    background: '#FFFFFF',
                    border: '1px solid #DAC493',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#8C6228',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Change
                </button>
              </div>

              {/* OTP Input Field */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917' }}>
                    Enter 6-Digit OTP Code
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
                    color: '#8C6228',
                    marginTop: '8px'
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
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading || sendingOtp}
            style={{
              width: '100%',
              padding: '16px 18px',
              fontSize: '14px',
              fontWeight: '700',
              marginTop: '14px',
              background: loginBranding.login_primary_color || loginBranding.primary_color,
              color: loginBranding.login_button_text_color || '#FFFFFF',
              border: 'none',
              borderRadius: `${loginBranding.login_button_radius ?? 12}px`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: (loading || sendingOtp) ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(184, 139, 74, 0.18)',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? 'Verifying...' : sendingOtp ? 'Sending Code...' : (
              <>
                {otpSent ? 'Verify & Open Desk' : (loginBranding.login_button_label || 'Continue to Studio Portal')}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>


        {/* Footer */}
        <div style={{
          marginTop: '25px',
          textAlign: 'center',
          fontSize: '11px',
          color: loginBranding.login_subtext_color || loginBranding.subtext_color,
          opacity: 0.8
        }}>
          <span>{loginBranding.login_footer_text || 'Maison BeYou Luxury Aesthetic Clinic & Salon'}</span>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, User, LogOut, LayoutDashboard, Users, Scissors, Award, BarChart3, ChevronDown, Menu, Phone, Mail, ShieldCheck } from 'lucide-react';
import { getStoredUser, setStoredToken, setStoredUser } from '../utils/api';
import logoImg from '../assets/logo.png';
import brandLogoImg from '../assets/brand-logo.png';

export default function Navbar({ activeTab, setActiveTab, currentUser, setCurrentUser, activeVisitClient, onResetVisit }) {
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);
  const [showDashboardConfirm, setShowDashboardConfirm] = useState(false);
  const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);
  const switchMenuRef = useRef(null);
  const clientMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (switchMenuRef.current && !switchMenuRef.current.contains(event.target)) {
        setShowSwitchMenu(false);
      }
      if (clientMenuRef.current && !clientMenuRef.current.contains(event.target)) {
        setIsClientMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setStoredToken(null);
    setStoredUser(null);
    setCurrentUser(null);
  };

  const handleQuickSwitch = async (roleEmail, rolePass) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: roleEmail, password: rolePass })
      });
      const data = await res.json();
      if (res.ok) {
        setStoredToken(data.token);
        setStoredUser(data.user);
        setCurrentUser(data.user);
        setShowSwitchMenu(false);
        if (onResetVisit) onResetVisit();
        if (data.user?.role === 'visitor') {
          setActiveTab('new-visit');
        } else {
          setActiveTab('dashboard');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const roleLabels = {
    admin: 'Administrator',
    reception: 'Reception Desk',
    visitor: 'Visitor Desk',
    staff: 'Staff Member'
  };

  const isAdmin = currentUser?.role === 'admin';

  const getClientInitials = (name) => {
    if (!name) return 'CL';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const formatClientPhone = (phone) => {
    if (!phone) return '';
    const clean = String(phone).replace(/\D/g, '');
    if (clean.length === 10) return `${clean.slice(0, 5)} ${clean.slice(5)}`;
    return phone;
  };

  return (
    <header style={{
      background: '#FFFFFF',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div className="header-container">
        {/* Brand identity */}
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <div 
            onClick={() => {
              if (currentUser?.role === 'visitor') {
                if (activeVisitClient) {
                  setShowDashboardConfirm(true);
                } else {
                  setActiveTab('new-visit');
                }
              } else if (activeTab !== 'dashboard') {
                setShowDashboardConfirm(true);
              } else {
                setActiveTab('dashboard');
              }
            }}
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            title={currentUser?.role === 'visitor' ? "Visitor Reception Flow" : "Maison BeYou Dashboard"}
          >
            <img 
              src={brandLogoImg} 
              alt="Maison BeYou" 
              className="navbar-brand-logo"
            />
          </div>
        </div>

        {/* Right side info & user controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          {/* Priority 1: When a Client is Active in the Visit Flow (visitor desk only)
              Display the Client Profile Pill (Image 2) in place of Visitor Desk (Image 3) */}
          {currentUser?.role === 'visitor' && activeVisitClient && activeVisitClient.name ? (
            <div ref={clientMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsClientMenuOpen(prev => !prev)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #1C1917 0%, #292524 100%)',
                  border: '1.5px solid #B88B4A',
                  padding: '5px 12px 5px 6px',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  boxShadow: '0 3px 12px rgba(184, 139, 74, 0.25)',
                  transition: 'all 0.2s ease',
                  color: '#FAF7F2',
                  maxWidth: '100%',
                  boxSizing: 'border-box'
                }}
                title="Click to view client profile, membership details, or log out"
              >
                {/* Avatar Icon / Initials */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: activeVisitClient.isMember
                    ? 'linear-gradient(135deg, #B88B4A 0%, #D4AF37 100%)'
                    : 'linear-gradient(135deg, #44403C 0%, #292524 100%)',
                  color: activeVisitClient.isMember ? '#1C1917' : '#FAF7F2',
                  fontWeight: '800',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #B88B4A',
                  letterSpacing: '0.04em',
                  flexShrink: 0
                }}>
                  {getClientInitials(activeVisitClient.name)}
                </div>

                {/* Name & Tier Info */}
                <div style={{ textAlign: 'left', lineHeight: 1.25, minWidth: 0, maxWidth: '140px', overflow: 'hidden' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#FAF7F2', display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeVisitClient.name}</span>
                    {activeVisitClient.isMember && <span style={{ fontSize: '12px' }}>💎</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: activeVisitClient.isMember ? '#DAC493' : '#A8A29E', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeVisitClient.isMember ? activeVisitClient.membershipTier : 'Non-Member'}</span>
                    <span>•</span>
                    <span style={{ fontFamily: 'monospace', color: activeVisitClient.isMember ? '#F5EADB' : '#E7E5E4' }}>{activeVisitClient.formattedId || activeVisitClient.client_id || 'MB-001'}</span>
                  </div>
                </div>

                {/* Chevron Indicator */}
                <ChevronDown
                  size={14}
                  style={{
                    color: '#DAC493',
                    marginLeft: '2px',
                    transform: isClientMenuOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease'
                  }}
                />
              </button>

              {/* Client Profile Dropdown Menu */}
              {isClientMenuOpen && (
                <div
                  className="animate-fade-in"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 10px)',
                    width: '340px',
                    maxWidth: 'calc(100vw - 32px)',
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1.5px solid #DAC493',
                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.18)',
                    padding: '18px 20px',
                    zIndex: 1000,
                    color: '#1C1917',
                    textAlign: 'left'
                  }}
                >
                  {/* 1. Client Dossier & Contact Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: activeVisitClient.isMember
                        ? 'linear-gradient(135deg, #B88B4A 0%, #D4AF37 100%)'
                        : 'linear-gradient(135deg, #292524 0%, #1C1917 100%)',
                      color: activeVisitClient.isMember ? '#1C1917' : '#FAF7F2',
                      fontWeight: '800',
                      fontSize: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1.5px solid #B88B4A',
                      boxShadow: '0 2px 8px rgba(184, 139, 74, 0.25)',
                      flexShrink: 0
                    }}>
                      {getClientInitials(activeVisitClient.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#1C1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {activeVisitClient.name} {activeVisitClient.surname || ''}
                        </div>
                        {activeVisitClient.formattedId && (
                          <span style={{
                            fontSize: '10.5px',
                            fontFamily: 'monospace',
                            fontWeight: '800',
                            letterSpacing: '0.04em',
                            color: activeVisitClient.isMember ? '#9F7335' : '#57534E',
                            background: activeVisitClient.isMember ? 'rgba(184, 139, 74, 0.14)' : '#F5F5F4',
                            border: `1px solid ${activeVisitClient.isMember ? 'rgba(184, 139, 74, 0.4)' : '#E7E5E4'}`,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            flexShrink: 0
                          }}>
                            {activeVisitClient.formattedId}
                          </span>
                        )}
                      </div>
                      {activeVisitClient.phone && (
                        <div style={{ fontSize: '12px', color: '#B88B4A', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Phone size={11} />
                          <span>{formatClientPhone(activeVisitClient.phone)}</span>
                        </div>
                      )}
                      {activeVisitClient.email && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                          <Mail size={10} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeVisitClient.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '8px 12px',
                    background: '#FAF7F2',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '16px',
                    fontSize: '11.5px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Client Type:</span>
                      <strong style={{ color: '#1C1917' }}>
                        {activeVisitClient.type === 'regular' ? 'Regular Client' : 'New Guest Profile'}
                      </strong>
                    </div>
                    <div style={{ height: '1px', background: 'var(--border-color)', opacity: 0.7 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>
                        {activeVisitClient.badgeLabel || (activeVisitClient.isMember ? 'Membership ID' : 'Client ID')}:
                      </span>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        fontWeight: '800',
                        letterSpacing: '0.05em',
                        color: activeVisitClient.isMember ? '#9F7335' : '#1C1917',
                        background: activeVisitClient.isMember ? '#FAF3E3' : '#FFFFFF',
                        border: `1px solid ${activeVisitClient.isMember ? '#DAC493' : '#E5E7EB'}`,
                        padding: '2px 8px',
                        borderRadius: '5px'
                      }}>
                        {activeVisitClient.formattedId || activeVisitClient.client_id || 'MB-001'}
                      </span>
                    </div>
                  </div>

                  {/* DIVIDER */}
                  <div style={{ height: '1px', background: 'var(--border-color)', marginBottom: '14px' }} />

                  {/* OPTION 1: Current Membership Status */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B88B4A', fontWeight: '800', marginBottom: '6px' }}>
                      1. Membership Status
                    </div>
                    {activeVisitClient.isMember ? (
                      <div style={{
                        background: 'linear-gradient(135deg, #FAF6EE 0%, #F5ECE0 100%)',
                        border: `1.5px solid ${activeVisitClient.expiryInfo?.isExpired ? '#FCA5A5' : (activeVisitClient.expiryInfo?.isExpiringSoon ? '#F59E0B' : '#DAC493')}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '800', color: '#1C1917', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>💎</span>
                            <span>{activeVisitClient.membershipTier}</span>
                          </span>
                          <span style={{
                            fontSize: '10px',
                            background: activeVisitClient.expiryInfo?.isExpired ? '#DC2626' : (activeVisitClient.expiryInfo?.isExpiringSoon ? '#D97706' : '#B88B4A'),
                            color: '#FFFFFF',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontWeight: '800'
                          }}>
                            {activeVisitClient.expiryInfo?.isExpired ? 'EXPIRED' : (activeVisitClient.expiryInfo?.isExpiringSoon ? `EXPIRES IN ${activeVisitClient.expiryInfo.daysRemaining}D` : 'ACTIVE VIP')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Membership ID:</span>
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            fontWeight: '800',
                            letterSpacing: '0.04em',
                            color: '#9F7335',
                            background: 'rgba(255, 255, 255, 0.9)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid #DAC493'
                          }}>
                            {activeVisitClient.formattedId}
                          </span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          {activeVisitClient.planInfo?.priceFormatted ? `${activeVisitClient.planInfo.priceFormatted} Package • ` : ''}
                          Exclusive VIP Privileges Active
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        background: '#FAF7F2',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#1C1917', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>⚪</span>
                            <span>Non-Member</span>
                          </span>
                          <span style={{ fontSize: '10px', background: '#E5E7EB', color: '#4B5563', padding: '2px 8px', borderRadius: '9999px', fontWeight: '700' }}>
                            NO ACTIVE PLAN
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Client ID:</span>
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            fontWeight: '800',
                            letterSpacing: '0.04em',
                            color: '#1C1917',
                            background: '#FFFFFF',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)'
                          }}>
                            {activeVisitClient.formattedId || activeVisitClient.client_id || 'MB-001'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          Client is visiting as a non-member.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* OPTION 2: Log Out Client */}
                  <div>
                    <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#DC2626', fontWeight: '800', marginBottom: '6px' }}>
                      2. Client Session
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsClientMenuOpen(false);
                        setShowDashboardConfirm(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: '#FEF2F2',
                        border: '1.5px solid #FCA5A5',
                        color: '#991B1B',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#FEE2E2';
                        e.currentTarget.style.borderColor = '#EF4444';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#FEF2F2';
                        e.currentTarget.style.borderColor = '#FCA5A5';
                      }}
                    >
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: '#DC2626',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <LogOut size={14} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#991B1B' }}>
                          Log Out Client Session
                        </div>
                        <div style={{ fontSize: '11px', color: '#B91C1C' }}>
                          Clear session & return to Visitor Desk
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (activeTab === 'dashboard' || currentUser?.role === 'visitor') ? (
            /* Visitor Desk or Dashboard User Profile pill (Image 3) */
            <div ref={switchMenuRef} style={{ position: 'relative' }}>
              <div 
                onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                className="navbar-user-pill"
                style={{
                  background: showSwitchMenu ? 'var(--bg-surface)' : 'transparent',
                }}
              >
                <div 
                  className="navbar-user-avatar"
                  style={{
                    background: currentUser?.role === 'visitor' ? '#ECFDF5' : (currentUser?.role === 'reception' ? '#EFF6FF' : 'var(--primary-subtle)'),
                    color: currentUser?.role === 'visitor' ? '#059669' : (currentUser?.role === 'reception' ? '#1D4ED8' : 'var(--primary-hover)'),
                  }}
                >
                  {currentUser?.name?.charAt(0) || (currentUser?.role === 'reception' ? 'R' : 'V')}
                </div>
                <div className="navbar-user-info">
                  <div className="navbar-user-name">
                    {currentUser?.name || (currentUser?.role === 'reception' ? 'Reception Desk' : 'Staff User')}
                  </div>
                  <div className="navbar-user-role">
                    {roleLabels[currentUser?.role] || currentUser?.role}
                  </div>
                </div>
                <ChevronDown size={14} color="var(--text-muted)" className="navbar-user-chevron" />
              </div>

              {/* Quick Switch Role Dropdown */}
              {showSwitchMenu && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  width: '260px',
                  maxWidth: 'calc(100vw - 32px)',
                  background: '#FFFFFF',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--border-color)',
                  padding: '10px',
                  zIndex: 100
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', padding: '6px 8px' }}>
                    Switch Active Role (Demo)
                  </div>
                  
                  <button
                    onClick={() => handleQuickSwitch('admin@maisonbeyou.com', 'admin123')}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '13px',
                      background: currentUser?.role === 'admin' ? 'var(--primary-subtle)' : 'transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>Maison Admin</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Admin • Full System & Edit Access</span>
                  </button>

                  <button
                    onClick={() => handleQuickSwitch('reception@maisonbeyou.com', 'reception123')}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '13px',
                      background: currentUser?.role === 'reception' ? 'var(--primary-subtle)' : 'transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>Reception Desk</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Staff • Dashboard & Client Intake</span>
                  </button>

                  <button
                    onClick={() => handleQuickSwitch('visitor@maisonbeyou.com', 'visitor123')}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '13px',
                      background: currentUser?.role === 'visitor' ? 'var(--primary-subtle)' : 'transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>Visitor Desk</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Visitor • Direct Client Intake Flow</span>
                  </button>

                  <div style={{ height: '1px', background: 'var(--border-color)', margin: '8px 0' }} />

                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '13px',
                      color: '#DC2626',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: '600'
                    }}
                  >
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* When on ANY OTHER page: Replace Reception/Admin profile with Dashboard Button */
            <button
              type="button"
              onClick={() => setShowDashboardConfirm(true)}
              title="Return to Main Dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 20px',
                borderRadius: '9999px',
                fontSize: '13.5px',
                fontWeight: '600',
                color: '#B88B4A',
                background: '#FAF6EE',
                border: '1.5px solid rgba(218, 196, 147, 0.55)',
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F5ECE0';
                e.currentTarget.style.borderColor = '#B88B4A';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FAF6EE';
                e.currentTarget.style.borderColor = 'rgba(218, 196, 147, 0.55)';
              }}
            >
              <LayoutDashboard size={16} color="#B88B4A" />
              <span>Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {/* Return to Dashboard / Client Session Confirmation Modal */}
      {showDashboardConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28, 25, 23, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1500,
          padding: '20px'
        }}>
          <div className="card animate-fade-in" style={{
            maxWidth: activeVisitClient ? '490px' : '450px',
            width: '100%',
            background: '#FFFFFF',
            borderRadius: '18px',
            padding: '28px 24px 24px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
            border: '1.5px solid #DAC493',
            textAlign: 'center'
          }}>
            {activeVisitClient ? (
              <>
                {/* Header Icon */}
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#FEF2F2',
                  border: '1.5px solid #FCA5A5',
                  margin: '0 auto 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DC2626'
                }}>
                  <LogOut size={24} />
                </div>

                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1C1917', marginBottom: '6px' }}>
                  Log Out Client Session?
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Do you want to log out the active client session and return to Dashboard? Any unsaved services will be cleared.
                </p>

                {/* Client Profile Card modeled after Image 2 */}
                <div style={{
                  border: '1.5px solid #DAC493',
                  borderRadius: '14px',
                  padding: '16px',
                  background: '#FFFFFF',
                  textAlign: 'left',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                  marginBottom: '16px'
                }}>
                  {/* Client Avatar, Name & Contact Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: activeVisitClient.isMember
                        ? 'linear-gradient(135deg, #B88B4A 0%, #D4AF37 100%)'
                        : 'linear-gradient(135deg, #292524 0%, #1C1917 100%)',
                      color: activeVisitClient.isMember ? '#1C1917' : '#FAF7F2',
                      fontWeight: '800',
                      fontSize: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1.5px solid #B88B4A',
                      boxShadow: '0 2px 8px rgba(184, 139, 74, 0.25)',
                      flexShrink: 0
                    }}>
                      {getClientInitials(activeVisitClient.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: '#1C1917' }}>
                          {activeVisitClient.name} {activeVisitClient.surname || ''}
                        </span>
                        {activeVisitClient.formattedId && (
                          <span style={{
                            fontSize: '10.5px',
                            fontFamily: 'monospace',
                            fontWeight: '800',
                            letterSpacing: '0.04em',
                            color: activeVisitClient.isMember ? '#9F7335' : '#57534E',
                            background: activeVisitClient.isMember ? 'rgba(184, 139, 74, 0.14)' : '#F5F5F4',
                            border: `1px solid ${activeVisitClient.isMember ? 'rgba(184, 139, 74, 0.4)' : '#E7E5E4'}`,
                            padding: '1px 6px',
                            borderRadius: '4px'
                          }}>
                            {activeVisitClient.formattedId}
                          </span>
                        )}
                      </div>
                      {activeVisitClient.phone && (
                        <div style={{ fontSize: '12px', color: '#B88B4A', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Phone size={11} />
                          <span>{formatClientPhone(activeVisitClient.phone)}</span>
                        </div>
                      )}
                      {activeVisitClient.email && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                          <Mail size={10} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeVisitClient.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Client Type & ID Row */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    padding: '8px 12px',
                    background: '#FAF7F2',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    fontSize: '11.5px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Client Type:</span>
                      <strong style={{ color: '#1C1917' }}>
                        {activeVisitClient.type === 'regular' ? 'Regular Client' : 'New Guest Profile'}
                      </strong>
                    </div>
                    {activeVisitClient.formattedId && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>
                          {activeVisitClient.badgeLabel || (activeVisitClient.isMember ? 'Membership ID' : 'Client ID')}:
                        </span>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '11.5px',
                          fontWeight: '800',
                          color: activeVisitClient.isMember ? '#9F7335' : '#1C1917',
                          background: activeVisitClient.isMember ? '#FAF3E3' : '#FFFFFF',
                          border: `1px solid ${activeVisitClient.isMember ? '#DAC493' : '#E5E7EB'}`,
                          padding: '1px 7px',
                          borderRadius: '4px'
                        }}>
                          {activeVisitClient.formattedId}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 1. Membership Status */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B88B4A', fontWeight: '800', marginBottom: '5px' }}>
                      1. Membership Status
                    </div>
                    {activeVisitClient.isMember ? (
                      <div style={{
                        background: 'linear-gradient(135deg, #FAF6EE 0%, #F5ECE0 100%)',
                        border: '1.5px solid #DAC493',
                        borderRadius: '8px',
                        padding: '10px 12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#1C1917', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>💎</span>
                            <span>{activeVisitClient.membershipTier}</span>
                          </span>
                          <span style={{ fontSize: '10px', background: '#B88B4A', color: '#FFFFFF', padding: '2px 8px', borderRadius: '9999px', fontWeight: '800' }}>
                            ACTIVE VIP
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {activeVisitClient.planInfo?.priceFormatted ? `${activeVisitClient.planInfo.priceFormatted} Package • ` : ''}Exclusive VIP Privileges Active
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        background: '#FAF7F2',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '10px 12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#1C1917', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>⚪</span>
                            <span>Non-Member</span>
                          </span>
                          <span style={{ fontSize: '10px', background: '#E5E7EB', color: '#4B5563', padding: '2px 8px', borderRadius: '9999px', fontWeight: '700' }}>
                            NO ACTIVE PLAN
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Client Session Action */}
                  <div>
                    <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#DC2626', fontWeight: '800', marginBottom: '5px' }}>
                      2. Client Session
                    </div>
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: '#FEF2F2',
                      border: '1.5px solid #FCA5A5',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#DC2626',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <LogOut size={13} />
                      </div>
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#991B1B' }}>
                          Log Out Client Session
                        </div>
                        <div style={{ fontSize: '11px', color: '#B91C1C' }}>
                          Exit and return to Dashboard (unsaved visit services will be cleared)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Staff User Persistent Status Note */}
                <div style={{
                  background: '#FAF6EE',
                  border: '1px solid #DAC493',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: '#78350F',
                  textAlign: 'left'
                }}>
                  <ShieldCheck size={16} color="#B88B4A" style={{ flexShrink: 0 }} />
                  <div>
                    You will remain logged in to CRM as <strong>{currentUser?.name || 'Reception Desk'}</strong> ({roleLabels[currentUser?.role] || currentUser?.role}).
                  </div>
                </div>

                {/* Modal Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowDashboardConfirm(false)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13.5px',
                      fontWeight: '600',
                      border: '1.5px solid var(--border-color)',
                      background: 'var(--bg-card-subtle)',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F5ECE0'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card-subtle)'}
                  >
                    No (Remain Here)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDashboardConfirm(false);
                      if (onResetVisit) {
                        onResetVisit();
                      } else {
                        setActiveTab(currentUser?.role === 'visitor' ? 'new-visit' : 'dashboard');
                      }
                    }}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13.5px',
                      fontWeight: '700',
                      border: 'none',
                      background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Yes (Log Out Client)
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Gold icon badge */}
                <div style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FAF6EE 0%, #F5ECE0 100%)',
                  border: '1.5px solid #DAC493',
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <LayoutDashboard size={26} color="#B88B4A" />
                </div>

                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1C1917', marginBottom: '8px' }}>
                  Return to Dashboard?
                </h3>

                <p style={{ fontSize: '14px', color: '#44403C', lineHeight: 1.55, marginBottom: '22px' }}>
                  Do you need to exit this page and return to the main Dashboard? Any unsaved progress will be cleared.
                  <br />
                  <span style={{ fontSize: '12.5px', color: '#B88B4A', marginTop: '8px', display: 'block', fontWeight: '600' }}>
                    You will remain logged in as {currentUser?.name || 'Reception Desk'} on the Dashboard.
                  </span>
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowDashboardConfirm(false)}
                    style={{
                      padding: '12px 18px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: '1.5px solid var(--border-color)',
                      background: 'var(--bg-card-subtle)',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F5ECE0'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card-subtle)'}
                  >
                    No (Remain Here)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDashboardConfirm(false);
                      setActiveTab(currentUser?.role === 'visitor' ? 'new-visit' : 'dashboard');
                    }}
                    style={{
                      padding: '12px 18px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '14px',
                      fontWeight: '700',
                      border: 'none',
                      background: 'linear-gradient(135deg, #B88B4A 0%, #9F7335 100%)',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(184, 139, 74, 0.35)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {currentUser?.role === 'visitor' ? 'Yes (Start Over)' : 'Yes (Return to Dashboard)'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

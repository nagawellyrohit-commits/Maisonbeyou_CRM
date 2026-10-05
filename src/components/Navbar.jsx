import React, { useState } from 'react';
import { Sparkles, Calendar, User, LogOut, LayoutDashboard, PlusCircle, Users, Scissors, Award, BarChart3, ChevronDown } from 'lucide-react';
import { getStoredUser, setStoredToken, setStoredUser } from '../utils/api';

export default function Navbar({ activeTab, setActiveTab, currentUser, setCurrentUser }) {
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

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
      }
    } catch (e) {
      console.error(e);
    }
  };

  const todayDisplay = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const roleLabels = {
    admin: 'Administrator',
    reception: 'Reception Desk',
    therapist: 'Therapist / Staff',
    manager: 'Studio Manager'
  };

  const canManageServices = currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const canViewReports = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  return (
    <header style={{
      background: '#FFFFFF',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{
        maxWidth: '1420px',
        margin: '0 auto',
        padding: '0 24px',
        height: '72px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div 
            onClick={() => setActiveTab('dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          >
            <img 
              src="/logo.png" 
              alt="Maison BeYou Logo" 
              style={{
                width: '44px',
                height: '44px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 6px rgba(184, 139, 74, 0.2))'
              }}
            />
            <div>
              <div style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '20px',
                fontWeight: '700',
                letterSpacing: '0.04em',
                color: '#1C1917',
                lineHeight: 1.1
              }}>
                MAISON BEYOU
              </div>
              <div style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                color: '#B88B4A',
                fontWeight: '600'
              }}>
                Aesthetic Studio & CRM
              </div>
            </div>
          </div>

          {/* Navigation links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontWeight: activeTab === 'dashboard' ? '600' : '500',
                color: activeTab === 'dashboard' ? '#B88B4A' : 'var(--text-muted)',
                background: activeTab === 'dashboard' ? 'var(--primary-subtle)' : 'transparent'
              }}
            >
              <LayoutDashboard size={17} />
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('new-visit')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontWeight: '600',
                color: '#FFFFFF',
                background: 'linear-gradient(135deg, #B88B4A 0%, #9F7335 100%)',
                boxShadow: '0 2px 8px rgba(184, 139, 74, 0.25)',
                margin: '0 4px'
              }}
            >
              <PlusCircle size={17} />
              + New Visit
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontWeight: activeTab === 'clients' ? '600' : '500',
                color: activeTab === 'clients' ? '#B88B4A' : 'var(--text-muted)',
                background: activeTab === 'clients' ? 'var(--primary-subtle)' : 'transparent'
              }}
            >
              <Users size={17} />
              Clients
            </button>

            {canManageServices && (
              <button
                onClick={() => setActiveTab('services')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '14px',
                  fontWeight: activeTab === 'services' ? '600' : '500',
                  color: activeTab === 'services' ? '#B88B4A' : 'var(--text-muted)',
                  background: activeTab === 'services' ? 'var(--primary-subtle)' : 'transparent'
                }}
              >
                <Scissors size={17} />
                Services
              </button>
            )}

            {canManageServices && (
              <button
                onClick={() => setActiveTab('staff')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '14px',
                  fontWeight: activeTab === 'staff' ? '600' : '500',
                  color: activeTab === 'staff' ? '#B88B4A' : 'var(--text-muted)',
                  background: activeTab === 'staff' ? 'var(--primary-subtle)' : 'transparent'
                }}
              >
                <Award size={17} />
                Staff
              </button>
            )}

            {canViewReports && (
              <button
                onClick={() => setActiveTab('reports')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '14px',
                  fontWeight: activeTab === 'reports' ? '600' : '500',
                  color: activeTab === 'reports' ? '#B88B4A' : 'var(--text-muted)',
                  background: activeTab === 'reports' ? 'var(--primary-subtle)' : 'transparent'
                }}
              >
                <BarChart3 size={17} />
                Reports
              </button>
            )}
          </nav>
        </div>

        {/* Right side info & user controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Date indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: 'var(--text-muted)',
            padding: '6px 12px',
            background: 'var(--bg-card-subtle)',
            borderRadius: '9999px',
            border: '1px solid var(--border-color)'
          }}>
            <Calendar size={14} color="#B88B4A" />
            <span>{todayDisplay}</span>
          </div>

          {/* User profile & switch menu */}
          <div style={{ position: 'relative' }}>
            <div 
              onClick={() => setShowSwitchMenu(!showSwitchMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                background: showSwitchMenu ? 'var(--bg-surface)' : 'transparent',
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--primary-subtle)',
                color: 'var(--primary-hover)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '13px'
              }}>
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                  {currentUser?.name || 'Staff User'}
                </div>
                <div style={{ fontSize: '11px', color: '#B88B4A', fontWeight: '500' }}>
                  {roleLabels[currentUser?.role] || currentUser?.role}
                </div>
              </div>
              <ChevronDown size={14} color="var(--text-muted)" />
            </div>

            {/* Quick Switch Role Dropdown */}
            {showSwitchMenu && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: '260px',
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
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    background: currentUser?.role === 'admin' ? 'var(--primary-subtle)' : 'transparent',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <span style={{ fontWeight: '600' }}>Maison Admin</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Admin • Full Access</span>
                </button>

                <button
                  onClick={() => handleQuickSwitch('reception@maisonbeyou.com', 'reception123')}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    background: currentUser?.role === 'reception' ? 'var(--primary-subtle)' : 'transparent',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <span style={{ fontWeight: '600' }}>Reception Desk</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Clients, Billing & Visits</span>
                </button>

                <button
                  onClick={() => handleQuickSwitch('therapist@maisonbeyou.com', 'therapist123')}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    background: currentUser?.role === 'therapist' ? 'var(--primary-subtle)' : 'transparent',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <span style={{ fontWeight: '600' }}>Dr. Ananya Sharma</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Therapist • Assigned Services</span>
                </button>

                <button
                  onClick={() => handleQuickSwitch('manager@maisonbeyou.com', 'manager123')}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    background: currentUser?.role === 'manager' ? 'var(--primary-subtle)' : 'transparent',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <span style={{ fontWeight: '600' }}>Studio Manager</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Manager • Reports & History</span>
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
        </div>
      </div>
    </header>
  );
}

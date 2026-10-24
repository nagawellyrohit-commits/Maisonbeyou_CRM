import React, { useState, useEffect } from 'react';
import { Building2, Handshake, LogOut } from 'lucide-react';
import studioBg from '../assets/studio-bg.png';
import { apiRequest } from '../utils/api';

export default function StudioManagement({ currentUser, onSelectType, onLogout }) {
  const [counts, setCounts] = useState({ branchCount: 2, franchiseCount: 2, totalLocations: 4 });
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/locations/summary');
      if (res) {
        setCounts({
          branchCount: res.branchCount || 0,
          franchiseCount: res.franchiseCount || 0,
          totalLocations: res.totalLocations || 0
        });
      }
    } catch (e) {
      console.error('Error fetching location summary:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('selected_location');
      window.location.reload();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.62), rgba(0, 0, 0, 0.62)), url(${studioBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-sans)',
      position: 'relative'
    }}>
      {/* Top-Right Floating Luxury Logout Button */}
      <button
        type="button"
        onClick={handleLogoutClick}
        title="Sign Out of Session"
        style={{
          position: 'absolute',
          top: 'clamp(16px, 3vh, 28px)',
          right: 'clamp(16px, 3vw, 32px)',
          zIndex: 20,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '9px 18px',
          borderRadius: '9999px',
          background: 'rgba(26, 20, 15, 0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(218, 196, 147, 0.35)',
          color: '#E8D5B5',
          fontSize: '13px',
          fontWeight: '600',
          letterSpacing: '0.03em',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
          transition: 'all 0.25s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(220, 38, 38, 0.25)';
          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.6)';
          e.currentTarget.style.color = '#FFFFFF';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 6px 24px rgba(220, 38, 38, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(26, 20, 15, 0.65)';
          e.currentTarget.style.borderColor = 'rgba(218, 196, 147, 0.35)';
          e.currentTarget.style.color = '#E8D5B5';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.35)';
        }}
      >
        <LogOut size={15} style={{ strokeWidth: 2 }} />
        <span>Log Out</span>
      </button>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(36px, 5vh, 60px) 24px',
        position: 'relative',
        zIndex: 2,
        width: '100%'
      }}>
        {/* Header matching user reference */}
        <div className="concierge-header" style={{ marginBottom: 'clamp(28px, 4vh, 42px)' }}>
          <h1 className="concierge-title" style={{ letterSpacing: '0.14em' }}>
            STUDIO MANAGEMENT
          </h1>

          <div className="concierge-subtitle-wrap">
            <div className="concierge-divider-line" style={{ background: 'linear-gradient(90deg, transparent, #C59A58)' }} />
            <span className="concierge-subtitle">
              your personalised journey awaits
            </span>
            <div className="concierge-divider-line" style={{ background: 'linear-gradient(90deg, #C59A58, transparent)' }} />
          </div>
        </div>

        {/* Selection Cards Grid */}
        <div className="concierge-cards-grid" style={{ maxWidth: '820px', width: '100%', margin: '0 auto' }}>
          {/* CARD 1: Branches (Company-Owned) */}
          <div
            onClick={() => onSelectType('branch')}
            className="concierge-luxury-card"
          >
            {/* Icon Medallion */}
            <div className="concierge-icon-medallion">
              <Building2 size={28} strokeWidth={1.8} />
            </div>

            {/* Card Title */}
            <h2 className="concierge-card-title">
              BRANCHES
            </h2>

            {/* Card Subtitle */}
            <p className="concierge-card-desc">
              manage company-owned studio locations
            </p>

            {/* Luxury Action Button - Gold */}
            <div className="concierge-action-btn concierge-action-btn-gold">
              <span>GET STARTED</span>
            </div>
          </div>

          {/* CARD 2: Franchises (Franchise-Operated) */}
          <div
            onClick={() => onSelectType('franchise')}
            className="concierge-luxury-card"
          >
            {/* Icon Medallion */}
            <div className="concierge-icon-medallion">
              <Handshake size={28} strokeWidth={1.8} />
            </div>

            {/* Card Title */}
            <h2 className="concierge-card-title">
              FRANCHISES
            </h2>

            {/* Card Subtitle */}
            <p className="concierge-card-desc">
              monitor franchise partner performance
            </p>

            {/* Luxury Action Button - Dark */}
            <div className="concierge-action-btn concierge-action-btn-dark">
              <span>CONTINUE</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

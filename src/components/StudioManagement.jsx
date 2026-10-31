import React, { useState, useEffect } from 'react';
import { Building2, Handshake, LogOut, Menu, Palette } from 'lucide-react';
import studioBg from '../assets/studio-bg.png';
import { apiRequest } from '../utils/api';
import { masterPortalCssVariables } from '../utils/branding';
import BrandingCustomizer from './BrandingCustomizer';

export default function StudioManagement({ currentUser, onSelectType, onLogout, branding, onPreviewBranding, onSaveBranding }) {
  const [counts, setCounts] = useState({ branchCount: 2, franchiseCount: 2, totalLocations: 4 });
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

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

  const overlayOpacity = Math.min(90, Math.max(0, Number(branding?.master_overlay_opacity ?? 62))) / 100;

  return (
    <div className="master-portal-themed studio-management-screen" style={{
      ...masterPortalCssVariables(branding),
      minHeight: '100vh',
      backgroundColor: branding?.master_background_color || '#2C211B',
      backgroundImage: `linear-gradient(rgba(0, 0, 0, ${overlayOpacity}), rgba(0, 0, 0, ${overlayOpacity})), url(${branding?.master_background_image_url || studioBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-sans)',
      position: 'relative'
    }}>
      {branding?.master_logo_url && <img src={branding.master_logo_url} alt={branding.brand_name || 'Brand logo'} style={{ position: 'absolute', top: 24, left: 28, height: 58, maxWidth: 220, objectFit: 'contain', zIndex: 5 }} />}
      <div style={{ position: 'absolute', top: 'clamp(16px, 3vh, 28px)', right: 'clamp(16px, 3vw, 32px)', zIndex: 20 }}>
        <button type="button" aria-label="Open master portal menu" onClick={() => setShowMenu(value => !value)} style={{ width: 42, height: 42, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, color: '#E8D5B5', background: 'rgba(26,20,15,.72)', border: '1px solid rgba(218,196,147,.45)', cursor: 'pointer' }}>
          <Menu size={19} />
        </button>
        {showMenu && <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 220, padding: 8, background: '#FFFFFF', border: '1px solid #E5D8C6', borderRadius: 10, boxShadow: '0 16px 40px rgba(0,0,0,.2)' }}>
          <button type="button" onClick={() => { setShowMenu(false); window.dispatchEvent(new Event('open_master_portal_customizer')); }} style={masterMenuItemStyle}>
            <Palette size={15} /> Customize
          </button>
          <div style={{ height: 1, background: '#E7DED2', margin: '5px 0' }} />
          <button type="button" onClick={handleLogoutClick} style={{ ...masterMenuItemStyle, color: '#B42318' }}>
            <LogOut size={15} /> {branding?.master_logout_label || 'Sign Out'}
          </button>
        </div>}
      </div>

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
            {branding?.master_studio_heading || 'STUDIO MANAGEMENT'}
          </h1>

          <div className="concierge-subtitle-wrap">
            <div className="concierge-divider-line" style={{ background: 'linear-gradient(90deg, transparent, #C59A58)' }} />
            <span className="concierge-subtitle">
              {branding?.master_studio_subtitle || 'your personalised journey awaits'}
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
              {branding?.master_branches_title || 'BRANCHES'}
            </h2>

            {/* Card Subtitle */}
            <p className="concierge-card-desc">
              {branding?.master_branches_subtitle || 'manage company-owned studio locations'}
            </p>

            {/* Luxury Action Button - Gold */}
            <div className="concierge-action-btn concierge-action-btn-gold">
              <span>{branding?.master_branches_button || 'GET STARTED'}</span>
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
              {branding?.master_franchises_title || 'FRANCHISES'}
            </h2>

            {/* Card Subtitle */}
            <p className="concierge-card-desc">
              {branding?.master_franchises_subtitle || 'monitor franchise partner performance'}
            </p>

            {/* Luxury Action Button - Dark */}
            <div className="concierge-action-btn concierge-action-btn-dark">
              <span>{branding?.master_franchises_button || 'CONTINUE'}</span>
            </div>
          </div>
        </div>
      </main>
      <BrandingCustomizer scope="master" section="studio_management" showMasterLoginTab location={{ name: 'Master Portal' }} initialBranding={branding} onPreview={onPreviewBranding} onSaved={onSaveBranding} />
    </div>
  );
}

const masterMenuItemStyle = { width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 7, fontSize: 13, fontWeight: 700, color: '#9F7335', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, border: 'none', cursor: 'pointer' };

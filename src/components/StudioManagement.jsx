import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Menu, Palette } from 'lucide-react';
import studioBg from '../assets/studio-bg.png';
import { apiRequest } from '../utils/api';
import { masterPortalCssVariables } from '../utils/branding';
import BrandingCustomizer from './BrandingCustomizer';
import brandLogoImg from '../assets/brand-logo.png';

export default function StudioManagement({ currentUser, onSelectType, onSelectRevenue, onLogout, branding, onPreviewBranding, onSaveBranding }) {
  const [counts, setCounts] = useState({ branchCount: 2, franchiseCount: 2, totalLocations: 4 });
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = event => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      backgroundColor: '#F7F3ED',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-sans)',
      position: 'relative'
    }}>
      <header style={{ background: '#FFFFFF', borderBottom: '1px solid #E5D8C6', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 2px 10px rgba(44, 33, 27, 0.04)' }}>
        <div className="header-container">
          <img src={branding?.master_logo_url || brandLogoImg} alt={branding?.brand_name || 'Maison BeYou'} className="navbar-brand-logo" />
          <div ref={menuRef} style={{ position: 'relative', zIndex: 20 }}>
            <button type="button" aria-label="Open master portal menu" aria-expanded={showMenu} onClick={() => setShowMenu(value => !value)} style={{ width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, color: '#A8793D', background: '#FFFFFF', border: '1px solid #D8BD91', cursor: 'pointer' }}>
              <Menu size={18} strokeWidth={1.8} />
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
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        padding: 0,
        position: 'relative',
        zIndex: 2,
        width: '100%'
      }}>
        <section className="studio-management-hero" style={{
          minHeight: `${Math.min(680, Math.max(280, Number(branding?.master_hero_height) || 430))}px`,
          backgroundColor: branding?.master_background_color || '#2C211B',
          backgroundImage: `linear-gradient(rgba(0, 0, 0, ${overlayOpacity}), rgba(0, 0, 0, ${overlayOpacity})), url(${branding?.master_background_image_url || studioBg})`,
          backgroundSize: `100% 100%, ${Math.min(180, Math.max(100, Number(branding?.master_background_width) || 100))}% auto`,
          backgroundPosition: `center, ${Math.min(100, Math.max(0, Number(branding?.master_background_position_x ?? 50)))}% ${Math.min(100, Math.max(0, Number(branding?.master_background_position_y ?? 52)))}%`
        }}>
          <div className="studio-management-hero-content">
            <span className="studio-management-hero-eyebrow">MAISON BEYOU · MASTER PORTAL</span>
            <h1>{branding?.master_studio_heading || 'STUDIO MANAGEMENT'}</h1>
            <div className="studio-management-hero-rule" />
            <p>{branding?.master_studio_subtitle || 'your personalised journey awaits'}</p>
          </div>
        </section>

        <nav className="studio-management-nav" aria-label="Studio management sections">
          <div className="studio-management-breadcrumb"><span>HOME</span><span className="studio-management-breadcrumb-separator">›</span><strong>STUDIO MANAGEMENT</strong></div>
          <div className="studio-management-nav-links">
            <button type="button" onClick={() => onSelectType('branch')}>{branding?.master_branches_title || 'BRANCHES'}</button>
            <button type="button" onClick={() => onSelectType('franchise')}>{branding?.master_franchises_title || 'FRANCHISES'}</button>
            <button type="button" onClick={() => onSelectRevenue('branch')}>{branding?.master_branch_revenue_title || 'BRANCH REVENUE'}</button>
            <button type="button" onClick={() => onSelectRevenue('franchise')}>{branding?.master_franchise_revenue_title || 'FRANCHISE REVENUE'}</button>
          </div>
        </nav>
      </main>
      <BrandingCustomizer scope="master" section="studio_management" showMasterLoginTab location={{ name: 'Master Portal' }} initialBranding={branding} onPreview={onPreviewBranding} onSaved={onSaveBranding} />
    </div>
  );
}

const masterMenuItemStyle = { width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 7, fontSize: 13, fontWeight: 700, color: '#9F7335', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, border: 'none', cursor: 'pointer' };

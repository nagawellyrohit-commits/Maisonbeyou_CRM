import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, Store, Handshake, ArrowLeft, Plus, MapPin, Phone, Mail, User, Scissors, Crown, UserCheck, Award,
  CheckCircle2, Clock, ArrowRight, X, AlertCircle, AlertTriangle, Sparkles, Shield, ShieldCheck,
  ChevronRight, Users, Briefcase, ChevronDown, LogOut, TrendingUp, TrendingDown, Minus,
  Calendar, BarChart3, Menu, Palette
} from 'lucide-react';
import brandLogoImg from '../assets/brand-logo.png';
import studioBg from '../assets/studio-bg.png';
import { apiRequest, formatCurrency } from '../utils/api';
import BranchFranchiseKYCModal from './BranchFranchiseKYCModal';
import LocationDateFilterModal, { formatISO, formatDisplayDate } from './LocationDateFilterModal';
import ReportsView from './ReportsView';
import MasterAdminReportsDashboard from './MasterAdminReportsDashboard';
import { masterPortalCssVariables } from '../utils/branding';
import BrandingCustomizer from './BrandingCustomizer';
import CentralMasterCatalog from './CentralMasterCatalog';
import ServiceManagement from './ServiceManagement';
import MembershipManagement from './MembershipManagement';
import LoyaltyManagement from './LoyaltyManagement';

const FIRM_TYPES = ['Proprietor', 'Partnership', 'Pvt. Ltd.', 'LLP'];

export function formatStudioCode(loc, sequence) {
  if (!loc) return 'MB-B-LOC-001';
  const validCode = loc.code && loc.code.match(/^(MB-[BF]-[A-Z]{3})-(\d{3})$/);
  const prefix = validCode?.[1] || (() => {
    const cleanType = (loc.type || 'branch').trim().toLowerCase();
    const typeChar = cleanType === 'franchise' ? 'F' : 'B';
    const cityCode = (loc.city || 'LOC').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'LOC';
    return `MB-${typeChar}-${cityCode}`;
  })();
  const sequenceNumber = sequence ?? (validCode ? Number(validCode[2]) : Number(loc.location_id) || 1);
  return `${prefix}-${String(sequenceNumber).padStart(3, '0')}`;
}

export function formatStudioTitle(loc) {
  let raw = (loc?.name || '').trim();
  raw = raw
    .replace(/\((?:Proprietor|Partnership|Pvt\.?\s*Ltd\.?|LLP|Updated\s*&\s*Verified|Updated|Verified)\)/gi, '')
    .replace(/\b\d{10,}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) {
    const city = (loc?.city || 'Flagship').trim();
    const suffix = (loc?.type || 'branch').toLowerCase() === 'franchise' ? 'Franchise' : 'Studio';
    return `Maison BeYou — ${city} ${suffix}`;
  }
  if (/^maison\s*beyou/i.test(raw)) {
    return raw.replace(/^maison\s*beyou\s*[-–—]?\s*/i, 'Maison BeYou — ');
  }
  return `Maison BeYou — ${raw}`;
}

export function formatStudioAddress(loc) {
  const addr = (loc?.address || [loc?.kyc?.address_line1, loc?.kyc?.address_line2].filter(Boolean).join(', ') || 'Road No. 36, Jubilee Hills').trim();
  const city = (loc?.city || loc?.kyc?.city || 'Hyderabad').trim();
  const state = (loc?.state || loc?.kyc?.state || 'Telangana').trim();
  const defaultPinByCity = {
    hyderabad: '500033',
    mumbai: '400050',
    bengaluru: '560038',
    bangalore: '560038',
    pune: '411001'
  };
  const pincode = (loc?.pincode || loc?.kyc?.pincode || defaultPinByCity[city.toLowerCase()] || '500033').trim();
  const base = [addr, city, state].filter(Boolean).join(', ');
  return pincode ? `${base} - ${pincode}` : base;
}

export function formatStudioPhone(loc) {
  const rawPhone = String(loc?.phone || '').trim();
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  const last10 = digits.length >= 10 ? digits.slice(-10) : '';
  if (last10.length === 10) {
    return `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;
  }
  return rawPhone;
}

export function formatStudioManager(loc) {
  return String(loc?.manager_name || '').trim();
}

const getReturnTierConfig = (tier = 'Good', dailyIncome = 0) => {
  let effectiveTier = tier;
  if (!effectiveTier || !['Good', 'Average', 'Low'].includes(effectiveTier)) {
    const income = Number(dailyIncome) || 0;
    if (income >= 35000) effectiveTier = 'Good';
    else if (income >= 15000) effectiveTier = 'Average';
    else effectiveTier = 'Low';
  }

  switch (effectiveTier) {
    case 'Good':
      return {
        tier: 'Good',
        label: 'Good',
        fullLabel: 'Good Return',
        bg: '#F3EDE4',
        border: '#E5D8C6',
        color: '#2C211B',
        dot: '#C6A36A',
        icon: TrendingUp
      };
    case 'Average':
      return {
        tier: 'Average',
        label: 'Average',
        fullLabel: 'Average Return',
        bg: '#F3EDE4',
        border: '#E5D8C6',
        color: '#2C211B',
        dot: '#796B5D',
        icon: Minus
      };
    case 'Low':
    default:
      return {
        tier: 'Low',
        label: 'Low',
        fullLabel: 'Low Return',
        bg: '#F3EDE4',
        border: '#E5D8C6',
        color: '#2C211B',
        dot: '#796B5D',
        icon: AlertTriangle
      };
  }
};

const FIRM_CARDS = [
  {
    type: 'Proprietor',
    titleKey: 'master_firm_proprietor_title',
    descriptionKey: 'master_firm_proprietor_description',
    title: 'Proprietor',
    tagline: 'Sole Proprietorship',
    desc: 'individual proprietorship studio operations',
    icon: User
  },
  {
    type: 'Partnership',
    titleKey: 'master_firm_partnership_title',
    descriptionKey: 'master_firm_partnership_description',
    title: 'Partnership',
    tagline: 'Partnership Firm',
    desc: 'joint partner-owned studio operations',
    icon: Users
  },
  {
    type: 'Pvt. Ltd.',
    titleKey: 'master_firm_pvt_ltd_title',
    descriptionKey: 'master_firm_pvt_ltd_description',
    title: 'Pvt. Ltd.',
    tagline: 'Private Limited Company',
    desc: 'corporate board-governed studio operations',
    icon: Store
  },
  {
    type: 'LLP',
    titleKey: 'master_firm_llp_title',
    descriptionKey: 'master_firm_llp_description',
    title: 'LLP',
    tagline: 'Limited Liability Partnership',
    desc: 'limited liability partnership studio operations',
    icon: ShieldCheck
  }
];

export default function LocationSelection({ type = 'branch', currentUser, onSelectLocation, onBack, onLogout, branding, onPreviewBranding, onSaveBranding, embedded = false, openAddRequest = null, onAddRequestHandled }) {
  const isBranch = type === 'branch';
  const typeLabel = isBranch ? 'Branch' : 'Franchise';
  const typePlural = isBranch ? 'Branches' : 'Franchises';

  const [locations, setLocations] = useState([]);
  const [storeTargets, setStoreTargets] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter for records view: 'All' | 'Proprietor' | 'Partnership' | 'Pvt. Ltd.' | 'LLP'
  const [filterFirmType, setFilterFirmType] = useState('All');

  // Main View: 'locations' (clean studio selection) | 'reports' (reports suite with Date & Firm Type filters)
  const [viewMode, setViewMode] = useState('locations');
  const [reportsSubTab, setReportsSubTab] = useState('overview'); // 'overview' | 'detailed'
  const [masterDataModule, setMasterDataModule] = useState('services');

  const openCentralMasterData = () => {
    setViewMode('master-data');
  };

  // Flow State: false = Image 2 (All Locations List), true = Image 3 (Select Firm Type to Add)
  const [isSelectingFirmTypeToAdd, setIsSelectingFirmTypeToAdd] = useState(false);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [kycModal, setKycModal] = useState({
    open: false,
    mode: 'create', // 'create' | 'edit'
    location: null,
    defaultType: type,
    defaultFirmType: 'Proprietor'
  });

  // Date Filter State for Performance Metrics
  const now = new Date();
  const todayISO = formatISO(now);
  const [dateFilter, setDateFilter] = useState({
    mode: 'today',
    title: 'Today',
    startDate: todayISO,
    endDate: todayISO,
    pillLabel: `Date :- Today (${formatDisplayDate(todayISO)})`,
    rangeDescription: `${formatDisplayDate(todayISO)} (1 day)`
  });
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);

  const fetchLocations = async (sDate = dateFilter.startDate, eDate = dateFilter.endDate) => {
    try {
      setLoading(true);
      setError('');
      let url = `/locations?type=${type}`;
      if (sDate && eDate) {
        url += `&startDate=${sDate}&endDate=${eDate}`;
      }
      const res = await apiRequest(url);
      if (res?.locations) {
        const newestFirst = [...res.locations].sort((a, b) => {
          const dateDifference = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
          return Number.isFinite(dateDifference) && dateDifference !== 0
            ? dateDifference
            : (Number(b.location_id) || 0) - (Number(a.location_id) || 0);
        });
        setLocations(newestFirst);
      }
    } catch (err) {
      console.error('Failed to load locations:', err);
      setError(err.message || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations(dateFilter.startDate, dateFilter.endDate);
    setFilterFirmType('All');
    setIsSelectingFirmTypeToAdd(false);
  }, [type]);

  useEffect(() => {
    if (openAddRequest?.requestId && openAddRequest.type === type) {
      setIsSelectingFirmTypeToAdd(false);
      setKycModal({
        open: true,
        mode: 'create',
        location: null,
        defaultType: openAddRequest.type,
        defaultFirmType: openAddRequest.firmType || 'Proprietor'
      });
      onAddRequestHandled?.(openAddRequest.requestId);
    }
  }, [openAddRequest, type, onAddRequestHandled]);

  useEffect(() => {
    if (!locations.length) {
      setStoreTargets({});
      return;
    }
    let cancelled = false;
    const monthKey = todayISO.slice(0, 7);
    Promise.all(locations.map(async location => {
      try {
        const target = await apiRequest(`/store-targets?period_type=monthly&period_key=${monthKey}&location_id=${location.location_id}`);
        return [location.location_id, target];
      } catch {
        return [location.location_id, null];
      }
    })).then(entries => {
      if (!cancelled) setStoreTargets(Object.fromEntries(entries));
    });
    return () => { cancelled = true; };
  }, [locations, todayISO]);

  const branchLocations = locations;

  const handleApplyDateFilter = (newFilter) => {
    setDateFilter(newFilter);
    fetchLocations(newFilter.startDate, newFilter.endDate);
  };

  const getFirmCount = (firm) => {
    return branchLocations.filter(loc => (loc.kyc?.firm_type || loc.firm_type) === firm).length;
  };

  const handleOpenAddModal = (targetFirmType = 'Proprietor') => {
    setIsSelectingFirmTypeToAdd(false);
    setKycModal({
      open: true,
      mode: 'create',
      location: null,
      defaultType: type,
      defaultFirmType: targetFirmType
    });
  };

  const handleOpenEditKyc = (loc) => {
    setIsSelectingFirmTypeToAdd(false);
    setKycModal({
      open: true,
      mode: 'edit',
      location: loc,
      defaultType: loc.type || type,
      defaultFirmType: loc.kyc?.firm_type || loc.firm_type || 'Proprietor'
    });
  };

  const handleQuickToggleReturnTier = async (e, loc) => {
    e.stopPropagation();
    const tiers = ['Good', 'Average', 'Low'];
    const currentIdx = tiers.indexOf(loc.return_tier || 'Low');
    const nextTier = tiers[(currentIdx + 1) % tiers.length];

    try {
      await apiRequest(`/locations/${loc.location_id}`, {
        method: 'PUT',
        body: JSON.stringify({ return_tier: nextTier })
      });
      fetchLocations();
    } catch (err) {
      console.error('Failed to update return tier:', err);
    }
  };

  // In locations view, display all locations cleanly; in reports view, filter by selected firm type
  const displayedLocations = (viewMode === 'reports' && filterFirmType !== 'All')
    ? branchLocations.filter(loc => (loc.kyc?.firm_type || loc.firm_type) === filterFirmType)
    : branchLocations;

  // Aggregate metrics for Reports View
  const reportLocations = filterFirmType === 'All'
    ? branchLocations
    : branchLocations.filter(loc => (loc.kyc?.firm_type || loc.firm_type) === filterFirmType);

  const totalReportRevenue = reportLocations.reduce((sum, loc) => sum + Number(loc.daily_income || 0), 0);
  const totalReportFootfall = reportLocations.reduce((sum, loc) => sum + Number(loc.footfall || 0), 0);
  const goodTiersCount = reportLocations.filter(loc => (loc.return_tier || '').toLowerCase() === 'good').length;
  const avgTiersCount = reportLocations.filter(loc => (loc.return_tier || '').toLowerCase() === 'average').length;
  const lowTiersCount = reportLocations.filter(loc => (loc.return_tier || '').toLowerCase() === 'low').length;

  return (
    <div className={`master-portal-themed location-selection-screen ${viewMode === 'locations' ? 'branch-selection-page-light' : ''} ${embedded ? 'embedded-location-selection' : ''}`} style={{
      ...masterPortalCssVariables(branding),
      minHeight: embedded ? 'auto' : '100vh',
      backgroundColor: embedded ? 'transparent' : (branding?.master_background_color || '#F7F3ED'),
      backgroundImage: embedded ? 'none' : viewMode === 'locations' || viewMode === 'master-data'
        ? (branding?.master_background_image_url ? `url(${branding.master_background_image_url})` : 'none')
        : `linear-gradient(180deg, rgba(44, 33, 27, 0.78) 0%, rgba(44, 33, 27, 0.70) 280px, rgba(44, 33, 27, 0.65) 100%), url(${studioBg}) center / cover fixed`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-sans)'
    }}>
      {/* Top Header - Pixel-aligned with Image 1 Navbar */}
      {!embedded && <>
      <header style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid #E5D8C6',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 2px 10px rgba(44, 33, 27, 0.04)'
      }}>
        <div className="header-container">
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img
              src={branding?.master_logo_url || brandLogoImg}
              alt={branding?.brand_name || 'Maison BeYou'}
              className="navbar-brand-logo"
            />
          </div>

          {/* Master Admin Menu */}
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              aria-label="Open Master Admin menu"
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
                width: '40px',
                height: '40px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #D8BD91',
                borderRadius: '8px',
                color: '#A8793D',
                background: showUserMenu ? '#FAF6EE' : '#FFFFFF',
                cursor: 'pointer',
                transition: 'background 0.15s ease, border-color 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FAF6EE'; e.currentTarget.style.borderColor = '#B88B4A'; }}
              onMouseLeave={e => { e.currentTarget.style.background = showUserMenu ? '#FAF6EE' : '#FFFFFF'; e.currentTarget.style.borderColor = '#D8BD91'; }}
            >
              <Menu size={18} strokeWidth={1.8} />
            </button>

            {showUserMenu && (
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
                  Current Session
                </div>
                <div style={{ padding: '8px 10px', fontSize: '13px' }}>
                  <div style={{ fontWeight: '700', color: '#1C1917' }}>{currentUser?.name || 'Maison Master Admin'}</div>
                  <div style={{ fontSize: '11px', color: '#9F7335', fontWeight: '600' }}>Master Administrator</div>
                </div>
                <div style={{ height: '1px', background: 'var(--border-color)', margin: '8px 0' }} />
                <button type="button" onClick={() => { setShowUserMenu(false); setViewMode('reports'); }} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: '#9F7335', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', background: 'none', border: 'none', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.background = '#FAF6EE'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  <BarChart3 size={15} />
                  <span>{branding?.master_reports_label || 'Reports'}</span>
                </button>
                <div style={{ height: '1px', background: 'var(--border-color)', margin: '8px 0' }} />
                <button type="button" onClick={() => { setShowUserMenu(false); openCentralMasterData(); }} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: '#9F7335', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', background: 'none', border: 'none', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.background = '#FAF6EE'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  <Scissors size={15} />
                  <span>Master data</span>
                </button>
                <div style={{ height: '1px', background: 'var(--border-color)', margin: '8px 0' }} />
                <button type="button" onClick={() => { setShowUserMenu(false); window.dispatchEvent(new Event('open_master_portal_customizer')); }} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: '#9F7335', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.background = '#FAF6EE'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  <Palette size={15} />
                  <span>Customize</span>
                </button>
                <div style={{ height: '1px', background: 'var(--border-color)', margin: '8px 0' }} />
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '13px',
                      color: '#DC2626',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: '600',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#FEF2F2'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <LogOut size={15} />
                    <span>{branding?.master_logout_label || 'Sign Out'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      </>}

      {/* Main Container - Aligned with Image 1 app-container */}
      <main className="app-container" style={{ flex: 1, maxWidth: embedded ? '1304px' : undefined, padding: embedded ? '40px 0 48px' : '44px var(--container-padding-x) 60px' }}>
        {error && (
          <div style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger-text)',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            fontSize: '14px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {kycModal.open ? (
          <BranchFranchiseKYCModal
            isOpen={kycModal.open}
            embedded={embedded}
            onClose={() => setKycModal(prev => ({ ...prev, open: false }))}
            onSuccess={async (savedLoc) => {
              setKycModal(prev => ({ ...prev, open: false }));
              await fetchLocations();
            }}
            defaultType={kycModal.defaultType || type}
            defaultFirmType={kycModal.defaultFirmType || 'Proprietor'}
            locationToEdit={kycModal.location}
          />
        ) : isSelectingFirmTypeToAdd ? (
          /* ======================================================== */
          /* STEP 3 (IMAGE 3): SELECT FIRM TYPE FOR ADDING A BRANCH   */
          /* ======================================================== */
          <div style={{ paddingTop: '40px', paddingBottom: '32px' }}>
            <div style={{ marginBottom: '28px' }}>
              <button
                type="button"
                onClick={() => setIsSelectingFirmTypeToAdd(false)}
                className="btn-luxury-header-action"
              >
                <ArrowLeft size={16} />
                <span>Back to {typePlural}</span>
              </button>
            </div>

            {/* Header for Firm Type Selection */}
            <div style={{ marginBottom: '44px' }}>
              <h1 style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '28px',
                fontWeight: '500',
                color: 'var(--master-heading, #2C211B)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                margin: 0,
                textShadow: '0 2px 14px rgba(0,0,0,0.75)'
              }}>
                {branding?.master_firm_type_heading || 'Select Firm Type'}
              </h1>
              <div style={{ width: '42px', height: '2px', background: '#C6A36A', borderRadius: '2px', marginTop: '12px' }} />
            </div>

            {/* Grid of the Four Firm Types - Full width and perfectly aligned */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
              gap: '24px',
              width: '100%'
            }}>
              {FIRM_CARDS.map((card) => {
                const Icon = card.icon;
                const description = branding?.[card.descriptionKey] || card.desc;
                const hasOperationsEnding = /\s+operations$/i.test(description);
                return (
                  <div
                    key={card.type}
                    onClick={() => handleOpenAddModal(card.type)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleOpenAddModal(card.type);
                      }
                    }}
                    className="concierge-luxury-card firm-type-registration-card"
                    role="button"
                    tabIndex={0}
                    style={{
                      minHeight: '290px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      background: branding?.master_firm_card_fill || '#FFFFFF',
                      border: `1.5px solid ${branding?.master_firm_card_border || '#D99A64'}`
                    }}
                  >
                    {/* Top Content: Medallion, Title, Description */}
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div className="concierge-icon-medallion" style={{ background: branding?.master_firm_icon_fill || '#FAF0E4', color: branding?.master_firm_icon_color || '#A6733D', borderColor: branding?.master_firm_card_border || '#D99A64' }}>
                        <Icon size={28} strokeWidth={1.8} />
                      </div>

                      <h2 className="concierge-card-title">
                        {(branding?.[card.titleKey] || card.title).toUpperCase()}
                      </h2>

                      <p className="concierge-card-desc" style={{ minHeight: '38px', margin: '0 0 20px 0', color: branding?.master_firm_card_text_color || '#4B4038' }}>
                        {hasOperationsEnding ? <>{description.replace(/\s+operations$/i, '')}<br />operations</> : description}
                      </p>
                    </div>

                    {/* Luxury Action Button - Warm Gold Finish (Matching Image 1) */}
                    <button
                      type="button"
                      className="concierge-action-btn concierge-action-btn-gold"
                      onClick={event => {
                        event.stopPropagation();
                        handleOpenAddModal(card.type);
                      }}
                      style={{ background: branding?.master_firm_button_fill || '#A0723E', color: branding?.master_firm_button_text || '#FFFFFF', border: 0, cursor: 'pointer' }}
                    >
                      <span>{isBranch ? (branding?.master_register_branch_label || 'REGISTER BRANCH') : (branding?.master_register_franchise_label || 'REGISTER FRANCHISE')}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* STEP 2 (IMAGE 2): ALL BRANCHES WITH FIRM TYPE FILTERS   */
          /* ======================================================== */
          <div>
            {/* Top Navigation Row in Locations View */}
            {viewMode === 'locations' && (
              <>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  paddingTop: embedded ? '0' : '40px',
                  marginBottom: '28px'
                }}>
                  {onBack && !embedded ? (
                    <button
                      type="button"
                      onClick={onBack}
                      className="btn-luxury-header-action"
                    >
                      <ArrowLeft size={16} />
                      <span>{branding?.master_back_label || 'Back to Studio Management'}</span>
                    </button>
                  ) : <div />}

                </div>

                {/* Heading: All Branches */}
                <div style={{ marginBottom: '36px' }}>
                  <h1 style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '28px',
                    fontWeight: '500',
                    color: '#2C211B',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    margin: 0,
                    textShadow: 'none'
                  }}>
                    {branding?.master_locations_heading || (isBranch ? 'All Branches' : 'All Franchises')}
                  </h1>
                  <div style={{ width: '42px', height: '2px', background: '#C6A36A', borderRadius: '2px', marginTop: '12px' }} />
                </div>
              </>
            )}

            {/* Master Admin Reports Dashboard or Branch Locations Grid */}
            {viewMode === 'master-data' ? (
              <section className="master-data-content" style={{ width: '100%', maxWidth: 1360, boxSizing: 'border-box', margin: '0 auto 48px', padding: '0 0 24px', background: 'transparent', border: 'none', borderRadius: 0, boxShadow: 'none' }}>
                <button type="button" onClick={() => setViewMode('locations')} className="btn-luxury-header-action" style={{ marginBottom: 22 }}><ArrowLeft size={15} /> Back to {isBranch ? 'All Branches' : 'All Franchises'}</button>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.13em', color: '#A97735', textTransform: 'uppercase' }}>Master administration</div>
                <h2 style={{ margin: '6px 0', color: '#302820', fontSize: 26 }}>Central master data</h2>
                <p style={{ margin: '0 0 18px', color: '#786D62', lineHeight: 1.55 }}>Manage the shared master catalog here. During branch or franchise setup, choose which of these lists to copy into the new location.</p>
                <div role="tablist" aria-label="Master data type" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 205px), 1fr))', gap: 14, margin: '28px 0 30px' }}>
                  {[
                    { id: 'services', eyebrow: 'SERVICES', label: 'Service catalog', icon: Scissors },
                    { id: 'membership', eyebrow: 'MEMBERSHIP', label: 'Plans & privileges', icon: Crown },
                    { id: 'loyalty', eyebrow: 'LOYALTY', label: 'Points & rewards', icon: Award },
                    { id: 'designation', eyebrow: 'DESIGNATION', label: 'Seniority levels', icon: UserCheck },
                    { id: 'hierarchy', eyebrow: 'HIERARCHY', label: 'Brand reporting', icon: Award }
                  ].map(tab => {
                    const Icon = tab.icon;
                    const selected = masterDataModule === tab.id;
                    return (
                      <button key={tab.id} type="button" role="tab" aria-selected={selected} onClick={() => setMasterDataModule(tab.id)} style={{ minHeight: 132, padding: '18px 20px', border: `1.5px solid ${selected ? '#2C2926' : '#D99A64'}`, borderRadius: 22, background: selected ? '#FAF6EE' : '#FFFFFF', color: '#51463D', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: selected ? '0 5px 16px rgba(54,39,25,.08)' : '0 3px 10px rgba(54,39,25,.025)', transition: 'border-color .16s ease, transform .16s ease, box-shadow .16s ease' }} onMouseEnter={event => { event.currentTarget.style.transform = 'translateY(-2px)'; event.currentTarget.style.boxShadow = '0 8px 20px rgba(54,39,25,.09)'; }} onMouseLeave={event => { event.currentTarget.style.transform = 'none'; event.currentTarget.style.boxShadow = selected ? '0 5px 16px rgba(54,39,25,.08)' : '0 3px 10px rgba(54,39,25,.025)'; }}>
                        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em' }}>{tab.eyebrow}</span>
                          <span style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 12, background: '#F4EEE5', color: '#6F5D4D' }}><Icon size={19} /></span>
                        </span>
                        <span style={{ fontSize: 17, lineHeight: 1.25, fontWeight: 750 }}>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
                {masterDataModule === 'services'
                  ? <ServiceManagement masterCatalogMode />
                  : masterDataModule === 'membership'
                    ? <MembershipManagement masterCatalogMode />
                    : masterDataModule === 'loyalty'
                      ? <LoyaltyManagement />
                      : <CentralMasterCatalog activeTab={masterDataModule} currentUser={currentUser} />}
              </section>
            ) : viewMode === 'reports' ? (
              <MasterAdminReportsDashboard onBack={() => setViewMode('locations')} />
            ) : loading ? (
              <div style={{ textAlign: 'center', padding: '64px 20px', color: '#78716C' }}>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>Loading {typePlural.toLowerCase()}...</div>
              </div>
            ) : embedded ? (
              <div style={{ width: '100%', overflowX: 'auto', background: branding?.master_card_color || '#FFFFFF', border: `1px solid ${branding?.master_border_color || '#E7D8C4'}`, borderRadius: `${Number(branding?.master_card_radius) || 18}px`, boxShadow: '0 5px 20px rgba(87,58,32,.045)' }}>
                <table style={{ width: '100%', minWidth: 850, borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: `color-mix(in srgb, ${branding?.master_primary_color || '#B88B4A'} 9%, #FFFFFF)`, color: branding?.master_text_color || '#51463D', fontSize: 12 }}>
                      {[
                        branding?.master_table_number_heading || 'No.',
                        branding?.master_table_name_heading || `${typeLabel} Name`,
                        branding?.master_table_address_heading || 'Full Address',
                        branding?.master_table_target_heading || 'Store Target',
                        branding?.master_table_type_heading || `${typeLabel} Type`,
                        branding?.master_table_status_heading || 'Status',
                        branding?.master_table_action_heading || 'Action'
                      ].map(label => <th key={label} style={{ padding: '14px 16px', borderBottom: '1px solid #E7D8C4', fontWeight: 750, whiteSpace: 'nowrap' }}>{label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {displayedLocations.map((loc, branchIndex) => {
                      const locFirmType = loc.kyc?.firm_type || loc.firm_type || 'Proprietor';
                      const locationName = String(loc.name || '').replace(/^maison\s*beyou\s*[—–-]\s*/i, '').trim() || loc.city || `${typeLabel} Location`;
                      const target = storeTargets[loc.location_id];
                      const targetAmount = Number(target?.target_amount) || 0;
                      const actualAmount = Number(target?.actual_amount) || 0;
                      const targetStatus = targetAmount > 0 ? (actualAmount >= targetAmount ? 'High' : 'Low') : 'Not Set';
                      const targetColor = targetStatus === 'High' ? '#13805C' : targetStatus === 'Low' ? '#B54708' : '#786D62';
                      return <tr key={loc.location_id} style={{ borderBottom: `1px solid ${branding?.master_border_color || '#EEE6DC'}`, color: branding?.master_text_color || '#51463D', fontSize: 13 }}>
                        <td style={{ padding: '15px 16px', fontWeight: 800 }}>{branchIndex + 1}</td>
                        <td style={{ padding: '15px 16px', fontWeight: 750, color: '#302820' }}>{typeLabel} - {locationName}</td>
                        <td style={{ padding: '15px 16px', minWidth: 270, lineHeight: 1.5 }}>{formatStudioAddress(loc)}</td>
                        <td style={{ padding: '15px 16px', color: targetColor, fontWeight: 750, whiteSpace: 'nowrap' }}>{targetStatus === 'High' ? '↑ ' : targetStatus === 'Low' ? '↓ ' : ''}{targetStatus}{targetAmount > 0 && <div style={{ marginTop: 3, color: '#786D62', fontSize: 11, fontWeight: 500 }}>{formatCurrency(actualAmount)} / {formatCurrency(targetAmount)}</div>}</td>
                        <td style={{ padding: '15px 16px', whiteSpace: 'nowrap' }}>{locFirmType}</td>
                        <td style={{ padding: '15px 16px' }}>{loc.status || 'Active'}</td>
                        <td style={{ padding: '15px 16px' }}><button type="button" onClick={() => onSelectLocation(loc)} aria-label={`Open ${formatStudioTitle(loc)}`} style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', border: '1px solid #D99A64', borderRadius: '50%', background: '#F3EDE4', color: '#9F7335', cursor: 'pointer' }}><ArrowRight size={17} /></button></td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Grid of Matching Records */
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
                gap: '24px'
              }}>
                {/* 1. FIXED FIRST CARD: + ADD RECORD CARD */}
                <div
                  onClick={() => setIsSelectingFirmTypeToAdd(true)}
                  style={{
                    background: '#FFFDF9',
                    borderRadius: '22px',
                    border: '1px solid #D99A64',
                    padding: '32px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
                    minHeight: '300px',
                    height: '100%',
                    boxSizing: 'border-box',
                    boxShadow: '0 6px 18px rgba(87, 58, 32, 0.06)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.background = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#C6A36A';
                    e.currentTarget.style.boxShadow = '0 16px 32px -8px rgba(198, 163, 106, 0.22)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.background = '#FFFDF9';
                    e.currentTarget.style.borderColor = '#D99A64';
                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(87, 58, 32, 0.06)';
                  }}
                >
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: '#F3EDE4',
                    border: '1.5px solid #E5D8C6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#C6A36A',
                    marginBottom: '14px',
                    boxShadow: '0 4px 12px rgba(44, 33, 27, 0.05)'
                  }}>
                    <Plus size={24} strokeWidth={2.2} />
                  </div>

                  <div style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#2C211B',
                    marginBottom: '6px',
                    fontFamily: 'var(--font-sans)'
                  }}>
                    + Add {typeLabel}
                  </div>

                  <p style={{
                    fontSize: '12.5px',
                    color: '#796B5D',
                    margin: 0,
                    maxWidth: '240px',
                    lineHeight: 1.45,
                    fontFamily: 'var(--font-sans)'
                  }}>
                    Choose firm type and register a new {typeLabel.toLowerCase()} with preselected statutory KYC details.
                  </p>
                </div>

                {/* Empty State Card if no locations match the filter */}
                {displayedLocations.length === 0 && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(6px)',
                    borderRadius: '20px',
                    border: '1.5px solid rgba(218, 196, 147, 0.45)',
                    padding: '36px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    minHeight: '260px',
                    boxSizing: 'border-box'
                  }}>
                    <ShieldCheck size={28} color="#9F7335" style={{ marginBottom: '12px' }} />
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#1C1917', marginBottom: '6px' }}>
                      No {filterFirmType === 'All' ? '' : `${filterFirmType} `}{typePlural} Registered
                    </div>
                    <p style={{ fontSize: '12.5px', color: '#78716C', margin: 0, maxWidth: '240px', lineHeight: 1.45 }}>
                      Click the + Add {typeLabel} card to register your first location under this category.
                    </p>
                  </div>
                )}

                {/* 2. LOCATION CARDS */}
                {displayedLocations.map((loc, branchIndex) => {
                  const locFirmType = loc.kyc?.firm_type || loc.firm_type || 'Proprietor';
                  const branchBranding = loc.branding || {};
                  const locationName = String(loc.name || '').replace(/^maison\s*beyou\s*[—–-]\s*/i, '').trim() || loc.city || `${typeLabel} Location`;
                  const storeTarget = storeTargets[loc.location_id];
                  const targetAmount = Number(storeTarget?.target_amount) || 0;
                  const actualAmount = Number(storeTarget?.actual_amount) || 0;
                  const targetStatus = targetAmount > 0 ? (actualAmount >= targetAmount ? 'High' : 'Low') : 'Not Set';
                  const targetColor = targetStatus === 'High' ? '#13805C' : targetStatus === 'Low' ? '#B54708' : '#786D62';
                  return (
                    <div
                      key={loc.location_id}
                      className="master-location-card"
                      style={{
                        background: branding?.master_card_color || branchBranding.card_color || '#FFFDF9',
                        backgroundImage: branchBranding.background_image_url
                          ? `linear-gradient(color-mix(in srgb, ${branchBranding.card_color || '#FFFDF9'} 84%, transparent), color-mix(in srgb, ${branchBranding.card_color || '#FFFDF9'} 84%, transparent)), url("${branchBranding.background_image_url}")`
                          : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderRadius: `${Number(branding?.master_card_radius ?? branchBranding.card_radius) || 22}px`,
                        border: `${Math.max(0, Number(branding?.master_border_width ?? branchBranding.card_border_width) || 0)}px solid ${branding?.master_border_color || branchBranding.card_border_color || '#D99A64'}`,
                        padding: '30px 28px 58px',
                        boxShadow: '0 6px 18px rgba(87, 58, 32, 0.06)',
                        cursor: 'default',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'all 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
                        position: 'relative',
                        minHeight: '300px',
                        height: '100%',
                        boxSizing: 'border-box'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.borderColor = '#C6A36A';
                        e.currentTarget.style.boxShadow = '0 16px 32px -8px rgba(198, 163, 106, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = '#D99A64';
                        e.currentTarget.style.boxShadow = '0 6px 18px rgba(87, 58, 32, 0.06)';
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                          <span style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: '50%', background: '#F3EDE4', border: '1px solid #D99A64', color: '#9F7335', fontSize: 14, fontWeight: 800 }}>{branchIndex + 1}</span>
                          <span style={{ color: '#796B5D', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{loc.status || 'Active'}</span>
                        </div>

                        {/* Studio Name */}
                        {branchBranding.logo_url && <img src={branchBranding.logo_url} alt={`${branchBranding.brand_name || loc.name} logo`} style={{ maxWidth: 120, height: 32, objectFit: 'contain', objectPosition: 'left center', margin: '2px 0 8px' }} />}
                        <h3 style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: branchBranding.heading_color || '#2C211B',
                          margin: '8px 0 20px 0',
                          lineHeight: 1.35,
                          letterSpacing: '-0.01em',
                          fontFamily: 'var(--font-sans)'
                        }}>
                          {typeLabel} - {locationName}
                        </h3>

                        {/* Address / Location */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#796B5D', fontSize: '12.5px', fontWeight: 500, marginBottom: '22px', lineHeight: 1.55, letterSpacing: '0.005em', fontFamily: "'Gotham', 'Montserrat', 'Plus Jakarta Sans', sans-serif" }}>
                          <MapPin size={14} color="#C6A36A" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>
                            {formatStudioAddress(loc)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 16px 22px', fontSize: 13, color: targetColor, fontWeight: 750 }}>
                          <span>Store target: {targetStatus}</span>
                          {targetAmount > 0 && <span style={{ color: '#796B5D', fontWeight: 500 }}>({formatCurrency(actualAmount)} / {formatCurrency(targetAmount)})</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#796B5D', fontSize: 13, fontWeight: 600, marginLeft: 22 }}>
                          <Shield size={14} color="#C6A36A" />
                          <span>{typeLabel} type: {locFirmType}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="branch-card-open-button"
                        aria-label={`Open ${formatStudioTitle(loc)}`}
                        onClick={() => onSelectLocation(loc)}
                        style={{
                          position: 'absolute',
                          right: '20px',
                          bottom: '18px',
                          width: '40px',
                          height: '40px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          border: '1px solid #D99A64',
                          background: '#F3EDE4',
                          color: '#9F7335',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        <ArrowRight size={19} strokeWidth={2} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
    </main>

    {/* Luxury Date Range Filter Modal (Today, Yesterday, Week, Month, Year, Custom) */}
    <LocationDateFilterModal
      isOpen={isDateModalOpen}
      onClose={() => setIsDateModalOpen(false)}
      currentFilter={dateFilter}
      onApply={handleApplyDateFilter}
    />
    {!embedded && <BrandingCustomizer scope="master" section="all_branches" location={{ name: 'Master Portal' }} initialBranding={branding} onPreview={onPreviewBranding} onSaved={onSaveBranding} />}
  </div>
);
}

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, Store, Handshake, ArrowLeft, Plus, MapPin, Phone, Mail, User,
  CheckCircle2, Clock, ArrowRight, X, AlertCircle, AlertTriangle, Sparkles, Shield, ShieldCheck,
  ChevronRight, Users, Briefcase, ChevronDown, LogOut, TrendingUp, TrendingDown, Minus,
  Calendar, BarChart3
} from 'lucide-react';
import brandLogoImg from '../assets/brand-logo.png';
import studioBg from '../assets/studio-bg.png';
import { apiRequest } from '../utils/api';
import BranchFranchiseKYCModal from './BranchFranchiseKYCModal';
import LocationDateFilterModal, { formatISO, formatDisplayDate } from './LocationDateFilterModal';
import ReportsView from './ReportsView';
import MasterAdminReportsDashboard from './MasterAdminReportsDashboard';

const FIRM_TYPES = ['Proprietor', 'Partnership', 'Pvt. Ltd.', 'LLP'];

export function formatStudioCode(loc) {
  if (!loc) return 'MB-B-LOC-001';
  if (loc.code && /^MB-[BF]-[A-Z]{3}-\d{3}$/.test(loc.code)) {
    return loc.code;
  }
  const cleanType = (loc.type || 'branch').trim().toLowerCase();
  const typeChar = cleanType === 'franchise' ? 'F' : 'B';
  const cityCode = (loc.city || 'LOC').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'LOC';
  const seqNum = String(loc.location_id || 1).padStart(3, '0');
  return `MB-${typeChar}-${cityCode}-${seqNum}`;
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
  const rawPhone = (
    loc?.phone ||
    loc?.primary_login_phone ||
    loc?.kyc?.primary_login_phone ||
    loc?.kyc?.mobile_numbers?.[0] ||
    '+91 98200 12345'
  ).trim();
  const digits = rawPhone.replace(/\D/g, '');
  const last10 = digits.length >= 10 ? digits.slice(-10) : '';
  if (last10.length === 10) {
    return `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;
  }
  return rawPhone || '+91 98200 12345';
}

export function formatStudioManager(loc) {
  let mgr = (loc?.manager_name || loc?.stakeholders?.[0]?.name || '').trim();
  mgr = mgr
    .replace(/^(?:Partner\s+(?:One|Two|Three|\d+)\s*[-–—:]\s*|Director\s+|Proprietor\s+)/i, '')
    .replace(/\bUpdated\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!mgr || /Test\s+Individual/i.test(mgr)) {
    const fallbackManagers = [
      'Ayesha Khan',
      'Vikram Rathore',
      'Karan Verma',
      'Tanvi Deshmukh',
      'Pooja Hegde',
      'Rohan Kulkarni',
      'Ananya Sharma',
      'Siddharth Malhotra'
    ];
    mgr = fallbackManagers[(Number(loc?.location_id || 1) - 1) % fallbackManagers.length];
  }
  return mgr;
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
    title: 'Proprietor',
    tagline: 'Sole Proprietorship',
    desc: 'individual proprietorship studio operations',
    icon: User
  },
  {
    type: 'Partnership',
    title: 'Partnership',
    tagline: 'Partnership Firm',
    desc: 'joint partner-owned studio operations',
    icon: Users
  },
  {
    type: 'Pvt. Ltd.',
    title: 'Pvt. Ltd.',
    tagline: 'Private Limited Company',
    desc: 'corporate board-governed studio operations',
    icon: Store
  },
  {
    type: 'LLP',
    title: 'LLP',
    tagline: 'Limited Liability Partnership',
    desc: 'limited liability partnership studio operations',
    icon: ShieldCheck
  }
];

export default function LocationSelection({ type = 'branch', currentUser, onSelectLocation, onBack, onLogout }) {
  const isBranch = type === 'branch';
  const typeLabel = isBranch ? 'Branch' : 'Franchise';
  const typePlural = isBranch ? 'Branches' : 'Franchises';

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter for records view: 'All' | 'Proprietor' | 'Partnership' | 'Pvt. Ltd.' | 'LLP'
  const [filterFirmType, setFilterFirmType] = useState('All');

  // Main View: 'locations' (clean studio selection) | 'reports' (reports suite with Date & Firm Type filters)
  const [viewMode, setViewMode] = useState('locations');
  const [reportsSubTab, setReportsSubTab] = useState('overview'); // 'overview' | 'detailed'

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
        setLocations(res.locations);
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

  const handleApplyDateFilter = (newFilter) => {
    setDateFilter(newFilter);
    fetchLocations(newFilter.startDate, newFilter.endDate);
  };

  const getFirmCount = (firm) => {
    return locations.filter(loc => (loc.kyc?.firm_type || loc.firm_type) === firm).length;
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
    ? locations.filter(loc => (loc.kyc?.firm_type || loc.firm_type) === filterFirmType)
    : locations;

  // Aggregate metrics for Reports View
  const reportLocations = filterFirmType === 'All'
    ? locations
    : locations.filter(loc => (loc.kyc?.firm_type || loc.firm_type) === filterFirmType);

  const totalReportRevenue = reportLocations.reduce((sum, loc) => sum + Number(loc.daily_income || 0), 0);
  const totalReportFootfall = reportLocations.reduce((sum, loc) => sum + Number(loc.footfall || 0), 0);
  const goodTiersCount = reportLocations.filter(loc => (loc.return_tier || '').toLowerCase() === 'good').length;
  const avgTiersCount = reportLocations.filter(loc => (loc.return_tier || '').toLowerCase() === 'average').length;
  const lowTiersCount = reportLocations.filter(loc => (loc.return_tier || '').toLowerCase() === 'low').length;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: `linear-gradient(180deg, rgba(44, 33, 27, 0.78) 0%, rgba(44, 33, 27, 0.70) 280px, rgba(44, 33, 27, 0.65) 100%), url(${studioBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-sans)'
    }}>
      {/* Top Header - Pixel-aligned with Image 1 Navbar */}
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
              src={brandLogoImg}
              alt="Maison BeYou"
              className="navbar-brand-logo"
            />
          </div>

          {/* Master Admin Profile & Dropdown - Matching Image 1 */}
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <div
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="navbar-user-pill"
              style={{
                background: showUserMenu ? 'var(--bg-surface)' : 'transparent',
              }}
            >
              <div
                className="navbar-user-avatar"
                style={{
                  background: 'var(--primary-subtle)',
                  color: 'var(--primary-hover)',
                }}
              >
                {currentUser?.name?.charAt(0) || 'M'}
              </div>
              <div className="navbar-user-info">
                <div className="navbar-user-name">
                  {currentUser?.name || 'Maison Master Admin'}
                </div>
                <div className="navbar-user-role">
                  Master Administrator
                </div>
              </div>
              <ChevronDown size={14} color="var(--text-muted)" className="navbar-user-chevron" />
            </div>

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
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container - Aligned with Image 1 app-container */}
      <main className="app-container" style={{ flex: 1, padding: '44px var(--container-padding-x) 60px' }}>
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
                color: '#FFFFFF',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                margin: 0,
                textShadow: '0 2px 14px rgba(0,0,0,0.75)'
              }}>
                Select Firm Type
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
                return (
                  <div
                    key={card.type}
                    onClick={() => handleOpenAddModal(card.type)}
                    className="concierge-luxury-card"
                    style={{
                      minHeight: '290px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%'
                    }}
                  >
                    {/* Top Content: Medallion, Title, Description */}
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div className="concierge-icon-medallion">
                        <Icon size={28} strokeWidth={1.8} />
                      </div>

                      <h2 className="concierge-card-title">
                        {card.title.toUpperCase()}
                      </h2>

                      <p className="concierge-card-desc" style={{ minHeight: '38px', margin: '0 0 20px 0' }}>
                        {card.desc}
                      </p>
                    </div>

                    {/* Luxury Action Button - Warm Gold Finish (Matching Image 1) */}
                    <div className="concierge-action-btn concierge-action-btn-gold">
                      <span>{isBranch ? 'REGISTER BRANCH' : 'REGISTER FRANCHISE'}</span>
                    </div>
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
                  paddingTop: '40px',
                  marginBottom: '28px'
                }}>
                  {onBack ? (
                    <button
                      type="button"
                      onClick={onBack}
                      className="btn-luxury-header-action"
                    >
                      <ArrowLeft size={16} />
                      <span>Back to Studio Management</span>
                    </button>
                  ) : <div />}

                  <button
                    type="button"
                    onClick={() => setViewMode('reports')}
                    className="btn-luxury-header-action"
                  >
                    <BarChart3 size={16} />
                    <span>Reports</span>
                  </button>
                </div>

                {/* Heading: All Branches */}
                <div style={{ marginBottom: '44px' }}>
                  <h1 style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '28px',
                    fontWeight: '500',
                    color: '#FFFFFF',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    margin: 0,
                    textShadow: '0 2px 14px rgba(0,0,0,0.75)'
                  }}>
                    {isBranch ? 'All Branches' : 'All Franchises'}
                  </h1>
                  <div style={{ width: '42px', height: '2px', background: '#C6A36A', borderRadius: '2px', marginTop: '12px' }} />
                </div>
              </>
            )}

            {/* Master Admin Reports Dashboard or Branch Locations Grid */}
            {viewMode === 'reports' ? (
              <MasterAdminReportsDashboard onBack={() => setViewMode('locations')} />
            ) : loading ? (
              <div style={{ textAlign: 'center', padding: '64px 20px', color: '#78716C' }}>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>Loading {typePlural.toLowerCase()}...</div>
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
                    background: '#FAF7F2',
                    borderRadius: '20px',
                    border: '1.5px dashed #C6A36A',
                    padding: '32px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
                    minHeight: '260px',
                    height: '100%',
                    boxSizing: 'border-box',
                    boxShadow: '0 8px 24px -6px rgba(44, 33, 27, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.background = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#C6A36A';
                    e.currentTarget.style.boxShadow = '0 16px 32px -8px rgba(198, 163, 106, 0.22)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.background = '#FAF7F2';
                    e.currentTarget.style.borderColor = '#C6A36A';
                    e.currentTarget.style.boxShadow = '0 8px 24px -6px rgba(44, 33, 27, 0.05)';
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
                {displayedLocations.map((loc) => {
                  const isActive = (loc.status || 'Active').toLowerCase() === 'active';
                  const locFirmType = loc.kyc?.firm_type || loc.firm_type || 'Proprietor';
                  return (
                    <div
                      key={loc.location_id}
                      onClick={() => onSelectLocation(loc)}
                      style={{
                        background: '#FAF7F2',
                        borderRadius: '20px',
                        border: '1.5px solid #E5D8C6',
                        padding: '24px 24px 20px 24px',
                        boxShadow: '0 8px 24px -6px rgba(44, 33, 27, 0.05)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'all 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
                        position: 'relative',
                        minHeight: '260px',
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
                        e.currentTarget.style.borderColor = '#E5D8C6';
                        e.currentTarget.style.boxShadow = '0 8px 24px -6px rgba(44, 33, 27, 0.05)';
                      }}
                    >
                      <div>
                        {/* Top Badges */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '16px'
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#F3EDE4',
                            border: '1px solid #E5D8C6',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: '#2C211B',
                            letterSpacing: '0.02em',
                            fontFamily: 'var(--font-sans)'
                          }}>
                            <MapPin size={12} color="#C6A36A" />
                            <span>{formatStudioCode(loc)}</span>
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: '#F3EDE4',
                                border: '1px solid #E5D8C6',
                                padding: '4px 10px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: '600',
                                color: '#2C211B',
                                fontFamily: 'var(--font-sans)'
                              }}
                              title={`Registered as ${locFirmType}`}
                            >
                              <Shield size={12} color="#C6A36A" />
                              <span>{locFirmType}</span>
                            </span>

                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: '#F3EDE4',
                              border: '1px solid #E5D8C6',
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: '600',
                              color: '#2C211B',
                              fontFamily: 'var(--font-sans)'
                            }}>
                              <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: isActive ? '#796B5D' : '#A89E92'
                              }} />
                              <span>{loc.status || 'Active'}</span>
                            </span>
                          </div>
                        </div>

                        {/* Studio Name */}
                        <h3 style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#2C211B',
                          margin: '14px 0 10px 0',
                          lineHeight: 1.35,
                          letterSpacing: '-0.01em',
                          fontFamily: 'var(--font-sans)'
                        }}>
                          {formatStudioTitle(loc)}
                        </h3>

                        {/* Address / Location */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#796B5D', fontSize: '12.5px', marginBottom: '6px', lineHeight: 1.45, fontFamily: 'var(--font-sans)' }}>
                          <MapPin size={14} color="#C6A36A" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>
                            {formatStudioAddress(loc)}
                          </span>
                        </div>

                        {/* Phone */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#796B5D', fontSize: '12.5px', marginBottom: '6px', fontFamily: 'var(--font-sans)' }}>
                          <Phone size={14} color="#C6A36A" />
                          <span>{formatStudioPhone(loc)}</span>
                        </div>

                        {/* Manager */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#796B5D', fontSize: '12.5px', fontFamily: 'var(--font-sans)' }}>
                          <User size={14} color="#C6A36A" />
                          <span>Manager: {formatStudioManager(loc)}</span>
                        </div>
                      </div>
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
  </div>
);
}

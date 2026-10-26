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
                  const returnConfig = getReturnTierConfig(loc.return_tier, loc.daily_income);
                  const formattedIncome = Number(loc.daily_income || 0).toLocaleString('en-IN');
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
                        minHeight: '260px'
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
                            <span>{loc.code || `MB-0${loc.location_id}`}</span>
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
                          {loc.name}
                        </h3>

                        {/* Address / Location */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#796B5D', fontSize: '12.5px', marginBottom: '6px', lineHeight: 1.45, fontFamily: 'var(--font-sans)' }}>
                          <MapPin size={14} color="#C6A36A" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>
                            {[loc.address, loc.city, loc.state].filter(Boolean).join(', ') || 'Address not specified'}
                            {loc.pincode ? ` - ${loc.pincode}` : ''}
                          </span>
                        </div>

                        {/* Phone or Manager */}
                        {loc.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#796B5D', fontSize: '12.5px', marginBottom: '6px', fontFamily: 'var(--font-sans)' }}>
                            <Phone size={14} color="#C6A36A" />
                            <span>{loc.phone}</span>
                          </div>
                        )}
                        {loc.manager_name && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#796B5D', fontSize: '12.5px', fontFamily: 'var(--font-sans)' }}>
                            <User size={14} color="#C6A36A" />
                            <span>Manager: {loc.manager_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Financial Performance Strip: Muted Luxury Return on Left, Daily Income on Right */}
                      <div style={{
                        marginTop: '18px',
                        padding: '10px 16px',
                        borderRadius: '12px',
                        background: '#FAF7F2',
                        border: '1.5px solid #E5D8C6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}>
                        {/* Left: Return Status Pill (Low, Average, Good) */}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span
                            onClick={(e) => handleQuickToggleReturnTier(e, loc)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '600',
                              background: '#F3EDE4',
                              border: '1px solid #E5D8C6',
                              color: '#2C211B',
                              cursor: 'pointer',
                              userSelect: 'none',
                              transition: 'all 0.15s ease',
                              fontFamily: 'var(--font-sans)'
                            }}
                            title={`Return Status: ${returnConfig.fullLabel} (Click to toggle)`}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#C6A36A'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E5D8C6'}
                          >
                            <AlertTriangle size={13} color="#796B5D" />
                            <span>{returnConfig.label}</span>
                          </span>
                        </div>

                        {/* Center Divider */}
                        <div style={{ width: '1px', height: '22px', background: '#E5D8C6' }} />

                        {/* Right: Income strictly of this specific branch for selected date window */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            textAlign: 'right'
                          }}
                          title={`${loc.name} (${dateFilter.title}):\n• Revenue (Cash, UPI & Card): ₹${Number(loc.revenue_today || 0).toLocaleString('en-IN')}\n• Membership Redeemed: ₹${Number(loc.membership_redeemed_today || 0).toLocaleString('en-IN')}\n• Total Branch Income: ₹${formattedIncome}`}
                        >
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: '#796B5D',
                            fontFamily: 'var(--font-sans)'
                          }}>
                            {dateFilter.mode === 'today' ? 'DAILY INCOME:' : 'INCOME:'}
                          </span>
                          <span style={{
                            fontSize: '15px',
                            fontWeight: '700',
                            color: '#2C211B',
                            fontFamily: 'var(--font-sans)'
                          }}>
                            ₹{formattedIncome}
                          </span>
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

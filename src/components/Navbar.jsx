import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, User, LogOut, LayoutDashboard, Users, Scissors, Award, BarChart3, ChevronDown, Menu, Phone, Mail, ShieldCheck, Calendar, CalendarDays, Check, Building2, ArrowLeft, Palette } from 'lucide-react';
import { getStoredToken, getStoredUser, setStoredToken, setStoredUser, getStoredLocation, setStoredLocation, formatCurrency, formatDate, apiRequest } from '../utils/api';
import { canAccessModule } from '../utils/permissions';
import logoImg from '../assets/logo.png';
import brandLogoImg from '../assets/brand-logo.png';

export default function Navbar({ activeTab, setActiveTab, currentUser, setCurrentUser, activeVisitClient, onResetVisit, cartCount = 0, cartVisible = false, onOpenCart, activeLocation, onSwitchLocation, onNavigateDashboardSection, branding }) {
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);
  const [showDashboardConfirm, setShowDashboardConfirm] = useState(false);
  const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);
  const [isProfileHovered, setIsProfileHovered] = useState(false);
  const [isVisitHistoryOpen, setIsVisitHistoryOpen] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState(null);
  const [cartPrivilegeIds, setCartPrivilegeIds] = useState([]);
  const [livePrivileges, setLivePrivileges] = useState(null);
  const [activeClientAppointment, setActiveClientAppointment] = useState(null);
  const switchMenuRef = useRef(null);
  const clientMenuRef = useRef(null);
  const membershipPrivilegeRequestRef = useRef(0);

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

  useEffect(() => {
    function handleCartPrivileges(e) {
      if (Array.isArray(e.detail?.privilegeIds)) {
        setCartPrivilegeIds(e.detail.privilegeIds);
      }
    }
    window.addEventListener('cart_privileges_updated', handleCartPrivileges);
    return () => window.removeEventListener('cart_privileges_updated', handleCartPrivileges);
  }, []);

  // Fetch fresh membership privileges whenever client or visits update
  const fetchLivePrivileges = async (clientId, membershipTier = null) => {
    if (!clientId) return;
    const requestId = ++membershipPrivilegeRequestRef.current;
    setLivePrivileges(null);
    try {
      const tierQuery = membershipTier ? `?tier=${encodeURIComponent(membershipTier)}` : '';
      const data = await apiRequest(`/clients/${clientId}/membership-privileges${tierQuery}`);
      if (requestId === membershipPrivilegeRequestRef.current && Array.isArray(data?.privileges)) {
        setLivePrivileges(data.privileges);
      }
    } catch (e) {
      console.error('Error fetching live privileges:', e);
    }
  };

  useEffect(() => {
    if (activeVisitClient?.client_id) {
      fetchLivePrivileges(activeVisitClient.client_id, activeVisitClient.membershipTier || activeVisitClient.membership_tier);
    } else {
      membershipPrivilegeRequestRef.current += 1;
      setLivePrivileges(null);
    }
  }, [activeVisitClient?.client_id, activeVisitClient?.membershipTier, activeVisitClient?.membership_tier]);

  useEffect(() => {
    const clientId = activeVisitClient?.client_id;
    if (!clientId || currentUser?.role !== 'visitor') {
      setActiveClientAppointment(null);
      return undefined;
    }
    let cancelled = false;
    setActiveClientAppointment(null);
    apiRequest(`/appointments/client/${clientId}`)
      .then(result => { if (!cancelled) setActiveClientAppointment(result.appointment || null); })
      .catch(error => {
        if (!cancelled) {
          setActiveClientAppointment(null);
          console.error('Could not load client appointment status:', error);
        }
      });
    return () => { cancelled = true; };
  }, [activeVisitClient?.client_id, currentUser?.role]);

  useEffect(() => {
    const handleVisitUpdate = () => {
      if (activeVisitClient?.client_id) {
        fetchLivePrivileges(activeVisitClient.client_id, activeVisitClient.membershipTier || activeVisitClient.membership_tier);
      }
    };
    window.addEventListener('visit_created', handleVisitUpdate);
    window.addEventListener('visit_payment_updated', handleVisitUpdate);
    return () => {
      window.removeEventListener('visit_created', handleVisitUpdate);
      window.removeEventListener('visit_payment_updated', handleVisitUpdate);
    };
  }, [activeVisitClient?.client_id]);

  const handleLogout = () => {
    setStoredToken(null);
    setStoredUser(null);
    setStoredLocation(null);
    setCurrentUser(null);
    window.dispatchEvent(new Event('auth_change'));
  };

  useEffect(() => {
    window.addEventListener('request_app_logout', handleLogout);
    return () => window.removeEventListener('request_app_logout', handleLogout);
  }, [setCurrentUser]);

  const handleQuickSwitchRole = async (targetRole) => {
    try {
      const activeLocId = activeLocation?.location_id || currentUser?.location_id;
      const data = await apiRequest('/auth/switch-role', {
        method: 'POST',
        body: JSON.stringify({
          role: targetRole,
          location_id: activeLocId
        })
      });
      if (data && data.token) {
        setStoredToken(data.token);
        setStoredUser(data.user);
        setCurrentUser(data.user);
        setShowSwitchMenu(false);
        if (onResetVisit) onResetVisit();

        if (data.user?.role === 'master_admin') {
          // Master Admin sees all branches first, so clear any pre-selected location
          setStoredLocation(null);
          if (onSwitchLocation) onSwitchLocation();
        } else {
          // Branch accounts are locked to their branch assignment
          const targetLoc = data.location || activeLocation || null;
          if (targetLoc) {
            setStoredLocation(targetLoc);
          }
          if (data.user?.role === 'visitor') {
            setActiveTab('new-visit');
          } else {
            setActiveTab('dashboard');
          }
        }
        window.dispatchEvent(new Event('auth_change'));
      } else {
        alert(data?.error || 'Failed to switch desk role');
      }
    } catch (e) {
      console.error('Quick switch error:', e);
      alert(e.message || 'Failed to switch desk role');
    }
  };

  const handleQuickSwitch = handleQuickSwitchRole;

  const roleLabels = {
    master_admin: 'Master Administrator',
    admin: 'Administrator',
    reception: 'Manager',
    visitor: 'Visitor Desk',
    staff: 'Staff Member'
  };

  const effectiveOriginalRole = currentUser?.original_role || currentUser?.role;
  const isMasterAdmin = effectiveOriginalRole === 'master_admin';
  const isVisitor = effectiveOriginalRole === 'visitor';
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'master_admin';

  const getClientInitials = (name, surname = '') => {
    if (!name) return 'CL';
    if (surname && surname.trim()) {
      return (name.trim()[0] + surname.trim()[0]).toUpperCase();
    }
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

  const getClientMembershipData = (client) => {
    if (!client) return null;

    const rawTier = (client.membershipTier || client.membership_tier || '').trim();
    const tierCostMap = { 'lumiere': 50000, 'infini': 25000, 'eternal': 15000, 'eclat': 6000 };
    const tierKey = rawTier.toLowerCase();
    const matchedKey = Object.keys(tierCostMap).find(k => tierKey.includes(k));
    const fallbackCost = matchedKey ? tierCostMap[matchedKey] : (client.planInfo?.price ? parseFloat(client.planInfo.price) : 25000);
    const membershipCost = (client.membership_cost !== undefined && client.membership_cost !== null)
      ? parseFloat(client.membership_cost)
      : (client.membershipCost !== undefined && client.membershipCost !== null ? parseFloat(client.membershipCost) : fallbackCost);

    const totalCreditsUsed = (client.total_membership_credits_used !== undefined && client.total_membership_credits_used !== null)
      ? parseFloat(client.total_membership_credits_used)
      : (client.totalCreditsUsedTillDate !== undefined && client.totalCreditsUsedTillDate !== null ? parseFloat(client.totalCreditsUsedTillDate) : (client.membership_balance === 0 ? membershipCost : 25000));

    const availableCredits = (client.membership_balance !== undefined && client.membership_balance !== null)
      ? parseFloat(client.membership_balance)
      : (client.availableCredits !== undefined && client.availableCredits !== null ? parseFloat(client.availableCredits) : 0);

    const hasUsedCredits = client.hasUsedCredits !== undefined ? client.hasUsedCredits : (totalCreditsUsed > 0);

    const validityDate = client.validityDate || client.membership_expires_at || client.expiryInfo?.dateFormatted || '15 OCT 2027';

    const benefitsStatus = client.benefitsStatus || (hasUsedCredits ? 'Partially used' : 'Available');

    let perksWithStatus = [];
    const configuredPlan = client.planInfo;
    const configuredPlanPrivileges = configuredPlan ? [
      ...(Array.isArray(configuredPlan.benefits) ? configuredPlan.benefits : [])
        .filter(item => typeof item === 'string' && item.trim())
        .map((name, index) => ({
          id: `${configuredPlan.id || configuredPlan.name || tierKey}_benefit_${index + 1}`,
          name: name.trim(),
          allowedUses: 1,
          type: 'benefit'
        })),
      ...(Array.isArray(configuredPlan.free_services) ? configuredPlan.free_services : [])
        .filter(service => service && service.is_free !== false)
        .map(service => ({
          id: `membership_service_${service.service_id}`,
          name: `${service.service_name || 'Complimentary service'} — complimentary`,
          allowedUses: 1,
          type: 'service'
        }))
    ] : null;
    const sourcePrivileges = Array.isArray(livePrivileges) && livePrivileges.length > 0
      ? livePrivileges
      : (Array.isArray(client.membership_privileges) && client.membership_privileges.length > 0
          ? client.membership_privileges
          : configuredPlanPrivileges);

    if (sourcePrivileges) {
      perksWithStatus = sourcePrivileges.map(p => ({
        id: p.id,
        text: p.name,
        name: p.name,
        isUsed: p.isUsed,
        allowedUses: p.allowedUses,
        usedCount: p.usedCount,
        remainingUses: p.remainingUses,
        type: p.type
      }));
    } else {
      if (tierKey.includes('lumiere')) {
        perksWithStatus = [
          { id: 'priv_lumiere_consult', text: 'Unlimited expert aesthetic consultations', name: 'Unlimited expert aesthetic consultations', isUsed: false, allowedUses: 999 },
          { id: 'priv_lumiere_facials', text: '4 Complimentary premium medi-facials or laser sessions', name: '4 Complimentary premium medi-facials or laser sessions', isUsed: false, allowedUses: 4 },
          { id: 'priv_lumiere_bday', text: 'Birthday: ₹10,000 voucher + luxury wellness package', name: 'Birthday: ₹10,000 voucher + luxury wellness package', isUsed: false, allowedUses: 1 },
          { id: 'priv_lumiere_discount', text: '20% Off all services & homecare product lines', name: '20% Off all services & homecare product lines', isUsed: false, allowedUses: 1 },
          { id: 'priv_lumiere_staff', text: 'Personal aesthetician of choice for all visits', name: 'Personal aesthetician of choice for all visits', isUsed: false, allowedUses: 1 },
          { id: 'priv_lumiere_lounge', text: 'VIP private lounge booking & companion guest passes', name: 'VIP private lounge booking & companion guest passes', isUsed: false, allowedUses: 1 }
        ];
      } else if (tierKey.includes('eternal')) {
        perksWithStatus = [
          { id: 'priv_eternal_analysis', text: 'Free advanced skin analysis (worth ₹1500–₹2000)', name: 'Free advanced skin analysis (worth ₹1500–₹2000)', isUsed: true, allowedUses: 1 },
          { id: 'priv_eternal_bday', text: 'Birthday: ₹2500 Voucher / Complimentary Services', name: 'Birthday: ₹2500 Voucher / Complimentary Services', isUsed: false, allowedUses: 1 },
          { id: 'priv_eternal_facials', text: '1 Free express facial / peel quarterly or 2 per year', name: '1 Free express facial / peel quarterly or 2 per year', isUsed: false, allowedUses: 2 },
          { id: 'priv_eternal_priority', text: 'Priority booking + peak hour preference', name: 'Priority booking + peak hour preference', isUsed: false, allowedUses: 1 },
          { id: 'priv_eternal_pricing', text: 'Exclusive pricing on laser packages', name: 'Exclusive pricing on laser packages', isUsed: false, allowedUses: 1 },
          { id: 'priv_eternal_access', text: 'Early access to new treatments & offers', name: 'Early access to new treatments & offers', isUsed: false, allowedUses: 1 }
        ];
      } else if (tierKey.includes('eclat')) {
        perksWithStatus = [
          { id: 'priv_eclat_analysis', text: 'Complimentary skin analysis (basic) once a year', name: 'Complimentary skin analysis (basic) once a year', isUsed: true, allowedUses: 1 },
          { id: 'priv_eclat_bday', text: 'Birthday month: ₹1000 voucher / free add-on', name: 'Birthday month: ₹1000 voucher / free add-on', isUsed: false, allowedUses: 1 },
          { id: 'priv_eclat_priority', text: 'Priority booking on weekends', name: 'Priority booking on weekends', isUsed: false, allowedUses: 1 },
          { id: 'priv_eclat_packages', text: 'Access to member-only packages', name: 'Access to member-only packages', isUsed: false, allowedUses: 1 },
          { id: 'priv_eclat_consult', text: 'Free consultation anytime', name: 'Free consultation anytime', isUsed: false, allowedUses: 1 }
        ];
      } else if (tierKey.includes('infini')) {
        perksWithStatus = [
          { id: 'priv_infini_analysis', text: 'Free comprehensive 3D skin & hair analysis twice a year', name: 'Free comprehensive 3D skin & hair analysis twice a year', isUsed: true, allowedUses: 2 },
          { id: 'priv_infini_bday', text: 'Birthday: ₹5000 voucher + complimentary luxury medi-facial', name: 'Birthday: ₹5000 voucher + complimentary luxury medi-facial', isUsed: false, allowedUses: 1 },
          { id: 'priv_infini_facials', text: '2 Complimentary medi-facials or signature body therapies', name: '2 Complimentary medi-facials or signature body therapies', isUsed: false, allowedUses: 2 },
          { id: 'priv_infini_discount', text: '15% Off all aesthetic, laser & salon services year-round', name: '15% Off all aesthetic, laser & salon services year-round', isUsed: false, allowedUses: 1 },
          { id: 'priv_infini_vip', text: 'Dedicated relationship manager & VIP suite access', name: 'Dedicated relationship manager & VIP suite access', isUsed: true, allowedUses: 1 },
          { id: 'priv_infini_priority', text: 'Priority weekend & late-evening scheduling', name: 'Priority weekend & late-evening scheduling', isUsed: false, allowedUses: 1 }
        ];
      } else {
        perksWithStatus = [];
      }
    }

    return {
      tierName: client.membershipTier || client.membership_tier || 'INFINI MEMBER',
      membershipCost,
      totalCreditsUsed,
      availableCredits,
      hasUsedCredits,
      validityDate,
      benefitsStatus,
      perksWithStatus,
      expiryInfo: client.expiryInfo
    };
  };

  const isClientMember = (client) => {
    if (!client) return false;
    const rawTier = (client.membershipTier || client.membership_tier || '').trim();
    const hasTier = Boolean(
      rawTier &&
      rawTier !== 'Non-Member' &&
      rawTier.toLowerCase() !== 'none' &&
      rawTier.toLowerCase() !== 'null' &&
      rawTier !== ''
    );
    if (hasTier) return true;
    if (typeof client.isMember === 'boolean') return client.isMember;
    return false;
  };

  const renderRichMembershipStatus = (client) => {
    if (!client) return null;
    const isMember = isClientMember(client);
    if (!isMember) {
      return (
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
              {client.formattedId || client.client_id || 'MB-001'}
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            Client is visiting as a non-member.
          </div>
        </div>
      );
    }

    const memberData = getClientMembershipData(client);
    const formatMoney = (val) => {
      const num = parseFloat(val) || 0;
      return '`' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
      <div
        className="animate-fade-in"
        style={{
          background: '#FAF8F5',
          border: '1.5px solid #D6A87C',
          borderRadius: '24px',
          padding: '22px 18px',
          boxShadow: '0 4px 20px rgba(181, 132, 82, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxSizing: 'border-box'
        }}
      >
        {/* Tier Header with PRIVILEGED, Tier Name, ACTIVE VIP & UPGRADE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              color: '#B5874E',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
            }}>
              PRIVILEGED
            </div>
            <div style={{
              fontSize: '22px',
              fontWeight: '700',
              color: '#1C1917',
              letterSpacing: '-0.01em',
              marginTop: '1px',
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              textTransform: 'uppercase'
            }}>
              {memberData.tierName}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
            <span style={{
              background: '#BA8758',
              color: '#FFFFFF',
              fontSize: '10.5px',
              fontWeight: '700',
              borderRadius: '9999px',
              padding: '5px 16px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              boxShadow: '0 2px 8px rgba(186, 135, 88, 0.25)',
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
            }}>
              ACTIVE VIP
            </span>
            <button
              type="button"
              onClick={() => {
                setIsClientMenuOpen(false);
                window.dispatchEvent(new CustomEvent('open_upgrade_flow'));
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#B5874E',
                fontSize: '10.5px',
                fontWeight: '700',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                padding: '2px 0',
                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              UPGRADE
            </button>
          </div>
        </div>

        {/* Box 1: MEMBERSHIP VALIDITY & MEMBERSHIP VALUE */}
        <div style={{
          background: '#FFFFFF',
          border: '1.5px solid #E6D8C5',
          borderRadius: '16px',
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{
              fontSize: '10px',
              fontWeight: '700',
              color: '#A27848',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '3px',
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
            }}>
              MEMBERSHIP VALIDITY
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1C1917',
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              textTransform: 'uppercase'
            }}>
              {memberData.validityDate?.toUpperCase() || '15 OCT 2027'}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '10px',
              fontWeight: '700',
              color: '#A27848',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '3px',
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
            }}>
              MEMBERSHIP VALUE
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1C1917',
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
            }}>
              {formatMoney(memberData.membershipCost || 30000)}
            </div>
          </div>
        </div>

        {/* Box 2: AVAILABLE CREDITS & USED CREDITS */}
        <div>
          <div style={{
            background: '#FFFFFF',
            border: '1.5px solid #E6D8C5',
            borderRadius: '16px',
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{
                fontSize: '10px',
                fontWeight: '700',
                color: '#A27848',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '3px',
                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
              }}>
                AVAILABLE CREDITS
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1C1917',
                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
              }}>
                {formatMoney(memberData.availableCredits ?? 23230)}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '10px',
                fontWeight: '700',
                color: '#A27848',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '3px',
                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
              }}>
                USED CREDITS
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1C1917',
                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
              }}>
                {formatMoney(memberData.totalCreditsUsed ?? 1770)}
              </div>
            </div>
          </div>

          {/* 1 CREDIT = ` 1 note */}
          <div style={{
            fontSize: '9.5px',
            fontWeight: '700',
            color: '#A27848',
            letterSpacing: '0.04em',
            marginTop: '5px',
            marginLeft: '4px',
            fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
          }}>
            1 CREDIT = ` 1
          </div>
        </div>

        {/* Bar 3: VISIT HISTORY Collapsible */}
        <div>
          <div
            onClick={() => setIsVisitHistoryOpen(!isVisitHistoryOpen)}
            style={{
              background: '#FCFAF7',
              border: '1.5px solid #E6D8C5',
              borderRadius: '14px',
              padding: '11px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#FAF4EB')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#FCFAF7')}
          >
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              color: '#8C6538',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
            }}>
              VISIT HISTORY
            </span>
            <span style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#8C6538',
              lineHeight: 1
            }}>
              {isVisitHistoryOpen ? '−' : '+'}
            </span>
          </div>

          {isVisitHistoryOpen && (
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E6D8C5',
              borderRadius: '12px',
              padding: '12px 14px',
              marginTop: '6px',
              fontSize: '11.5px',
              color: 'var(--text-muted)'
            }}>
              {client.recentVisits?.length > 0 ? (
                client.recentVisits.map((v, i) => (
                  <div key={i} style={{ padding: '5px 0', borderBottom: '1px solid #F3EDE3', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{formatDate(v.visit_date)}</span>
                    <span style={{ fontWeight: '600', color: '#1C1917' }}>{formatCurrency(v.total_amount)}</span>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '6px 0' }}>
                  Latest visit recorded • <strong>{memberData.validityDate || 'Active'}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 4: ANNUAL PRIVILEGE */}
        <div style={{ marginTop: '8px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '700',
            color: '#A27848',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            paddingBottom: '8px',
            borderBottom: '1px solid #D8C3AA',
            fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
          }}>
            MEMBERSHIP BENEFITS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {memberData.perksWithStatus.map((perk, index) => (
              <div
                key={index}
                style={{
                  padding: '11px 0',
                  borderBottom: index === memberData.perksWithStatus.length - 1 ? 'none' : '1px solid #E6D8C5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '14px'
                }}
              >
                <div style={{
                  fontSize: '12px',
                  color: perk.isUsed ? '#9CA3AF' : '#2C2621',
                  textDecoration: perk.isUsed ? 'line-through' : 'none',
                  fontWeight: perk.isUsed ? '400' : '500',
                  lineHeight: 1.35,
                  flex: 1,
                  fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
                }}>
                  {perk.text}
                </div>

                {perk.isUsed ? (
                  <span style={{
                    background: '#8E9499',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: '700',
                    borderRadius: '9999px',
                    padding: '3px 12px',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    flexShrink: 0,
                    fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
                  }}>
                    USED
                  </span>
                ) : cartPrivilegeIds.includes(perk.id) ? (
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('remove_privilege_from_cart', {
                        detail: { privilegeId: perk.id }
                      }));
                      setCartPrivilegeIds(prev => prev.filter(id => id !== perk.id));
                    }}
                    style={{
                      background: '#FAF3E3',
                      border: '1px solid #D6A87C',
                      borderRadius: '6px',
                      color: '#9E7437',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      padding: '3px 8px',
                      flexShrink: 0,
                      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
                    }}
                    title="Click to remove from cart"
                  >
                    IN CART ✓
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const isExpired = client.expiryInfo?.isExpired || (client.membership_expires_at && new Date(client.membership_expires_at).setHours(23, 59, 59, 999) < Date.now());
                      if (isExpired) {
                        alert('Membership has expired. Please renew or upgrade to access privileges.');
                        return;
                      }
                      if (perk.isUsed) {
                        alert('This privilege has already been redeemed under this membership purchase.');
                        return;
                      }

                      const perkId = perk.id || 'priv_' + (perk.text || perk.name).slice(0, 20).toLowerCase().replace(/[^a-z0-9]/g, '_');
                      window.dispatchEvent(new CustomEvent('add_privilege_to_cart', {
                        detail: {
                          privilege: {
                            id: perkId,
                            name: perk.text || perk.name,
                            price: 0,
                            type: perk.type || 'service',
                            allowedUses: perk.allowedUses || 1
                          },
                          client
                        }
                      }));
                      setCartPrivilegeIds(prev => [...prev, perkId]);
                      if (activeTab !== 'new-visit') {
                        setActiveTab('new-visit');
                      }
                      if (onOpenCart) {
                        onOpenCart();
                      }
                      setIsClientMenuOpen(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#9E7437',
                      fontSize: '11px',
                      fontWeight: '700',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      flexShrink: 0,
                      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
                    }}
                  >
                    SELECT
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
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
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, gap: '14px' }}>
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
              src={branding?.logo_url || brandLogoImg}
              alt={branding?.brand_name || 'Maison BeYou'}
              className="navbar-brand-logo"
            />
          </div>


        </div>

        {/* Right side info & user controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          {/* Master Admin: Switch Studio button */}
          {false && isMasterAdmin && onSwitchLocation && (
            <button
              type="button"
              onClick={onSwitchLocation}
              title="Back"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '7px 15px',
                borderRadius: '9999px',
                fontSize: '12.5px',
                fontWeight: '700',
                color: '#9F7335',
                background: '#FAF6EE',
                border: '1.5px solid #DAC493',
                cursor: 'pointer',
                transition: 'all 0.18s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#B88B4A';
                e.currentTarget.style.color = '#FFFFFF';
                e.currentTarget.style.borderColor = '#B88B4A';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FAF6EE';
                e.currentTarget.style.color = '#9F7335';
                e.currentTarget.style.borderColor = '#DAC493';
              }}
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          )}

          {/* Priority 1: When a Client is Active in the Visit Flow (visitor desk only)
              Display the Client Profile Pill (Image 2) in place of Visitor Desk (Image 3) */}
          {(currentUser?.role === 'visitor' || activeTab === 'new-visit') && activeVisitClient && activeVisitClient.name ? (
            <div ref={clientMenuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Shopping Cart Icon (Appears FROM 'DISCOVER YOUR RITUAL' / categories onwards) */}
              {cartVisible && (
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenCart) onOpenCart();
                    else if (setActiveTab) setActiveTab('new-visit');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '36px',
                    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    userSelect: 'none',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                  title={cartCount > 0 ? `View Cart (${cartCount} items)` : 'Shopping Cart (00)'}
                  aria-label="Shopping Cart"
                >
                  <svg width="40" height="36" viewBox="0 2 34 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Basket */}
                    <path d="M2.5 5H8L11.2 19H28.2L30.5 7.5" stroke="#1C1917" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
                    {/* Lower chassis/frame */}
                    <path d="M11.5 19L12 23.5H27.5" stroke="#1C1917" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"/>
                    {/* Wheels */}
                    <circle cx="14" cy="27" r="2.1" fill="#1C1917" />
                    <circle cx="25.5" cy="27" r="2.1" fill="#1C1917" />
                    {/* Count inside basket */}
                    <text x="20" y="13.2" textAnchor="middle" dominantBaseline="middle" fill="#B68452" fontSize="11.5" fontWeight="700" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif">
                      {String(cartCount || 0).padStart(2, '0')}
                    </text>
                  </svg>
                </button>
              )}

              {/* Profile Avatar Pill with smooth Hover expansion (Image 4 -> Image 5) */}
              <div
                onMouseEnter={() => setIsProfileHovered(true)}
                onMouseLeave={() => setIsProfileHovered(false)}
                onClick={() => setIsClientMenuOpen(prev => !prev)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#B68452',
                  borderRadius: '9999px',
                  padding: isProfileHovered ? '3px 14px 3px 4px' : '0px',
                  cursor: 'pointer',
                  boxShadow: isProfileHovered ? '0 4px 14px rgba(182, 132, 82, 0.35)' : '0 2px 8px rgba(182, 132, 82, 0.2)',
                  transition: 'all 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
                  userSelect: 'none',
                  overflow: 'hidden',
                  height: '36px',
                  boxSizing: 'border-box'
                }}
                title="Click to view client dossier & session details"
              >
                {/* Initials Circle: plain circle in Image 4, inner white border ring in Image 5 */}
                <div style={{
                  width: isProfileHovered ? '28px' : '36px',
                  height: isProfileHovered ? '28px' : '36px',
                  borderRadius: '50%',
                  background: '#B68452',
                  border: isProfileHovered ? '1.5px solid #FFFFFF' : '1.5px solid transparent',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: isProfileHovered ? '11.5px' : '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
                  letterSpacing: '0.04em'
                }}>
                  {getClientInitials(activeVisitClient.name, activeVisitClient.surname)}
                </div>

                {/* Expanded Full Name revealed on hover (Image 5) */}
                <div style={{
                  maxWidth: isProfileHovered ? '260px' : '0px',
                  opacity: isProfileHovered ? 1 : 0,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  transition: 'max-width 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease',
                  paddingLeft: isProfileHovered ? '8px' : '0px',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '600',
                  lineHeight: 1
                }}>
                  {[activeVisitClient.name, activeVisitClient.surname].filter(Boolean).join(' ')}
                </div>
              </div>

              {/* Hamburger Menu Icon ☰ (Image 4 & Image 5) */}
              <button
                type="button"
                onClick={() => setIsClientMenuOpen(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isClientMenuOpen ? '#FAF6EE' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  color: isClientMenuOpen ? '#B68452' : '#4A453F',
                  borderRadius: '8px',
                  transition: 'color 0.2s, background 0.2s'
                }}
                title="Menu"
                onMouseEnter={(e) => { e.currentTarget.style.color = '#B68452'; e.currentTarget.style.background = '#FAF6EE'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = isClientMenuOpen ? '#B68452' : '#4A453F'; e.currentTarget.style.background = isClientMenuOpen ? '#FAF6EE' : 'transparent'; }}
              >
                <Menu size={22} strokeWidth={2.2} />
              </button>

              {/* Client Profile Dropdown Menu */}
              {isClientMenuOpen && (
                <div
                  className="animate-fade-in"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 10px)',
                    width: '390px',
                    maxWidth: 'calc(100vw - 24px)',
                    maxHeight: 'min(88vh, 760px)',
                    overflowY: 'auto',
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1.5px solid #DAC493',
                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.18)',
                    padding: '18px 20px',
                    zIndex: 1000,
                    color: '#1C1917',
                    textAlign: 'left',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* 1. Client Dossier & Contact Header */}
                  {(() => {
                    const isMember = isClientMember(activeVisitClient);
                    return (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                          <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: isMember
                              ? 'linear-gradient(135deg, #B88B4A 0%, #D4AF37 100%)'
                              : 'linear-gradient(135deg, #292524 0%, #1C1917 100%)',
                            color: isMember ? '#1C1917' : '#FAF7F2',
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
                                  color: isMember ? '#9F7335' : '#57534E',
                                  background: isMember ? 'rgba(184, 139, 74, 0.14)' : '#F5F5F4',
                                  border: `1px solid ${isMember ? 'rgba(184, 139, 74, 0.4)' : '#E7E5E4'}`,
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
                              {activeVisitClient.badgeLabel || (isMember ? 'Membership ID' : 'Client ID')}:
                            </span>
                            <span style={{
                              fontFamily: 'monospace',
                              fontSize: '12px',
                              fontWeight: '800',
                              letterSpacing: '0.05em',
                              color: isMember ? '#9F7335' : '#1C1917',
                              background: isMember ? '#FAF3E3' : '#FFFFFF',
                              border: `1px solid ${isMember ? '#DAC493' : '#E5E7EB'}`,
                              padding: '2px 8px',
                              borderRadius: '5px'
                            }}>
                              {activeVisitClient.formattedId || activeVisitClient.client_id || 'MB-001'}
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {activeClientAppointment && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 14, padding: '10px 12px', border: '1px solid #E4C995', borderRadius: 9, background: '#FBF7EF', color: '#5D4525' }}>
                      <CalendarDays size={16} color="#A9793C" style={{ flexShrink: 0, marginTop: 1 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: 12 }}>Appointment booked</strong>
                          <span style={{ padding: '2px 6px', borderRadius: 999, background: '#F1E6D3', color: '#8C6228', fontSize: 9, fontWeight: 800, letterSpacing: '.05em' }}>APPOINTMENT</span>
                        </div>
                        <div style={{ marginTop: 3, color: '#81766B', fontSize: 11 }}>
                          {new Date(`${String(activeClientAppointment.visit_date).slice(0, 10)}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {activeClientAppointment.service_time ? ` · ${activeClientAppointment.service_time}` : ''}
                          {activeClientAppointment.appointment_duration_mins ? ` · ${activeClientAppointment.appointment_duration_mins} min` : ''}
                        </div>
                        {activeClientAppointment.services && <div style={{ marginTop: 3, color: '#5D5147', fontSize: 11, lineHeight: 1.4 }}>{activeClientAppointment.services}</div>}
                      </div>
                    </div>
                  )}

                  {/* DIVIDER */}
                  <div style={{ height: '1px', background: 'var(--border-color)', marginBottom: '14px' }} />

                  {/* OPTION 1: Current Membership Status */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B88B4A', fontWeight: '800', marginBottom: '8px' }}>
                      1. Membership Status
                    </div>
                    {renderRichMembershipStatus(activeVisitClient)}
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
          ) : activeTab === 'dashboard' && (isAdmin || currentUser?.role === 'reception') ? (
            <button
              type="button"
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                window.dispatchEvent(new CustomEvent('open_studio_modules', {
                  detail: {
                    top: rect.bottom + 8,
                    right: window.innerWidth - rect.right
                  }
                }));
              }}
              title="Open Studio Modules"
              aria-label="Open Studio Modules"
              style={{
                width: '36px',
                height: '36px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #D8BD91',
                borderRadius: '6px',
                color: '#A8793D',
                background: '#FFFFFF',
                cursor: 'pointer',
                transition: 'background 0.15s ease, border-color 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#FAF6EE';
                e.currentTarget.style.borderColor = '#B88B4A';
                const rect = e.currentTarget.getBoundingClientRect();
                window.dispatchEvent(new CustomEvent('open_studio_modules', {
                  detail: {
                    top: rect.bottom + 8,
                    right: window.innerWidth - rect.right
                  }
                }));
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#FFFFFF';
                e.currentTarget.style.borderColor = '#D8BD91';
              }}
            >
              <Menu size={18} strokeWidth={1.8} />
            </button>
          ) : (
            /* Visitor Desk or Dashboard User Profile pill (Image 3) */
            <div ref={switchMenuRef} style={{ position: 'relative' }}>
              {isMasterAdmin || ['new-visit', 'appointments'].includes(activeTab) ? (
                <button
                  type="button"
                  onClick={() => setShowSwitchMenu(value => !value)}
                  aria-label="Open account menu"
                  aria-expanded={showSwitchMenu}
                  title="Menu"
                  style={{ width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #D8BD91', borderRadius: 8, color: '#A8793D', background: showSwitchMenu ? '#FAF6EE' : '#FFFFFF', cursor: 'pointer' }}
                >
                  <Menu size={20} strokeWidth={1.8} />
                </button>
              ) : <div
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
                    {currentUser?.name || (currentUser?.role === 'reception' ? 'Manager' : 'Staff User')}
                  </div>
                  <div className="navbar-user-role">
                    {roleLabels[currentUser?.role] || currentUser?.role}
                  </div>
                </div>
                <ChevronDown size={14} color="var(--text-muted)" className="navbar-user-chevron" />
              </div>}

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
                  {activeTab === 'appointments' ? <div style={{ padding: '6px 8px 10px', borderBottom: '1px solid var(--border-color)', marginBottom: 6 }}>
                    <div style={{ color: '#4B4038', fontSize: 12, fontWeight: 750 }}>{activeLocation?.name || 'Branch'}</div>
                    {activeLocation?.code && <span style={{ display: 'inline-block', marginTop: 7, padding: '3px 8px', border: '1px solid #DAC493', borderRadius: 999, color: '#9F7335', fontSize: 10, fontWeight: 700, letterSpacing: '.05em' }}>{activeLocation.code}</span>}
                  </div> : <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-light)', padding: '6px 8px' }}>
                    {isVisitor
                      ? `Active Kiosk (${activeLocation ? (activeLocation.name?.includes('—') ? activeLocation.name.split('—')[1].trim() : activeLocation.name) : 'Visitor Desk'})`
                      : (activeLocation ? `Active Desk (${activeLocation.name?.includes('—') ? activeLocation.name.split('—')[1].trim() : activeLocation.name})` : 'Switch Active Role')
                    }
                  </div>}

                  {activeTab === 'appointments' && <div style={{ display: 'flex', flexDirection: 'column', gap: 2, margin: '4px 0 8px' }}>
                    {[
                      { id: 'appointments', label: 'Appointments', icon: CalendarDays, show: canAccessModule(currentUser, 'visits') || canAccessModule(currentUser, 'visitor_intake') },
                      { id: 'visits', label: 'Dashboard', icon: LayoutDashboard, show: canAccessModule(currentUser, 'dashboard') || canAccessModule(currentUser, 'visits') },
                      { id: 'branch_details', label: 'Branch Details', icon: Building2, show: isAdmin && Boolean(activeLocation?.location_id) },
                      { id: 'team-master', label: 'Master', icon: ShieldCheck, show: isAdmin && canAccessModule(currentUser, 'team') },
                      { id: 'clients', label: 'Clients', icon: Users, show: canAccessModule(currentUser, 'clients') },
                      { id: 'reports', label: 'Reports', icon: BarChart3, show: canAccessModule(currentUser, 'reports') }
                    ].filter(item => item.show).map(item => {
                      const Icon = item.icon;
                      const active = item.id === 'appointments';
                      return <button key={item.id} type="button" onClick={() => {
                        setShowSwitchMenu(false);
                        if (item.id === 'appointments') setActiveTab('appointments');
                        else onNavigateDashboardSection?.(item.id);
                      }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', border: 0, borderRadius: 8, textAlign: 'left', color: active ? '#A8793D' : '#4B4038', background: active ? '#F6F0E8' : 'transparent', fontSize: 13, fontWeight: active ? 700 : 600, cursor: 'pointer' }}>
                        <Icon size={15} color={active ? '#A8793D' : '#8F7D6A'} />{item.label}
                      </button>;
                    })}
                  </div>}
                  
                  {isMasterAdmin && activeTab !== 'appointments' && (
                    <button
                      onClick={() => handleQuickSwitchRole('master_admin')}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px',
                        background: currentUser?.role === 'master_admin' ? 'var(--primary-subtle)' : 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ fontWeight: '700', color: '#9F7335' }}>👑 Master Admin</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Multi-Studio Governance & Control</span>
                    </button>
                  )}

                  {activeTab !== 'appointments' && !isVisitor && <div style={{ height: '1px', background: 'var(--border-color)', margin: '8px 0' }} />}

                  {isAdmin && activeLocation?.location_id && (
                    <>
                      {activeTab === 'appointments' && <div style={{ height: '1px', background: 'var(--border-color)', margin: '8px 0' }} />}
                      <button
                        type="button"
                        onClick={() => {
                          setShowSwitchMenu(false);
                          window.dispatchEvent(new CustomEvent('open_branding_customizer', { detail: { section: activeTab === 'appointments' ? 'appointments' : undefined } }));
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '13px',
                          color: '#9F7335',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <Palette size={15} />
                        Customize
                      </button>
                      <div style={{ height: '1px', background: 'var(--border-color)', margin: '8px 0' }} />
                    </>
                  )}

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
            maxHeight: 'min(92vh, 860px)',
            overflowY: 'auto',
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
                  {(() => {
                    const isMember = isClientMember(activeVisitClient);
                    return (
                      <>
                        {/* Client Avatar, Name & Contact Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                          <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: isMember
                              ? 'linear-gradient(135deg, #B88B4A 0%, #D4AF37 100%)'
                              : 'linear-gradient(135deg, #292524 0%, #1C1917 100%)',
                            color: isMember ? '#1C1917' : '#FAF7F2',
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
                                  color: isMember ? '#9F7335' : '#57534E',
                                  background: isMember ? 'rgba(184, 139, 74, 0.14)' : '#F5F5F4',
                                  border: `1px solid ${isMember ? 'rgba(184, 139, 74, 0.4)' : '#E7E5E4'}`,
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
                                {activeVisitClient.badgeLabel || (isMember ? 'Membership ID' : 'Client ID')}:
                              </span>
                              <span style={{
                                fontFamily: 'monospace',
                                fontSize: '11.5px',
                                fontWeight: '800',
                                color: isMember ? '#9F7335' : '#1C1917',
                                background: isMember ? '#FAF3E3' : '#FFFFFF',
                                border: `1px solid ${isMember ? '#DAC493' : '#E5E7EB'}`,
                                padding: '1px 7px',
                                borderRadius: '4px'
                              }}>
                                {activeVisitClient.formattedId}
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}

                  {/* 1. Membership Status */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B88B4A', fontWeight: '800', marginBottom: '8px' }}>
                      1. Membership Status
                    </div>
                    {renderRichMembershipStatus(activeVisitClient)}
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
                    You will remain logged in to CRM as <strong>{currentUser?.name || 'Manager'}</strong> ({roleLabels[currentUser?.role] || currentUser?.role}).
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
                    You will remain logged in as {currentUser?.name || 'Manager'} on the Dashboard.
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

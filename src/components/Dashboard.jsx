import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, Handshake,
  Users, UserPlus, UserCheck, Sparkles, IndianRupee, AlertCircle,
  ArrowRight, Clock, Plus, Receipt, Eye, CheckCircle2, LayoutDashboard,
  Menu, ChevronDown, Scissors, Award, BarChart3, X, ShieldCheck, RotateCw, Copy, Check,
  Edit2, FileText, Crown
} from 'lucide-react';
import { apiRequest, formatCurrency, formatDate, formatPhone } from '../utils/api';
import { MEMBERSHIP_PLANS } from './NewVisitWizard';
import ClientsList from './ClientsList';
import ServiceManagement from './ServiceManagement';
import StaffManagement from './StaffManagement';
import ReportsView from './ReportsView';
import BranchFranchiseKYCModal from './BranchFranchiseKYCModal';

export default function Dashboard({ currentUser, onOpenClient, onOpenReceipt, onBackToDashboard, onNavigateTab, activeLocation, onSwitchLocation }) {
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'master_admin';
  const [currentLocation, setCurrentLocation] = useState(activeLocation);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);

  useEffect(() => {
    setCurrentLocation(activeLocation);
  }, [activeLocation]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ summary: {}, visits: [] });
  const [error, setError] = useState('');

  // In-dashboard sub-module section switcher ('visits' | 'clients' | 'services' | 'staff' | 'reports')
  const [activeSection, setActiveSection] = useState('visits');
  const sectionContentRef = useRef(null);

  useEffect(() => {
    setActiveSection('visits');
  }, [activeLocation?.location_id]);

  // Staff allocation & Payment verification state for Reception
  const [staffList, setStaffList] = useState([]);
  const [staffModalVisit, setStaffModalVisit] = useState(null);
  const [staffAssignments, setStaffAssignments] = useState({});
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [staffModalServiceTime, setStaffModalServiceTime] = useState('');

  // Service Timing dedicated editor state
  const [editTimeModalVisit, setEditTimeModalVisit] = useState(null);
  const [customServiceTime, setCustomServiceTime] = useState('');
  const [isSavingServiceTime, setIsSavingServiceTime] = useState(false);

  const [paymentModalVisit, setPaymentModalVisit] = useState(null);
  const [viewUpiModalVisit, setViewUpiModalVisit] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount_paid: 0,
    payment_method: 'Cash',
    notes: '',
    card_ref: '',
    membership_amount_used: 0,
    membership_benefit_used: '',
    benefit_used_date: new Date().toISOString().slice(0, 10),
    benefit_status: 'Available'
  });
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [settlementTab, setSettlementTab] = useState('membership'); // 'membership' | 'manual'
  const [isEditingPerkInModal, setIsEditingPerkInModal] = useState(false);
  const [actionToast, setActionToast] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredServicesVisitId, setHoveredServicesVisitId] = useState(null);
  const [isSelectingUpgradeMembership, setIsSelectingUpgradeMembership] = useState(false);
  const [pendingUpgradePlan, setPendingUpgradePlan] = useState(null);

  const formatVisitTime = (dateStr) => {
    if (!dateStr) return '—';
    let s = String(dateStr).trim();
    // Convert SQLite UTC timestamps without timezone to ISO Z so browser formats in client's local system time
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
      s = s.replace(' ', 'T') + 'Z';
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) {
      s = s + 'Z';
    }
    const d = new Date(s);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await apiRequest('/dashboard/today');
      setData(res);
      setError('');
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    setData({ summary: {}, visits: [] });
    setLoading(true);
    fetchDashboardData();
    // Load staff options for assignment strictly for this location
    apiRequest('/staff')
      .then(res => setStaffList(res.staff || []))
      .catch(e => console.error('Staff fetch error:', e));

    const handleVisitCreated = () => {
      fetchDashboardData(true);
    };
    window.addEventListener('visit_created', handleVisitCreated);

    // Smooth auto-refresh every 10 seconds so new visitor submissions appear in real-time
    const pollInterval = setInterval(() => {
      fetchDashboardData(true);
    }, 10000);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('visit_created', handleVisitCreated);
    };
  }, [activeLocation?.location_id]);

  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetchDashboardData(true);
      const staffRes = await apiRequest('/staff').catch(() => ({ staff: [] }));
      if (staffRes?.staff) setStaffList(staffRes.staff);
      setActionToast('Dashboard data refreshed successfully');
      setTimeout(() => setActionToast(null), 2500);
    } catch (err) {
      console.error('Refresh error:', err);
      setError('Failed to refresh data: ' + err.message);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleOpenStaffModal = (visit) => {
    setStaffModalVisit(visit);
    setStaffModalServiceTime(visit.service_time || formatVisitTime(visit.created_at));
    const initial = {};
    if (visit.services) {
      visit.services.forEach(s => {
        initial[s.visit_service_id] = s.staff_id || '';
      });
    }
    setStaffAssignments(initial);
  };

  const handleSaveStaffAssignments = async () => {
    if (!staffModalVisit) return;
    try {
      setIsSavingStaff(true);
      const servicesPayload = Object.entries(staffAssignments).map(([vid, sid]) => ({
        visit_service_id: Number(vid),
        staff_id: sid ? Number(sid) : null
      }));

      await apiRequest(`/visits/${staffModalVisit.visit_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          services: servicesPayload,
          service_time: (staffModalServiceTime || '').trim() || undefined
        })
      });

      setActionToast(`✓ Staff & timing updated for ${staffModalVisit.client_name}`);
      setTimeout(() => setActionToast(null), 3500);
      setStaffModalVisit(null);
      await fetchDashboardData();
    } catch (err) {
      alert('Error assigning staff: ' + (err.message || 'Failed'));
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleOpenTimeModal = (visit) => {
    setEditTimeModalVisit(visit);
    setCustomServiceTime(visit.service_time || formatVisitTime(visit.created_at));
  };

  const handleSaveServiceTime = async () => {
    if (!editTimeModalVisit) return;
    try {
      setIsSavingServiceTime(true);
      const timeToSave = (customServiceTime || '').trim() || formatVisitTime(editTimeModalVisit.created_at);
      await apiRequest(`/visits/${editTimeModalVisit.visit_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ service_time: timeToSave })
      });

      setActionToast(`✓ Service timing updated to ${timeToSave} for ${editTimeModalVisit.client_name}`);
      setTimeout(() => setActionToast(null), 3500);
      setEditTimeModalVisit(null);
      await fetchDashboardData(true);
    } catch (err) {
      alert('Error updating service timing: ' + (err.message || 'Failed'));
    } finally {
      setIsSavingServiceTime(false);
    }
  };

  const openPaymentModal = (visit) => {
    setPaymentModalVisit(visit);
    setIsEditingPerkInModal(false);
    setIsSelectingUpgradeMembership(false);
    setPendingUpgradePlan(null);

    const rawTier = (
      visit?.effective_membership_tier ||
      visit?.client_membership_tier ||
      visit?.membership_tier ||
      ''
    ).trim();
    const isMember = Boolean(rawTier && rawTier.toLowerCase() !== 'none' && rawTier.toLowerCase() !== 'non-member');
    const isPurchasingMembership = parseFloat(visit?.membership_price) > 0;
    const isExistingMember = isMember && !isPurchasingMembership;

    // Available credits
    const tierCostMap = { 'lumiere': 50000, 'infini': 25000, 'eternal': 15000, 'eclat': 6000 };
    const matchedK = Object.keys(tierCostMap).find(k => rawTier.toLowerCase().includes(k));
    const tierBase = matchedK ? tierCostMap[matchedK] : 25000;
    const clientBal = visit.membership_balance !== undefined && visit.membership_balance !== null
      ? parseFloat(visit.membership_balance)
      : (isExistingMember ? tierBase : 0);

    // Initial membership credit used:
    // If existing member and has credits available, default to using credits for the visit
    let initialCredit = 0;
    let initialMethod = 'UPI';

    if (isExistingMember && clientBal > 0) {
      initialCredit = Math.min(visit.total_amount, clientBal);
      const remainingForManual = Math.max(0, visit.total_amount - initialCredit);
      initialMethod = remainingForManual === 0 ? 'Membership' : (visit.payment_method || 'UPI');
      setSettlementTab('membership');
    } else {
      setSettlementTab('manual');
      if (visit.payment_method === 'Card') initialMethod = 'Card';
      else if (visit.payment_method === 'Cash') initialMethod = 'Cash';
      else if (visit.payment_method === 'UPI') initialMethod = 'UPI';
    }

    const remainingForManual = Math.max(0, visit.total_amount - initialCredit);

    setPaymentForm({
      amount_paid: remainingForManual,
      payment_method: initialMethod,
      notes: visit.notes || (initialCredit > 0 ? '[MEMBERSHIP SETTLEMENT: Auto Credits Applied]' : ''),
      card_ref: '',
      membership_amount_used: initialCredit,
      membership_benefit_used: visit.membership_benefit_used || '',
      benefit_used_date: visit.benefit_used_date || (visit.visit_date || new Date().toISOString().slice(0, 10)),
      benefit_status: visit.benefit_status || 'Available'
    });
  };

  const handleCheckPayment = (visit) => {
    // 1. If it is paid via UPI: only view UPI reference id and how much paid
    if (visit.payment_status === 'Paid' && (visit.payment_method === 'UPI' || !visit.payment_method)) {
      setViewUpiModalVisit(visit);
      return;
    }

    // 2. If it is Cash, Card, Membership or Pending: open record payment modal
    openPaymentModal(visit);
  };

  const handleSavePayment = async () => {
    if (!paymentModalVisit) return;
    try {
      setIsSavingPayment(true);
      const baseBill = paymentModalVisit.total_amount;
      const upgradePrice = pendingUpgradePlan ? (parseFloat(pendingUpgradePlan.price) || 0) : 0;
      const effectiveTotalBill = baseBill + upgradePrice;

      const manualAmount = parseFloat(paymentForm.amount_paid) || 0;
      const creditUsed = parseFloat(paymentForm.membership_amount_used) || 0;
      const totalSettled = manualAmount + creditUsed;
      const method = paymentForm.payment_method || 'Cash';

      const notes = [
        paymentForm.notes,
        paymentForm.card_ref ? `Card Slip Ref: ${paymentForm.card_ref}` : '',
        pendingUpgradePlan ? `[MEMBERSHIP UPGRADE AT RECEPTION: ${pendingUpgradePlan.name} (${formatCurrency(pendingUpgradePlan.price)})]` : ''
      ].filter(Boolean).join(' • ');

      const benefitText = (paymentForm.membership_benefit_used || '').trim();
      const hasBenefitUsed = benefitText !== '' && benefitText.toLowerCase() !== 'none';
      const autoBenefitStatus = (hasBenefitUsed || creditUsed > 0) ? 'Partially used' : 'Available';

      const finalStatus = totalSettled >= effectiveTotalBill ? 'Paid' : (totalSettled > 0 ? 'Partially Paid' : 'Pending');
      const finalMethod = (creditUsed > 0 && manualAmount > 0) ? `${method} + Member Credit` : (creditUsed > 0 ? 'Membership' : method);

      const patchPayload = {
        amount_paid: manualAmount,
        payment_method: finalMethod,
        payment_status: finalStatus,
        notes: notes || undefined,
        membership_amount_used: creditUsed,
        membership_benefit_used: hasBenefitUsed ? benefitText : '',
        benefit_used_date: paymentForm.benefit_used_date || undefined,
        benefit_status: autoBenefitStatus
      };

      if (pendingUpgradePlan) {
        patchPayload.total_amount = effectiveTotalBill;
        patchPayload.membership_tier = pendingUpgradePlan.name;
        patchPayload.membership_price = pendingUpgradePlan.price;
      }

      await apiRequest(`/visits/${paymentModalVisit.visit_id}`, {
        method: 'PATCH',
        body: JSON.stringify(patchPayload)
      });

      // Broadcast real-time payment update to client kiosks / checkout tabs
      try {
        const bc = new BroadcastChannel('crm_visit_updates');
        bc.postMessage({
          type: 'payment_received',
          visit_id: paymentModalVisit.visit_id,
          status: finalStatus
        });
        bc.close();
      } catch (e) {}

      window.dispatchEvent(new CustomEvent('visit_payment_updated', {
        detail: { visit_id: paymentModalVisit.visit_id, status: finalStatus }
      }));

      setActionToast(`✓ Payment & membership settlement recorded for ${paymentModalVisit.client_name}`);
      setTimeout(() => setActionToast(null), 3500);
      setPaymentModalVisit(null);
      await fetchDashboardData(true);
    } catch (err) {
      alert('Error updating payment: ' + (err.message || 'Failed'));
    } finally {
      setIsSavingPayment(false);
    }
  };


  const summary = data.summary || {
    total_clients: 0,
    new_clients: 0,
    regular_clients: 0,
    total_services: 0,
    total_revenue: 0,
    pending_balance: 0
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

      {/* Top Banner / Hero with Search & Quick Action */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        padding: '28px 32px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ maxWidth: '520px', minWidth: '240px' }}>
          <div style={{
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: '#B88B4A',
            fontWeight: '700',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {activeLocation ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {activeLocation.type === 'franchise' ? <Handshake size={14} color="#B88B4A" /> : <Building2 size={14} color="#B88B4A" />}
                {activeLocation.type === 'franchise' ? 'Franchise Studio Operations' : 'Branch Studio Operations'}
              </span>
            ) : (
              <span>{isAdmin ? 'Admin Studio Operations' : 'Reception Desk Operations'}</span>
            )}
            {activeLocation && (
              <span style={{
                background: '#FAF6EE',
                border: '1px solid #DAC493',
                color: '#9F7335',
                padding: '1px 8px',
                borderRadius: '6px',
                fontSize: '10.5px',
                fontWeight: '800'
              }}>
                {activeLocation.code || 'MB-LOC'}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '26px', color: '#1C1917', lineHeight: 1.2, margin: 0 }}>
            {activeLocation ? activeLocation.name : (isAdmin ? "Admin Studio Overview" : "Reception Desk Dashboard")}
          </h1>
        </div>

        {/* Right Corner Controls: Quick Module Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          flex: '1 1 auto',
          minWidth: 0
        }}>
          {/* Quick Module Navigation (Clients, Services, Staff, Reports) */}
          {(isAdmin || currentUser?.role === 'reception') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'clients', label: 'Clients', icon: Users, show: true },
                { id: 'services', label: 'Services', icon: Scissors, show: isAdmin },
                { id: 'staff', label: 'Staff', icon: Award, show: isAdmin },
                { id: 'reports', label: 'Reports', icon: BarChart3, show: isAdmin }
              ].filter(item => item.show).map(item => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(prev => {
                        const next = prev === item.id ? 'visits' : item.id;
                        setTimeout(() => {
                          if (sectionContentRef.current) {
                            sectionContentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 50);
                        return next;
                      });
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 18px',
                      borderRadius: '9999px',
                      fontSize: '13.5px',
                      fontWeight: '600',
                      color: isActive ? '#FFFFFF' : '#44403C',
                      background: isActive ? '#B88B4A' : '#FAF6EE',
                      border: isActive ? '1.5px solid #B88B4A' : '1.5px solid rgba(218, 196, 147, 0.45)',
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 2px 8px rgba(184, 139, 74, 0.28)' : '0 1px 3px rgba(0,0,0,0.02)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = '#F5ECE0';
                        e.currentTarget.style.borderColor = '#B88B4A';
                        e.currentTarget.style.color = '#1C1917';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = '#FAF6EE';
                        e.currentTarget.style.borderColor = 'rgba(218, 196, 147, 0.45)';
                        e.currentTarget.style.color = '#44403C';
                      }
                    }}
                  >
                    <Icon size={15} color={isActive ? '#FFFFFF' : '#B88B4A'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {/* KYC Details Pill Button matching Image 1 */}
              {activeLocation && (
                <button
                  type="button"
                  onClick={() => setIsKycModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '9px 18px',
                    borderRadius: '9999px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    color: '#9F7335',
                    background: '#FAF6EE',
                    border: '1.5px solid #DAC493',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F5ECE0';
                    e.currentTarget.style.borderColor = '#B88B4A';
                    e.currentTarget.style.color = '#1C1917';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#FAF6EE';
                    e.currentTarget.style.borderColor = '#DAC493';
                    e.currentTarget.style.color = '#9F7335';
                  }}
                  title="View or update Statutory KYC Details for this location"
                >
                  <ShieldCheck size={16} color="#B88B4A" />
                  <span>KYC Details</span>
                </button>
              )}

            </div>
          )}
        </div>
      </div>

      {/* Today's Summary Grid (Section 3 Requirement) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '18px', color: 'var(--text-main)' }}>TODAY'S SUMMARY</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>• Real-time operational metrics</span>
          </div>
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Refresh dashboard metrics and latest visits"
            style={{
              fontSize: '12px',
              color: '#B88B4A',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: isRefreshing ? 'var(--primary-subtle)' : 'transparent',
              border: 'none',
              cursor: isRefreshing ? 'wait' : 'pointer',
              padding: '6px 12px',
              borderRadius: '9999px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (!isRefreshing) e.currentTarget.style.background = 'var(--primary-subtle)';
            }}
            onMouseLeave={(e) => {
              if (!isRefreshing) e.currentTarget.style.background = 'transparent';
            }}
          >
            <RotateCw
              size={13}
              color="#B88B4A"
              style={{
                animation: isRefreshing ? 'spin 0.75s linear infinite' : 'none',
                display: 'inline-block'
              }}
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
          gap: '16px',
          alignItems: 'stretch'
        }}>
          {/* Total Clients */}
          <div className="card" style={{
            padding: '20px 22px 24px 22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '124px',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', minHeight: '34px' }}>
              <div style={{ fontSize: '11.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.06em', lineHeight: 1.35 }}>
                Clients Today
              </div>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Users size={19} color="#B88B4A" />
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)', marginTop: '16px', lineHeight: 1, letterSpacing: '-0.02em', fontFamily: 'var(--font-sans)' }}>
              {summary.total_clients}
            </div>
          </div>

          {/* New Clients */}
          <div className="card" style={{
            padding: '20px 22px 24px 22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '124px',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', minHeight: '34px' }}>
              <div style={{ fontSize: '11.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.06em', lineHeight: 1.35 }}>
                New Clients
              </div>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <UserPlus size={19} color="#166534" />
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#166534', marginTop: '16px', lineHeight: 1, letterSpacing: '-0.02em', fontFamily: 'var(--font-sans)' }}>
              {summary.new_clients}
            </div>
          </div>

          {/* Regular Clients, Total Services & Revenue Today (Admin only) */}
          {isAdmin && (
            <>
              {/* Returning / Regular Clients */}
              <div className="card" style={{
                padding: '20px 22px 24px 22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '124px',
                boxSizing: 'border-box'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', minHeight: '34px' }}>
                  <div style={{ fontSize: '11.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.06em', lineHeight: 1.35 }}>
                    Regular Clients
                  </div>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <UserCheck size={19} color="#1E40AF" />
                  </div>
                </div>
                <div style={{ fontSize: '32px', fontWeight: '800', color: '#1E40AF', marginTop: '16px', lineHeight: 1, letterSpacing: '-0.02em', fontFamily: 'var(--font-sans)' }}>
                  {summary.regular_clients}
                </div>
              </div>

              {/* Membership Credits / Earned Through Membership */}
              <div className="card" style={{
                padding: '20px 22px 24px 22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '124px',
                boxSizing: 'border-box'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', minHeight: '34px' }}>
                  <div style={{ fontSize: '11.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.06em', lineHeight: 1.35 }}>
                    Membership Redeemed
                  </div>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#FAF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Crown size={19} color="#7E22CE" />
                  </div>
                </div>
                <div style={{ fontSize: '30px', fontWeight: '800', color: '#7E22CE', marginTop: '16px', lineHeight: 1, letterSpacing: '-0.02em', fontFamily: 'var(--font-sans)' }}>
                  {formatCurrency(summary.membership_revenue || 0)}
                </div>
              </div>

              {/* Total Revenue */}
              <div className="card" style={{
                padding: '20px 22px 24px 22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '124px',
                boxSizing: 'border-box',
                background: 'linear-gradient(135deg, #FAF6EE 0%, #FFFFFF 100%)',
                border: '1.5px solid var(--primary-border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', minHeight: '34px' }}>
                  <div style={{ fontSize: '11.5px', textTransform: 'uppercase', color: '#B88B4A', fontWeight: '700', letterSpacing: '0.06em', lineHeight: 1.35 }}>
                    Revenue Today
                  </div>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IndianRupee size={19} color="#B88B4A" />
                  </div>
                </div>
                <div style={{ fontSize: '30px', fontWeight: '800', color: '#1C1917', marginTop: '16px', lineHeight: 1, letterSpacing: '-0.02em', fontFamily: 'var(--font-sans)' }}>
                  {formatCurrency(summary.total_revenue)}
                </div>
              </div>
            </>
          )}

          {/* Pending Balance */}
          <div className="card" style={{
            padding: '20px 22px 24px 22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '124px',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', minHeight: '34px' }}>
              <div style={{ fontSize: '11.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.06em', lineHeight: 1.35 }}>
                Pending Balance
              </div>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: summary.pending_balance > 0 ? 'var(--danger-bg)' : 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertCircle size={19} color={summary.pending_balance > 0 ? '#DC2626' : 'var(--text-muted)'} />
              </div>
            </div>
            <div style={{ fontSize: '30px', fontWeight: '800', color: summary.pending_balance > 0 ? '#DC2626' : 'var(--text-main)', marginTop: '16px', lineHeight: 1, letterSpacing: '-0.02em', fontFamily: 'var(--font-sans)' }}>
              {formatCurrency(summary.pending_balance)}
            </div>
          </div>
        </div>
      </div>

      {/* Anchor Ref for smooth scrolling into Section 3 */}
      <div ref={sectionContentRef} style={{ scrollMarginTop: '80px' }} />

      {/* Dynamic Section 3: Today's Visits Table or Selected Sub-Module */}
      {activeSection === 'visits' && (
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: '18px', color: 'var(--text-main)' }}>
              {isAdmin ? "TODAY'S VISITS" : "TODAY'S INTAKE QUEUE • RECEPTION DESK"}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {isAdmin
                ? "All client visits, assigned therapists, billing, and payment records for today"
                : "Real-time incoming client queue • Assign specialists, adjust service timings & verify payments"}
            </p>
          </div>
          <span className="badge badge-gold">
            {data.visits.length} Visits Logged
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading today's records...
          </div>
        ) : data.visits.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Sparkles size={36} color="#B88B4A" style={{ marginBottom: '12px', opacity: 0.8 }} />
            <h3 style={{ fontSize: '18px', color: 'var(--text-main)', marginBottom: '6px' }}>No Visits Recorded Today Yet</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Visits logged via the Visitor Desk will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="horizontal-scroller" style={{ overflowX: 'auto', minHeight: '260px' }}>
            <table style={{ width: '100%', minWidth: '960px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '14px 20px', fontWeight: '600' }}>Client Name</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Type</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Services</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Amount</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Payment Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Staff</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Service Timing</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Form Filled</th>
                  <th style={{ padding: '14px 20px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.visits.map((v) => {
                  const visitTime = formatVisitTime(v.created_at);

                  let statusBadgeClass = 'badge-paid';
                  if (v.payment_status === 'Partially Paid') statusBadgeClass = 'badge-partial';
                  if (v.payment_status === 'Pending') statusBadgeClass = 'badge-pending';

                  return (
                    <tr
                      key={v.visit_id}
                      style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-subtle)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Client Name */}
                      <td style={{ padding: '14px 20px' }}>
                        {isAdmin ? (
                          <div
                            onClick={() => onOpenClient(v.client_id)}
                            style={{ fontWeight: '600', color: '#1C1917', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'text-decoration-color 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecorationColor = '#B88B4A'}
                            onMouseLeave={(e) => e.currentTarget.style.textDecorationColor = 'transparent'}
                          >
                            {v.client_name}
                          </div>
                        ) : (
                          <div style={{ fontWeight: '600', color: '#1C1917' }}>
                            {v.client_name}
                          </div>
                        )}
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {formatPhone(v.client_phone)}
                        </div>
                      </td>

                      {/* New / Regular */}
                      <td style={{ padding: '14px 16px' }}>
                        {v.is_new_client ? (
                          <span className="badge badge-paid" style={{ fontSize: '11px' }}>
                            New Client
                          </span>
                        ) : (
                          <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                            Regular Client
                          </span>
                        )}
                      </td>

                      {/* Services */}
                      <td style={{ padding: '14px 16px', maxWidth: '320px' }}>
                        {v.services && v.services.length > 1 ? (
                          <div
                            style={{ position: 'relative', display: 'inline-block' }}
                            onMouseEnter={() => setHoveredServicesVisitId(v.visit_id)}
                            onMouseLeave={() => setHoveredServicesVisitId(null)}
                          >
                            <div
                              onClick={() => setHoveredServicesVisitId(prev => prev === v.visit_id ? null : v.visit_id)}
                              title="Hover or click to view all services"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '5px 12px',
                                borderRadius: '9999px',
                                background: hoveredServicesVisitId === v.visit_id ? '#F5ECE0' : 'var(--bg-card-subtle)',
                                border: `1.5px solid ${hoveredServicesVisitId === v.visit_id ? '#B88B4A' : 'rgba(218, 196, 147, 0.65)'}`,
                                color: '#B88B4A',
                                fontWeight: '700',
                                fontSize: '12px',
                                cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Scissors size={13} color="#B88B4A" />
                              <span>{v.services.length} Services</span>
                              <ChevronDown
                                size={13}
                                color="#B88B4A"
                                style={{
                                  transform: hoveredServicesVisitId === v.visit_id ? 'rotate(180deg)' : 'none',
                                  transition: 'transform 0.15s ease'
                                }}
                              />
                            </div>

                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', paddingLeft: '4px' }}>
                              {v.services[0]?.service_name_snapshot} + {v.services.length - 1} more
                            </div>

                            {/* Floating Services Box / Popover */}
                            {hoveredServicesVisitId === v.visit_id && (
                              <div
                                className="animate-fade-in"
                                style={{
                                  position: 'absolute',
                                  top: 'calc(100% + 4px)',
                                  left: 0,
                                  minWidth: '290px',
                                  maxWidth: '350px',
                                  background: '#FFFFFF',
                                  borderRadius: 'var(--radius-md)',
                                  border: '1.5px solid #DAC493',
                                  boxShadow: '0 14px 35px rgba(0,0,0,0.18)',
                                  padding: '12px 14px',
                                  zIndex: 150
                                }}
                              >
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  paddingBottom: '8px',
                                  borderBottom: '1px solid var(--border-light)',
                                  marginBottom: '8px'
                                }}>
                                  <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#B88B4A' }}>
                                    All Services ({v.services.length})
                                  </span>
                                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>
                                    Total: {formatCurrency(v.total_amount)}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                                  {v.services.map((s, idx) => (
                                    <div
                                      key={idx}
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '6px 10px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'var(--bg-card-subtle)',
                                        fontSize: '12.5px'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ color: '#B88B4A', fontWeight: '700' }}>•</span>
                                        <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                                          {s.service_name_snapshot}
                                        </span>
                                        {(s.is_privilege === 1 || s.is_privilege === true || parseFloat(s.price_snapshot) === 0) && (
                                          <span style={{
                                            fontSize: '9.5px',
                                            fontWeight: '700',
                                            color: '#9E7437',
                                            background: '#FAF3E3',
                                            border: '1px solid #D6A87C',
                                            borderRadius: '4px',
                                            padding: '1px 5px',
                                            textTransform: 'uppercase'
                                          }}>
                                            Privilege
                                          </span>
                                        )}
                                      </div>
                                      <span style={{ fontWeight: '700', color: (s.is_privilege || parseFloat(s.price_snapshot) === 0) ? '#9E7437' : '#B88B4A', fontSize: '12px' }}>
                                        {(s.is_privilege || parseFloat(s.price_snapshot) === 0) ? '₹0' : formatCurrency(s.price_snapshot)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontWeight: '500', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {v.service_names || 'General Service'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              1 service
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                          {formatCurrency(v.total_amount)}
                        </div>
                        {v.balance > 0 && (
                          <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: '500' }}>
                            Bal: {formatCurrency(v.balance)}
                          </div>
                        )}
                      </td>

                      {/* Payment Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            onClick={() => handleCheckPayment(v)}
                            className={`badge ${statusBadgeClass}`}
                            title={v.payment_status === 'Paid' && v.payment_method === 'UPI' ? "Click to view UPI Reference ID & Amount" : "Click to check & collect payment"}
                            style={{
                              cursor: 'pointer',
                              transition: 'transform 0.1s ease'
                            }}
                          >
                            {v.payment_status}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCheckPayment(v)}
                            title={v.payment_status === 'Paid' && v.payment_method === 'UPI' ? "Check UPI Reference ID & Amount Paid" : "Check & Record Payment"}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: 0,
                              fontSize: '12px',
                              color: '#B88B4A',
                              textDecoration: 'underline',
                              fontWeight: '700',
                              cursor: 'pointer',
                              lineHeight: 1
                            }}
                          >
                            Check
                          </button>
                        </div>
                        {v.payment_status === 'Pending' ? (() => {
                          let methodLabel = v.payment_method || 'UPI';
                          const usedCredits = parseFloat(v.membership_amount_used) || 0;
                          let intendedLabel = `Prefers: ${methodLabel}`;
                          if (usedCredits > 0 && (methodLabel === 'Membership' || !v.payment_method || v.balance === 0)) {
                            intendedLabel = `Prefers: Member Credits (${formatCurrency(usedCredits)})`;
                          } else if (usedCredits > 0 && v.balance > 0) {
                            intendedLabel = `Prefers: Credits (${formatCurrency(usedCredits)}) + ${methodLabel} (${formatCurrency(v.balance)})`;
                          }
                          return (
                            <div style={{ fontSize: '11px', color: '#92400E', fontWeight: '600', marginTop: '3px' }}>
                              {intendedLabel}
                            </div>
                          );
                        })() : (() => {
                          let methodLabel = v.payment_method || 'UPI';
                          if (methodLabel === 'Other') methodLabel = 'Desk Settlement';

                          const usedCredits = parseFloat(v.membership_amount_used) || 0;
                          let displayMethod = `Via ${methodLabel}`;

                          if (usedCredits > 0 && (methodLabel === 'Membership' || !v.payment_method || v.balance === 0)) {
                            displayMethod = `Via Member Credits (${formatCurrency(usedCredits)})`;
                          } else if (usedCredits > 0 && methodLabel) {
                            displayMethod = `Via ${methodLabel} + Credits (${formatCurrency(usedCredits)})`;
                          }

                          return (
                            <div style={{ fontSize: '11px', color: '#166534', fontWeight: '600', marginTop: '3px' }}>
                              {displayMethod}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Staff */}
                      <td style={{ padding: '14px 16px', color: 'var(--text-main)', fontSize: '13px' }}>
                        {(() => {
                          const unassignedCount = (v.services || []).filter(s => !s.staff_id).length;
                          const totalServices = v.services?.length || 1;

                          if (unassignedCount === 0 && v.staff_summary && v.staff_summary !== 'Unassigned') {
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: '600', color: '#166534' }}>{v.staff_summary}</span>
                                {!isAdmin && (
                                  <button
                                    onClick={() => handleOpenStaffModal(v)}
                                    title="Change Assigned Staff"
                                    style={{
                                      fontSize: '11px',
                                      color: '#B88B4A',
                                      background: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      textDecoration: 'underline',
                                      fontWeight: '600'
                                    }}
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>
                            );
                          }

                          if (unassignedCount > 0 && unassignedCount < totalServices) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontWeight: '600', color: '#166534', fontSize: '12px' }}>
                                  {v.staff_summary}
                                </span>
                                <button
                                  onClick={() => handleOpenStaffModal(v)}
                                  style={{
                                    padding: '3px 9px',
                                    borderRadius: '9999px',
                                    background: '#FEF3C7',
                                    border: '1px solid #F59E0B',
                                    color: '#92400E',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    width: 'fit-content'
                                  }}
                                >
                                  <Award size={12} />
                                  Assign Staff
                                </button>
                              </div>
                            );
                          }

                          return (
                            <button
                              onClick={() => handleOpenStaffModal(v)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '9999px',
                                background: '#FEF2F2',
                                border: '1px solid #FCA5A5',
                                color: '#DC2626',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Award size={12} />
                              Assign Staff
                            </button>
                          );
                        })()}
                      </td>

                      {/* Service Timing (Editable) */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenTimeModal(v)}
                          title="Click to edit assigned service timing"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 11px',
                            borderRadius: '9999px',
                            background: '#FAF6EE',
                            border: '1.5px solid #DAC493',
                            color: '#855E17',
                            fontWeight: '700',
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#F5ECCE';
                            e.currentTarget.style.borderColor = '#B88B4A';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#FAF6EE';
                            e.currentTarget.style.borderColor = '#DAC493';
                          }}
                        >
                          <Clock size={13} color="#B88B4A" />
                          <span>{v.service_time || visitTime}</span>
                          <Edit2 size={11} color="#B88B4A" style={{ marginLeft: '1px', opacity: 0.85 }} />
                        </button>
                      </td>

                      {/* Form Filled */}
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-main)', fontWeight: '500' }}>
                          <FileText size={13} color="var(--text-light)" />
                          <span>{visitTime}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>

                          <button
                            onClick={() => onOpenReceipt(v.visit_id)}
                            title="View / Print Receipt"
                            style={{
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-color)',
                              fontSize: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: '500',
                              color: 'var(--text-main)',
                              cursor: 'pointer'
                            }}
                          >
                            <Receipt size={14} color="#B88B4A" />
                            Bill
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => onOpenClient(v.client_id)}
                              title="Open Client Profile"
                              style={{
                                padding: '6px 10px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--primary-subtle)',
                                border: '1px solid var(--primary-border)',
                                fontSize: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: '600',
                                color: '#B88B4A',
                                cursor: 'pointer'
                              }}
                            >
                              <Eye size={14} />
                              Profile
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Clients Section (Rendered inside Dashboard Section 3) */}
      {activeSection === 'clients' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #FAF6EE 0%, #F5ECE0 100%)',
            border: '1.5px solid #DAC493',
            borderRadius: '12px',
            padding: '12px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={18} color="#B88B4A" />
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#1C1917', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                CLIENTS DIRECTORY
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('visits')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: '9999px',
                fontSize: '12.5px',
                fontWeight: '700',
                color: '#9F7335',
                background: '#FAF6EE',
                border: '1.5px solid #DAC493',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#B88B4A';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FAF6EE';
                e.currentTarget.style.color = '#9F7335';
              }}
            >
              ← Back to Today's Visits
            </button>
          </div>
          <ClientsList
            onOpenClient={(id) => onOpenClient(id, 'dashboard')}
            onBackToDashboard={() => setActiveSection('visits')}
          />
        </div>
      )}

      {/* Services Section (Rendered inside Dashboard Section 3) */}
      {activeSection === 'services' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #FAF6EE 0%, #F5ECE0 100%)',
            border: '1.5px solid #DAC493',
            borderRadius: '12px',
            padding: '12px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Scissors size={18} color="#B88B4A" />
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#1C1917', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                SERVICE & PRICING MANAGEMENT
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('visits')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: '9999px',
                fontSize: '12.5px',
                fontWeight: '700',
                color: '#9F7335',
                background: '#FAF6EE',
                border: '1.5px solid #DAC493',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#B88B4A';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FAF6EE';
                e.currentTarget.style.color = '#9F7335';
              }}
            >
              ← Back to Today's Visits
            </button>
          </div>
          <ServiceManagement />
        </div>
      )}

      {/* Staff Section (Rendered inside Dashboard Section 3) */}
      {activeSection === 'staff' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #FAF6EE 0%, #F5ECE0 100%)',
            border: '1.5px solid #DAC493',
            borderRadius: '12px',
            padding: '12px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Award size={18} color="#B88B4A" />
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#1C1917', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                STAFF & PRACTITIONERS MANAGEMENT
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('visits')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: '9999px',
                fontSize: '12.5px',
                fontWeight: '700',
                color: '#9F7335',
                background: '#FAF6EE',
                border: '1.5px solid #DAC493',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#B88B4A';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FAF6EE';
                e.currentTarget.style.color = '#9F7335';
              }}
            >
              ← Back to Today's Visits
            </button>
          </div>
          <StaffManagement />
        </div>
      )}

      {/* Reports Section (Rendered inside Dashboard Section 3) */}
      {activeSection === 'reports' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #FAF6EE 0%, #F5ECE0 100%)',
            border: '1.5px solid #DAC493',
            borderRadius: '12px',
            padding: '12px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BarChart3 size={18} color="#B88B4A" />
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#1C1917', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                STUDIO REPORTS & ANALYTICS
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('visits')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: '9999px',
                fontSize: '12.5px',
                fontWeight: '700',
                color: '#9F7335',
                background: '#FAF6EE',
                border: '1.5px solid #DAC493',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#B88B4A';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FAF6EE';
                e.currentTarget.style.color = '#9F7335';
              }}
            >
              ← Back to Today's Visits
            </button>
          </div>
          <ReportsView />
        </div>
      )}

      {/* Floating Action Toast */}
      {actionToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#1C1917',
          color: '#FAF7F2',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
          zIndex: 2500,
          fontSize: '13.5px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1.5px solid #DAC493'
        }}>
          <CheckCircle2 size={16} color="#10B981" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* MODAL 1: Assign Staff to Visitor Services */}
      {staffModalVisit && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28,25,23,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '20px'
        }}>
          <div className="card animate-fade-in" style={{
            maxWidth: '520px',
            width: '100%',
            background: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: '26px 28px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B88B4A', fontWeight: '800' }}>
                  Reception Staff Allocation
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1C1917', marginTop: '2px' }}>
                  Assign Staff for {staffModalVisit.client_name}
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Allocate therapists or specialists for each service requested by this visitor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStaffModalVisit(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Service Timing Banner in Staff Modal */}
            <div style={{
              background: '#FAF6EE',
              border: '1.5px solid #DAC493',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#B88B4A', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={12} color="#B88B4A" />
                  Assigned Service Timing
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileText size={11} color="var(--text-muted)" />
                  Form filled at: <strong>{formatVisitTime(staffModalVisit.created_at)}</strong>
                </div>
              </div>
              <input
                type="text"
                value={staffModalServiceTime}
                onChange={(e) => setStaffModalServiceTime(e.target.value)}
                placeholder="e.g. 11:30 AM"
                style={{
                  width: '130px',
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1.5px solid #DAC493',
                  background: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '13px',
                  color: '#855E17',
                  textAlign: 'center',
                  outline: 'none'
                }}
              />
            </div>

            {/* Services List with Staff Dropdowns */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '22px', maxHeight: '340px', overflowY: 'auto' }}>
              {staffModalVisit.services?.map(s => (
                <div key={s.visit_service_id} style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: '#1C1917' }}>
                      {s.service_name_snapshot}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#B88B4A' }}>
                      {formatCurrency(s.price_snapshot)}
                    </span>
                  </div>
                  <select
                    value={staffAssignments[s.visit_service_id] ?? (s.staff_id || '')}
                    onChange={(e) => setStaffAssignments(prev => ({ ...prev, [s.visit_service_id]: e.target.value ? Number(e.target.value) : '' }))}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1.5px solid var(--border-color)',
                      background: '#FFFFFF',
                      fontSize: '13px',
                      color: 'var(--text-main)',
                      outline: 'none'
                    }}
                  >
                    <option value="">-- Select Specialist / Therapist --</option>
                    {staffList.map(st => (
                      <option key={st.staff_id} value={st.staff_id}>
                        {st.name} ({st.role})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setStaffModalVisit(null)}
                className="btn-secondary"
                style={{ padding: '10px 18px', fontSize: '13.5px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStaffAssignments}
                disabled={isSavingStaff}
                className="btn-primary"
                style={{ padding: '10px 22px', fontSize: '13.5px', fontWeight: '700' }}
              >
                {isSavingStaff ? 'Saving...' : 'Save Staff Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2A: Check UPI Payment Verification (Read-Only: Reference ID & Amount Paid) */}
      {viewUpiModalVisit && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28,25,23,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '20px'
        }}>
          <div className="card animate-fade-in" style={{
            maxWidth: '460px',
            width: '100%',
            background: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: '28px 30px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
            border: '1.5px solid #DAC493'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'var(--success-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldCheck size={22} color="#166534" />
                </div>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B88B4A', fontWeight: '800' }}>
                    UPI Payment Verification
                  </div>
                  <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#1C1917', lineHeight: 1.2 }}>
                    Verified UPI Transaction
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewUpiModalVisit(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Client Info Banner */}
            <div style={{
              background: 'var(--bg-card-subtle)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px solid var(--border-color)'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#1C1917' }}>
                  {viewUpiModalVisit.client_name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {formatPhone(viewUpiModalVisit.client_phone)}
                </div>
              </div>
              <span className="badge badge-paid" style={{ fontSize: '11px' }}>
                Paid via UPI
              </span>
            </div>

            {/* 1. UPI Reference ID / UTR - Prominent Box */}
            <div style={{
              background: 'linear-gradient(135deg, #FAF6EE 0%, #FFFFFF 100%)',
              border: '1.5px solid #DAC493',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#B88B4A', fontWeight: '700' }}>
                  UPI Reference ID / UTR
                </span>
                <span style={{ fontSize: '11px', color: '#166534', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <CheckCircle2 size={12} color="#166534" /> Verified
                </span>
              </div>
              <div style={{
                fontSize: '18px',
                fontFamily: 'monospace',
                fontWeight: '800',
                color: '#1C1917',
                marginTop: '4px',
                letterSpacing: '0.04em',
                wordBreak: 'break-all'
              }}>
                {viewUpiModalVisit.upi_ref || `UPI/UTR-${viewUpiModalVisit.visit_id}${Date.now().toString().slice(-6)}`}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                Unique transaction reference from UPI payment gateway settlement.
              </div>
            </div>

            {/* 2. Amount Paid by UPI */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: '700' }}>
                  How Much Paid by UPI
                </div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: '#166534', marginTop: '2px', fontFamily: 'var(--font-sans)' }}>
                  {formatCurrency(viewUpiModalVisit.amount_paid || viewUpiModalVisit.total_amount)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Payment Time</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1C1917', marginTop: '2px' }}>
                  {formatVisitTime(viewUpiModalVisit.created_at)}
                </div>
              </div>
            </div>

            {/* Option to record / edit membership benefits even if paid via UPI */}
            <button
              type="button"
              onClick={() => {
                const targetVisit = viewUpiModalVisit;
                setViewUpiModalVisit(null);
                openPaymentModal(targetVisit);
              }}
              className="btn-secondary"
              style={{
                width: '100%',
                padding: '11px',
                fontSize: '13px',
                fontWeight: '700',
                borderRadius: 'var(--radius-md)',
                marginBottom: '10px',
                color: '#B88B4A',
                border: '1.5px solid #DAC493',
                background: '#FAF6EE'
              }}
            >
              💎 Record / Edit Membership Benefits & Used Amount
            </button>

            {/* Close Button (Read-only as required) */}
            <button
              type="button"
              onClick={() => setViewUpiModalVisit(null)}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                fontWeight: '700',
                borderRadius: 'var(--radius-md)'
              }}
            >
              Close Verification
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2B: Check & Record Payment (Cash or Card -> Mark as Paid) */}
      {paymentModalVisit && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28,25,23,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '20px',
          overflowY: 'auto'
        }}>
          {isSelectingUpgradeMembership ? (
            <div className="card animate-fade-in" style={{
              maxWidth: '860px',
              width: '100%',
              background: '#FFFFFF',
              borderRadius: 'var(--radius-xl)',
              padding: '28px 30px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B88B4A', fontWeight: '800' }}>
                    Maison BeYou • Membership Upgrade Desk
                  </div>
                  <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#1C1917', marginTop: '2px' }}>
                    Select Membership Tier for {paymentModalVisit.client_name}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Select a tier below to add to today's checkout bill, or click <strong>Skip</strong> to return without any changes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSelectingUpgradeMembership(false)}
                  style={{
                    background: '#FAF6EE',
                    border: '1px solid #DAC493',
                    color: '#B88B4A',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Skip & Return
                </button>
              </div>

              {/* 4 Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                {MEMBERSHIP_PLANS.map(plan => {
                  const isSelected = pendingUpgradePlan?.id === plan.id;
                  return (
                    <div
                      key={plan.id}
                      style={{
                        background: isSelected ? '#FAF6EE' : '#FFFFFF',
                        border: isSelected ? '2px solid #B88B4A' : '1.5px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '16px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: isSelected ? '0 4px 14px rgba(184, 139, 74, 0.2)' : '0 2px 6px rgba(0,0,0,0.03)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: '#B88B4A',
                          background: '#FDF8F0',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid #E8D6BC'
                        }}>
                          {plan.validity}
                        </span>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#1C1917', marginTop: '8px' }}>
                          {plan.name}
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: '#B88B4A', marginTop: '4px' }}>
                          {plan.priceFormatted || formatCurrency(plan.price)}
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.35 }}>
                          {plan.tagline}
                        </p>
                        <div style={{ marginTop: '10px', borderTop: '1px dashed #E5E7EB', paddingTop: '8px' }}>
                          <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: '#78716C', marginBottom: '4px' }}>
                            Privileges:
                          </div>
                          <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '11px', color: '#44403C', lineHeight: 1.4 }}>
                            {plan.benefits.slice(0, 2).map((b, i) => (
                              <li key={i}>{b}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setPendingUpgradePlan(plan);
                          setIsSelectingUpgradeMembership(false);
                          const newTotal = paymentModalVisit.total_amount + plan.price;
                          setPaymentForm(prev => ({
                            ...prev,
                            amount_paid: newTotal
                          }));
                        }}
                        style={{
                          marginTop: '14px',
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #B88B4A 0%, #9E7437 100%)',
                          color: '#FFFFFF',
                          fontWeight: '700',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 8px rgba(184, 139, 74, 0.25)'
                        }}
                      >
                        <Check size={14} />
                        <span>Select {plan.name.replace(' MEMBER', '')}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Bottom footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Current Services Bill: <strong>{formatCurrency(paymentModalVisit.total_amount)}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSelectingUpgradeMembership(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 18px', fontSize: '13px' }}
                >
                  Skip & Return without Changes
                </button>
              </div>
            </div>
          ) : (() => {
            const rawClientTier = (
              paymentModalVisit?.effective_membership_tier ||
              paymentModalVisit?.client_membership_tier ||
              paymentModalVisit?.membership_tier ||
              ''
            ).trim();
            const isMember = Boolean(rawClientTier && rawClientTier.toLowerCase() !== 'none' && rawClientTier.toLowerCase() !== 'non-member');
            const isPurchasingMembership = (parseFloat(paymentModalVisit?.membership_price) > 0) || Boolean(pendingUpgradePlan);
            const isExistingMember = isMember && !isPurchasingMembership;

            const tierCostMap = { 'lumiere': 50000, 'infini': 25000, 'eternal': 15000, 'eclat': 6000 };
            const matchedK = Object.keys(tierCostMap).find(k => rawClientTier.toLowerCase().includes(k));
            const defaultTierCost = matchedK ? tierCostMap[matchedK] : 25000;
            const availableCredits = paymentModalVisit?.membership_balance !== undefined && paymentModalVisit?.membership_balance !== null
              ? parseFloat(paymentModalVisit.membership_balance)
              : (isExistingMember ? defaultTierCost : 0);

            const creditUsed = parseFloat(paymentForm.membership_amount_used) || 0;
            const manualAmount = parseFloat(paymentForm.amount_paid) || 0;
            const baseBill = parseFloat(paymentModalVisit?.total_amount) || 0;
            const upgradeCost = pendingUpgradePlan ? (parseFloat(pendingUpgradePlan.price) || 0) : 0;
            const totalBill = baseBill + upgradeCost;
            const remainingAfterCredit = Math.max(0, totalBill - creditUsed);
            const totalSettled = creditUsed + manualAmount;
            const isFullySettled = totalSettled >= totalBill;
            const hasValidCredits = isExistingMember && availableCredits > 0;
            const isCreditInsufficient = isExistingMember && (!hasValidCredits || availableCredits < totalBill);
            const isUsingCredits = creditUsed > 0;
            const balanceCreditsAfterVisit = Math.max(0, availableCredits - creditUsed);

            let tierPerks = [];
            if (rawClientTier.toLowerCase().includes('lumiere')) {
              tierPerks = [
                'Unlimited expert aesthetic & dermatological consultations',
                'Birthday: ₹10,000 voucher + luxury wellness package',
                '4 Complimentary premium medi-facials or laser sessions',
                '20% Off all services & homecare product lines',
                'Personal aesthetician of choice for all visits',
                'VIP private lounge booking & companion guest passes'
              ];
            } else if (rawClientTier.toLowerCase().includes('infini')) {
              tierPerks = [
                'Free comprehensive 3D skin & hair analysis twice a year',
                'Birthday: ₹5000 voucher + complimentary luxury medi-facial',
                '2 Complimentary medi-facials or signature body therapies',
                '15% Off all aesthetic, laser & salon services year-round',
                'Dedicated relationship manager & VIP suite access',
                'Priority weekend & late-evening scheduling'
              ];
            } else if (rawClientTier.toLowerCase().includes('eternal')) {
              tierPerks = [
                'Free advanced skin analysis (worth ₹1500–₹2000)',
                'Birthday: ₹2500 Voucher / Complimentary Services',
                '1 Free express facial / peel quarterly or 2 per year',
                'Priority booking + peak hour preference',
                'Exclusive pricing on laser packages',
                'Early access to new treatments & offers'
              ];
            } else if (rawClientTier.toLowerCase().includes('eclat')) {
              tierPerks = [
                'Complimentary skin analysis (basic) once a year',
                'Birthday: ₹1000 voucher / free add-ons',
                'Priority booking on weekends',
                'Access to member-only packages',
                'Free consultation anytime'
              ];
            }

            const hasBenefitSelected = paymentForm.membership_benefit_used && paymentForm.membership_benefit_used.trim() !== '' && paymentForm.membership_benefit_used !== 'None';

            return (
              <div className="card animate-fade-in" style={{
                maxWidth: '490px',
                width: '100%',
                maxHeight: '88vh',
                overflowY: 'auto',
                background: '#FFFFFF',
                borderRadius: 'var(--radius-xl)',
                padding: '18px 22px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                boxSizing: 'border-box'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B88B4A', fontWeight: '800' }}>
                      Reception Payment Desk
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1C1917', marginTop: '2px', marginBottom: '2px' }}>
                      Payment Settlement • {paymentModalVisit?.client_name || 'Client'}
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                      Verify membership credits and collect any balance, then click <strong>Approve & Confirm</strong> to mark as Paid.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaymentModalVisit(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Bill Amount Summary Banner */}
                <div style={{
                  background: '#FAF6EE',
                  border: '1.5px solid #DAC493',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  marginBottom: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>
                      Total Bill
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#1C1917', marginTop: '1px' }}>
                      {formatCurrency(totalBill)}
                    </div>
                    {pendingUpgradePlan && (
                      <div style={{ fontSize: '11px', color: '#B88B4A', marginTop: '1px', fontWeight: '600' }}>
                        Services: {formatCurrency(baseBill)} + Upgrade: {formatCurrency(upgradeCost)}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>
                      Current Status
                    </div>
                    <span className={`badge ${paymentModalVisit?.payment_status === 'Paid' ? 'badge-paid' : 'badge-pending'}`}>
                      {paymentModalVisit?.payment_status || 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Upgrade Added Banner OR Credits Insufficient Alert */}
                {pendingUpgradePlan ? (
                  <div style={{
                    background: '#FAF6EE',
                    border: '1.5px solid #DAC493',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Crown size={20} color="#B88B4A" style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#785422' }}>
                          Upgrade Added: {pendingUpgradePlan.name} (+{formatCurrency(upgradeCost)})
                        </div>
                        <div style={{ fontSize: '11px', color: '#92400E', marginTop: '1px' }}>
                          Added to bill. Membership credits & perks will be activated upon approval.
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setIsSelectingUpgradeMembership(true)}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #DAC493',
                          color: '#B88B4A',
                          borderRadius: '5px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Change Tier
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingUpgradePlan(null);
                          setPaymentForm(prev => ({
                            ...prev,
                            amount_paid: baseBill
                          }));
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#DC2626',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : isCreditInsufficient ? (
                  <div style={{
                    background: '#FFFBEB',
                    border: '1.5px solid #FDE68A',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={18} color="#D97706" style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#92400E' }}>
                          Credits Insufficient {!hasValidCredits ? '(No Active Credits)' : `(${formatCurrency(availableCredits)} available)`}
                        </div>
                        <div style={{ fontSize: '11px', color: '#B45309', marginTop: '1px' }}>
                          Client has insufficient credits to settle today's bill.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSelectingUpgradeMembership(true)}
                      style={{
                        background: 'linear-gradient(135deg, #B88B4A 0%, #9E7437 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '7px 14px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 2px 6px rgba(184, 139, 74, 0.28)'
                      }}
                    >
                      <Crown size={14} />
                      <span>Upgrade Membership</span>
                    </button>
                  </div>
                ) : null}

                {/* Membership Purchase Callout Banner */}
                {isPurchasingMembership && (
                  <div style={{
                    background: '#FAF6EE',
                    border: '1.5px solid #DAC493',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}>
                    <span style={{ fontSize: '20px', lineHeight: 1 }}>👑</span>
                    <div style={{ fontSize: '12px', lineHeight: 1.45, color: '#44403C' }}>
                      <div style={{ fontWeight: '800', color: '#B88B4A', marginBottom: '2px' }}>
                        New Membership Purchase Included: {paymentModalVisit?.membership_tier} ({formatCurrency(paymentModalVisit?.membership_price || 0)})
                      </div>
                      <div>
                        This client is purchasing a membership on this visit. Please collect the full bill amount (<strong>{formatCurrency(totalBill)}</strong>) below via manual payment (UPI, Cash, or Card). Membership credits & benefits will be automatically activated on their profile once settled.
                      </div>
                    </div>
                  </div>
                )}

                {/* EXISTING VIP MEMBER CARD & CREDITS DEDUCTION */}
                {isExistingMember && (
                  <div style={{
                    background: '#FAF6EE',
                    border: '1.5px solid #DAC493',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginBottom: '10px',
                    boxShadow: '0 4px 14px rgba(184, 139, 74, 0.08)'
                  }}>
                    {/* Member Info & Available Credits Header */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid rgba(218, 196, 147, 0.5)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px', lineHeight: 1 }}>💎</span>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#785422', letterSpacing: '0.04em' }}>
                            {rawClientTier}
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#92400E', fontWeight: '600' }}>
                            Active VIP Member
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>
                          Available Credits
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: availableCredits > 0 ? '#166534' : '#DC2626' }}>
                          {formatCurrency(availableCredits)}
                        </div>
                      </div>
                    </div>

                    {/* Interactive Credit Usage Box */}
                    {availableCredits > 0 ? (
                      <div style={{
                        background: '#FFFFFF',
                        border: isUsingCredits ? '1.5px solid #166534' : '1.5px solid #DAC493',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        boxShadow: isUsingCredits ? '0 2px 8px rgba(22, 101, 52, 0.08)' : 'none',
                        marginBottom: '10px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle2 size={18} color={isUsingCredits ? '#166534' : '#9CA3AF'} />
                            <div>
                              <div style={{ fontSize: '12.5px', fontWeight: '800', color: isUsingCredits ? '#166534' : '#1C1917' }}>
                                {isUsingCredits ? '✓ Membership Credits Applied' : 'Use Membership Credits'}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {isUsingCredits
                                  ? `Deducting ${formatCurrency(creditUsed)} for today's visit`
                                  : `Click to deduct service cost from ${formatCurrency(availableCredits)} available credits`}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (isUsingCredits) {
                                // Remove credits -> pay manually
                                setPaymentForm(prev => ({
                                  ...prev,
                                  membership_amount_used: 0,
                                  amount_paid: totalBill,
                                  payment_method: prev.payment_method === 'Membership' ? 'UPI' : prev.payment_method
                                }));
                                setSettlementTab('manual');
                              } else {
                                // Apply credits
                                const maxCredit = Math.min(totalBill, availableCredits);
                                const remainingManual = Math.max(0, totalBill - maxCredit);
                                setPaymentForm(prev => ({
                                  ...prev,
                                  membership_amount_used: maxCredit,
                                  amount_paid: remainingManual,
                                  payment_method: remainingManual === 0 ? 'Membership' : (prev.payment_method || 'UPI'),
                                  notes: prev.notes || '[MEMBERSHIP SETTLEMENT: Auto Credits Applied]'
                                }));
                                setSettlementTab(remainingManual === 0 ? 'membership' : 'manual');
                              }
                            }}
                            style={{
                              background: isUsingCredits ? '#DCFCE7' : 'linear-gradient(135deg, #B88B4A 0%, #9E7437 100%)',
                              color: isUsingCredits ? '#166534' : '#FFFFFF',
                              border: isUsingCredits ? '1px solid #BBF7D0' : 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isUsingCredits ? (
                              <>
                                <Check size={13} />
                                <span>Credits Applied</span>
                              </>
                            ) : (
                              <span>🔘 Use Credits</span>
                            )}
                          </button>
                        </div>

                        {/* Deduction breakdown */}
                        {isUsingCredits && (
                          <div style={{
                            marginTop: '8px',
                            paddingTop: '8px',
                            borderTop: '1px dashed #E5E7EB',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            fontSize: '11.5px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4B5563' }}>
                              <span>Available Membership Credits:</span>
                              <span style={{ fontWeight: '600' }}>{formatCurrency(availableCredits)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534', fontWeight: '700' }}>
                              <span>Visit / Service Cost Deducted:</span>
                              <span>-{formatCurrency(creditUsed)}</span>
                            </div>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingTop: '5px',
                              borderTop: '1.5px solid #F3F4F6',
                              fontSize: '12.5px',
                              fontWeight: '800',
                              color: '#1C1917'
                            }}>
                              <span>Remaining Balance Credits:</span>
                              <span style={{ color: '#B88B4A', fontSize: '13.5px' }}>{formatCurrency(balanceCreditsAfterVisit)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        background: '#FFFBEB',
                        border: '1px solid #FDE68A',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '12px',
                        color: '#92400E',
                        marginBottom: '12px'
                      }}>
                        Zero balance remaining on this membership. Please collect via manual payment below or upgrade membership.
                      </div>
                    )}

                    {/* Benefit Availed / Redeemed Perk */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#1C1917' }}>
                          Benefit Availed / Redeemed:
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsEditingPerkInModal(!isEditingPerkInModal)}
                          style={{ fontSize: '11px', color: '#B88B4A', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', textDecoration: 'underline' }}
                        >
                          {isEditingPerkInModal ? 'Done' : (hasBenefitSelected ? 'Change' : '+ Select')}
                        </button>
                      </div>

                      {!isEditingPerkInModal ? (
                        hasBenefitSelected ? (
                          <div style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background: '#FFFFFF',
                            border: '1.5px solid #DAC493',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Sparkles size={15} color="#B88B4A" style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: '13px', fontWeight: '700', color: '#1C1917' }}>
                                {paymentForm.membership_benefit_used}
                              </span>
                            </div>
                            <span style={{
                              fontSize: '10.5px',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: '#DCFCE7',
                              color: '#166534',
                              border: '1px solid #BBF7D0',
                              flexShrink: 0
                            }}>
                              ✓ Selected by Client
                            </span>
                          </div>
                        ) : (
                          <div style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: '#FFFFFF',
                            border: '1px solid #E5E7EB',
                            fontSize: '11.5px',
                            color: '#6B7280'
                          }}>
                            None (No perk selected for this visit)
                          </div>
                        )
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #DAC493' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentForm(prev => ({ ...prev, membership_benefit_used: '' }));
                              setIsEditingPerkInModal(false);
                            }}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '5px',
                              border: !paymentForm.membership_benefit_used ? '1.5px solid #B88B4A' : '1px solid #E5E7EB',
                              background: !paymentForm.membership_benefit_used ? '#FAF6EE' : '#FFFFFF',
                              color: !paymentForm.membership_benefit_used ? '#B88B4A' : '#4B5563',
                              fontSize: '11.5px',
                              fontWeight: '600',
                              textAlign: 'left',
                              cursor: 'pointer'
                            }}
                          >
                            None (Do not avail perk today)
                          </button>
                          {tierPerks.map(p => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                setPaymentForm(prev => ({ ...prev, membership_benefit_used: p }));
                                setIsEditingPerkInModal(false);
                              }}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '5px',
                                border: paymentForm.membership_benefit_used === p ? '1.5px solid #B88B4A' : '1px solid #E5E7EB',
                                background: paymentForm.membership_benefit_used === p ? '#FAF6EE' : '#FFFFFF',
                                color: paymentForm.membership_benefit_used === p ? '#B88B4A' : '#1C1917',
                                fontSize: '11.5px',
                                fontWeight: paymentForm.membership_benefit_used === p ? '700' : '500',
                                textAlign: 'left',
                                cursor: 'pointer'
                              }}
                            >
                              {paymentForm.membership_benefit_used === p && <span style={{ marginRight: '6px' }}>✓</span>}
                              {p}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* IF 100% COVERED BY MEMBERSHIP CREDITS: ONLY SHOW CREDITS SETTLEMENT */}
                {isExistingMember && isUsingCredits && remainingAfterCredit === 0 ? (
                  <div style={{
                    background: '#F0FDF4',
                    border: '1.5px solid #BBF7D0',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={18} color="#166534" style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '12.5px', color: '#166534', fontWeight: '800' }}>
                          100% Settled via Membership Credits
                        </div>
                        <div style={{ fontSize: '11px', color: '#15803D' }}>
                          No cash or card collection required. Click Approve & Settle below.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentForm(prev => ({
                          ...prev,
                          membership_amount_used: 0,
                          amount_paid: totalBill,
                          payment_method: 'UPI'
                        }));
                        setSettlementTab('manual');
                      }}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #BBF7D0',
                        color: '#78716C',
                        fontSize: '11px',
                        fontWeight: '600',
                        padding: '4px 10px',
                        borderRadius: '5px',
                        cursor: 'pointer'
                      }}
                    >
                      Pay Manually Instead
                    </button>
                  </div>
                ) : (
                  /* MANUAL PAYMENT SECTION (Shown for non-members, 0 credits, or partial balances) */
                  <div>
                    {/* Remaining Balance Banner if partial credits used */}
                    {isExistingMember && isUsingCredits && remainingAfterCredit > 0 && (
                      <div style={{
                        background: '#FFFBEB',
                        border: '1.5px solid #FDE68A',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        marginBottom: '14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#92400E', fontWeight: '700' }}>
                            Remaining Balance to Collect Manually
                          </div>
                          <div style={{ fontSize: '20px', fontWeight: '800', color: '#92400E', marginTop: '2px' }}>
                            {formatCurrency(remainingAfterCredit)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '11.5px', color: '#78716C' }}>
                          <div>Total Bill: <strong>{formatCurrency(totalBill)}</strong></div>
                          <div>Credits Applied: <strong style={{ color: '#166534' }}>-{formatCurrency(creditUsed)}</strong></div>
                        </div>
                      </div>
                    )}

                    {/* Payment Method Selector (UPI, Cash, Card) */}
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1C1917', marginBottom: '6px' }}>
                        Select Manual Payment Method:
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {[
                          { id: 'UPI', label: '📱 UPI' },
                          { id: 'Cash', label: '💵 Cash' },
                          { id: 'Card', label: '💳 Card' }
                        ].map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPaymentForm(prev => ({ ...prev, payment_method: m.id }))}
                            style={{
                              padding: '10px 4px',
                              borderRadius: 'var(--radius-md)',
                              border: paymentForm.payment_method === m.id ? '2px solid #B88B4A' : '1px solid var(--border-color)',
                              background: paymentForm.payment_method === m.id ? '#FAF6EE' : '#FFFFFF',
                              color: paymentForm.payment_method === m.id ? '#B88B4A' : 'var(--text-main)',
                              fontWeight: '700',
                              fontSize: '13px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {paymentForm.payment_method === m.id && <CheckCircle2 size={13} color="#B88B4A" />}
                            <span>{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Amount Paid Input */}
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#1C1917' }}>
                          Amount Collected Manually (₹)
                        </label>
                        <button
                          type="button"
                          onClick={() => setPaymentForm(prev => ({ ...prev, amount_paid: remainingAfterCredit }))}
                          style={{ fontSize: '11px', color: '#B88B4A', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', textDecoration: 'underline' }}
                        >
                          Mark Full Remaining ({formatCurrency(remainingAfterCredit)})
                        </button>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={totalBill}
                        value={paymentForm.amount_paid}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, amount_paid: Math.max(0, parseFloat(e.target.value) || 0) }))}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: '1.5px solid var(--border-color)',
                          fontSize: '16px',
                          fontWeight: '700',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Card Slip Ref if Card */}
                    {paymentForm.payment_method === 'Card' && (
                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          Card Slip / Auth Ref (Optional)
                        </label>
                        <input
                          type="text"
                          value={paymentForm.card_ref || ''}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, card_ref: e.target.value }))}
                          placeholder="e.g. POS Auth 98234 / Card Last 4"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            fontSize: '13px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    )}

                    {/* Notes */}
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Receptionist Settlement Notes (Optional)
                      </label>
                      <input
                        type="text"
                        value={paymentForm.notes || ''}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="e.g. Paid via receptionist desk, split verified"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          fontSize: '12.5px',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                )}
                {/* Settlement Summary Footer Banner */}
                <div style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '6px',
                  fontSize: '11.5px'
                }}>
                  <div>
                    <span style={{ color: '#4B5563' }}>Settlement: </span>
                    {creditUsed > 0 && <strong style={{ color: '#166534' }}>💎 {formatCurrency(creditUsed)} + </strong>}
                    <strong>💳 {formatCurrency(manualAmount)}</strong>
                    {pendingUpgradePlan && (
                      <span style={{ fontSize: '10.5px', color: '#B88B4A', marginLeft: '6px', fontWeight: '700' }}>
                        (Includes {pendingUpgradePlan.name})
                      </span>
                    )}
                  </div>
                  <div>
                    <span style={{
                      fontWeight: '800',
                      color: isFullySettled ? '#166534' : '#DC2626'
                    }}>
                      {isFullySettled ? '✓ Fully Settled (Paid)' : `Due: ${formatCurrency(Math.max(0, totalBill - totalSettled))}`}
                    </span>
                  </div>
                </div>

                {/* Modal Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
                  <div>
                    {!pendingUpgradePlan && (
                      <button
                        type="button"
                        onClick={() => setIsSelectingUpgradeMembership(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#B88B4A',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          textDecoration: 'underline'
                        }}
                      >
                        <Crown size={13} />
                        <span>Upgrade / Add Membership</span>
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setPaymentModalVisit(null)}
                      className="btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePayment}
                      disabled={isSavingPayment}
                      className="btn-primary"
                      style={{
                        padding: '8px 20px',
                        fontSize: '13.5px',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <CheckCircle2 size={15} />
                      {isSavingPayment
                        ? 'Saving...'
                        : (isUsingCredits && manualAmount === 0
                            ? 'Approve & Settle from Credits'
                            : (paymentModalVisit?.payment_status === 'Pending' ? 'Approve & Confirm' : 'Save Changes'))}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* MODAL 3: Edit Assigned Service Timing */}
      {editTimeModalVisit && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28,25,23,0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '20px'
        }}>
          <div className="card animate-fade-in" style={{
            maxWidth: '480px',
            width: '100%',
            background: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: '26px 28px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
            border: '1.5px solid #DAC493'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#FAF6EE',
                  border: '1.5px solid #DAC493',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Clock size={20} color="#B88B4A" />
                </div>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B88B4A', fontWeight: '800' }}>
                    Service Schedule
                  </div>
                  <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#1C1917', lineHeight: 1.2 }}>
                    Edit Service Timing
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditTimeModalVisit(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Client & Form Filled Summary Banner */}
            <div style={{
              background: 'var(--bg-card-subtle)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '18px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#1C1917' }}>
                  {editTimeModalVisit.client_name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {editTimeModalVisit.service_names || '1 service'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>
                  Form Filled At
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#166534', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', marginTop: '2px' }}>
                  <FileText size={12} color="#166534" />
                  {formatVisitTime(editTimeModalVisit.created_at)}
                </div>
              </div>
            </div>

            {/* Timing Input & Current Selection */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#1C1917', marginBottom: '8px' }}>
                Assigned Service Timing:
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={customServiceTime}
                  onChange={(e) => setCustomServiceTime(e.target.value)}
                  placeholder="e.g. 11:30 AM"
                  style={{
                    flex: 1,
                    padding: '11px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '2px solid #DAC493',
                    fontSize: '16px',
                    fontWeight: '800',
                    color: '#855E17',
                    background: '#FAF6EE',
                    outline: 'none',
                    letterSpacing: '0.02em'
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setCustomServiceTime(now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }));
                  }}
                  style={{
                    padding: '11px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #DAC493',
                    background: '#FFFFFF',
                    color: '#B88B4A',
                    fontWeight: '700',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Set Now
                </button>
              </div>
            </div>

            {/* Quick Adjustment Presets */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Quick Offset from Intake ({formatVisitTime(editTimeModalVisit.created_at)}):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {[
                  { label: '+10m', mins: 10 },
                  { label: '+15m', mins: 15 },
                  { label: '+30m', mins: 30 },
                  { label: '+45m', mins: 45 },
                  { label: '+1 hr', mins: 60 },
                  { label: '+1.5 hr', mins: 90 },
                  { label: '+2 hr', mins: 120 },
                  { label: 'Reset Form Time', mins: 0 }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const baseDate = new Date(editTimeModalVisit.created_at || Date.now());
                      const targetDate = new Date(baseDate.getTime() + item.mins * 60000);
                      setCustomServiceTime(targetDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }));
                    }}
                    style={{
                      padding: '7px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: item.mins === 0 ? 'var(--bg-surface)' : '#FAF6EE',
                      border: '1px solid #DAC493',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      color: item.mins === 0 ? 'var(--text-muted)' : '#855E17',
                      cursor: 'pointer'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Common Time Slot Chips */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Standard Salon Slots:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto', padding: '2px 0' }}>
                {[
                  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
                  '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
                  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM',
                  '7:00 PM', '7:30 PM', '8:00 PM'
                ].map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setCustomServiceTime(slot)}
                    style={{
                      padding: '5px 9px',
                      borderRadius: '6px',
                      background: customServiceTime === slot ? '#B88B4A' : 'var(--bg-surface)',
                      color: customServiceTime === slot ? '#FFFFFF' : 'var(--text-main)',
                      border: customServiceTime === slot ? '1px solid #B88B4A' : '1px solid var(--border-color)',
                      fontSize: '11.5px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setEditTimeModalVisit(null)}
                className="btn-secondary"
                style={{ padding: '10px 18px', fontSize: '13.5px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveServiceTime}
                disabled={isSavingServiceTime}
                className="btn-primary"
                style={{
                  padding: '10px 22px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle2 size={16} />
                {isSavingServiceTime ? 'Saving...' : 'Save Service Timing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Branch & Franchise Statutory KYC Modal Overlay */}
      {isKycModalOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsKycModalOpen(false);
            }
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(28, 25, 23, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            overflowY: 'auto',
            padding: '28px 16px'
          }}
        >
          <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
            <BranchFranchiseKYCModal
              isOpen={isKycModalOpen}
              onClose={() => setIsKycModalOpen(false)}
              locationToEdit={currentLocation}
              onSuccess={(updatedLoc) => {
                setCurrentLocation(updatedLoc);
                setIsKycModalOpen(false);
                if (onSwitchLocation) onSwitchLocation(updatedLoc);
              }}
              defaultType={currentLocation?.type || 'branch'}
              defaultFirmType={currentLocation?.kyc?.firm_type || currentLocation?.firm_type || 'Proprietor'}
            />
          </div>
        </div>
      )}
    </div>
  );
}

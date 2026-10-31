import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart3, IndianRupee, Users, Sparkles, Award,
  TrendingUp, Calendar, ChevronRight, ChevronLeft, Filter, Download,
  Printer, RefreshCw, Clock, AlertCircle, CheckCircle2,
  ArrowUpRight, Search, CreditCard, Flame, Snowflake,
  X, UserPlus, UserCheck, Repeat, Crown, GripVertical, RotateCcw
} from 'lucide-react';
import { apiRequest, formatCurrency, formatDate } from '../utils/api';

const DEFAULT_KPI_CARD_ORDER = [
  'revenue',
  'ticket',
  'footfall',
  'memberships',
  'category',
  'services',
  'payment',
  'staff'
];

export default function ReportsView({ onOpenClient, branding }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Membership quick management modals in Reports
  const [adjustBalanceModal, setAdjustBalanceModal] = useState({ open: false, member: null, amount: '' });
  const [extendValidityModal, setExtendValidityModal] = useState({ open: false, member: null, date: '' });

  // Filter states
  const [preset, setPreset] = useState('month'); // 'today' | 'yesterday' | 'week' | 'last_week' | 'month' | 'last_month' | 'year' | 'last_year' | 'all_time' | 'specific_month' | 'specific_year' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Sub-tab states
  const [serviceSubTab, setServiceSubTab] = useState('top'); // 'top' | 'unused'
  const [unusedSearch, setUnusedSearch] = useState('');
  const [unusedCategoryFilter, setUnusedCategoryFilter] = useState('all');

  // Day-wise table filter
  const [dayStatusFilter, setDayStatusFilter] = useState('all'); // 'all' | 'green' | 'orange' | 'red'
  const [hideZeroDays, setHideZeroDays] = useState(false);

  // Executive KPI deep-dive popup modal tab state ('revenue' | 'ticket' | 'footfall' | 'memberships' | 'category' | 'payment' | 'staff' | 'services' | null)
  const [activeKpiModal, setActiveKpiModal] = useState(null);

  // Draggable KPI cards state
  const [kpiCardOrder, setKpiCardOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('mb_reports_kpi_card_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_KPI_CARD_ORDER.length && DEFAULT_KPI_CARD_ORDER.every(id => parsed.includes(id))) {
          return parsed;
        }
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_KPI_CARD_ORDER;
  });
  const [draggedCardId, setDraggedCardId] = useState(null);
  const [dragOverCardId, setDragOverCardId] = useState(null);
  const isDraggingRef = useRef(false);

  const handleDragStart = (e, cardId) => {
    isDraggingRef.current = true;
    setDraggedCardId(cardId);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', cardId);
    } catch (err) {}
  };

  const handleDragOver = (e, cardId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCardId !== cardId) {
      setDragOverCardId(cardId);
    }
  };

  const handleDragLeave = (e, cardId) => {
    if (dragOverCardId === cardId) {
      setDragOverCardId(null);
    }
  };

  const handleDrop = (e, targetCardId) => {
    e.preventDefault();
    if (!draggedCardId || draggedCardId === targetCardId) {
      setDragOverCardId(null);
      setDraggedCardId(null);
      setTimeout(() => { isDraggingRef.current = false; }, 120);
      return;
    }

    const newOrder = [...kpiCardOrder];
    const sourceIdx = newOrder.indexOf(draggedCardId);
    const targetIdx = newOrder.indexOf(targetCardId);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      newOrder.splice(sourceIdx, 1);
      newOrder.splice(targetIdx, 0, draggedCardId);
      setKpiCardOrder(newOrder);
      try {
        localStorage.setItem('mb_reports_kpi_card_order', JSON.stringify(newOrder));
      } catch (err) {}
    }

    setDragOverCardId(null);
    setDraggedCardId(null);
    setTimeout(() => { isDraggingRef.current = false; }, 120);
  };

  const handleDragEnd = () => {
    setDragOverCardId(null);
    setDraggedCardId(null);
    setTimeout(() => { isDraggingRef.current = false; }, 120);
  };

  const handleResetCardOrder = () => {
    setKpiCardOrder(DEFAULT_KPI_CARD_ORDER);
    try {
      localStorage.removeItem('mb_reports_kpi_card_order');
    } catch (err) {}
  };

  const handleCardClick = (cardId) => {
    if (isDraggingRef.current) return;
    setActiveKpiModal(cardId);
  };
  const [footfallTab, setFootfallTab] = useState('all'); // 'all' | 'new' | 'old'
  const [footfallSearch, setFootfallSearch] = useState('');

  // Membership modal filter states
  const [membershipTierFilter, setMembershipTierFilter] = useState('all'); // 'all' | 'Infini' | 'Lumière' | 'Eternal' | 'Éclat'
  const [membershipSearch, setMembershipSearch] = useState('');

  // Daily trend chart metric mode ('revenue' | 'clients')
  const [dailyChartMetric, setDailyChartMetric] = useState('revenue');

  // Day-wise deep dive popup modal state
  const [activeDayModal, setActiveDayModal] = useState(null);
  const [dayDetailsData, setDayDetailsData] = useState(null);
  const [dayDetailsLoading, setDayDetailsLoading] = useState(false);
  const [dayVisitsFilter, setDayVisitsFilter] = useState('all'); // 'all' | 'new' | 'old'
  const [dayVisitsSearch, setDayVisitsSearch] = useState('');

  // Fetch reports based on filters
  async function fetchReports(overrideParams = {}) {
    try {
      setLoading(true);
      setError('');

      const activePreset = overrideParams.preset !== undefined ? overrideParams.preset : preset;
      const activeMonth = overrideParams.month !== undefined ? overrideParams.month : selectedMonth;
      const activeYear = overrideParams.year !== undefined ? overrideParams.year : selectedYear;
      const activeStart = overrideParams.start !== undefined ? overrideParams.start : customStart;
      const activeEnd = overrideParams.end !== undefined ? overrideParams.end : customEnd;

      let queryParams = [];

      if (activePreset === 'specific_month' && activeMonth) {
        queryParams.push(`month=${encodeURIComponent(activeMonth)}`);
      } else if (activePreset === 'specific_year' && activeYear) {
        queryParams.push(`year=${encodeURIComponent(activeYear)}`);
      } else if (activePreset === 'custom' && activeStart && activeEnd) {
        queryParams.push(`start_date=${encodeURIComponent(activeStart)}`);
        queryParams.push(`end_date=${encodeURIComponent(activeEnd)}`);
      } else {
        queryParams.push(`preset=${encodeURIComponent(activePreset)}`);
      }

      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const res = await apiRequest(`/reports${queryString}`);
      setData(res);

      // Prepopulate month selector if empty
      if (res.filter_options?.available_months?.length > 0 && !selectedMonth) {
        setSelectedMonth(res.filter_options.available_months[0]);
      }
      if (res.filter_options?.available_years?.length > 0 && !selectedYear) {
        setSelectedYear(res.filter_options.available_years[0]);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSaveBalanceAdjustment = async (e) => {
    e.preventDefault();
    const { member, amount } = adjustBalanceModal;
    if (!member) return;
    try {
      await apiRequest(`/clients/${member.client_id}/membership`, {
        method: 'PATCH',
        body: JSON.stringify({
          membership_balance: parseFloat(amount) || 0
        })
      });
      setAdjustBalanceModal({ open: false, member: null, amount: '' });
      fetchReports();
    } catch (err) {
      alert('Failed to update balance: ' + err.message);
    }
  };

  const handleSaveExtendValidity = async (e) => {
    e.preventDefault();
    const { member, date } = extendValidityModal;
    if (!member || !date) return;
    try {
      await apiRequest(`/clients/${member.client_id}/membership-validity`, {
        method: 'PUT',
        body: JSON.stringify({
          membership_expires_at: date
        })
      });
      setExtendValidityModal({ open: false, member: null, date: '' });
      fetchReports();
    } catch (err) {
      alert('Failed to extend validity: ' + err.message);
    }
  };

  // Handle escape key to close modals
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setActiveKpiModal(null);
        setActiveDayModal(null);
      }
    }
    if (activeKpiModal || activeDayModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeKpiModal, activeDayModal]);

  // Fetch day-specific appointment & invoice breakdown when activeDayModal is opened
  useEffect(() => {
    if (activeDayModal && activeDayModal.date) {
      setDayDetailsLoading(true);
      apiRequest(`/reports/day-details?date=${encodeURIComponent(activeDayModal.date)}`)
        .then(res => setDayDetailsData(res))
        .catch(err => {
          console.error('Failed to load day details:', err);
          setDayDetailsData(null);
        })
        .finally(() => setDayDetailsLoading(false));
    } else {
      setDayDetailsData(null);
    }
  }, [activeDayModal?.date]);

  // Quick Preset Click Handler
  const handlePresetChange = (newPreset) => {
    setPreset(newPreset);
    setSelectedMonth('');
    setSelectedYear('');
    setCustomStart('');
    setCustomEnd('');
    if (newPreset !== 'specific_month' && newPreset !== 'specific_year' && newPreset !== 'custom') {
      fetchReports({ preset: newPreset, month: '', year: '', start: '', end: '' });
    }
  };

  const handleMonthSelect = (m) => {
    if (!m) {
      handlePresetChange('month');
      return;
    }
    setSelectedMonth(m);
    setSelectedYear('');
    setCustomStart('');
    setCustomEnd('');
    setPreset('specific_month');
    fetchReports({ preset: 'specific_month', month: m, year: '', start: '', end: '' });
  };

  const handleYearSelect = (y) => {
    if (!y) {
      handlePresetChange('year');
      return;
    }
    setSelectedYear(y);
    setSelectedMonth('');
    setCustomStart('');
    setCustomEnd('');
    setPreset('specific_year');
    fetchReports({ preset: 'specific_year', year: y, month: '', start: '', end: '' });
  };

  const handleApplyCustomRange = (e) => {
    e.preventDefault();
    if (!customStart || !customEnd) return;
    setPreset('custom');
    fetchReports({ preset: 'custom', start: customStart, end: customEnd });
  };

  const handleResetCustomRange = () => {
    setCustomStart('');
    setCustomEnd('');
    setPreset('month');
    fetchReports({ preset: 'month', start: '', end: '', month: '', year: '' });
  };


  // Export CSV
  const handleExportCSV = () => {
    if (!data || !data.day_wise?.days) return;
    const headers = ['Date', 'Day', 'Status', 'Visits Count', 'Collected Revenue (INR)', 'Gross Invoiced (INR)', 'Top Treatment'];
    const rows = data.day_wise.days.map(d => [
      d.date,
      d.display_date,
      d.status.toUpperCase(),
      d.visits_count,
      d.revenue,
      d.gross_amount,
      `"${(d.top_service || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Studio_Report_${data.period?.start_date}_to_${data.period?.end_date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  if (loading && !data) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', color: '#8C7E74' }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: '#B88B4A' }} />
        <div style={{ fontSize: '15px', fontWeight: '600', color: '#1C1917' }}>Generating Studio Operational Reports...</div>
        <div style={{ fontSize: '12.5px', marginTop: '4px' }}>Aggregating multi-period revenue, visits, and service utilization</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', color: '#DC2626' }}>
        <AlertCircle size={32} style={{ margin: '0 auto 10px' }} />
        <div style={{ fontWeight: '700', fontSize: '16px' }}>Failed to Load Studio Reports</div>
        <div style={{ fontSize: '13px', marginTop: '4px' }}>{error}</div>
        <button
          onClick={() => fetchReports()}
          style={{
            marginTop: '16px',
            padding: '8px 18px',
            borderRadius: '9999px',
            background: '#DC2626',
            color: '#FFFFFF',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  const {
    period = {},
    revenue = {},
    clients = {},
    day_wise = { days: [] },
    top_services = [],
    unused_services = [],
    categories = [],
    staff_performance = [],
    payment_methods: paymentMethods = [],
    filter_options = { available_months: [], available_years: [] },
    monthly_breakdown = [],
    memberships = {
      total_plans: 4,
      total_members: 0,
      total_credits_allocated: 0,
      total_credits_used: 0,
      total_remaining_balance: 0,
      overall_usage_pct: 0,
      plans: [],
      tier_breakdown: [],
      members_roster: []
    }
  } = data || {};

  const payment_methods = paymentMethods;

  // Valid tender payment modes (strictly excludes null and 'Other' non-tender entries as requested)
  const displayPaymentMethods = useMemo(() => {
    return (paymentMethods || []).filter(pm => {
      if (!pm || !pm.payment_method) return false;
      const method = String(pm.payment_method).trim().toLowerCase();
      return method !== '' && method !== 'other' && method !== 'null' && method !== 'undefined';
    });
  }, [paymentMethods]);

  // Unused services filtering
  const filteredUnusedServices = unused_services.filter(s => {
    const matchesSearch = !unusedSearch || s.service_name.toLowerCase().includes(unusedSearch.toLowerCase());
    const matchesCategory = unusedCategoryFilter === 'all' || s.category_name === unusedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const unusedCategories = Array.from(new Set(unused_services.map(s => s.category_name).filter(Boolean)));

  // Day-wise filtering
  const filteredDays = day_wise.days.filter(d => {
    if (hideZeroDays && d.revenue === 0 && d.visits_count === 0) return false;
    if (dayStatusFilter === 'all') return true;
    return d.status === dayStatusFilter;
  });

  const maxDailyRevenue = Math.max(...day_wise.days.map(d => d.revenue), 1000);
  const maxTopServiceCount = Math.max(...top_services.map(s => s.times_performed), 1);
  const maxDailyNewOldRev = Math.max(
    ...day_wise.days.map(d => Math.max(d.new_revenue || 0, d.old_revenue || 0)),
    1000
  );
  const maxDailyNewOldClients = Math.max(
    ...day_wise.days.map(d => Math.max(d.new_clients_count || 0, d.old_clients_count || 0)),
    1
  );

  // Client footfall breakdown filtering
  const clientBreakdownList = clients.clients_breakdown || [];
  const filteredFootfallClients = clientBreakdownList.filter(c => {
    if (footfallTab === 'new' && !c.is_new) return false;
    if (footfallTab === 'old' && c.is_new) return false;
    if (footfallSearch.trim()) {
      const query = footfallSearch.trim().toLowerCase();
      const matchesName = (c.name || '').toLowerCase().includes(query);
      const matchesPhone = (c.phone || '').includes(query);
      return matchesName || matchesPhone;
    }
    return true;
  });

  const periodNewClients = clients.period_new !== undefined ? clients.period_new : (clients.new_clients || 0);
  const periodOldClients = clients.period_repeat !== undefined ? clients.period_repeat : (clients.old_clients !== undefined ? clients.old_clients : Math.max(0, (clients.period_unique || 0) - periodNewClients));
  const newClientsCount = clientBreakdownList.length > 0 ? clientBreakdownList.filter(c => c.is_new).length : periodNewClients;
  const oldClientsCount = clientBreakdownList.length > 0 ? clientBreakdownList.filter(c => !c.is_new).length : periodOldClients;

  // Membership roster filtering
  const membershipRosterList = memberships.members_roster || [];
  const filteredMembershipMembers = membershipRosterList.filter(m => {
    if (membershipTierFilter !== 'all' && m.tier_group !== membershipTierFilter) return false;
    if (membershipSearch.trim()) {
      const q = membershipSearch.trim().toLowerCase();
      const matchesName = (m.name || '').toLowerCase().includes(q);
      const matchesPhone = (m.phone || '').includes(q);
      const matchesEmail = (m.email || '').toLowerCase().includes(q);
      const matchesReg = (m.reg_no || '').toLowerCase().includes(q);
      return matchesName || matchesPhone || matchesEmail || matchesReg;
    }
    return true;
  });

  return (
    <div className="animate-fade-in reports-container" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* 1. Header & Executive Controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
        borderBottom: '1px solid #E7DFD5',
        paddingBottom: '22px'
      }}>
        <div>
          <h1 style={{ fontSize: '26px', color: '#1C1917', margin: 0, fontWeight: '700', paddingLeft: '20px' }}>
            {branding?.reports_heading || 'Executive Reporting & Analytics'}
          </h1>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginRight: '20px' }}>
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: '700',
              color: '#1C1917',
              background: '#FFFFFF',
              border: '1px solid #D6D3D1',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Download Day-wise CSV Report"
          >
            <Download size={14} color="#B88B4A" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: '700',
              color: '#FFFFFF',
              background: '#B88B4A',
              border: '1px solid #A67B38',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(184, 139, 74, 0.25)',
              transition: 'all 0.15s ease'
            }}
            title="Print Clean Executive Summary"
          >
            <Printer size={14} color="#FFFFFF" />
            Print Report
          </button>

          <button
            type="button"
            onClick={() => fetchReports()}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: '1px solid #D6D3D1',
              cursor: 'pointer'
            }}
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} color="#78716C" />
          </button>
        </div>
      </div>

      {/* 2. Interactive Period & Date Range Filter Bar */}
      <div className="card" style={{
        marginTop: '8px',
        padding: '18px 22px',
        background: '#FAF6EE',
        border: '1.5px solid #DAC493',
        borderRadius: '14px',
        boxShadow: '0 2px 6px rgba(184, 139, 74, 0.08)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Quick Presets Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={15} color="#B88B4A" />
              <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1C1917' }}>
                Select Reporting Period
              </span>
            </div>

            {/* Branch Registration & Inception metadata badge */}
            <div style={{ fontSize: '11.5px', color: '#78716C', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={12} color="#B88B4A" />
              <span>
                Branch: <strong style={{ color: '#1C1917' }}>{period.branch_name || 'Studio'}</strong>
                {period.earliest_visit && (
                  <> • Tracking since: <strong style={{ color: '#1C1917' }}>{formatDate(period.earliest_visit)}</strong></>
                )}
              </span>
            </div>
          </div>

          {/* Custom Date Range Picker */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '14px'
          }}>
            <form onSubmit={handleApplyCustomRange} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={14} color="#B88B4A" /> Custom Date Range:
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #D6D3D1',
                  background: '#FFFFFF',
                  fontSize: '12.5px',
                  color: '#1C1917',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '12.5px', color: '#78716C', fontWeight: '600' }}>to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #D6D3D1',
                  background: '#FFFFFF',
                  fontSize: '12.5px',
                  color: '#1C1917',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={!customStart || !customEnd}
                style={{
                  padding: '6px 16px',
                  borderRadius: '8px',
                  background: customStart && customEnd ? '#B88B4A' : '#E7E5E4',
                  color: customStart && customEnd ? '#FFFFFF' : '#A8A29E',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: customStart && customEnd ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                  boxShadow: customStart && customEnd ? '0 2px 4px rgba(184, 139, 74, 0.25)' : 'none'
                }}
              >
                Apply
              </button>
              {(customStart || customEnd || preset === 'custom') && (
                <button
                  type="button"
                  onClick={handleResetCustomRange}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    color: '#78716C',
                    border: '1px solid #D6D3D1',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Reset
                </button>
              )}
            </form>
          </div>

          {/* Pre-Inception Milestone Banner if selected period precedes branch registration */}
          {period.is_pre_inception && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              background: '#FFFBEB',
              border: '1.5px solid #FCD34D',
              borderRadius: '8px',
              fontSize: '12.5px',
              color: '#92400E'
            }}>
              <AlertCircle size={18} color="#D97706" style={{ flexShrink: 0 }} />
              <div>
                <strong>Branch Registration Milestone:</strong> {period.branch_name || 'This branch'} was officially registered and activated on <strong>{formatDate(period.branch_created_at || '2026-10-05')}</strong>. The selected timeframe (<strong>{period.label}</strong>) precedes the branch's registration, so operations and revenue are ₹0.
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 3. Executive KPI Metric Cards (Draggable & Flexible Reordering) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', padding: '0 4px', marginBottom: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#78716C', fontWeight: '600' }}>
            <GripVertical size={13} color="#B88B4A" />
            <span>Drag cards to reorder executive metrics to your preferred layout</span>
          </div>
          {JSON.stringify(kpiCardOrder) !== JSON.stringify(DEFAULT_KPI_CARD_ORDER) && (
            <button
              type="button"
              onClick={handleResetCardOrder}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: '700',
                color: '#8C6828',
                background: '#FAF6EE',
                border: '1px solid #DAC493',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Reset to default card layout"
            >
              <RotateCcw size={11} color="#8C6828" />
              Reset Order
            </button>
          )}
        </div>

        <div className="reports-kpi-grid">
          {kpiCardOrder.map((cardId) => {
            const isDragged = draggedCardId === cardId;
            const isDragOver = dragOverCardId === cardId && draggedCardId !== cardId;

            const baseCardStyle = {
              padding: '20px 22px 18px 22px',
              borderRadius: '16px',
              background: '#FFFFFF',
              border: isDragOver ? '2px dashed #B88B4A' : '1px solid #EFEAE4',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'grab',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
              opacity: isDragged ? 0.35 : 1,
              transform: isDragOver ? 'scale(1.02)' : 'none',
              boxShadow: isDragOver ? '0 8px 24px rgba(184, 139, 74, 0.22)' : ''
            };

            const handleMouseEnter = (e) => {
              if (!isDraggingRef.current && dragOverCardId !== cardId) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(184, 139, 74, 0.12)';
                e.currentTarget.style.borderColor = '#DAC493';
              }
            };

            const handleMouseLeave = (e) => {
              if (!isDraggingRef.current && dragOverCardId !== cardId) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '';
                e.currentTarget.style.borderColor = '#EFEAE4';
              }
            };

            const dragProps = {
              className: 'card reports-kpi-card',
              draggable: true,
              onDragStart: (e) => handleDragStart(e, cardId),
              onDragOver: (e) => handleDragOver(e, cardId),
              onDragLeave: (e) => handleDragLeave(e, cardId),
              onDrop: (e) => handleDrop(e, cardId),
              onDragEnd: handleDragEnd,
              onClick: () => handleCardClick(cardId),
              onMouseEnter: handleMouseEnter,
              onMouseLeave: handleMouseLeave,
              style: baseCardStyle
            };

            if (cardId === 'revenue') {
              return (
                <div
                  key="revenue"
                  {...dragProps}
                  title="Click to view Revenue Breakdown & Invoices (Drag to reorder)"
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', minHeight: '34px', gap: '8px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#78716C', fontWeight: '700', letterSpacing: '0.06em', lineHeight: 1.35 }}>
                        Period Collected Revenue
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <GripVertical size={13} color="#B88B4A" style={{ opacity: 0.45, cursor: 'grab' }} />
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#FAF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <IndianRupee size={16} color="#B88B4A" />
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#1C1917', marginTop: '14px', height: '36px', display: 'flex', alignItems: 'center', lineHeight: 1, letterSpacing: '-0.02em' }}>
                      {formatCurrency(revenue.period_revenue)}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '16px',
                    paddingTop: '12px',
                    fontSize: '11.5px',
                    color: '#8C6828',
                    fontWeight: '600',
                    borderTop: '1px dashed #DAC493'
                  }}>
                    <span>Tap for Revenue Audit</span>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10.5px',
                      background: '#FAF6EE',
                      color: '#8C6828',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #DAC493',
                      fontWeight: '700'
                    }}>
                      Breakdown ↗
                    </span>
                  </div>
                </div>
              );
            }

            if (cardId === 'ticket') {
              return (
                <div
                  key="ticket"
                  {...dragProps}
                  title="Click to view Average Ticket Size Distribution (Drag to reorder)"
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', minHeight: '34px', gap: '8px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#78716C', fontWeight: '700', letterSpacing: '0.06em', lineHeight: 1.35 }}>
                        Average Ticket Size
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <GripVertical size={13} color="#B88B4A" style={{ opacity: 0.45, cursor: 'grab' }} />
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#FAF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <TrendingUp size={16} color="#B88B4A" />
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#1C1917', marginTop: '14px', height: '36px', display: 'flex', alignItems: 'center', lineHeight: 1, letterSpacing: '-0.02em' }}>
                      {formatCurrency(revenue.avg_ticket)}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '16px',
                    paddingTop: '12px',
                    fontSize: '11.5px',
                    color: '#8C6828',
                    fontWeight: '600',
                    borderTop: '1px dashed #DAC493'
                  }}>
                    <span>Tap for Ticket Distribution</span>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10.5px',
                      background: '#FAF6EE',
                      color: '#8C6828',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #DAC493',
                      fontWeight: '700'
                    }}>
                      Breakdown ↗
                    </span>
                  </div>
                </div>
              );
            }

            if (cardId === 'footfall') {
              return (
                <div
                  key="footfall"
                  {...dragProps}
                  title="Click to view New vs Old client counts & breakdown (Drag to reorder)"
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', minHeight: '34px', gap: '8px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#78716C', fontWeight: '700', letterSpacing: '0.06em', lineHeight: 1.35 }}>
                        Client Footfall & Rate
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <GripVertical size={13} color="#B88B4A" style={{ opacity: 0.45, cursor: 'grab' }} />
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#FAF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Users size={16} color="#B88B4A" />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '14px', height: '36px' }}>
                      <span style={{ fontSize: '32px', fontWeight: '800', color: '#1C1917', lineHeight: 1, letterSpacing: '-0.02em' }}>
                        {clients.period_unique || 0}
                      </span>
                      <span style={{ fontSize: '12px', color: '#78716C', fontWeight: '600', textTransform: 'uppercase' }}>
                        footfall
                      </span>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '16px',
                    paddingTop: '12px',
                    fontSize: '11.5px',
                    color: '#8C6828',
                    fontWeight: '600',
                    borderTop: '1px dashed #DAC493'
                  }}>
                    <span>Tap for New & Old counts</span>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10.5px',
                      background: '#FAF6EE',
                      color: '#8C6828',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #DAC493',
                      fontWeight: '700'
                    }}>
                      Breakdown ↗
                    </span>
                  </div>
                </div>
              );
            }

            if (cardId === 'memberships') {
              return (
                <div
                  key="memberships"
                  {...dragProps}
                  title="Click to view Studio Memberships & Client Credits Intelligence (Drag to reorder)"
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', minHeight: '34px', gap: '8px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#78716C', fontWeight: '700', letterSpacing: '0.06em', lineHeight: 1.35 }}>
                        Studio Memberships & Credits
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <GripVertical size={13} color="#B88B4A" style={{ opacity: 0.45, cursor: 'grab' }} />
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#FAF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Crown size={15} color="#B88B4A" />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '14px', height: '36px' }}>
                      <span style={{ fontSize: '32px', fontWeight: '800', color: '#1C1917', lineHeight: 1, letterSpacing: '-0.02em' }}>
                        {memberships.total_members || 0}
                      </span>
                      <span style={{ fontSize: '12px', color: '#78716C', fontWeight: '600', textTransform: 'uppercase' }}>
                        members
                      </span>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '16px',
                    paddingTop: '12px',
                    fontSize: '11.5px',
                    color: '#8C6828',
                    fontWeight: '600',
                    borderTop: '1px dashed #DAC493'
                  }}>
                    <span>Tap for Membership Audit</span>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10.5px',
                      background: '#FAF6EE',
                      color: '#8C6828',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #DAC493',
                      fontWeight: '700'
                    }}>
                      Breakdown ↗
                    </span>
                  </div>
                </div>
              );
            }

            if (cardId === 'category') {
              return (
                <div
                  key="category"
                  {...dragProps}
                  title="Click to view Revenue by Category Insights (Drag to reorder)"
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', minHeight: '34px', gap: '8px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#78716C', fontWeight: '700', letterSpacing: '0.06em', lineHeight: 1.35 }}>
                        Revenue By Category
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <GripVertical size={13} color="#B88B4A" style={{ opacity: 0.45, cursor: 'grab' }} />
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#FAF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Award size={16} color="#B88B4A" />
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#1C1917', marginTop: '14px', height: '36px', display: 'flex', alignItems: 'center', lineHeight: 1, letterSpacing: '-0.02em' }}>
                      {formatCurrency(categories.reduce((acc, c) => acc + (c.total_revenue || 0), 0) || revenue.period_revenue || 0)}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '16px',
                    paddingTop: '12px',
                    fontSize: '11.5px',
                    color: '#8C6828',
                    fontWeight: '600',
                    borderTop: '1px dashed #DAC493'
                  }}>
                    <span>Tap for Category Insights</span>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10.5px',
                      background: '#FAF6EE',
                      color: '#8C6828',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #DAC493',
                      fontWeight: '700'
                    }}>
                      Breakdown ↗
                    </span>
                  </div>
                </div>
              );
            }

            if (cardId === 'services') {
              return (
                <div
                  key="services"
                  {...dragProps}
                  title="Click to view Service Utilization & Catalog Intelligence (Drag to reorder)"
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', minHeight: '34px', gap: '8px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#78716C', fontWeight: '700', letterSpacing: '0.06em', lineHeight: 1.35 }}>
                        Service Utilization & Catalog
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <GripVertical size={13} color="#B88B4A" style={{ opacity: 0.45, cursor: 'grab' }} />
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#FAF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Flame size={16} color="#B88B4A" />
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#1C1917', marginTop: '14px', height: '36px', display: 'flex', alignItems: 'center', lineHeight: 1, letterSpacing: '-0.02em' }}>
                      {formatCurrency(top_services.reduce((acc, s) => acc + (s.total_revenue || 0), 0) || revenue.period_revenue || 0)}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '16px',
                    paddingTop: '12px',
                    fontSize: '11.5px',
                    color: '#8C6828',
                    fontWeight: '600',
                    borderTop: '1px dashed #DAC493'
                  }}>
                    <span>Tap for Catalog Intelligence</span>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10.5px',
                      background: '#FAF6EE',
                      color: '#8C6828',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #DAC493',
                      fontWeight: '700'
                    }}>
                      Breakdown ↗
                    </span>
                  </div>
                </div>
              );
            }

            if (cardId === 'payment') {
              return (
                <div
                  key="payment"
                  {...dragProps}
                  title="Click to view Payment Methods Breakdown (Drag to reorder)"
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', minHeight: '34px', gap: '8px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#78716C', fontWeight: '700', letterSpacing: '0.06em', lineHeight: 1.35 }}>
                        Payment Methods Breakdown
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <GripVertical size={13} color="#B88B4A" style={{ opacity: 0.45, cursor: 'grab' }} />
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#FAF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <CreditCard size={16} color="#B88B4A" />
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#1C1917', marginTop: '14px', height: '36px', display: 'flex', alignItems: 'center', lineHeight: 1, letterSpacing: '-0.02em' }}>
                      {formatCurrency(displayPaymentMethods.reduce((acc, pm) => acc + (pm.amount || 0), 0) || revenue.period_revenue || 0)}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '16px',
                    paddingTop: '12px',
                    fontSize: '11.5px',
                    color: '#8C6828',
                    fontWeight: '600',
                    borderTop: '1px dashed #DAC493'
                  }}>
                    <span>Tap for Payment Mode Audit</span>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10.5px',
                      background: '#FAF6EE',
                      color: '#8C6828',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #DAC493',
                      fontWeight: '700'
                    }}>
                      Breakdown ↗
                    </span>
                  </div>
                </div>
              );
            }

            if (cardId === 'staff') {
              return (
                <div
                  key="staff"
                  {...dragProps}
                  title="Click to view Staff Productivity Audit (Drag to reorder)"
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', minHeight: '34px', gap: '8px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#78716C', fontWeight: '700', letterSpacing: '0.06em', lineHeight: 1.35 }}>
                        Staff Treatment & Revenue Performance
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <GripVertical size={13} color="#B88B4A" style={{ opacity: 0.45, cursor: 'grab' }} />
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#FAF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Users size={16} color="#B88B4A" />
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#1C1917', marginTop: '14px', height: '36px', display: 'flex', alignItems: 'center', lineHeight: 1, letterSpacing: '-0.02em' }}>
                      {formatCurrency(staff_performance.reduce((acc, s) => acc + (s.revenue_generated || 0), 0) || revenue.period_revenue || 0)}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '16px',
                    paddingTop: '12px',
                    fontSize: '11.5px',
                    color: '#8C6828',
                    fontWeight: '600',
                    borderTop: '1px dashed #DAC493'
                  }}>
                    <span>Tap for Staff Productivity Audit</span>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10.5px',
                      background: '#FAF6EE',
                      color: '#8C6828',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #DAC493',
                      fontWeight: '700'
                    }}>
                      Breakdown ↗
                    </span>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>

      {/* 3b. Month-Wise Performance Breakdown (For Yearly, Multi-Month, or All-Time Analytics) */}
      {monthly_breakdown && monthly_breakdown.length > 0 && (
        <div className="card" style={{ padding: '24px', marginTop: '12px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="#B88B4A" />
                <h2 style={{ fontSize: '17px', color: '#1C1917', margin: 0, fontWeight: '800' }}>
                  MONTH-WISE REVENUE & FOOTFALL BREAKDOWN
                </h2>
              </div>
              <p style={{ fontSize: '12px', color: '#78716C', margin: '3px 0 0 0' }}>
                Operational monthly summary across the active branch timeline (strictly since registration date).
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #E7DFD5', borderRadius: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: '#F8F6F2', borderBottom: '1.5px solid #E2D9CC' }}>
                  <th style={{ padding: '10px 14px', fontWeight: '700', color: '#1C1917' }}>Month</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', color: '#1C1917' }}>Performance Status</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', color: '#1C1917' }}>Visits</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', color: '#1C1917' }}>Unique Clients</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', color: '#1C1917' }}>Collected Revenue</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', color: '#1C1917' }}>Avg / Visit</th>
                  <th style={{ padding: '10px 14px', fontWeight: '700', color: '#1C1917' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {monthly_breakdown.map((m, idx) => (
                  <tr
                    key={m.month_key}
                    style={{
                      borderBottom: '1px solid #F0ECE4',
                      background: idx % 2 === 0 ? '#FFFFFF' : '#FAF8F5'
                    }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: '700', color: '#1C1917' }}>
                      {m.label} <span style={{ color: '#78716C', fontWeight: '400', fontSize: '11px' }}>({m.month_key})</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: m.status === 'green' ? '#FAF6EE' : '#FAF8F5',
                        border: m.status === 'green' ? '1px solid #DAC493' : '1px solid #E7DFD5',
                        color: m.status === 'green' ? '#8C6828' : m.status === 'orange' ? '#78716C' : '#A8A29E',
                        fontWeight: '700',
                        fontSize: '11px'
                      }}>
                        {m.status === 'green' ? 'Peak Target Met' : m.status === 'orange' ? 'Steady Activity' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#1C1917', fontWeight: m.visits_count > 0 ? '700' : '400' }}>
                      {m.visits_count} {m.visits_count === 1 ? 'visit' : 'visits'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#57534E' }}>
                      {m.unique_clients} {m.unique_clients === 1 ? 'client' : 'clients'}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: '800', color: m.revenue > 0 ? '#1C1917' : '#78716C', fontSize: '13px' }}>
                      {formatCurrency(m.revenue)}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#57534E' }}>
                      {m.avg_ticket > 0 ? formatCurrency(m.avg_ticket) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        type="button"
                        onClick={() => handleMonthSelect(m.month_key)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid #D6D3D1',
                          background: '#FFFFFF',
                          fontSize: '11.5px',
                          fontWeight: '600',
                          color: '#B88B4A',
                          cursor: 'pointer'
                        }}
                      >
                        View Days <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Day-wise Breakdown (Revamped in Image 2 luxury card styling) */}
      <div
        className="card"
        style={{
          marginTop: '12px',
          padding: '24px',
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E7DFD5',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Card Header matching Image 2 luxury aesthetic */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: '#FAF6EE',
              border: '1px solid #DAC493',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BarChart3 size={17} color="#B88B4A" />
            </div>
            <div>
              <div style={{ fontSize: '11.5px', textTransform: 'uppercase', color: '#8C6828', fontWeight: '800', letterSpacing: '0.06em' }}>
                Day-Wise Revenue & Performance Breakdown
              </div>
              <p style={{ fontSize: '12px', color: '#78716C', margin: '2px 0 0 0' }}>
                Daily audit showing volume, revenue velocity, and color-coded performance thresholds.
              </p>
            </div>
          </div>

          {/* Color Legend & Filters in sleek pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setDayStatusFilter('all')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: dayStatusFilter === 'all' ? '1.5px solid #1C1917' : '1px solid #E7DFD5',
                  background: dayStatusFilter === 'all' ? '#1C1917' : '#FFFFFF',
                  color: dayStatusFilter === 'all' ? '#FFFFFF' : '#44403C',
                  transition: 'all 0.15s ease'
                }}
              >
                All Days ({day_wise.days.length})
              </button>

              <button
                type="button"
                onClick={() => setDayStatusFilter('green')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: dayStatusFilter === 'green' ? '1.5px solid #8C6828' : '1px solid #DAC493',
                  background: dayStatusFilter === 'green' ? '#8C6828' : '#FAF6EE',
                  color: dayStatusFilter === 'green' ? '#FFFFFF' : '#8C6828',
                  transition: 'all 0.15s ease'
                }}
              >
                Peak Performance ({day_wise.green_count || 0})
              </button>

              <button
                type="button"
                onClick={() => setDayStatusFilter('orange')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: dayStatusFilter === 'orange' ? '1.5px solid #78716C' : '1px solid #E7DFD5',
                  background: dayStatusFilter === 'orange' ? '#78716C' : '#FAF8F5',
                  color: dayStatusFilter === 'orange' ? '#FFFFFF' : '#78716C',
                  transition: 'all 0.15s ease'
                }}
              >
                Steady ({day_wise.orange_count || 0})
              </button>

              <button
                type="button"
                onClick={() => setDayStatusFilter('red')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: dayStatusFilter === 'red' ? '1.5px solid #A8A29E' : '1px solid #E7DFD5',
                  background: dayStatusFilter === 'red' ? '#A8A29E' : '#FAF8F5',
                  color: dayStatusFilter === 'red' ? '#FFFFFF' : '#A8A29E',
                  transition: 'all 0.15s ease'
                }}
              >
                Zero / Inactive ({day_wise.red_count || 0})
              </button>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#57534E', cursor: 'pointer', userSelect: 'none', marginLeft: '4px' }}>
              <input
                type="checkbox"
                checked={hideZeroDays}
                onChange={(e) => setHideZeroDays(e.target.checked)}
              />
              Hide ₹0 Days
            </label>
          </div>
        </div>

        {/* Visual Dual-Bar Chart of the Days (New Clients vs Old Clients) */}
        {day_wise.days.length > 0 && day_wise.days.length <= 45 && (
          <div style={{
            background: '#FAF8F5',
            border: '1px solid #EFEAE2',
            borderRadius: '12px',
            padding: '16px 18px 12px',
            marginBottom: '18px'
          }}>
            {/* Header: Title, Legend, and Metric Mode Toggle */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '14px',
              borderBottom: '1px solid #EFEAE2',
              paddingBottom: '10px'
            }}>
              <div>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#8C7E74', fontWeight: '800', letterSpacing: '0.06em' }}>
                  Daily Client Trajectory Trend (New vs Old Clients)
                </div>
                <div style={{ fontSize: '11px', color: '#78716C', marginTop: '2px' }}>
                  Two bars per day: <strong>Gold</strong> = New Clients, <strong>Champagne</strong> = Old / Returning Clients • Tap bar for day details
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {/* Legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', fontWeight: '700' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#8C6828' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#B88B4A', display: 'inline-block' }} />
                    New Clients
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#78716C' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#DAC493', display: 'inline-block' }} />
                    Old Clients
                  </span>
                </div>

                {/* Metric Mode Toggle (Revenue vs Client Count) */}
                <div style={{
                  display: 'flex',
                  background: '#FFFFFF',
                  padding: '2px',
                  borderRadius: '6px',
                  border: '1px solid #E5DCCF'
                }}>
                  <button
                    type="button"
                    onClick={() => setDailyChartMetric('revenue')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: dailyChartMetric === 'revenue' ? '800' : '600',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      background: dailyChartMetric === 'revenue' ? '#1C1917' : 'transparent',
                      color: dailyChartMetric === 'revenue' ? '#FFFFFF' : '#78716C'
                    }}
                  >
                    Revenue (₹)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDailyChartMetric('clients')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: dailyChartMetric === 'clients' ? '800' : '600',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      background: dailyChartMetric === 'clients' ? '#1C1917' : 'transparent',
                      color: dailyChartMetric === 'clients' ? '#FFFFFF' : '#78716C'
                    }}
                  >
                    Client Count
                  </button>
                </div>
              </div>
            </div>

            {/* Two Bars per Day Container */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '110px', overflowX: 'auto', paddingBottom: '6px' }}>
              {day_wise.days.map((d, idx) => {
                const isRev = dailyChartMetric === 'revenue';
                const newRaw = isRev ? (d.new_revenue || 0) : (d.new_clients_count || 0);
                const oldRaw = isRev ? (d.old_revenue || 0) : (d.old_clients_count || 0);
                const maxVal = isRev ? maxDailyNewOldRev : maxDailyNewOldClients;

                const newPct = newRaw > 0 ? Math.max(12, Math.round((newRaw / maxVal) * 100)) : 5;
                const oldPct = oldRaw > 0 ? Math.max(12, Math.round((oldRaw / maxVal) * 100)) : 5;

                const tooltip = `${d.display_date}\n` +
                  `🟢 New Clients: ${d.new_clients_count || 0} (${formatCurrency(d.new_revenue || 0)})\n` +
                  `🟣 Old / Returning Clients: ${d.old_clients_count || 0} (${formatCurrency(d.old_revenue || 0)})\n` +
                  `Total: ${formatCurrency(d.revenue || 0)} (${d.visits_count || 0} visits)\nClick to view day breakdown`;

                return (
                  <div
                    key={idx}
                    title={tooltip}
                    onClick={() => setActiveDayModal(d)}
                    style={{
                      flex: '1 1 0',
                      minWidth: '28px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: '100%',
                      justifyContent: 'flex-end',
                      cursor: 'pointer',
                      padding: '2px',
                      borderRadius: '6px',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#F0EBE1'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* The 2 Bars Side-by-Side */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      gap: '2.5px',
                      width: '100%',
                      height: '84px'
                    }}>
                      {/* Bar 1: New Client (Gold) */}
                      <div
                        style={{
                          width: '45%',
                          maxWidth: '12px',
                          height: `${newPct}%`,
                          background: '#B88B4A',
                          borderRadius: '3px 3px 0 0',
                          opacity: newRaw > 0 ? 0.95 : 0.2,
                          transition: 'height 0.25s ease'
                        }}
                      />
                      {/* Bar 2: Old / Returning Client (Champagne) */}
                      <div
                        style={{
                          width: '45%',
                          maxWidth: '12px',
                          height: `${oldPct}%`,
                          background: '#DAC493',
                          borderRadius: '3px 3px 0 0',
                          opacity: oldRaw > 0 ? 0.95 : 0.2,
                          transition: 'height 0.25s ease'
                        }}
                      />
                    </div>

                    {/* Day number */}
                    <div style={{ fontSize: '9.5px', color: '#78716C', marginTop: '4px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                      {d.date.substring(8, 10)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Day-wise Table with Image 2 luxury styling */}
        <div style={{ overflowX: 'auto', border: '1px solid #E7DFD5', borderRadius: '10px', marginTop: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: '#FAF8F5', borderBottom: '1.5px solid #E2D9CC' }}>
                <th style={{ padding: '10px 14px', fontWeight: '700', color: '#1C1917' }}>Date & Day</th>
                <th style={{ padding: '10px 14px', fontWeight: '700', color: '#1C1917' }}>Performance Status</th>
                <th style={{ padding: '10px 14px', fontWeight: '700', color: '#1C1917' }}>Visits</th>
                <th style={{ padding: '10px 14px', fontWeight: '700', color: '#1C1917' }}>Collected Revenue</th>
                <th style={{ padding: '10px 14px', fontWeight: '700', color: '#1C1917' }}>Avg / Visit</th>
                <th style={{ padding: '10px 14px', fontWeight: '700', color: '#1C1917' }}>Top Performed Service</th>
                <th style={{ padding: '10px 14px', fontWeight: '700', color: '#1C1917', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDays.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px 20px', textAlign: 'center', color: '#78716C' }}>
                    {period.is_pre_inception ? (
                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <Clock size={22} color="#B88B4A" />
                        <span style={{ fontWeight: '700', color: '#1C1917', fontSize: '13px' }}>No operations prior to branch registration</span>
                        <span style={{ fontSize: '12px', color: '#78716C' }}>This branch was registered on {formatDate(period.branch_created_at || '2026-10-05')}. No operational records exist for {period.label}.</span>
                      </div>
                    ) : (
                      'No day records match the selected status filter.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredDays.map((d, idx) => {
                  const avg = d.visits_count > 0 ? Math.round(d.revenue / d.visits_count) : 0;

                  let badgeBg = '#FAF8F5';
                  let badgeColor = '#A8A29E';
                  let badgeBorder = '#E7DFD5';
                  let badgeText = 'No Bookings';
                  if (d.status === 'green') {
                    badgeBg = '#FAF6EE';
                    badgeColor = '#8C6828';
                    badgeBorder = '#DAC493';
                    badgeText = 'Peak Target Met';
                  } else if (d.status === 'orange') {
                    badgeBg = '#FAF8F5';
                    badgeColor = '#78716C';
                    badgeBorder = '#E7DFD5';
                    badgeText = 'Steady Activity';
                  }

                  return (
                    <tr
                      key={idx}
                      onClick={() => setActiveDayModal(d)}
                      style={{
                        borderBottom: '1px solid #F0ECE4',
                        background: idx % 2 === 0 ? '#FFFFFF' : '#FAF8F5',
                        transition: 'background 0.12s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#F5EFE6'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#FAF8F5'; }}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: '600', color: '#1C1917' }}>
                        {d.display_date} <span style={{ color: '#78716C', fontWeight: '400', fontSize: '11px' }}>({d.date})</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: badgeBg,
                          border: `1px solid ${badgeBorder}`,
                          color: badgeColor,
                          fontWeight: '700',
                          fontSize: '11px'
                        }}>
                          {badgeText}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#1C1917', fontWeight: d.visits_count > 0 ? '700' : '400' }}>
                        <div>{d.visits_count} {d.visits_count === 1 ? 'visit' : 'visits'}</div>
                        {d.visits_count > 0 && (
                          <div style={{ fontSize: '11px', marginTop: '2px', display: 'flex', gap: '5px' }}>
                            <span style={{ color: '#8C6828', fontWeight: '700' }}>{d.new_clients_count || 0} new</span>
                            <span style={{ color: '#D6D3D1' }}>•</span>
                            <span style={{ color: '#78716C', fontWeight: '700' }}>{d.old_clients_count || 0} old</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: '800', color: d.revenue > 0 ? '#1C1917' : '#78716C', fontSize: '13px' }}>
                        <div>{formatCurrency(d.revenue)}</div>
                        {d.revenue > 0 && (
                          <div style={{ fontSize: '11px', marginTop: '2px', display: 'flex', gap: '5px', fontWeight: '600' }}>
                            <span style={{ color: '#8C6828' }}>{formatCurrency(d.new_revenue || 0)}</span>
                            <span style={{ color: '#D6D3D1' }}>|</span>
                            <span style={{ color: '#78716C' }}>{formatCurrency(d.old_revenue || 0)}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#57534E' }}>
                        {avg > 0 ? formatCurrency(avg) : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#1C1917', fontWeight: '500' }}>
                        {d.top_service !== '—' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Sparkles size={12} color="#B88B4A" /> {d.top_service}
                          </span>
                        ) : (
                          <span style={{ color: '#A8A29E' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: '#FAF6EE',
                          border: '1px solid #DAC493',
                          color: '#8C6828'
                        }}>
                          Audit ↗
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Card Footer matching Image 2 with dashed divider & tap callout */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '16px',
          paddingTop: '14px',
          borderTop: '1px dashed #DAC493',
          fontSize: '12px',
          color: '#8C6828',
          fontWeight: '600',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={14} color="#B88B4A" />
            <span>Tap any day in chart or table to open day audit & client invoices breakdown</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveDayModal(filteredDays.find(d => d.visits_count > 0) || filteredDays[0] || day_wise.days[0])}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 14px',
              borderRadius: '6px',
              background: '#FAF6EE',
              border: '1px solid #DAC493',
              color: '#8C6828',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F5EFE6'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#FAF6EE'; }}
          >
            Breakdown ↗
          </button>
        </div>
      </div>

      {/* 8. Executive KPI Deep-Dive Popup Tab Modal */}
      {Boolean(activeKpiModal) && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveKpiModal(null);
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '860px',
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0'
            }}
          >
            {/* Modal Top Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #E7DFD5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#FAF8F5'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: (activeKpiModal === 'revenue' || activeKpiModal === 'payment') ? '#DCFCE7' : activeKpiModal === 'ticket' ? '#EFF6FF' : activeKpiModal === 'footfall' ? '#F5F3FF' : '#FAF6EE',
                  border: `1px solid ${(activeKpiModal === 'revenue' || activeKpiModal === 'payment') ? '#BBF7D0' : activeKpiModal === 'ticket' ? '#BFDBFE' : activeKpiModal === 'footfall' ? '#DDD6FE' : '#DAC493'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {activeKpiModal === 'revenue' && <IndianRupee size={20} color="#166534" />}
                  {activeKpiModal === 'ticket' && <TrendingUp size={20} color="#2563EB" />}
                  {activeKpiModal === 'footfall' && <Users size={20} color="#7C3AED" />}
                  {(activeKpiModal === 'memberships' || activeKpiModal === 'benchmarks') && <Crown size={20} color="#B88B4A" />}
                  {activeKpiModal === 'category' && <Award size={20} color="#B88B4A" />}
                  {activeKpiModal === 'payment' && <CreditCard size={20} color="#166534" />}
                  {activeKpiModal === 'staff' && <Users size={20} color="#B88B4A" />}
                  {activeKpiModal === 'services' && <Flame size={20} color="#EA580C" />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#1C1917' }}>
                    {activeKpiModal === 'revenue' && 'Period Collected Revenue Audit'}
                    {activeKpiModal === 'ticket' && 'Average Ticket Size & Spend Intelligence'}
                    {activeKpiModal === 'footfall' && 'Client Footfall & Retention Breakdown'}
                    {(activeKpiModal === 'memberships' || activeKpiModal === 'benchmarks') && 'Studio Memberships & Client Credits Intelligence'}
                    {activeKpiModal === 'category' && 'Treatment Category Revenue & Performance'}
                    {activeKpiModal === 'payment' && 'Payment Methods & Tender Modes Audit'}
                    {activeKpiModal === 'staff' && 'Staff Treatment & Revenue Productivity Audit'}
                    {activeKpiModal === 'services' && 'Service Utilization & Catalog Intelligence Audit'}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#78716C' }}>
                    {period.label || 'Selected Period'} • {period.branch_name || 'Studio'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveKpiModal(null)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #E7E5E4',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#78716C',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F5F5F4'; e.currentTarget.style.color = '#1C1917'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = '#78716C'; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Popup Tab Switcher Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              background: '#F8F6F2',
              borderBottom: '1px solid #E7DFD5',
              overflowX: 'auto'
            }}>
              <button
                type="button"
                onClick={() => setActiveKpiModal('revenue')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: activeKpiModal === 'revenue' ? '1.5px solid #166534' : '1px solid #D6D3D1',
                  background: activeKpiModal === 'revenue' ? '#DCFCE7' : '#FFFFFF',
                  color: activeKpiModal === 'revenue' ? '#166534' : '#57534E',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <IndianRupee size={13} color={activeKpiModal === 'revenue' ? '#166534' : '#78716C'} />
                Collected Revenue ({formatCurrency(revenue.period_revenue)})
              </button>

              <button
                type="button"
                onClick={() => setActiveKpiModal('ticket')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: activeKpiModal === 'ticket' ? '1.5px solid #2563EB' : '1px solid #D6D3D1',
                  background: activeKpiModal === 'ticket' ? '#EFF6FF' : '#FFFFFF',
                  color: activeKpiModal === 'ticket' ? '#1D4ED8' : '#57534E',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <TrendingUp size={13} color={activeKpiModal === 'ticket' ? '#2563EB' : '#78716C'} />
                Avg Ticket ({formatCurrency(revenue.avg_ticket)})
              </button>

              <button
                type="button"
                onClick={() => setActiveKpiModal('footfall')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: activeKpiModal === 'footfall' ? '1.5px solid #7C3AED' : '1px solid #D6D3D1',
                  background: activeKpiModal === 'footfall' ? '#F5F3FF' : '#FFFFFF',
                  color: activeKpiModal === 'footfall' ? '#6D28D9' : '#57534E',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <Users size={13} color={activeKpiModal === 'footfall' ? '#7C3AED' : '#78716C'} />
                Client Footfall ({clients.period_unique || 0} • {clients.period_repeat_rate || 0}% Repeat)
              </button>

              <button
                type="button"
                onClick={() => setActiveKpiModal('memberships')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: (activeKpiModal === 'memberships' || activeKpiModal === 'benchmarks') ? '1.5px solid #B88B4A' : '1px solid #D6D3D1',
                  background: (activeKpiModal === 'memberships' || activeKpiModal === 'benchmarks') ? '#FAF6EE' : '#FFFFFF',
                  color: (activeKpiModal === 'memberships' || activeKpiModal === 'benchmarks') ? '#8C6828' : '#57534E',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <Crown size={13} color={(activeKpiModal === 'memberships' || activeKpiModal === 'benchmarks') ? '#B88B4A' : '#78716C'} />
                Memberships ({memberships.total_members || 0})
              </button>

              <button
                type="button"
                onClick={() => setActiveKpiModal('category')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: activeKpiModal === 'category' ? '1.5px solid #B88B4A' : '1px solid #D6D3D1',
                  background: activeKpiModal === 'category' ? '#FAF6EE' : '#FFFFFF',
                  color: activeKpiModal === 'category' ? '#8C6828' : '#57534E',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <Award size={13} color={activeKpiModal === 'category' ? '#B88B4A' : '#78716C'} />
                By Category ({categories.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveKpiModal('payment')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: activeKpiModal === 'payment' ? '1.5px solid #166534' : '1px solid #D6D3D1',
                  background: activeKpiModal === 'payment' ? '#DCFCE7' : '#FFFFFF',
                  color: activeKpiModal === 'payment' ? '#166534' : '#57534E',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <CreditCard size={13} color={activeKpiModal === 'payment' ? '#166534' : '#78716C'} />
                Payment Modes ({displayPaymentMethods.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveKpiModal('services')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: activeKpiModal === 'services' ? '1.5px solid #EA580C' : '1px solid #D6D3D1',
                  background: activeKpiModal === 'services' ? '#FFF7ED' : '#FFFFFF',
                  color: activeKpiModal === 'services' ? '#C2410C' : '#57534E',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <Flame size={13} color={activeKpiModal === 'services' ? '#EA580C' : '#78716C'} />
                Service Catalog ({top_services.length + unused_services.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveKpiModal('staff')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: activeKpiModal === 'staff' ? '1.5px solid #B88B4A' : '1px solid #D6D3D1',
                  background: activeKpiModal === 'staff' ? '#FAF6EE' : '#FFFFFF',
                  color: activeKpiModal === 'staff' ? '#8C6828' : '#57534E',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <Users size={13} color={activeKpiModal === 'staff' ? '#B88B4A' : '#78716C'} />
                Staff Performance ({staff_performance.length})
              </button>
            </div>

            {/* TAB 1: PERIOD COLLECTED REVENUE AUDIT */}
            {activeKpiModal === 'revenue' && (
              <div style={{ padding: '22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 4 Metric Badges */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '14px', background: '#F0FDF4', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                    <div style={{ fontSize: '11px', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>Net Collected Revenue</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#166534', marginTop: '4px' }}>{formatCurrency(revenue.period_revenue)}</div>
                    <div style={{ fontSize: '11px', color: '#15803D', marginTop: '2px' }}>Deposited & verified</div>
                  </div>
                  <div style={{ padding: '14px', background: '#FAF8F5', borderRadius: '10px', border: '1px solid #EFEAE2' }}>
                    <div style={{ fontSize: '11px', color: '#78716C', fontWeight: '700', textTransform: 'uppercase' }}>Gross Invoiced</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#1C1917', marginTop: '4px' }}>{formatCurrency(revenue.period_invoiced)}</div>
                    <div style={{ fontSize: '11px', color: '#78716C', marginTop: '2px' }}>Before discounts</div>
                  </div>
                  <div style={{ padding: '14px', background: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA' }}>
                    <div style={{ fontSize: '11px', color: '#991B1B', fontWeight: '700', textTransform: 'uppercase' }}>Discounts Deducted</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#DC2626', marginTop: '4px' }}>{formatCurrency(revenue.period_discounts)}</div>
                    <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '2px' }}>Promotional & concessions</div>
                  </div>
                  <div style={{ padding: '14px', background: '#FAF6EE', borderRadius: '10px', border: '1px solid #DAC493' }}>
                    <div style={{ fontSize: '11px', color: '#8C6828', fontWeight: '700', textTransform: 'uppercase' }}>Invoiced Visits</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#B88B4A', marginTop: '4px' }}>{revenue.period_visits || 0}</div>
                    <div style={{ fontSize: '11px', color: '#8C6828', marginTop: '2px' }}>Completed checkouts</div>
                  </div>
                </div>

                {/* Payment Methods Section */}
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em' }}>
                    Payment Mode Collection Breakdown
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                    {displayPaymentMethods.length === 0 ? (
                      <div style={{ padding: '14px', color: '#78716C', fontSize: '12px' }}>No payments recorded in this period.</div>
                    ) : (
                      displayPaymentMethods.map((pm, idx) => {
                        const totalRev = displayPaymentMethods.reduce((a, b) => a + (b.amount || 0), 0) || 1;
                        const pct = Math.round((pm.amount / totalRev) * 100);
                        return (
                          <div key={idx} style={{ padding: '12px 14px', background: '#FAF8F5', border: '1px solid #EFEAE2', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <strong style={{ fontSize: '13px', color: '#1C1917' }}>{pm.payment_method}</strong>
                              <span style={{ fontSize: '13px', fontWeight: '800', color: '#166534' }}>{formatCurrency(pm.amount)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#78716C', marginBottom: '6px' }}>
                              <span>{pm.count} bills</span>
                              <span>{pct}% share</span>
                            </div>
                            <div style={{ height: '5px', background: '#E7DFD5', borderRadius: '9999px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: '#166534', borderRadius: '9999px' }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Daily Collections Velocity Table */}
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em' }}>
                    Daily Collection Velocity & Top Service
                  </div>
                  <div style={{ border: '1px solid #E7DFD5', borderRadius: '10px', overflow: 'hidden', maxHeight: '220px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead style={{ background: '#FAF8F5', position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr style={{ borderBottom: '1px solid #E7DFD5' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '700' }}>Date</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700' }}>Visits</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>Collected (₹)</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>Gross (₹)</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '700' }}>Top Performed Service</th>
                        </tr>
                      </thead>
                      <tbody>
                        {day_wise.days.filter(d => d.revenue > 0 || d.visits_count > 0).map((d, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #F5F5F4' }}>
                            <td style={{ padding: '8px 12px', fontWeight: '600' }}>{d.display_date}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>{d.visits_count}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: '#166534' }}>{formatCurrency(d.revenue)}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: '#78716C' }}>{formatCurrency(d.gross_amount)}</td>
                            <td style={{ padding: '8px 12px', color: '#B88B4A' }}>{d.top_service || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: AVERAGE TICKET SIZE INTELLIGENCE */}
            {activeKpiModal === 'ticket' && (
              <div style={{ padding: '22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '14px', background: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
                    <div style={{ fontSize: '11px', color: '#1E40AF', fontWeight: '700', textTransform: 'uppercase' }}>Average Ticket Value</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#1E40AF', marginTop: '4px' }}>{formatCurrency(revenue.avg_ticket)}</div>
                    <div style={{ fontSize: '11px', color: '#2563EB', marginTop: '2px' }}>Revenue per client visit</div>
                  </div>
                  <div style={{ padding: '14px', background: '#FAF8F5', borderRadius: '10px', border: '1px solid #EFEAE2' }}>
                    <div style={{ fontSize: '11px', color: '#78716C', fontWeight: '700', textTransform: 'uppercase' }}>Visits Completed</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#1C1917', marginTop: '4px' }}>{revenue.period_visits || 0}</div>
                    <div style={{ fontSize: '11px', color: '#78716C', marginTop: '2px' }}>Total client transactions</div>
                  </div>
                  <div style={{ padding: '14px', background: '#FAF6EE', borderRadius: '10px', border: '1px solid #DAC493' }}>
                    <div style={{ fontSize: '11px', color: '#8C6828', fontWeight: '700', textTransform: 'uppercase' }}>Revenue Yield / Client</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#B88B4A', marginTop: '4px' }}>
                      {formatCurrency(Math.round((revenue.period_revenue || 0) / Math.max(1, clients.period_unique || 1)))}
                    </div>
                    <div style={{ fontSize: '11px', color: '#8C6828', marginTop: '2px' }}>Across {clients.period_unique || 0} unique clients</div>
                  </div>
                  <div style={{ padding: '14px', background: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA' }}>
                    <div style={{ fontSize: '11px', color: '#991B1B', fontWeight: '700', textTransform: 'uppercase' }}>Avg Discount / Visit</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#DC2626', marginTop: '4px' }}>
                      {formatCurrency(Math.round((revenue.period_discounts || 0) / Math.max(1, revenue.period_visits || 1)))}
                    </div>
                    <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '2px' }}>Concessions impact</div>
                  </div>
                </div>

                {/* Ticket Value Insights */}
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em' }}>
                    Ticket Size Value Tiers
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                    <div style={{ padding: '12px 14px', background: '#FAF8F5', borderRadius: '8px', border: '1px solid #EFEAE2' }}>
                      <div style={{ fontWeight: '700', color: '#166534', fontSize: '13px' }}>VIP / High-Yield (&gt; ₹10,000)</div>
                      <div style={{ fontSize: '11.5px', color: '#78716C', marginTop: '2px' }}>Packages, multi-zone laser & aesthetics</div>
                    </div>
                    <div style={{ padding: '12px 14px', background: '#FAF8F5', borderRadius: '8px', border: '1px solid #EFEAE2' }}>
                      <div style={{ fontWeight: '700', color: '#1E40AF', fontSize: '13px' }}>Premium (₹5,000 – ₹10,000)</div>
                      <div style={{ fontSize: '11.5px', color: '#78716C', marginTop: '2px' }}>Advanced medi-facials & brow artistry</div>
                    </div>
                    <div style={{ padding: '12px 14px', background: '#FAF8F5', borderRadius: '8px', border: '1px solid #EFEAE2' }}>
                      <div style={{ fontWeight: '700', color: '#B88B4A', fontSize: '13px' }}>Standard (₹2,000 – ₹5,000)</div>
                      <div style={{ fontSize: '11.5px', color: '#78716C', marginTop: '2px' }}>Standard laser sessions & peels</div>
                    </div>
                    <div style={{ padding: '12px 14px', background: '#FAF8F5', borderRadius: '8px', border: '1px solid #EFEAE2' }}>
                      <div style={{ fontWeight: '700', color: '#78716C', fontSize: '13px' }}>Express (&lt; ₹2,000)</div>
                      <div style={{ fontSize: '11.5px', color: '#78716C', marginTop: '2px' }}>Add-on services & touch-ups</div>
                    </div>
                  </div>
                </div>

                {/* Day-by-Day Ticket Performance */}
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em' }}>
                    Day-by-Day Ticket Average Velocity
                  </div>
                  <div style={{ border: '1px solid #E7DFD5', borderRadius: '10px', overflow: 'hidden', maxHeight: '200px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead style={{ background: '#FAF8F5', position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr style={{ borderBottom: '1px solid #E7DFD5' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '700' }}>Date</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700' }}>Visits</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>Day's Revenue</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>Average Ticket / Visit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {day_wise.days.filter(d => d.visits_count > 0).map((d, idx) => {
                          const dayAvg = Math.round(d.revenue / d.visits_count);
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #F5F5F4' }}>
                              <td style={{ padding: '8px 12px', fontWeight: '600' }}>{d.display_date}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>{d.visits_count}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatCurrency(d.revenue)}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: dayAvg >= 4000 ? '#166534' : '#1E40AF' }}>
                                {formatCurrency(dayAvg)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CLIENT FOOTFALL & RETENTION (NEW VS OLD) */}
            {activeKpiModal === 'footfall' && (
              <div style={{ padding: '22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 3 Overview Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div style={{ padding: '14px', background: '#FAF8F5', borderRadius: '10px', border: '1px solid #EFEAE2' }}>
                    <div style={{ fontSize: '11px', color: '#78716C', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Total Footfall
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: '#1C1917', marginTop: '4px' }}>
                      {clients.period_unique || 0}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#78716C', marginTop: '2px' }}>
                      Distinct individual clients in period
                    </div>
                  </div>

                  <div style={{ padding: '14px', background: '#F0FDF4', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#166534', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        New Clients
                      </span>
                      <UserPlus size={15} color="#166534" />
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: '#166534', marginTop: '4px' }}>
                      {newClientsCount}
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#15803D', marginLeft: '6px' }}>
                        ({clients.period_unique > 0 ? Math.round((newClientsCount / clients.period_unique) * 100) : 0}%)
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#15803D', marginTop: '2px' }}>
                      First visit recorded during this period
                    </div>
                  </div>

                  <div style={{ padding: '14px', background: '#F5F3FF', borderRadius: '10px', border: '1px solid #DDD6FE' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#6D28D9', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Old / Returning Clients
                      </span>
                      <UserCheck size={15} color="#6D28D9" />
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: '#6D28D9', marginTop: '4px' }}>
                      {oldClientsCount}
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#7C3AED', marginLeft: '6px' }}>
                        ({clients.period_unique > 0 ? Math.round((oldClientsCount / clients.period_unique) * 100) : (clients.period_repeat_rate || 0)}% rate)
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#7C3AED', marginTop: '2px' }}>
                      Existing clients returning again
                    </div>
                  </div>
                </div>

                {/* Visual Distribution Bar */}
                <div style={{ background: '#FAF8F5', padding: '14px 16px', borderRadius: '10px', border: '1px solid #EFEAE2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>
                    <span style={{ color: '#166534' }}>
                      New Clients: {newClientsCount} ({clients.period_unique > 0 ? Math.round((newClientsCount / clients.period_unique) * 100) : 0}%)
                    </span>
                    <span style={{ color: '#6D28D9' }}>
                      Old / Returning: {oldClientsCount} ({clients.period_unique > 0 ? Math.round((oldClientsCount / clients.period_unique) * 100) : 0}%)
                    </span>
                  </div>
                  <div style={{ height: '10px', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{
                      width: `${clients.period_unique > 0 ? (newClientsCount / clients.period_unique) * 100 : 0}%`,
                      background: '#166534',
                      transition: 'width 0.3s ease'
                    }} title={`New Clients: ${newClientsCount}`} />
                    <div style={{
                      width: `${clients.period_unique > 0 ? (oldClientsCount / clients.period_unique) * 100 : 0}%`,
                      background: '#4F46E5',
                      transition: 'width 0.3s ease'
                    }} title={`Old Clients: ${oldClientsCount}`} />
                  </div>
                </div>

                {/* Sub-Tabs & Search Filter Bar */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setFootfallTab('all')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        border: footfallTab === 'all' ? '1.5px solid #1C1917' : '1px solid #D6D3D1',
                        background: footfallTab === 'all' ? '#1C1917' : '#FFFFFF',
                        color: footfallTab === 'all' ? '#FFFFFF' : '#44403C'
                      }}
                    >
                      All ({clientBreakdownList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFootfallTab('new')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        border: footfallTab === 'new' ? '1.5px solid #8C6828' : '1px solid #D6D3D1',
                        background: footfallTab === 'new' ? '#FAF6EE' : '#FFFFFF',
                        color: footfallTab === 'new' ? '#8C6828' : '#44403C'
                      }}
                    >
                      New Clients ({newClientsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFootfallTab('old')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        border: footfallTab === 'old' ? '1.5px solid #78716C' : '1px solid #D6D3D1',
                        background: footfallTab === 'old' ? '#FAF8F5' : '#FFFFFF',
                        color: footfallTab === 'old' ? '#78716C' : '#44403C'
                      }}
                    >
                      Old / Returning ({oldClientsCount})
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 200px' }}>
                    <Search size={14} color="#78716C" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Search client name/phone..."
                      value={footfallSearch}
                      onChange={(e) => setFootfallSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px 6px 30px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid #D6D3D1',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Clients Table */}
                <div style={{
                  border: '1px solid #E7DFD5',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  maxHeight: '260px',
                  overflowY: 'auto'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                    <thead style={{ background: '#FAF8F5', position: 'sticky', top: 0, zIndex: 2 }}>
                      <tr style={{ borderBottom: '1px solid #E7DFD5' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#57534E', fontSize: '11px', textTransform: 'uppercase' }}>Client</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#57534E', fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#57534E', fontSize: '11px', textTransform: 'uppercase' }}>First Visit</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#57534E', fontSize: '11px', textTransform: 'uppercase' }}>Period Visits</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#57534E', fontSize: '11px', textTransform: 'uppercase' }}>Amount Spent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFootfallClients.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ padding: '28px', textAlign: 'center', color: '#78716C' }}>
                            No clients matching criteria in this period.
                          </td>
                        </tr>
                      ) : (
                        filteredFootfallClients.map((c, idx) => (
                          <tr key={c.client_id || idx} style={{ borderBottom: '1px solid #F5F5F4' }}>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ fontWeight: '700', color: '#1C1917' }}>{c.name}</div>
                              <div style={{ fontSize: '11px', color: '#78716C' }}>{c.phone}</div>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                                background: c.is_new ? '#FAF6EE' : '#FAF8F5',
                                color: c.is_new ? '#8C6828' : '#78716C',
                                border: `1px solid ${c.is_new ? '#DAC493' : '#E7DFD5'}`
                              }}>
                                {c.is_new ? 'New Client' : 'Returning Client'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', color: '#57534E', fontSize: '12px' }}>
                              {c.first_visit_date ? formatDate(c.first_visit_date) : '—'}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#1C1917' }}>
                              {c.period_visits || 1}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '800', color: '#1C1917' }}>
                              {formatCurrency(c.period_spend)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: STUDIO MEMBERSHIPS & CLIENT CREDITS AUDIT */}
            {(activeKpiModal === 'memberships' || activeKpiModal === 'benchmarks') && (
              <div style={{ padding: '22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 5 KPI Summary Badges */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '14px', background: '#FAF6EE', borderRadius: '10px', border: '1px solid #DAC493' }}>
                    <div style={{ fontSize: '11px', color: '#8C6828', fontWeight: '700', textTransform: 'uppercase' }}>Available Plans</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#8C6828', marginTop: '4px' }}>{memberships.total_plans || 4} Plans</div>
                    <div style={{ fontSize: '11px', color: '#8C6828', marginTop: '2px' }}>Éclat, Eternal, Infini, Lumière</div>
                  </div>
                  <div style={{ padding: '14px', background: '#FAF8F5', borderRadius: '10px', border: '1px solid #EFEAE2' }}>
                    <div style={{ fontSize: '11px', color: '#78716C', fontWeight: '700', textTransform: 'uppercase' }}>Enrolled Members</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#1C1917', marginTop: '4px' }}>{memberships.total_members || 0}</div>
                    <div style={{ fontSize: '11px', color: '#78716C', marginTop: '2px' }}>Active member clients</div>
                  </div>
                  <div style={{ padding: '14px', background: '#FAF8F5', borderRadius: '10px', border: '1px solid #EFEAE2' }}>
                    <div style={{ fontSize: '11px', color: '#78716C', fontWeight: '700', textTransform: 'uppercase' }}>Allocated Credits</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#1C1917', marginTop: '4px' }}>{formatCurrency(memberships.total_credits_allocated || 0)}</div>
                    <div style={{ fontSize: '11px', color: '#78716C', marginTop: '2px' }}>Total client credit worth</div>
                  </div>
                  <div style={{ padding: '14px', background: '#F0FDF4', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                    <div style={{ fontSize: '11px', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>Credits Used Till Date</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#166534', marginTop: '4px' }}>{formatCurrency(memberships.total_credits_used || 0)}</div>
                    <div style={{ fontSize: '11px', color: '#15803D', marginTop: '2px' }}>{memberships.overall_usage_pct || 0}% credit utilization</div>
                  </div>
                  <div style={{ padding: '14px', background: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
                    <div style={{ fontSize: '11px', color: '#1E40AF', fontWeight: '700', textTransform: 'uppercase' }}>Active Balance</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#1E40AF', marginTop: '4px' }}>{formatCurrency(memberships.total_remaining_balance || 0)}</div>
                    <div style={{ fontSize: '11px', color: '#2563EB', marginTop: '2px' }}>Available for treatments</div>
                  </div>
                </div>

                {/* Membership Plans Breakdown Cards (Infini, Lumière, Eternal, Éclat) */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ fontWeight: '800', fontSize: '14px', color: '#1C1917' }}>
                      Membership Plans Breakdown & Credit Utilization
                    </div>
                    <div style={{ fontSize: '12px', color: '#78716C' }}>
                      Click any plan to filter client roster below
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    {(memberships.tier_breakdown || []).map((t) => {
                      const isSelected = membershipTierFilter === t.tier;
                      const usagePct = t.total_credits_allocated > 0 ? Math.round((t.total_credits_used / t.total_credits_allocated) * 100) : 0;
                      const cardImg = t.image || (
                        t.tier === 'Éclat' ? '/memberships/card_eclat_3d.jpg' :
                        t.tier === 'Eternal' ? '/memberships/card_eternal_3d.jpg' :
                        t.tier === 'Infini' ? '/memberships/card_infini_3d.jpg' :
                        '/memberships/card_lumiere_3d.jpg'
                      );
                      return (
                        <div
                          key={t.tier}
                          onClick={() => setMembershipTierFilter(isSelected ? 'all' : t.tier)}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '14px',
                            background: isSelected ? '#FAF6EE' : '#FFFFFF',
                            border: `1.5px solid ${isSelected ? '#B88B4A' : '#E7DFD5'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? '0 6px 16px rgba(184, 139, 74, 0.18)' : '0 2px 8px rgba(0,0,0,0.03)',
                            overflow: 'hidden'
                          }}
                        >
                          <div style={{
                            width: '100%',
                            height: '84px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            marginBottom: '10px',
                            background: '#FAF6EE'
                          }}>
                            <img
                              src={cardImg}
                              alt={t.tier}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{
                              fontWeight: '800',
                              fontSize: '13px',
                              color: isSelected ? '#8C6828' : '#1C1917',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <Crown size={14} color={t.color || '#B88B4A'} />
                              {t.tier}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              background: isSelected ? '#FFFFFF' : '#FAF6EE',
                              color: '#8C6828',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              border: '1px solid #DAC493'
                            }}>
                              {t.member_count} {t.member_count === 1 ? 'member' : 'members'}
                            </span>
                          </div>

                          <div style={{ fontSize: '11px', color: '#78716C', marginTop: '4px' }}>
                            {t.plan_name} • {formatCurrency(t.plan_price)}
                          </div>

                          {/* Progress bar */}
                          <div style={{ marginTop: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#78716C', marginBottom: '3px' }}>
                              <span>Used: <strong>{formatCurrency(t.total_credits_used)}</strong></span>
                              <span>{usagePct}%</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: '#F0ECE4', borderRadius: '9999px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${Math.min(100, usagePct)}%`,
                                height: '100%',
                                background: usagePct > 50 ? '#166534' : '#B88B4A',
                                borderRadius: '9999px'
                              }} />
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', paddingTop: '6px', borderTop: '1px dashed #EFEAE2' }}>
                            <span style={{ color: '#78716C' }}>Total: {formatCurrency(t.total_credits_allocated)}</span>
                            <span style={{ color: '#166534', fontWeight: '700' }}>Bal: {formatCurrency(t.total_remaining_balance)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Member Roster & Search Table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1C1917', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        ENROLLED MEMBER ROSTER
                      </h3>
                      <div style={{ fontSize: '12px', color: '#78716C', marginTop: '2px' }}>
                        Showing {filteredMembershipMembers.length} of {memberships.total_members || 0} member clients
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Tier Filter Pills */}
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                      <button
                        type="button"
                        onClick={() => setMembershipTierFilter('all')}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          border: membershipTierFilter === 'all' ? '1px solid #1C1917' : '1px solid #D6D3D1',
                          background: membershipTierFilter === 'all' ? '#1C1917' : '#FFFFFF',
                          color: membershipTierFilter === 'all' ? '#FFFFFF' : '#57534E',
                          cursor: 'pointer'
                        }}
                      >
                        All Members ({memberships.total_members || 0})
                      </button>
                      {(memberships.tier_breakdown || []).map(t => (
                        <button
                          key={t.tier}
                          type="button"
                          onClick={() => setMembershipTierFilter(t.tier)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            border: membershipTierFilter === t.tier ? `1.5px solid ${t.color || '#B88B4A'}` : '1px solid #D6D3D1',
                            background: membershipTierFilter === t.tier ? '#FAF6EE' : '#FFFFFF',
                            color: membershipTierFilter === t.tier ? '#8C6828' : '#57534E',
                            cursor: 'pointer'
                          }}
                        >
                          {t.tier} ({t.member_count})
                        </button>
                      ))}
                    </div>

                    {/* Search Bar */}
                    <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 200px' }}>
                      <Search size={14} color="#78716C" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        placeholder="Search member by name, phone, reg no..."
                        value={membershipSearch}
                        onChange={(e) => setMembershipSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px 6px 30px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          border: '1px solid #D6D3D1',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Member Details Table */}
                  <div style={{
                    border: '1px solid #E7DFD5',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    maxHeight: '360px',
                    overflowY: 'auto'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                      <thead style={{ background: '#FAF8F5', position: 'sticky', top: 0, zIndex: 2 }}>
                        <tr style={{ borderBottom: '1px solid #E7DFD5' }}>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#57534E', fontSize: '11px', textTransform: 'uppercase' }}>Member Client</th>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#57534E', fontSize: '11px', textTransform: 'uppercase' }}>Tier</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#57534E', fontSize: '11px', textTransform: 'uppercase' }}>Total Credits</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#57534E', fontSize: '11px', textTransform: 'uppercase' }}>Credits Used</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#57534E', fontSize: '11px', textTransform: 'uppercase' }}>Remaining Balance</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700', color: '#57534E', fontSize: '11px', textTransform: 'uppercase' }}>Usage %</th>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#57534E', fontSize: '11px', textTransform: 'uppercase' }}>Validity</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700', color: '#57534E', fontSize: '11px', textTransform: 'uppercase' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembershipMembers.length === 0 ? (
                          <tr>
                            <td colSpan="8" style={{ padding: '28px', textAlign: 'center', color: '#78716C' }}>
                              No member clients matching the selected criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredMembershipMembers.map((m, idx) => {
                            const tierBadgeColor = m.tier_group === 'Infini' ? '#B88B4A' : m.tier_group === 'Lumière' ? '#7C3AED' : m.tier_group === 'Eternal' ? '#2563EB' : '#166534';
                            const tierBadgeBg = m.tier_group === 'Infini' ? '#FAF6EE' : m.tier_group === 'Lumière' ? '#F5F3FF' : m.tier_group === 'Eternal' ? '#EFF6FF' : '#DCFCE7';
                            const tierBadgeBorder = m.tier_group === 'Infini' ? '#DAC493' : m.tier_group === 'Lumière' ? '#DDD6FE' : m.tier_group === 'Eternal' ? '#BFDBFE' : '#BBF7D0';

                            return (
                              <tr key={m.client_id || idx} style={{ borderBottom: '1px solid #F5F5F4' }}>
                                <td style={{ padding: '10px 14px' }}>
                                  <div style={{ fontWeight: '700', color: '#1C1917' }}>{m.name}</div>
                                  <div style={{ fontSize: '11px', color: '#78716C' }}>{m.phone} • {m.reg_no}</div>
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    background: tierBadgeBg,
                                    color: tierBadgeColor,
                                    border: `1px solid ${tierBadgeBorder}`
                                  }}>
                                    <Crown size={12} color={tierBadgeColor} />
                                    {m.membership_tier}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#1C1917' }}>
                                  {formatCurrency(m.credits_allocated)}
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '800', color: '#166534' }}>
                                  {formatCurrency(m.credits_used)}
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '800', color: m.remaining_balance > 0 ? '#B88B4A' : '#78716C' }}>
                                  {formatCurrency(m.remaining_balance)}
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    color: m.usage_pct > 50 ? '#166534' : '#78716C',
                                    background: m.usage_pct > 50 ? '#DCFCE7' : '#F5F5F4',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                  }}>
                                    {m.usage_pct}%
                                  </span>
                                </td>
                                <td style={{ padding: '10px 14px', color: '#57534E', fontSize: '11.5px' }}>
                                  <div>{m.membership_started_at ? formatDate(m.membership_started_at) : 'Active'}</div>
                                  {m.membership_expires_at && (
                                    <div style={{ fontSize: '10.5px', color: '#78716C' }}>Exp: {formatDate(m.membership_expires_at)}</div>
                                  )}
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <button
                                      type="button"
                                      onClick={() => setAdjustBalanceModal({ open: true, member: m, amount: String(m.remaining_balance ?? m.membership_balance ?? 0) })}
                                      style={{
                                        fontSize: '11px',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid #DAC493',
                                        background: '#FAF6EE',
                                        color: '#8C6228',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                      }}
                                      title="Adjust client credit balance"
                                    >
                                      Adjust
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setExtendValidityModal({ open: true, member: m, date: m.membership_expires_at || '' })}
                                      style={{
                                        fontSize: '11px',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid #E7E5E4',
                                        background: '#FFFFFF',
                                        color: '#57534E',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                      }}
                                      title="Extend client membership validity date"
                                    >
                                      Extend
                                    </button>
                                    {onOpenClient && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveKpiModal(null);
                                          onOpenClient(m);
                                        }}
                                        style={{
                                          fontSize: '11px',
                                          padding: '4px 9px',
                                          borderRadius: '6px',
                                          border: 'none',
                                          background: '#B88B4A',
                                          color: '#FFFFFF',
                                          fontWeight: '700',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px'
                                        }}
                                        title="View client profile"
                                      >
                                        Profile
                                        <ChevronRight size={12} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 5: REVENUE BY CATEGORY AUDIT */}
            {activeKpiModal === 'category' && (
              <div style={{ padding: '22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '14px', background: '#FAF6EE', borderRadius: '10px', border: '1px solid #DAC493' }}>
                    <div style={{ fontSize: '11px', color: '#8C6828', fontWeight: '700', textTransform: 'uppercase' }}>Categorized Revenue</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#8C6828', marginTop: '4px' }}>
                      {formatCurrency(categories.reduce((acc, c) => acc + (c.total_revenue || 0), 0) || revenue.period_revenue || 0)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#8C6828', marginTop: '2px' }}>Across {categories.length} categories</div>
                  </div>

                  <div style={{ padding: '14px', background: '#F0FDF4', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                    <div style={{ fontSize: '11px', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>Treatments Performed</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#166534', marginTop: '4px' }}>
                      {categories.reduce((acc, c) => acc + (c.total_services || 0), 0)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#15803D', marginTop: '2px' }}>Total client sessions</div>
                  </div>

                  <div style={{ padding: '14px', background: '#FAF8F5', borderRadius: '10px', border: '1px solid #EFEAE2' }}>
                    <div style={{ fontSize: '11px', color: '#78716C', fontWeight: '700', textTransform: 'uppercase' }}>Top Revenue Category</div>
                    <div style={{ fontSize: '17px', fontWeight: '800', color: '#1C1917', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {categories[0]?.category_name || 'None'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#78716C', marginTop: '2px' }}>
                      {categories[0] ? formatCurrency(categories[0].total_revenue) : '₹0'} ({categories[0]?.total_services || 0} treatments)
                    </div>
                  </div>

                  <div style={{ padding: '14px', background: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
                    <div style={{ fontSize: '11px', color: '#1E40AF', fontWeight: '700', textTransform: 'uppercase' }}>Avg Revenue / Treatment</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#1D4ED8', marginTop: '4px' }}>
                      {formatCurrency(
                        categories.reduce((acc, c) => acc + (c.total_services || 0), 0) > 0
                          ? Math.round(categories.reduce((acc, c) => acc + (c.total_revenue || 0), 0) / categories.reduce((acc, c) => acc + (c.total_services || 0), 0))
                          : revenue.avg_ticket || 0
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#2563EB', marginTop: '2px' }}>Blended treatment ticket</div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.04em' }}>
                    Category Revenue & Session Volume Audit
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {categories.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#78716C', background: '#FAF8F5', borderRadius: '8px' }}>
                        No category transactions recorded during this period.
                      </div>
                    ) : (
                      categories.map((c, idx) => {
                        const totalCatRev = categories.reduce((acc, cur) => acc + (cur.total_revenue || 0), 0) || revenue.period_revenue || 1;
                        const pct = Math.round(((c.total_revenue || 0) / totalCatRev) * 100);
                        return (
                          <div
                            key={idx}
                            style={{
                              padding: '12px 16px',
                              background: '#FAF8F5',
                              borderRadius: '10px',
                              border: '1px solid #EFEAE2',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: idx === 0 ? '#FAF6EE' : '#F5F5F4',
                                  border: idx === 0 ? '1px solid #DAC493' : '1px solid #E7E5E4',
                                  color: idx === 0 ? '#B88B4A' : '#78716C',
                                  fontWeight: '800',
                                  fontSize: '11px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  {idx + 1}
                                </span>
                                <div>
                                  <strong style={{ fontSize: '13.5px', color: '#1C1917' }}>{c.category_name}</strong>
                                  <span style={{ fontSize: '12px', color: '#78716C', marginLeft: '8px' }}>
                                    • {c.total_services} {c.total_services === 1 ? 'treatment' : 'treatments'} performed
                                  </span>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: '800', color: '#B88B4A', fontSize: '14px' }}>
                                  {formatCurrency(c.total_revenue)}
                                </div>
                                <div style={{ fontSize: '11px', color: '#78716C' }}>
                                  {pct}% share
                                </div>
                              </div>
                            </div>
                            <div style={{ height: '6px', background: '#E7DFD5', borderRadius: '9999px', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${pct}%`,
                                background: idx === 0 ? '#B88B4A' : '#DAC493',
                                borderRadius: '9999px',
                                transition: 'width 0.4s ease'
                              }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: PAYMENT METHODS AUDIT (Image 1 & Image 2 'Other' entries removed) */}
            {activeKpiModal === 'payment' && (
              <div style={{ padding: '22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '14px', background: '#F0FDF4', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                    <div style={{ fontSize: '11px', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>Net Settled Collections</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#166534', marginTop: '4px' }}>
                      {formatCurrency(displayPaymentMethods.reduce((acc, pm) => acc + (pm.amount || 0), 0) || revenue.period_revenue || 0)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#15803D', marginTop: '2px' }}>100% verified & reconciled</div>
                  </div>

                  <div style={{ padding: '14px', background: '#FAF6EE', borderRadius: '10px', border: '1px solid #DAC493' }}>
                    <div style={{ fontSize: '11px', color: '#8C6828', fontWeight: '700', textTransform: 'uppercase' }}>Total Bills Settled</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#B88B4A', marginTop: '4px' }}>
                      {displayPaymentMethods.reduce((acc, p) => acc + (p.count || 0), 0)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#8C6828', marginTop: '2px' }}>Completed payment receipts</div>
                  </div>

                  <div style={{ padding: '14px', background: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
                    <div style={{ fontSize: '11px', color: '#1E40AF', fontWeight: '700', textTransform: 'uppercase' }}>Top Tender Mode</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#1D4ED8', marginTop: '4px' }}>
                      {displayPaymentMethods[0]?.payment_method || 'UPI'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#2563EB', marginTop: '2px' }}>
                      {formatCurrency(displayPaymentMethods[0]?.amount || 0)} ({Math.round(((displayPaymentMethods[0]?.amount || 0) / Math.max(1, displayPaymentMethods.reduce((a, b) => a + (b.amount || 0), 0))) * 100)}% share)
                    </div>
                  </div>

                  <div style={{ padding: '14px', background: '#FAF8F5', borderRadius: '10px', border: '1px solid #EFEAE2' }}>
                    <div style={{ fontSize: '11px', color: '#78716C', fontWeight: '700', textTransform: 'uppercase' }}>Average Bill Size</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#1C1917', marginTop: '4px' }}>
                      {formatCurrency(
                        displayPaymentMethods.reduce((acc, p) => acc + (p.count || 0), 0) > 0
                          ? Math.round(displayPaymentMethods.reduce((acc, pm) => acc + (pm.amount || 0), 0) / displayPaymentMethods.reduce((acc, p) => acc + (p.count || 0), 0))
                          : revenue.avg_ticket || 0
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#78716C', marginTop: '2px' }}>Per receipt checkout</div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.04em' }}>
                    Tender Mode Collections Velocity & Volume
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {displayPaymentMethods.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#78716C', background: '#FAF8F5', borderRadius: '8px' }}>
                        No payments recorded during this period.
                      </div>
                    ) : (
                      displayPaymentMethods.map((pm, idx) => {
                        const totalRev = displayPaymentMethods.reduce((a, b) => a + (b.amount || 0), 0) || 1;
                        const sharePct = Math.round((pm.amount / totalRev) * 100);
                        return (
                          <div
                            key={idx}
                            style={{
                              padding: '12px 16px',
                              background: '#FAF8F5',
                              borderRadius: '10px',
                              border: '1px solid #EFEAE2',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <strong style={{ fontSize: '13.5px', color: '#1C1917' }}>{pm.payment_method}</strong>
                                <span style={{ fontSize: '12px', color: '#78716C', marginLeft: '8px' }}>
                                  ({pm.count} {pm.count === 1 ? 'bill' : 'bills'} processed)
                                </span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: '800', color: '#166534', fontSize: '14px' }}>
                                  {formatCurrency(pm.amount)}
                                </div>
                                <div style={{ fontSize: '11px', color: '#78716C' }}>
                                  {sharePct}% share
                                </div>
                              </div>
                            </div>
                            <div style={{ height: '6px', background: '#E7DFD5', borderRadius: '9999px', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${sharePct}%`,
                                background: '#166534',
                                borderRadius: '9999px',
                                transition: 'width 0.4s ease'
                              }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 8: SERVICE UTILIZATION & CATALOG INTELLIGENCE AUDIT */}
            {activeKpiModal === 'services' && (
              <div style={{ padding: '22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 4 Summary Badges */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '14px', background: '#FFF7ED', borderRadius: '10px', border: '1px solid #FED7AA' }}>
                    <div style={{ fontSize: '11px', color: '#C2410C', fontWeight: '700', textTransform: 'uppercase' }}>Top Performed</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#EA580C', marginTop: '4px' }}>
                      {top_services.length}
                    </div>
                    <div style={{ fontSize: '11px', color: '#C2410C', marginTop: '2px' }}>Active treatments booked</div>
                  </div>

                  <div style={{ padding: '14px', background: '#F0FDF4', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                    <div style={{ fontSize: '11px', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>Sessions Delivered</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#166534', marginTop: '4px' }}>
                      {top_services.reduce((acc, s) => acc + (s.times_performed || 0), 0)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#15803D', marginTop: '2px' }}>Total client treatments</div>
                  </div>

                  <div style={{ padding: '14px', background: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
                    <div style={{ fontSize: '11px', color: '#1E40AF', fontWeight: '700', textTransform: 'uppercase' }}>Unused Services</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#1D4ED8', marginTop: '4px' }}>
                      {unused_services.length}
                    </div>
                    <div style={{ fontSize: '11px', color: '#2563EB', marginTop: '2px' }}>0 bookings in timeframe</div>
                  </div>

                  <div style={{ padding: '14px', background: '#FAF6EE', borderRadius: '10px', border: '1px solid #DAC493' }}>
                    <div style={{ fontSize: '11px', color: '#8C6828', fontWeight: '700', textTransform: 'uppercase' }}>Top Revenue Treatment</div>
                    <div style={{ fontSize: '17px', fontWeight: '800', color: '#1C1917', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {top_services[0]?.service_name || 'None'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#8C6828', marginTop: '2px' }}>
                      {top_services[0] ? formatCurrency(top_services[0].total_revenue) : '₹0'} ({top_services[0]?.times_performed || 0} sessions)
                    </div>
                  </div>
                </div>

                {/* Sub-tab Switcher: Top Performed vs Unused */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #E7DFD5', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setServiceSubTab('top')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        border: serviceSubTab === 'top' ? '1.5px solid #EA580C' : '1px solid #D6D3D1',
                        background: serviceSubTab === 'top' ? '#FFF7ED' : '#FFFFFF',
                        color: serviceSubTab === 'top' ? '#C2410C' : '#57534E',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Flame size={13} color={serviceSubTab === 'top' ? '#EA580C' : '#78716C'} />
                      Top Performed ({top_services.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setServiceSubTab('unused')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        border: serviceSubTab === 'unused' ? '1.5px solid #2563EB' : '1px solid #D6D3D1',
                        background: serviceSubTab === 'unused' ? '#EFF6FF' : '#FFFFFF',
                        color: serviceSubTab === 'unused' ? '#1D4ED8' : '#57534E',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Snowflake size={13} color={serviceSubTab === 'unused' ? '#2563EB' : '#78716C'} />
                      Unused Services ({unused_services.length})
                    </button>
                  </div>
                </div>

                {/* Subtab 1: Top Performed Services List */}
                {serviceSubTab === 'top' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {top_services.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#78716C', background: '#FAF8F5', borderRadius: '8px' }}>
                        No services were performed during this period.
                      </div>
                    ) : (
                      top_services.map((s, idx) => {
                        const percentage = Math.round((s.times_performed / maxTopServiceCount) * 100);
                        return (
                          <div key={idx} style={{ padding: '12px 16px', background: '#FAF8F5', border: '1px solid #EFEAE2', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: idx < 3 ? '#FAF6EE' : '#F5F5F4',
                                  border: idx < 3 ? '1px solid #DAC493' : '1px solid #E7E5E4',
                                  color: idx < 3 ? '#B88B4A' : '#78716C',
                                  fontWeight: '800',
                                  fontSize: '11px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  {idx + 1}
                                </span>
                                <div>
                                  <strong style={{ fontSize: '13.5px', color: '#1C1917' }}>{s.service_name}</strong>
                                  {s.category_name && (
                                    <span style={{ fontSize: '12px', color: '#78716C', marginLeft: '6px' }}>
                                      • {s.category_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span style={{ fontWeight: '800', color: '#B88B4A', fontSize: '13.5px' }}>
                                {s.times_performed} sessions ({formatCurrency(s.total_revenue)})
                              </span>
                            </div>

                            <div style={{ height: '6px', background: '#E7DFD5', borderRadius: '9999px', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${percentage}%`,
                                background: 'linear-gradient(90deg, #B88B4A 0%, #D4AF37 100%)',
                                borderRadius: '9999px',
                                transition: 'width 0.4s ease'
                              }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Subtab 2: Unused Services */}
                {serviceSubTab === 'unused' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE'
                    }}>
                      <Snowflake size={16} color="#2563EB" style={{ flexShrink: 0 }} />
                      <div style={{ fontSize: '12px', color: '#1E40AF' }}>
                        <strong>{unused_services.length} catalog services</strong> had zero bookings in this timeframe. Use this list to run seasonal promos or train staff.
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: '1 1 200px' }}>
                        <Search size={14} color="#78716C" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="text"
                          placeholder="Search unused treatment..."
                          value={unusedSearch}
                          onChange={(e) => setUnusedSearch(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 10px 6px 30px',
                            borderRadius: '6px',
                            border: '1px solid #D6D3D1',
                            fontSize: '12px',
                            background: '#FFFFFF'
                          }}
                        />
                      </div>

                      {unusedCategories.length > 0 && (
                        <select
                          value={unusedCategoryFilter}
                          onChange={(e) => setUnusedCategoryFilter(e.target.value)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #D6D3D1',
                            background: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#1C1917'
                          }}
                        >
                          <option value="all">All Categories ({unusedCategories.length})</option>
                          {unusedCategories.map((c, i) => (
                            <option key={i} value={c}>{c}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div style={{ overflowX: 'auto', border: '1px solid #E7DFD5', borderRadius: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                        <thead style={{ background: '#FAF8F5', position: 'sticky', top: 0, zIndex: 1 }}>
                          <tr style={{ borderBottom: '1px solid #E7DFD5' }}>
                            <th style={{ padding: '8px 12px', fontWeight: '700', color: '#1C1917' }}>Service Name</th>
                            <th style={{ padding: '8px 12px', fontWeight: '700', color: '#1C1917' }}>Category</th>
                            <th style={{ padding: '8px 12px', fontWeight: '700', color: '#1C1917' }}>Menu Price</th>
                            <th style={{ padding: '8px 12px', fontWeight: '700', color: '#1C1917' }}>Duration</th>
                            <th style={{ padding: '8px 12px', fontWeight: '700', color: '#1C1917' }}>Last Booked</th>
                            <th style={{ padding: '8px 12px', fontWeight: '700', color: '#1C1917' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUnusedServices.length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#78716C' }}>
                                No unused services matched your search.
                              </td>
                            </tr>
                          ) : (
                            filteredUnusedServices.map((s, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #F0ECE4' }}>
                                <td style={{ padding: '8px 12px', fontWeight: '600', color: '#1C1917' }}>{s.service_name}</td>
                                <td style={{ padding: '8px 12px', color: '#78716C' }}>{s.category_name || 'General'}</td>
                                <td style={{ padding: '8px 12px', fontWeight: '700', color: '#B88B4A' }}>{formatCurrency(s.price)}</td>
                                <td style={{ padding: '8px 12px', color: '#78716C' }}>{s.duration_mins ? `${s.duration_mins}m` : '—'}</td>
                                <td style={{ padding: '8px 12px', color: s.last_performed_date ? '#1C1917' : '#9CA3AF' }}>
                                  {s.last_performed_date ? formatDate(s.last_performed_date) : 'Never'}
                                </td>
                                <td style={{ padding: '8px 12px' }}>
                                  <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#EFF6FF', color: '#1D4ED8', fontSize: '10.5px', fontWeight: '700' }}>
                                    0 Bookings
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 7: STAFF PERFORMANCE AUDIT */}
            {activeKpiModal === 'staff' && (
              <div style={{ padding: '22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '14px', background: '#FAF6EE', borderRadius: '10px', border: '1px solid #DAC493' }}>
                    <div style={{ fontSize: '11px', color: '#8C6828', fontWeight: '700', textTransform: 'uppercase' }}>Active Therapists</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#8C6828', marginTop: '4px' }}>
                      {staff_performance.length}
                    </div>
                    <div style={{ fontSize: '11px', color: '#8C6828', marginTop: '2px' }}>Delivering services</div>
                  </div>

                  <div style={{ padding: '14px', background: '#F0FDF4', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                    <div style={{ fontSize: '11px', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>Services Performed</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#166534', marginTop: '4px' }}>
                      {staff_performance.reduce((acc, s) => acc + (s.services_count || 0), 0)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#15803D', marginTop: '2px' }}>Completed treatments</div>
                  </div>

                  <div style={{ padding: '14px', background: '#FAF8F5', borderRadius: '10px', border: '1px solid #EFEAE2' }}>
                    <div style={{ fontSize: '11px', color: '#78716C', fontWeight: '700', textTransform: 'uppercase' }}>Staff Generated Revenue</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#1C1917', marginTop: '4px' }}>
                      {formatCurrency(staff_performance.reduce((acc, s) => acc + (s.revenue_generated || 0), 0) || revenue.period_revenue || 0)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#78716C', marginTop: '2px' }}>Direct service billing</div>
                  </div>

                  <div style={{ padding: '14px', background: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
                    <div style={{ fontSize: '11px', color: '#1E40AF', fontWeight: '700', textTransform: 'uppercase' }}>Top Performer</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#1D4ED8', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {staff_performance[0]?.staff_name || 'None'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#2563EB', marginTop: '2px' }}>
                      {staff_performance[0] ? formatCurrency(staff_performance[0].revenue_generated) : '₹0'} ({staff_performance[0]?.services_count || 0} services)
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.04em' }}>
                    Individual Staff Production & Velocity Breakdown
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '14px' }}>
                    {staff_performance.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#78716C', background: '#FAF8F5', borderRadius: '8px', gridColumn: '1 / -1' }}>
                        No staff service records found during this period.
                      </div>
                    ) : (
                      staff_performance.map((st, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '16px',
                            background: '#FAF8F5',
                            borderRadius: '12px',
                            border: '1px solid #EFEAE2',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '12px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ fontWeight: '700', fontSize: '14px', color: '#1C1917' }}>
                                {st.staff_name}
                              </div>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: idx === 0 ? '#FAF6EE' : '#F5F5F4',
                                border: idx === 0 ? '1px solid #DAC493' : '1px solid #E7E5E4',
                                color: idx === 0 ? '#B88B4A' : '#78716C'
                              }}>
                                #{idx + 1}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#78716C', textTransform: 'capitalize', marginTop: '2px' }}>
                              {st.role || 'Therapist'}
                            </div>
                          </div>

                          <div style={{ borderTop: '1px dashed #E5DCCF', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#57534E', fontWeight: '500' }}>
                              <strong>{st.services_count}</strong> {st.services_count === 1 ? 'service' : 'services'}
                            </span>
                            <span style={{ fontWeight: '800', color: '#B88B4A', fontSize: '14px' }}>
                              {formatCurrency(st.revenue_generated)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #E7DFD5',
              background: '#FAF8F5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ fontSize: '12px', color: '#78716C' }}>
                {activeKpiModal === 'footfall' && (
                  <span>Showing <strong>{filteredFootfallClients.length}</strong> of <strong>{clients.period_unique || 0}</strong> clients</span>
                )}
                {activeKpiModal === 'revenue' && (
                  <span>Period Total Invoiced: <strong>{formatCurrency(revenue.period_invoiced)}</strong></span>
                )}
                {activeKpiModal === 'ticket' && (
                  <span>Based on <strong>{revenue.period_visits || 0}</strong> completed transactions</span>
                )}
                {(activeKpiModal === 'memberships' || activeKpiModal === 'benchmarks') && (
                  <span>Showing <strong>{filteredMembershipMembers.length}</strong> of <strong>{memberships.total_members || 0}</strong> enrolled members • <strong>{formatCurrency(memberships.total_credits_used || 0)}</strong> redeemed till date</span>
                )}
                {activeKpiModal === 'category' && (
                  <span>Showing <strong>{categories.length}</strong> service categories across <strong>{categories.reduce((acc, c) => acc + (c.total_services || 0), 0)}</strong> treatments</span>
                )}
                {activeKpiModal === 'payment' && (
                  <span>Showing <strong>{displayPaymentMethods.length}</strong> payment tender modes across <strong>{displayPaymentMethods.reduce((acc, p) => acc + (p.count || 0), 0)}</strong> bills</span>
                )}
                {activeKpiModal === 'staff' && (
                  <span>Showing <strong>{staff_performance.length}</strong> staff providers across <strong>{staff_performance.reduce((acc, s) => acc + (s.services_count || 0), 0)}</strong> services</span>
                )}
                {activeKpiModal === 'services' && (
                  <span>Showing <strong>{top_services.length}</strong> active treatments and <strong>{unused_services.length}</strong> dormant catalog services</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveKpiModal(null)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  background: '#1C1917',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* 5. Day Audit & Client Invoices Pop-Up Tab Modal (createPortal) */}
      {activeDayModal && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(28, 25, 23, 0.65)',
            backdropFilter: 'blur(5px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveDayModal(null);
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E7DFD5',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              width: '100%',
              maxWidth: '920px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #E7DFD5',
              background: '#FAF8F5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#FAF6EE',
                  border: '1px solid #DAC493',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <BarChart3 size={20} color="#B88B4A" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#8C6828', fontWeight: '800', letterSpacing: '0.06em' }}>
                      Day Audit & Client Breakdown
                    </span>
                    {activeDayModal.status === 'green' && (
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#F0FDF4', color: '#166534', fontWeight: '700', border: '1px solid #BBF7D0' }}>
                        🟢 Peak Performance
                      </span>
                    )}
                    {activeDayModal.status === 'orange' && (
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#FFF7ED', color: '#C2410C', fontWeight: '700', border: '1px solid #FED7AA' }}>
                        🟠 Steady
                      </span>
                    )}
                    {activeDayModal.status === 'red' && (
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#FEF2F2', color: '#B91C1C', fontWeight: '700', border: '1px solid #FECACA' }}>
                        🔴 Zero / Inactive
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1C1917', margin: '2px 0 0 0' }}>
                    {activeDayModal.display_date} <span style={{ fontSize: '13px', fontWeight: '500', color: '#78716C' }}>({activeDayModal.date})</span>
                  </h3>
                </div>
              </div>

              {/* Day Navigation & Close */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {(() => {
                  const currIdx = day_wise?.days ? day_wise.days.findIndex(d => d.date === activeDayModal.date) : -1;
                  const hasPrev = currIdx > 0;
                  const hasNext = currIdx >= 0 && currIdx < (day_wise?.days?.length || 0) - 1;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '6px' }}>
                      <button
                        type="button"
                        disabled={!hasPrev}
                        onClick={() => hasPrev && setActiveDayModal(day_wise.days[currIdx - 1])}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          background: hasPrev ? '#FFFFFF' : '#F5F5F4',
                          border: '1px solid #D6D3D1',
                          color: hasPrev ? '#1C1917' : '#A8A29E',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: hasPrev ? 'pointer' : 'not-allowed'
                        }}
                        title="Previous Day"
                      >
                        <ChevronLeft size={14} /> Prev
                      </button>
                      <button
                        type="button"
                        disabled={!hasNext}
                        onClick={() => hasNext && setActiveDayModal(day_wise.days[currIdx + 1])}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          background: hasNext ? '#FFFFFF' : '#F5F5F4',
                          border: '1px solid #D6D3D1',
                          color: hasNext ? '#1C1917' : '#A8A29E',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: hasNext ? 'pointer' : 'not-allowed'
                        }}
                        title="Next Day"
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => setActiveDayModal(null)}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#78716C'
                  }}
                  title="Close (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 4 Summary Badges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {/* 1. Collected Revenue */}
                <div style={{ padding: '14px', background: '#FAF6EE', borderRadius: '12px', border: '1px solid #DAC493' }}>
                  <div style={{ fontSize: '11px', color: '#8C6828', fontWeight: '700', textTransform: 'uppercase' }}>Collected Revenue</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#1C1917', marginTop: '4px' }}>
                    {formatCurrency(activeDayModal.revenue || 0)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8C6828', marginTop: '3px' }}>
                    New: <strong>{formatCurrency(activeDayModal.new_revenue || 0)}</strong> • Old: <strong>{formatCurrency(activeDayModal.old_revenue || 0)}</strong>
                  </div>
                </div>

                {/* 2. Client Footfall / Visits */}
                <div style={{ padding: '14px', background: '#FAF6EE', borderRadius: '12px', border: '1px solid #DAC493' }}>
                  <div style={{ fontSize: '11px', color: '#8C6828', fontWeight: '700', textTransform: 'uppercase' }}>Completed Visits</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#1C1917', marginTop: '4px' }}>
                    {activeDayModal.visits_count || 0}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8C6828', marginTop: '3px' }}>
                    <span style={{ fontWeight: '700' }}>{activeDayModal.new_clients_count || 0} New</span> • <span style={{ fontWeight: '700' }}>{activeDayModal.old_clients_count || 0} Old</span>
                  </div>
                </div>

                {/* 3. Average Ticket Size */}
                <div style={{ padding: '14px', background: '#FAF6EE', borderRadius: '12px', border: '1px solid #DAC493' }}>
                  <div style={{ fontSize: '11px', color: '#8C6828', fontWeight: '700', textTransform: 'uppercase' }}>Avg Ticket Size</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#1C1917', marginTop: '4px' }}>
                    {activeDayModal.visits_count > 0 ? formatCurrency(Math.round(activeDayModal.revenue / activeDayModal.visits_count)) : '₹0'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8C6828', marginTop: '3px' }}>
                    Average revenue per visit
                  </div>
                </div>

                {/* 4. Top Performed Service */}
                <div style={{ padding: '14px', background: '#FAF6EE', borderRadius: '12px', border: '1px solid #DAC493' }}>
                  <div style={{ fontSize: '11px', color: '#8C6828', fontWeight: '700', textTransform: 'uppercase' }}>Top Performed Service</div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#1C1917', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeDayModal.top_service !== '—' ? activeDayModal.top_service : 'None recorded'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8C6828', marginTop: '3px' }}>
                    Primary day contributor
                  </div>
                </div>
              </div>

              {/* Day Appointments & Invoices Table Section */}
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#1C1917', margin: 0 }}>
                      Client Invoices & Completed Services ({dayDetailsData?.visits?.length || 0})
                    </h4>
                    <p style={{ fontSize: '12px', color: '#78716C', margin: '2px 0 0 0' }}>
                      Detailed audit of all client checkouts and billing on {activeDayModal.display_date}.
                    </p>
                  </div>

                  {/* Filter and Search */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', background: '#F5F5F4', padding: '2px', borderRadius: '8px', border: '1px solid #E7DFD5' }}>
                      <button
                        type="button"
                        onClick={() => setDayVisitsFilter('all')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: dayVisitsFilter === 'all' ? '800' : '600',
                          border: 'none',
                          cursor: 'pointer',
                          background: dayVisitsFilter === 'all' ? '#FFFFFF' : 'transparent',
                          color: dayVisitsFilter === 'all' ? '#1C1917' : '#78716C',
                          boxShadow: dayVisitsFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        All ({dayDetailsData?.visits?.length || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDayVisitsFilter('new')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: dayVisitsFilter === 'new' ? '800' : '600',
                          border: 'none',
                          cursor: 'pointer',
                          background: dayVisitsFilter === 'new' ? '#F0FDF4' : 'transparent',
                          color: dayVisitsFilter === 'new' ? '#166534' : '#78716C',
                          boxShadow: dayVisitsFilter === 'new' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        🟢 New ({dayDetailsData?.visits?.filter(v => v.is_new === 1).length || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDayVisitsFilter('old')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: dayVisitsFilter === 'old' ? '800' : '600',
                          border: 'none',
                          cursor: 'pointer',
                          background: dayVisitsFilter === 'old' ? '#F5F3FF' : 'transparent',
                          color: dayVisitsFilter === 'old' ? '#6D28D9' : '#78716C',
                          boxShadow: dayVisitsFilter === 'old' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        🟣 Returning ({dayDetailsData?.visits?.filter(v => v.is_new !== 1).length || 0})
                      </button>
                    </div>

                    <div style={{ position: 'relative', minWidth: '180px' }}>
                      <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#78716C' }} />
                      <input
                        type="text"
                        placeholder="Search client / phone..."
                        value={dayVisitsSearch}
                        onChange={(e) => setDayVisitsSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '5px 10px 5px 28px',
                          borderRadius: '8px',
                          border: '1px solid #D6D3D1',
                          fontSize: '12px',
                          outline: 'none',
                          background: '#FFFFFF'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Table of Visits */}
                {dayDetailsLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#78716C', background: '#FAF8F5', borderRadius: '10px', border: '1px solid #E7DFD5' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}>
                      <RefreshCw size={16} className="animate-spin" /> Loading audit records for {activeDayModal.display_date}...
                    </div>
                  </div>
                ) : (!dayDetailsData?.visits || dayDetailsData.visits.length === 0) ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#78716C', background: '#FAF8F5', borderRadius: '10px', border: '1px solid #E7DFD5' }}>
                    <Clock size={28} color="#A8A29E" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#1C1917' }}>No client visits on this date</div>
                    <div style={{ fontSize: '12px', color: '#78716C', marginTop: '4px' }}>No bookings or billed transactions were logged for {activeDayModal.display_date}.</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid #E7DFD5', borderRadius: '10px', maxHeight: '360px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#FAF8F5', borderBottom: '1.5px solid #E2D9CC', zIndex: 1 }}>
                        <tr>
                          <th style={{ padding: '10px 14px', fontWeight: '700', color: '#1C1917' }}>Client Name & Details</th>
                          <th style={{ padding: '10px 14px', fontWeight: '700', color: '#1C1917' }}>Client Type</th>
                          <th style={{ padding: '10px 14px', fontWeight: '700', color: '#1C1917' }}>Service Time</th>
                          <th style={{ padding: '10px 14px', fontWeight: '700', color: '#1C1917' }}>Services Performed</th>
                          <th style={{ padding: '10px 14px', fontWeight: '700', color: '#1C1917' }}>Payment Mode</th>
                          <th style={{ padding: '10px 14px', fontWeight: '700', color: '#1C1917', textAlign: 'right' }}>Amount Paid</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayDetailsData.visits
                          .filter(v => {
                            if (dayVisitsFilter === 'new') return v.is_new === 1;
                            if (dayVisitsFilter === 'old') return v.is_new !== 1;
                            return true;
                          })
                          .filter(v => {
                            if (!dayVisitsSearch) return true;
                            const q = dayVisitsSearch.toLowerCase();
                            const matchClient = (v.client_name || '').toLowerCase().includes(q);
                            const matchPhone = (v.client_phone || '').toLowerCase().includes(q);
                            const matchService = (v.services || []).some(s => (s.service_name || '').toLowerCase().includes(q));
                            return matchClient || matchPhone || matchService;
                          })
                          .map((v, vIdx) => {
                            return (
                              <tr key={v.visit_id || vIdx} style={{ borderBottom: '1px solid #F0ECE4', background: vIdx % 2 === 0 ? '#FFFFFF' : '#FAF8F5' }}>
                                <td style={{ padding: '10px 14px' }}>
                                  <div style={{ fontWeight: '700', color: '#1C1917' }}>{v.client_name || 'Walk-in Client'}</div>
                                  <div style={{ fontSize: '11px', color: '#78716C' }}>
                                    {v.client_phone ? v.client_phone : 'No phone'} {v.reg_no ? `• #${v.reg_no}` : ''}
                                  </div>
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  {v.is_new === 1 ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 8px', borderRadius: '6px', background: '#F0FDF4', color: '#166534', fontWeight: '700', fontSize: '11px', border: '1px solid #BBF7D0' }}>
                                      <UserPlus size={11} /> New Client
                                    </span>
                                  ) : (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 8px', borderRadius: '6px', background: '#F5F3FF', color: '#6D28D9', fontWeight: '700', fontSize: '11px', border: '1px solid #DDD6FE' }}>
                                      <Repeat size={11} /> Old / Returning
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '10px 14px', color: '#57534E' }}>
                                  {v.service_time || '—'}
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  {v.services && v.services.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      {v.services.map((svc, sIdx) => (
                                        <div key={sIdx} style={{ fontSize: '11.5px', color: '#1C1917' }}>
                                          <strong>{svc.service_name}</strong>
                                          {svc.staff_name && (
                                            <span style={{ color: '#78716C', marginLeft: '5px' }}>
                                              (Staff: {svc.staff_name})
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span style={{ color: '#A8A29E' }}>Standard Checkout</span>
                                  )}
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: '#F5F5F4',
                                    border: '1px solid #E7DFD5',
                                    color: '#44403C',
                                    fontWeight: '600',
                                    fontSize: '11px'
                                  }}>
                                    {v.payment_method || 'Cash / Card'}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '800', color: '#166534', fontSize: '13px' }}>
                                  {formatCurrency(v.amount_paid || v.total_amount || 0)}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #E7DFD5',
              background: '#FAF8F5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ fontSize: '12px', color: '#78716C' }}>
                Day Total Revenue: <strong style={{ color: '#166534' }}>{formatCurrency(activeDayModal.revenue || 0)}</strong> across <strong>{activeDayModal.visits_count || 0}</strong> client visits
              </div>
              <button
                type="button"
                onClick={() => setActiveDayModal(null)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  background: '#1C1917',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ADJUST BALANCE MODAL */}
      {adjustBalanceModal.open && createPortal(
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28,25,23,0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000000,
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '420px',
            width: '100%',
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #EADBBE',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            padding: '24px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1C1917', margin: 0 }}>
              Adjust Membership Credit Balance
            </h3>
            <p style={{ fontSize: '12.5px', color: '#78716C', margin: '4px 0 16px 0' }}>
              Client: <strong>{adjustBalanceModal.member?.name}</strong> • Current Plan: {adjustBalanceModal.member?.membership_tier}
            </p>

            <form onSubmit={handleSaveBalanceAdjustment}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                New Balance Amount (₹)
              </label>
              <input
                type="number"
                step="100"
                min="0"
                required
                value={adjustBalanceModal.amount}
                onChange={(e) => setAdjustBalanceModal({ ...adjustBalanceModal, amount: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D6D3D1',
                  fontSize: '15px',
                  fontWeight: '700',
                  color: '#1C1917',
                  marginBottom: '16px',
                  boxSizing: 'border-box'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAdjustBalanceModal({ open: false, member: null, amount: '' })}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #D6D3D1',
                    background: '#FFFFFF',
                    color: '#57534E',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#B88B4A',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Save Balance
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* EXTEND VALIDITY MODAL */}
      {extendValidityModal.open && createPortal(
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28,25,23,0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000000,
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '420px',
            width: '100%',
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #EADBBE',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            padding: '24px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1C1917', margin: 0 }}>
              Extend Membership Validity
            </h3>
            <p style={{ fontSize: '12.5px', color: '#78716C', margin: '4px 0 16px 0' }}>
              Client: <strong>{extendValidityModal.member?.name}</strong> • Plan: {extendValidityModal.member?.membership_tier}
            </p>

            <form onSubmit={handleSaveExtendValidity}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                New Expiration Date
              </label>
              <input
                type="date"
                required
                value={extendValidityModal.date}
                onChange={(e) => setExtendValidityModal({ ...extendValidityModal, date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D6D3D1',
                  fontSize: '14px',
                  color: '#1C1917',
                  marginBottom: '12px',
                  boxSizing: 'border-box'
                }}
              />

              {/* Quick extension pills */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {[
                  { label: '+30 Days', days: 30 },
                  { label: '+90 Days', days: 90 },
                  { label: '+1 Year', days: 365 }
                ].map(opt => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      const baseDate = extendValidityModal.date ? new Date(extendValidityModal.date) : new Date();
                      const newD = new Date(baseDate.getTime() + opt.days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                      setExtendValidityModal({ ...extendValidityModal, date: newD });
                    }}
                    style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #DAC493',
                      background: '#FAF6EE',
                      color: '#8C6228',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setExtendValidityModal({ open: false, member: null, date: '' })}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #D6D3D1',
                    background: '#FFFFFF',
                    color: '#57534E',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#B88B4A',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Update Validity
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Crown, Sparkles, Users, Search, Filter, Plus, Calendar, Clock,
  ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, RotateCw,
  ChevronRight, Edit2, ExternalLink, X, DollarSign, Wallet,
  CreditCard, Gift, Star, Check
} from 'lucide-react';
import { apiRequest, formatCurrency, formatDate, formatPhone } from '../utils/api';

export default function MembershipManagement({ onOpenClient, activeLocation, currentUser }) {
  const [plans, setPlans] = useState([]);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({
    total_members: 0,
    total_allocated: 0,
    total_used: 0,
    total_balance: 0,
    overall_usage_pct: 0,
    tier_counts: { 'Éclat': 0, 'Eternal': 0, 'Infini': 0, 'Lumière': 0 }
  });
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('all'); // 'all' | 'Lumière' | 'Infini' | 'Eternal' | 'Éclat'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'expired'

  // Modals state
  const [enrollModal, setEnrollModal] = useState(false);
  const [allClients, setAllClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState('infini');
  const [customCost, setCustomCost] = useState(25000);
  const [customExpiry, setCustomExpiry] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  // Quick Action Modals
  const [adjustBalanceModal, setAdjustBalanceModal] = useState({ open: false, member: null, amount: '' });
  const [extendValidityModal, setExtendValidityModal] = useState({ open: false, member: null, date: '' });

  const fetchMemberships = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/memberships');
      setPlans(res.plans || []);
      setMembers(res.members || []);
      setStats(res.stats || {
        total_members: 0,
        total_allocated: 0,
        total_used: 0,
        total_balance: 0,
        overall_usage_pct: 0,
        tier_counts: {}
      });
    } catch (err) {
      console.error('Failed to load memberships:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllClientsForEnroll = async () => {
    try {
      const res = await apiRequest('/clients');
      setAllClients(res.clients || []);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  useEffect(() => {
    fetchMemberships();
  }, [activeLocation]);

  const handleOpenEnrollModal = () => {
    fetchAllClientsForEnroll();
    setClientSearch('');
    setSelectedClient(null);
    setSelectedPlanId('infini');
    setCustomCost(25000);
    const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setCustomExpiry(oneYearFromNow);
    setEnrollModal(true);
  };

  const handleSelectPlanForEnroll = (plan) => {
    setSelectedPlanId(plan.id);
    setCustomCost(plan.price);
    let days = 365;
    if (plan.id === 'eclat') days = 90;
    else if (plan.id === 'eternal') days = 180;
    const expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setCustomExpiry(expiryDate);
  };

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClient) {
      alert('Please select a client to enroll');
      return;
    }
    const chosenPlan = plans.find(p => p.id === selectedPlanId) || plans[0];
    try {
      setEnrolling(true);
      await apiRequest(`/clients/${selectedClient.client_id}/membership`, {
        method: 'PATCH',
        body: JSON.stringify({
          membership_tier: chosenPlan.name,
          membership_cost: Number(customCost) || chosenPlan.price,
          membership_balance: Number(customCost) || chosenPlan.price,
          membership_expires_at: customExpiry,
          membership_status: 'active'
        })
      });
      setEnrollModal(false);
      fetchMemberships();
      alert(`Successfully enrolled ${selectedClient.name} into ${chosenPlan.name}!`);
    } catch (err) {
      alert('Enrollment failed: ' + err.message);
    } finally {
      setEnrolling(false);
    }
  };

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
      fetchMemberships();
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
      fetchMemberships();
    } catch (err) {
      alert('Failed to extend validity: ' + err.message);
    }
  };

  // Filter members list
  const filteredMembers = members.filter(m => {
    if (tierFilter !== 'all' && m.tier_group !== tierFilter) return false;
    if (statusFilter === 'active' && m.is_expired) return false;
    if (statusFilter === 'expired' && !m.is_expired) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const matchName = (m.name || '').toLowerCase().includes(q) || (m.surname || '').toLowerCase().includes(q);
      const matchPhone = (m.phone || '').includes(q);
      const matchTier = (m.membership_tier || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchTier) return false;
    }
    return true;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#B88B4A', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Crown size={14} color="#B88B4A" />
            Studio Client Privilege Program
          </div>
          <h1 style={{ fontSize: '28px', color: '#1C1917', margin: '4px 0 0 0', fontWeight: '800' }}>
            MEMBERSHIP TIERS & CLIENT DIRECTORY
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Exclusive membership tiers, client beauty credits, validity tenure, and privilege redemptions for {activeLocation?.name || 'this studio'}.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchMemberships}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #E7E5E4',
              background: '#FFFFFF',
              color: '#57534E',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            title="Refresh member records"
          >
            <RotateCw size={14} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleOpenEnrollModal}
            className="btn-primary"
            style={{ padding: '9px 18px', fontSize: '13.5px', display: 'inline-flex', alignItems: 'center', gap: '7px' }}
          >
            <Plus size={16} />
            Enroll Client into Membership
          </button>
        </div>
      </div>

      {/* 4 KPI Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Card 1: Enrolled Members */}
        <div style={{
          padding: '18px 20px',
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #EADBBE',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#8C6228', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Enrolled Members
            </span>
            <Users size={18} color="#B88B4A" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#1C1917', marginTop: '6px' }}>
            {stats.total_members}
          </div>
          <div style={{ fontSize: '11.5px', color: '#78716C', marginTop: '4px' }}>
            Active club members in {activeLocation?.code || 'this studio'}
          </div>
        </div>

        {/* Card 2: Allocated Credits */}
        <div style={{
          padding: '18px 20px',
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #EADBBE',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#8C6228', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Allocated Credits
            </span>
            <Wallet size={18} color="#B88B4A" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#1C1917', marginTop: '6px' }}>
            {formatCurrency(stats.total_allocated)}
          </div>
          <div style={{ fontSize: '11.5px', color: '#78716C', marginTop: '4px' }}>
            Total membership credit worth issued
          </div>
        </div>

        {/* Card 3: Credits Redeemed */}
        <div style={{
          padding: '18px 20px',
          background: '#F0FDF4',
          borderRadius: '12px',
          border: '1px solid #BBF7D0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#166534', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Credits Redeemed
            </span>
            <Sparkles size={18} color="#166534" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#166534', marginTop: '6px' }}>
            {formatCurrency(stats.total_used)}
          </div>
          <div style={{ fontSize: '11.5px', color: '#15803D', marginTop: '4px' }}>
            {stats.overall_usage_pct}% overall treatment redemption
          </div>
        </div>

        {/* Card 4: Active Available Balance */}
        <div style={{
          padding: '18px 20px',
          background: '#EFF6FF',
          borderRadius: '12px',
          border: '1px solid #BFDBFE',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#1E40AF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Active Client Balance
            </span>
            <CreditCard size={18} color="#1E40AF" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#1E40AF', marginTop: '6px' }}>
            {formatCurrency(stats.total_balance)}
          </div>
          <div style={{ fontSize: '11.5px', color: '#2563EB', marginTop: '4px' }}>
            Available balance for treatments & rituals
          </div>
        </div>
      </div>

      {/* SECTION 1: CANONICAL MEMBERSHIP TIER PLANS SHOWCASE */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1C1917', margin: 0 }}>
              EXCLUSIVE MEMBERSHIP TIERS
            </h2>
            <div style={{ fontSize: '12.5px', color: '#78716C', marginTop: '2px' }}>
              Click any tier badge to instantly filter enrolled members below.
            </div>
          </div>
          {tierFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setTierFilter('all')}
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #DAC493',
                background: '#FAF6EE',
                color: '#8C6228',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Clear Tier Filter ({tierFilter})
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {plans.map(p => {
            const memberCount = stats.tier_counts?.[p.tier] || 0;
            const isSelected = tierFilter === p.tier;
            return (
              <div
                key={p.id}
                onClick={() => setTierFilter(isSelected ? 'all' : p.tier)}
                style={{
                  background: isSelected ? '#FAF6EE' : '#FFFFFF',
                  borderRadius: '14px',
                  border: isSelected ? '2px solid #B88B4A' : '1px solid #EADBBE',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isSelected ? '0 8px 24px rgba(184, 139, 74, 0.18)' : '0 2px 8px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: p.color,
                      background: p.bg,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Crown size={11} />
                      {p.tierNumber}
                    </span>

                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      background: memberCount > 0 ? '#FEF3C7' : '#F5F5F4',
                      color: memberCount > 0 ? '#92400E' : '#78716C',
                      border: `1px solid ${memberCount > 0 ? '#FCD34D' : '#E7E5E4'}`
                    }}>
                      {memberCount} {memberCount === 1 ? 'member' : 'members'}
                    </span>
                  </div>

                  <div style={{ fontSize: '17px', fontWeight: '800', color: '#1C1917', marginTop: '10px' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#B88B4A', marginTop: '4px' }}>
                    {formatCurrency(p.price)}
                    <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#78716C', marginLeft: '6px' }}>
                      ({p.validity})
                    </span>
                  </div>

                  <p style={{ fontSize: '12px', color: '#78716C', margin: '8px 0 12px 0', lineHeight: 1.4 }}>
                    {p.tagline}
                  </p>

                  <div style={{ borderTop: '1px dashed #EADBBE', paddingTop: '10px' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', color: '#8C6228', marginBottom: '6px' }}>
                      Privileges & Benefits:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11.5px', color: '#44403C', lineHeight: 1.5 }}>
                      {p.benefits.slice(0, 3).map((b, idx) => (
                        <li key={idx}>{b}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #FAF6EE', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: isSelected ? '#8C6228' : '#78716C', fontWeight: '700' }}>
                  <span>{isSelected ? '✓ Filter Applied' : 'Click to Filter Roster'}</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: ENROLLED MEMBER CLIENTS DIRECTORY */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #EADBBE',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }}>
        {/* Controls: Search & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2 style={{ fontSize: '19px', fontWeight: '800', color: '#1C1917', margin: 0 }}>
              ENROLLED MEMBER ROSTER
            </h2>
            <div style={{ fontSize: '12.5px', color: '#78716C', marginTop: '2px' }}>
              Showing {filteredMembers.length} of {members.length} member clients
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={14} color="#78716C" style={{ position: 'absolute', left: '10px', top: '11px' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name or mobile..."
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 30px',
                  borderRadius: '8px',
                  border: '1px solid #D6D3D1',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#FFFDF9'
                }}
              />
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid #D6D3D1', overflow: 'hidden' }}>
              {['all', 'active', 'expired'].map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '7px 12px',
                    fontSize: '12px',
                    fontWeight: statusFilter === st ? '700' : '500',
                    border: 'none',
                    background: statusFilter === st ? '#B88B4A' : '#FFFFFF',
                    color: statusFilter === st ? '#FFFFFF' : '#57534E',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Members Roster Table / Card Grid */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#78716C' }}>
            Loading enrolled studio members...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            background: '#FAF6EE',
            borderRadius: '12px',
            border: '1px dashed #DAC493'
          }}>
            <Crown size={32} color="#B88B4A" style={{ margin: '0 auto 8px auto' }} />
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#1C1917' }}>
              No members found matching your search
            </div>
            <p style={{ fontSize: '12.5px', color: '#78716C', maxWidth: '400px', margin: '4px auto 14px auto' }}>
              Enroll a new client into a membership or clear filters to view the full studio member directory.
            </p>
            <button
              type="button"
              onClick={handleOpenEnrollModal}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              + Enroll Client into Membership
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '16px' }}>
            {filteredMembers.map(m => {
              const planConfig = plans.find(p => p.tier === m.tier_group) || {};
              const usedPct = m.usage_pct || 0;

              return (
                <div
                  key={m.client_id}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    border: m.is_expired ? '1px dashed #E7E5E4' : '1px solid #EADBBE',
                    background: m.is_expired ? '#FAFAF9' : '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                >
                  <div>
                    {/* Header: Avatar, Name, Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: planConfig.bg || '#FAF6EE',
                          color: planConfig.color || '#B88B4A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '16px',
                          border: `1px solid ${planConfig.color || '#DAC493'}`
                        }}>
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#1C1917' }}>
                            {m.name} {m.surname || ''}
                          </div>
                          <div style={{ fontSize: '12px', color: '#78716C' }}>
                            {formatPhone(m.phone)}
                          </div>
                        </div>
                      </div>

                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        background: m.is_expired ? '#FEE2E2' : '#DCFCE7',
                        color: m.is_expired ? '#B91C1C' : '#15803D'
                      }}>
                        {m.effective_status}
                      </span>
                    </div>

                    {/* Tier Badge & Validity Pill */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
                      <span style={{
                        fontSize: '11.5px',
                        fontWeight: '800',
                        padding: '3px 9px',
                        borderRadius: '6px',
                        background: planConfig.bg || '#FEF3C7',
                        color: planConfig.color || '#92400E',
                        border: '1px solid #DAC493',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <Crown size={12} />
                        {m.membership_tier}
                      </span>

                      {m.days_remaining !== null && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          color: m.is_expired ? '#DC2626' : (m.days_remaining < 30 ? '#B45309' : '#57534E'),
                          background: '#F5F5F4',
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>
                          <Clock size={11} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} />
                          {m.is_expired ? 'Expired' : `${m.days_remaining} days left`}
                        </span>
                      )}
                    </div>

                    {/* Credit Balance Progress Bar */}
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      borderRadius: '8px',
                      background: '#FAF6EE',
                      border: '1px solid #EADBBE'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '6px' }}>
                        <span style={{ color: '#78716C', fontWeight: '600' }}>Available Balance:</span>
                        <span style={{ fontWeight: '800', color: '#1E40AF', fontSize: '13px' }}>
                          {formatCurrency(m.balance)}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ width: '100%', height: '6px', background: '#E7DFD5', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(100, Math.max(0, 100 - usedPct))}%`,
                          height: '100%',
                          background: usedPct > 80 ? '#DC2626' : '#B88B4A',
                          borderRadius: '9999px'
                        }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#78716C', marginTop: '6px' }}>
                        <span>Used: {formatCurrency(m.used)} ({usedPct}%)</span>
                        <span>Plan Worth: {formatCurrency(m.cost)}</span>
                      </div>
                    </div>

                    {/* Tenure Dates */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#78716C', marginTop: '10px' }}>
                      <span>Started: <strong>{m.membership_started_at ? formatDate(m.membership_started_at) : 'N/A'}</strong></span>
                      <span>Expires: <strong>{m.membership_expires_at ? formatDate(m.membership_expires_at) : 'N/A'}</strong></span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '12px',
                    borderTop: '1px solid #F5F5F4',
                    gap: '8px'
                  }}>
                    <button
                      type="button"
                      onClick={() => setAdjustBalanceModal({ open: true, member: m, amount: String(m.balance) })}
                      style={{
                        fontSize: '11.5px',
                        padding: '5px 9px',
                        borderRadius: '6px',
                        border: '1px solid #DAC493',
                        background: '#FAF6EE',
                        color: '#8C6228',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Adjust Balance
                    </button>

                    <button
                      type="button"
                      onClick={() => setExtendValidityModal({ open: true, member: m, date: m.membership_expires_at || '' })}
                      style={{
                        fontSize: '11.5px',
                        padding: '5px 9px',
                        borderRadius: '6px',
                        border: '1px solid #E7E5E4',
                        background: '#FFFFFF',
                        color: '#57534E',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Extend Validity
                    </button>

                    {onOpenClient && (
                      <button
                        type="button"
                        onClick={() => onOpenClient(m)}
                        style={{
                          fontSize: '11.5px',
                          padding: '5px 10px',
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
                      >
                        Profile
                        <ChevronRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ENROLL CLIENT MODAL */}
      {enrollModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28,25,23,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div
            className="animate-fade-in"
            style={{
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#FFFDF9',
              borderRadius: '16px',
              border: '1px solid #EADBBE',
              boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
              padding: '28px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1C1917', margin: 0 }}>
                  Enroll Client into Membership
                </h2>
                <p style={{ fontSize: '13px', color: '#78716C', marginTop: '2px', margin: 0 }}>
                  Assign an exclusive membership plan and beauty credits to a client.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEnrollModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#78716C' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Step 1: Select Client */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '6px' }}>
                  1. Select Studio Client *
                </label>
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    if (selectedClient && !e.target.value.includes(selectedClient.name)) {
                      setSelectedClient(null);
                    }
                  }}
                  placeholder="Type client name or phone number..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D6D3D1',
                    fontSize: '13.5px',
                    background: '#FFFFFF',
                    outline: 'none'
                  }}
                />

                {/* Suggestions List */}
                {clientSearch.trim() && !selectedClient && (
                  <div style={{
                    maxHeight: '160px',
                    overflowY: 'auto',
                    border: '1px solid #EADBBE',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    marginTop: '6px'
                  }}>
                    {allClients
                      .filter(c => (c.name || '').toLowerCase().includes(clientSearch.toLowerCase()) || (c.phone || '').includes(clientSearch))
                      .slice(0, 5)
                      .map(c => (
                        <div
                          key={c.client_id}
                          onClick={() => {
                            setSelectedClient(c);
                            setClientSearch(`${c.name} (${c.phone || 'No phone'})`);
                          }}
                          style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid #F5F5F4',
                            cursor: 'pointer',
                            fontSize: '12.5px',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}
                        >
                          <span style={{ fontWeight: '700', color: '#1C1917' }}>{c.name} {c.surname || ''}</span>
                          <span style={{ color: '#78716C' }}>{c.phone || ''} • Current: {c.membership_tier || 'Non-Member'}</span>
                        </div>
                      ))}
                  </div>
                )}

                {selectedClient && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: '#166534', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} />
                    Selected: {selectedClient.name} (ID: #{selectedClient.client_id})
                  </div>
                )}
              </div>

              {/* Step 2: Select Plan */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '8px' }}>
                  2. Choose Membership Tier *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {plans.map(p => {
                    const isSelected = selectedPlanId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPlanForEnroll(p)}
                        style={{
                          padding: '12px',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #B88B4A' : '1px solid #E7E5E4',
                          background: isSelected ? '#FAF6EE' : '#FFFFFF',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '800', fontSize: '13px', color: isSelected ? '#8C6228' : '#1C1917' }}>
                            {p.tier}
                          </span>
                          <span style={{ fontWeight: '800', fontSize: '13px', color: '#B88B4A' }}>
                            {formatCurrency(p.price)}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#78716C', marginTop: '2px' }}>
                          {p.validity}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Cost / Credits & Validity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#1C1917', marginBottom: '6px' }}>
                    Membership Credits (₹)
                  </label>
                  <input
                    type="number"
                    value={customCost}
                    onChange={(e) => setCustomCost(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #D6D3D1',
                      fontSize: '13.5px',
                      fontWeight: '700'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#1C1917', marginBottom: '6px' }}>
                    Valid Till Date
                  </label>
                  <input
                    type="date"
                    value={customExpiry}
                    onChange={(e) => setCustomExpiry(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #D6D3D1',
                      fontSize: '13.5px'
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEnrollModal(false)}
                  className="btn-secondary"
                  style={{ padding: '9px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrolling || !selectedClient}
                  className="btn-primary"
                  style={{ padding: '9px 20px', fontWeight: '700' }}
                >
                  {enrolling ? 'Enrolling...' : 'Confirm Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST BALANCE MODAL */}
      {adjustBalanceModal.open && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28,25,23,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '420px',
            width: '100%',
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #EADBBE',
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
                  marginBottom: '16px'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAdjustBalanceModal({ open: false, member: null, amount: '' })}
                  className="btn-secondary"
                  style={{ padding: '8px 14px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontWeight: '700' }}
                >
                  Save Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXTEND VALIDITY MODAL */}
      {extendValidityModal.open && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28,25,23,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '420px',
            width: '100%',
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #EADBBE',
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
                  marginBottom: '12px'
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
                  className="btn-secondary"
                  style={{ padding: '8px 14px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontWeight: '700' }}
                >
                  Update Validity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

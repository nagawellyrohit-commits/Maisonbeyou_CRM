import React, { useState, useEffect } from 'react';
import {
  Crown, Sparkles, Users, Search, Filter, Plus, Calendar, Clock,
  ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, RotateCw,
  ChevronRight, Edit2, ExternalLink, X, DollarSign, Wallet,
  CreditCard, Gift, Star, Check, UserPlus, Trash2, Layers, Image as ImageIcon
} from 'lucide-react';
import { apiRequest, formatCurrency, formatDate, formatPhone } from '../utils/api';
import { MEMBERSHIP_PLANS } from './NewVisitWizard';

export default function MembershipManagement({ onOpenClient, activeLocation, currentUser }) {
  const user = currentUser || JSON.parse(localStorage.getItem('crm_user') || '{}');
  const effectiveRole = user?.original_role || user?.role;
  const canManagePlans = effectiveRole === 'master_admin' || effectiveRole === 'admin';

  const [plans, setPlans] = useState(MEMBERSHIP_PLANS);
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

  // Quick New Client Registration within Enroll Modal
  const [showQuickAddClient, setShowQuickAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  // Add Membership Plan Modal (Master Admin & Main Admin only)
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [newPlanForm, setNewPlanForm] = useState({
    name: '',
    fullName: '',
    tier: '',
    tierNumber: '',
    price: '',
    validity: 'Valid for 1 year',
    validityBadge: 'VALID FOR 1 YEAR',
    durationLabel: '(per year)',
    image: '/memberships/card_infini_3d.jpg',
    tagline: 'Exclusive personalized aesthetic luxury membership.',
    benefitInput: '',
    benefits: [
      'Complimentary skin consultation + AI analysis',
      'Priority booking on peak hours',
      'Special member discount on all treatments'
    ]
  });

  // Quick Action Modals
  const [adjustBalanceModal, setAdjustBalanceModal] = useState({ open: false, member: null, amount: '' });
  const [extendValidityModal, setExtendValidityModal] = useState({ open: false, member: null, date: '' });

  const fetchMemberships = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/memberships');
      if (res.plans && res.plans.length > 0) {
        setPlans(res.plans);
      }
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

  const handleSelectPlanForEnroll = (plan) => {
    if (!plan) return;
    setSelectedPlanId(plan.id);
    setCustomCost(plan.price);
    let days = 365;
    if (plan.id === 'eclat') days = 90;
    else if (plan.id === 'eternal') days = 180;
    const expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setCustomExpiry(expiryDate);
  };

  const handleOpenEnrollModal = (preselectedPlan = null) => {
    fetchAllClientsForEnroll();
    setClientSearch('');
    setSelectedClient(null);
    setShowQuickAddClient(false);
    setNewClientName('');
    setNewClientPhone('');
    if (preselectedPlan) {
      handleSelectPlanForEnroll(preselectedPlan);
    } else {
      const defaultPlan = plans.find(p => p.id === 'infini') || plans[0] || MEMBERSHIP_PLANS[2];
      handleSelectPlanForEnroll(defaultPlan);
    }
    setEnrollModal(true);
  };

  const handleQuickCreateClient = async (e) => {
    if (e) e.preventDefault();
    if (!newClientName.trim()) {
      alert('Client name is required');
      return;
    }
    try {
      setCreatingClient(true);
      const res = await apiRequest('/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: newClientName.trim(),
          phone: newClientPhone.trim(),
          location_id: activeLocation
        })
      });
      const createdClient = {
        client_id: res.client_id || res.id,
        name: newClientName.trim(),
        phone: newClientPhone.trim(),
        membership_tier: 'Non-Member'
      };
      setAllClients(prev => [createdClient, ...prev]);
      setSelectedClient(createdClient);
      setClientSearch(`${createdClient.name} (${createdClient.phone || 'No phone'})`);
      setShowQuickAddClient(false);
      setNewClientName('');
      setNewClientPhone('');
    } catch (err) {
      alert('Failed to register client: ' + err.message);
    } finally {
      setCreatingClient(false);
    }
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

  const handleAddBenefit = () => {
    if (!newPlanForm.benefitInput.trim()) return;
    setNewPlanForm(prev => ({
      ...prev,
      benefits: [...prev.benefits, prev.benefitInput.trim()],
      benefitInput: ''
    }));
  };

  const handleRemoveBenefit = (idx) => {
    setNewPlanForm(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== idx)
    }));
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!newPlanForm.name.trim() || !newPlanForm.price) {
      alert('Please enter a tier name and price.');
      return;
    }
    try {
      setSavingPlan(true);
      const tierVal = newPlanForm.tier.trim() || newPlanForm.name.trim();
      const payload = {
        name: newPlanForm.name.trim(),
        fullName: newPlanForm.fullName.trim() || `${newPlanForm.name.trim().toUpperCase()} MEMBERSHIP`,
        tier: tierVal,
        tierNumber: newPlanForm.tierNumber.trim() || `0${plans.length + 1} — SERVICE`,
        price: Number(newPlanForm.price),
        credits: Number(newPlanForm.price),
        validity: newPlanForm.validity,
        validityBadge: newPlanForm.validityBadge || newPlanForm.validity.toUpperCase(),
        durationLabel: newPlanForm.durationLabel || `(${newPlanForm.validity.toLowerCase()})`,
        image: newPlanForm.image,
        tagline: newPlanForm.tagline,
        benefits: newPlanForm.benefits.length > 0 ? newPlanForm.benefits : ['Exclusive tailored beauty treatment privileges']
      };

      const res = await apiRequest('/memberships/plans', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res && res.success) {
        setShowAddPlanModal(false);
        setNewPlanForm({
          name: '',
          fullName: '',
          tier: '',
          tierNumber: '',
          price: '',
          validity: 'Valid for 1 year',
          validityBadge: 'VALID FOR 1 YEAR',
          durationLabel: '(per year)',
          image: '/memberships/card_infini_3d.jpg',
          tagline: 'Exclusive personalized aesthetic luxury membership.',
          benefitInput: '',
          benefits: [
            'Complimentary skin consultation + AI analysis',
            'Priority booking on peak hours',
            'Special member discount on all treatments'
          ]
        });
        await fetchMemberships();
      } else {
        alert(res?.error || 'Failed to save membership tier');
      }
    } catch (err) {
      console.error('Create plan error:', err);
      alert('Error creating plan: ' + err.message);
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async (planId, planName) => {
    if (!window.confirm(`Are you sure you want to delete the "${planName}" membership plan?`)) {
      return;
    }
    try {
      const res = await apiRequest(`/memberships/plans/${planId}`, {
        method: 'DELETE'
      });
      if (res && res.success) {
        await fetchMemberships();
      } else {
        alert(res?.error || 'Failed to delete plan');
      }
    } catch (err) {
      console.error('Delete plan error:', err);
      alert('Error deleting plan: ' + err.message);
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

          {canManagePlans && (
            <button
              type="button"
              onClick={() => setShowAddPlanModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '9px 18px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #B88B4A 0%, #8E633A 100%)',
                color: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(184, 139, 74, 0.28)',
                letterSpacing: '0.02em',
                transition: 'all 0.15s ease'
              }}
            >
              <Plus size={16} />
              Add Membership Plan
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenEnrollModal}
            className="btn-primary"
            style={{ padding: '9px 18px', fontSize: '13.5px', display: 'inline-flex', alignItems: 'center', gap: '7px' }}
          >
            <UserPlus size={16} />
            Enroll Client into Membership
          </button>
        </div>
      </div>

      {/* SECTION 1: WORLD OF PRIVILEGES SHOWCASE (MATCHING IMAGE 2) */}
      <div>
        <div style={{ textAlign: 'center', marginBottom: '22px', position: 'relative' }}>
          <h2 style={{
            fontSize: 'clamp(22px, 2.2vw, 26px)',
            color: '#1C1917',
            fontWeight: '800',
            letterSpacing: '0.04em',
            margin: 0,
            textTransform: 'uppercase'
          }}>
            WORLD OF PRIVILEGES
          </h2>
          {tierFilter !== 'all' && (
            <div style={{ marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setTierFilter('all')}
                style={{
                  fontSize: '11.5px',
                  padding: '4px 14px',
                  borderRadius: '9999px',
                  border: '1px solid #DAC493',
                  background: '#FAF6EE',
                  color: '#8C6228',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 6px rgba(184, 139, 74, 0.1)'
                }}
              >
                Clear Filter ({tierFilter}) ×
              </button>
            </div>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '18px'
        }}>
          {plans.map(p => {
            const memberCount = stats.tier_counts?.[p.tier] || stats.tier_counts?.[p.name] || 0;
            const isSelected = tierFilter === p.tier;
            const cardImg = p.image || `/memberships/card_${p.id}_3d.jpg`;

            return (
              <div
                key={p.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '18px',
                  border: isSelected ? '2px solid #B88B4A' : '1.5px solid #EADBCC',
                  boxShadow: isSelected
                    ? '0 10px 28px rgba(184, 139, 74, 0.22)'
                    : '0 3px 14px rgba(184, 139, 74, 0.05)',
                  transform: isSelected ? 'translateY(-3px)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  transition: 'all 0.22s ease',
                  position: 'relative'
                }}
              >
                {/* 3D Realistic Metallic Card Showcase Image (Matching Image 2) */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '4 / 3',
                  overflow: 'hidden',
                  background: '#FAF6EE'
                }}>
                  <img
                    src={cardImg}
                    alt={p.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                  {/* Top-Right Member Count Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(4px)',
                    color: '#8C6228',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: '800',
                    border: '1px solid #DAC493',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    zIndex: 2
                  }}>
                    <Users size={12} />
                    {memberCount} {memberCount === 1 ? 'member' : 'members'}
                  </div>
                  {/* Selected Filter indicator */}
                  {isSelected && (
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      background: '#B88B4A',
                      color: '#FFFFFF',
                      padding: '3px 9px',
                      borderRadius: '9999px',
                      fontSize: '10px',
                      fontWeight: '800',
                      letterSpacing: '0.04em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                      zIndex: 2
                    }}>
                      <Check size={11} strokeWidth={2.5} />
                      FILTER APPLIED
                    </div>
                  )}
                </div>

                {/* Card Body (Matching Image 2) */}
                <div style={{
                  padding: '16px 16px 14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  boxSizing: 'border-box'
                }}>
                  {/* Category / Tier Name */}
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    letterSpacing: '0.06em',
                    color: '#292524',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    marginBottom: '4px'
                  }}>
                    {p.fullName || p.name}
                  </div>

                  {/* Price */}
                  <div style={{
                    fontSize: 'clamp(20px, 1.8vw, 24px)',
                    fontWeight: '800',
                    color: '#B88B4A',
                    textAlign: 'center',
                    lineHeight: 1.15
                  }}>
                    {p.priceFormatted || formatCurrency(p.price)}
                  </div>

                  {/* Duration Subtitle (e.g. per year, per 3 months) */}
                  <div style={{
                    fontSize: '9.5px',
                    color: '#8C827A',
                    textAlign: 'center',
                    marginBottom: '8px'
                  }}>
                    {p.durationLabel || `(${p.validity})`}
                  </div>

                  {/* Validity Pill Badge */}
                  <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                    <span style={{
                      display: 'inline-block',
                      background: '#F9F3EA',
                      border: '1px solid #E6D7C3',
                      borderRadius: '9999px',
                      padding: '3px 12px',
                      fontSize: '9.5px',
                      fontWeight: '700',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: '#9C6839'
                    }}>
                      {p.validityBadge || (p.validity ? p.validity.toUpperCase() : 'VALID FOR 1 YEAR')}
                    </span>
                  </div>

                  {/* Benefits Header */}
                  <div style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    color: '#B88B4A',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '6px'
                  }}>
                    BENEFITS :
                  </div>

                  {/* Benefits Bullet List with Red Dots (Matching Image 2) */}
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '0 0 16px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    flex: 1
                  }}>
                    {(p.benefits || []).map((b, idx) => (
                      <li key={idx} style={{
                        fontSize: '10.5px',
                        color: '#44403C',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '6px',
                        lineHeight: 1.32
                      }}>
                        <span style={{ color: '#E11D48', fontWeight: 'bold', fontSize: '13px', lineHeight: 1 }}>•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Direct Action Buttons (Matching Image 2) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                    <button
                      type="button"
                      onClick={() => setTierFilter(isSelected ? 'all' : p.tier)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: isSelected ? '1.5px solid #B88B4A' : '1px solid #DAC493',
                        background: isSelected ? 'linear-gradient(135deg, #B88B4A 0%, #9F7335 100%)' : '#FAF6EE',
                        color: isSelected ? '#FFFFFF' : '#8E633A',
                        fontSize: '11px',
                        fontWeight: '800',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 3px 10px rgba(184, 139, 74, 0.25)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #B88B4A 0%, #9F7335 100%)';
                          e.currentTarget.style.color = '#FFFFFF';
                          e.currentTarget.style.borderColor = '#B88B4A';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = '#FAF6EE';
                          e.currentTarget.style.color = '#8E633A';
                          e.currentTarget.style.borderColor = '#DAC493';
                        }
                      }}
                    >
                      {isSelected ? (
                        <>
                          <Check size={13} strokeWidth={2.5} />
                          SELECTED
                        </>
                      ) : (
                        "I'M INTERESTED"
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTierFilter(isSelected ? 'all' : p.tier)}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        color: isSelected ? '#8C6228' : '#78716C',
                        fontWeight: '700',
                        cursor: 'pointer',
                        padding: '4px',
                        userSelect: 'none'
                      }}
                    >
                      <span>{isSelected ? '✓ Filter Active on Roster' : `Filter Roster (${memberCount})`}</span>
                      <ChevronRight size={13} />
                    </button>

                    {/* Delete Custom Tier (Master Admin & Main Admin only) */}
                    {p.is_custom === 1 && canManagePlans && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePlan(p.id, p.name);
                        }}
                        style={{
                          background: '#FEF2F2',
                          border: '1px solid #FECACA',
                          borderRadius: '6px',
                          color: '#DC2626',
                          fontSize: '10.5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          padding: '5px 8px',
                          marginTop: '2px',
                          fontWeight: '700',
                          transition: 'all 0.15s ease'
                        }}
                        title="Delete custom membership plan"
                      >
                        <Trash2 size={12} />
                        Delete Custom Plan
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add New Membership Card Tile for Master or Main Admin */}
          {canManagePlans && (
            <div
              onClick={() => setShowAddPlanModal(true)}
              style={{
                background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF6EE 100%)',
                borderRadius: '18px',
                border: '2px dashed #DAC493',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '36px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                minHeight: '440px',
                transition: 'all 0.22s ease',
                boxShadow: '0 3px 14px rgba(184, 139, 74, 0.05)',
                userSelect: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#B88B4A';
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 10px 28px rgba(184, 139, 74, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#DAC493';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 3px 14px rgba(184, 139, 74, 0.05)';
              }}
            >
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#FAF6EE',
                border: '1.5px solid #DAC493',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#B88B4A',
                marginBottom: '16px'
              }}>
                <Plus size={30} strokeWidth={2.2} />
              </div>

              <div style={{
                fontSize: '13px',
                fontWeight: '800',
                letterSpacing: '0.06em',
                color: '#292524',
                textTransform: 'uppercase',
                marginBottom: '6px'
              }}>
                ADD NEW MEMBERSHIP
              </div>

              <p style={{
                fontSize: '11px',
                color: '#78716C',
                lineHeight: 1.45,
                maxWidth: '200px',
                margin: '0 0 18px 0'
              }}>
                Create a custom tier with bespoke privileges, pricing, and 3D metallic card finish.
              </p>

              <span style={{
                display: 'inline-block',
                background: '#FAF6EE',
                border: '1px solid #DAC493',
                borderRadius: '9999px',
                padding: '5px 14px',
                fontSize: '10px',
                fontWeight: '800',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#8E633A'
              }}>
                + Create Tier
              </span>
            </div>
          )}
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
                          background: '#FAF8F5',
                          color: '#8C6228',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '16px',
                          border: '1px solid #EADBBE'
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
                        fontWeight: '600',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: '#FAF8F5',
                        color: m.is_expired ? '#78716C' : '#57534E',
                        border: '1px solid #EADBBE'
                      }}>
                        {m.effective_status}
                      </span>
                    </div>

                    {/* Tier Badge & Validity Pill */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
                      <span style={{
                        fontSize: '11.5px',
                        fontWeight: '700',
                        padding: '3px 9px',
                        borderRadius: '6px',
                        background: '#FAF8F5',
                        color: '#8C6228',
                        border: '1px solid #EADBBE',
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
                          color: '#57534E',
                          background: '#FAF8F5',
                          border: '1px solid #EADBBE',
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>
                          <Clock size={11} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} />
                          {m.is_expired ? 'Expired' : `${m.days_remaining} days left`}
                        </span>
                      )}
                    </div>

                    {/* Credit Balance Progress Bar (Clean inline layout, single color) */}
                    <div style={{
                      marginTop: '12px',
                      padding: '10px 0',
                      borderTop: '1px solid #F0ECE4',
                      borderBottom: '1px solid #F0ECE4'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '6px' }}>
                        <span style={{ color: '#78716C', fontWeight: '600' }}>Available Balance:</span>
                        <span style={{ fontWeight: '800', color: '#1C1917', fontSize: '13px' }}>
                          {formatCurrency(m.balance)}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ width: '100%', height: '5px', background: '#F0ECE4', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(100, Math.max(0, 100 - usedPct))}%`,
                          height: '100%',
                          background: '#8C6228',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#1C1917' }}>
                    1. Select Studio Client *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickAddClient(!showQuickAddClient)}
                    style={{
                      fontSize: '11.5px',
                      color: '#8C6228',
                      background: '#FAF6EE',
                      border: '1px solid #DAC493',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <UserPlus size={12} />
                    {showQuickAddClient ? 'Search Existing' : '+ Quick Add New Client'}
                  </button>
                </div>

                {showQuickAddClient ? (
                  <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#FAF6EE',
                    border: '1px solid #DAC493',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#8C6228' }}>
                      Register New Client
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <input
                        type="text"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="Client Full Name *"
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #D6D3D1',
                          fontSize: '13px',
                          background: '#FFFFFF'
                        }}
                      />
                      <input
                        type="text"
                        value={newClientPhone}
                        onChange={(e) => setNewClientPhone(e.target.value)}
                        placeholder="Phone Number"
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid #D6D3D1',
                          fontSize: '13px',
                          background: '#FFFFFF'
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={creatingClient}
                      onClick={handleQuickCreateClient}
                      style={{
                        alignSelf: 'flex-start',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#B88B4A',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {creatingClient ? 'Registering...' : 'Register & Select Client'}
                    </button>
                  </div>
                ) : (
                  <>
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
                  </>
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
                    const cardImg = p.image || `/memberships/card_${p.id}_3d.jpg`;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPlanForEnroll(p)}
                        style={{
                          padding: '10px',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #B88B4A' : '1px solid #E7E5E4',
                          background: isSelected ? '#FAF6EE' : '#FFFFFF',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <img
                          src={cardImg}
                          alt={p.name}
                          style={{
                            width: '46px',
                            height: '34px',
                            borderRadius: '6px',
                            objectFit: 'cover',
                            border: '1px solid #EADBCC'
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '800', fontSize: '12.5px', color: isSelected ? '#8C6228' : '#1C1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.tier || p.name}
                            </span>
                            <span style={{ fontWeight: '800', fontSize: '12.5px', color: '#B88B4A', marginLeft: '4px' }}>
                              {formatCurrency(p.price)}
                            </span>
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#78716C', marginTop: '1px' }}>
                            {p.validity}
                          </div>
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

      {/* CREATE NEW MEMBERSHIP TIER MODAL (MASTER ADMIN & MAIN ADMIN ONLY) */}
      {showAddPlanModal && canManagePlans && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
            border: '1px solid #EADBCC',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #F0E6D8',
              background: 'linear-gradient(135deg, #FAF6EE 0%, #FFFFFF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #B88B4A 0%, #D4AF37 50%, #8E633A 100%)'
              }} />
              <div>
                <div style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#B88B4A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Crown size={14} color="#B88B4A" />
                  Admin Privilege • Custom Tier Builder
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1C1917', margin: '4px 0 0 0' }}>
                  Create New Membership Plan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPlanModal(false)}
                style={{
                  background: '#F5EFE6',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#78716C',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleCreatePlan} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#44403C', marginBottom: '6px' }}>
                    Tier Name <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Celestial, Diamond, Solstice"
                    value={newPlanForm.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewPlanForm(prev => ({
                        ...prev,
                        name: val,
                        fullName: prev.fullName === '' || prev.fullName === `${prev.name.toUpperCase()} MEMBERSHIP`
                          ? (val ? `${val.toUpperCase()} MEMBERSHIP` : '')
                          : prev.fullName,
                        tier: val
                      }));
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #D6D3D1',
                      fontSize: '13.5px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#44403C', marginBottom: '6px' }}>
                    Full Plan Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CELESTIAL ELITE MEMBERSHIP"
                    value={newPlanForm.fullName}
                    onChange={(e) => setNewPlanForm({ ...newPlanForm, fullName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #D6D3D1',
                      fontSize: '13.5px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#44403C', marginBottom: '6px' }}>
                    Price / Fee (₹) <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#78716C', fontWeight: '700' }}>₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="e.g. 75000"
                      value={newPlanForm.price}
                      onChange={(e) => setNewPlanForm({ ...newPlanForm, price: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 28px',
                        borderRadius: '8px',
                        border: '1px solid #D6D3D1',
                        fontSize: '13.5px',
                        fontWeight: '700',
                        boxSizing: 'border-box',
                        color: '#B88B4A'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#44403C', marginBottom: '6px' }}>
                    Tier Sequence / Tag
                  </label>
                  <input
                    type="text"
                    placeholder={`0${plans.length + 1} — SERVICE`}
                    value={newPlanForm.tierNumber}
                    onChange={(e) => setNewPlanForm({ ...newPlanForm, tierNumber: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #D6D3D1',
                      fontSize: '13.5px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#44403C', marginBottom: '6px' }}>
                    Validity Period
                  </label>
                  <select
                    value={newPlanForm.validity}
                    onChange={(e) => {
                      const val = e.target.value;
                      let dur = '(per year)';
                      if (val.includes('3 months')) dur = '(per 3 months)';
                      else if (val.includes('6 months')) dur = '(per 6 months)';
                      else if (val.includes('2 years')) dur = '(per 2 years)';
                      setNewPlanForm({
                        ...newPlanForm,
                        validity: val,
                        validityBadge: val.toUpperCase(),
                        durationLabel: dur
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #D6D3D1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      background: '#FFFFFF'
                    }}
                  >
                    <option value="Valid for 1 year">Valid for 1 year</option>
                    <option value="Valid for 6 months">Valid for 6 months</option>
                    <option value="Valid for 3 months">Valid for 3 months</option>
                    <option value="Valid for 2 years">Valid for 2 years</option>
                  </select>
                </div>
              </div>

              {/* 3D Metallic Card Image Finish Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#44403C', marginBottom: '8px' }}>
                  Choose 3D Metallic Card Artwork
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '10px',
                  marginBottom: '10px'
                }}>
                  {[
                    { label: 'Royal Gold', path: '/memberships/card_infini_3d.jpg' },
                    { label: 'Black Onyx', path: '/memberships/card_lumiere_3d.jpg' },
                    { label: 'Platinum Silver', path: '/memberships/card_eclat_3d.jpg' },
                    { label: 'Rose Champagne', path: '/memberships/card_eternal_3d.jpg' }
                  ].map(c => {
                    const isCardSelected = newPlanForm.image === c.path;
                    return (
                      <div
                        key={c.path}
                        onClick={() => setNewPlanForm({ ...newPlanForm, image: c.path })}
                        style={{
                          borderRadius: '10px',
                          border: isCardSelected ? '2px solid #B88B4A' : '1px solid #E5E7EB',
                          padding: '6px',
                          cursor: 'pointer',
                          background: isCardSelected ? '#FAF6EE' : '#FFFFFF',
                          transition: 'all 0.15s ease',
                          textAlign: 'center',
                          boxShadow: isCardSelected ? '0 4px 12px rgba(184, 139, 74, 0.2)' : 'none'
                        }}
                      >
                        <div style={{ width: '100%', height: '65px', borderRadius: '6px', overflow: 'hidden', marginBottom: '6px' }}>
                          <img src={c.path} alt={c.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: isCardSelected ? '800' : '600', color: isCardSelected ? '#8E633A' : '#57534E' }}>
                          {isCardSelected ? `✓ ${c.label}` : c.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Or enter custom image URL: https://..."
                  value={newPlanForm.image}
                  onChange={(e) => setNewPlanForm({ ...newPlanForm, image: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    fontSize: '11.5px',
                    color: '#78716C',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Tagline */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#44403C', marginBottom: '6px' }}>
                  Tagline / Overview
                </label>
                <input
                  type="text"
                  placeholder="e.g. Unmatched aesthetic brilliance and personalized luxury."
                  value={newPlanForm.tagline}
                  onChange={(e) => setNewPlanForm({ ...newPlanForm, tagline: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #D6D3D1',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Privileges & Benefits List */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#44403C', marginBottom: '6px' }}>
                  Privileges & Benefits ({newPlanForm.benefits.length})
                </label>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  border: '1px solid #E7E5E4',
                  borderRadius: '8px',
                  padding: '10px',
                  background: '#FAFAF9',
                  marginBottom: '10px'
                }}>
                  {newPlanForm.benefits.map((b, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      background: '#FFFFFF',
                      padding: '7px 12px',
                      borderRadius: '6px',
                      border: '1px solid #E7E5E4',
                      fontSize: '12px',
                      color: '#292524'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <span style={{ color: '#E11D48', fontWeight: 'bold' }}>•</span>
                        <span>{b}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBenefit(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#DC2626',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex'
                        }}
                        title="Remove benefit"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {newPlanForm.benefits.length === 0 && (
                    <div style={{ fontSize: '12px', color: '#A8A29E', textAlign: 'center', padding: '10px' }}>
                      No benefits added yet. Add at least one privilege below.
                    </div>
                  )}
                </div>

                {/* Add Benefit Input */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Type benefit item (e.g. Free 1x medi-facial quarterly)..."
                    value={newPlanForm.benefitInput}
                    onChange={(e) => setNewPlanForm({ ...newPlanForm, benefitInput: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddBenefit();
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #D6D3D1',
                      fontSize: '12.5px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddBenefit}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '8px',
                      border: '1px solid #DAC493',
                      background: '#FAF6EE',
                      color: '#8E633A',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '12px',
                paddingTop: '16px',
                borderTop: '1px solid #F0E6D8'
              }}>
                <button
                  type="button"
                  onClick={() => setShowAddPlanModal(false)}
                  className="btn-secondary"
                  style={{ padding: '10px 18px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #B88B4A 0%, #8E633A 100%)',
                    color: '#FFFFFF',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    cursor: savingPlan ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(184, 139, 74, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Crown size={15} />
                  {savingPlan ? 'Publishing Plan...' : 'Publish Membership Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

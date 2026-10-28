import React, { useState, useEffect, useRef } from 'react';
import {
  Crown, Sparkles, Users, Search, Filter, Plus, Calendar, Clock,
  ArrowRight, ShieldCheck, CheckCircle2, AlertCircle,
  ChevronRight, Edit2, ExternalLink, X, DollarSign, Wallet,
  CreditCard, Gift, Star, Check, UserPlus, Trash2, Layers, Image as ImageIcon,
  Upload
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

  const [selectedTier, setSelectedTier] = useState(null);

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

  // Delete Confirmation Modal State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    open: false,
    planId: null,
    planName: '',
    deleting: false
  });

  // Program Title State
  const [programTitle, setProgramTitle] = useState('WORLD OF PRIVILEGES');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('WORLD OF PRIVILEGES');
  const [savingTitle, setSavingTitle] = useState(false);

  // Edit Membership Plan Modal (Master Admin & Main Admin only)
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [savingEditPlan, setSavingEditPlan] = useState(false);
  const [editCardImageUploading, setEditCardImageUploading] = useState(false);
  const editCardImageInputRef = useRef(null);
  const [editPlanForm, setEditPlanForm] = useState({
    name: '',
    fullName: '',
    tier: '',
    tierNumber: '',
    price: '',
    validity: 'Valid for 1 year',
    validityBadge: 'VALID FOR 1 YEAR',
    durationLabel: '(per year)',
    discountPercent: 0,
    image: '/memberships/card_infini_3d.jpg',
    tagline: 'Exclusive personalized aesthetic luxury membership.',
    benefitInput: '',
    benefits: []
  });

  // Add Membership Plan Modal (Master Admin & Main Admin only)
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [isInlineAddingPlan, setIsInlineAddingPlan] = useState(false);
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
    discountPercent: 0,
    image: '/memberships/card_infini_3d.jpg',
    tagline: 'Exclusive personalized aesthetic luxury membership.',
    benefitInput: '',
    benefits: [
      'Complimentary skin consultation + AI analysis',
      'Priority booking on peak hours',
      'Special member discount on all treatments'
    ]
  });

  // Card Image File Upload State & Ref
  const [cardImageUploading, setCardImageUploading] = useState(false);
  const cardImageInputRef = useRef(null);
  const fetchMemberships = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/memberships');
      if (res.plans) {
        setPlans(res.plans);
      }
      if (res.program_title) {
        setProgramTitle(res.program_title);
        setTempTitle(res.program_title);
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

  const handleCardImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, JPEG, WEBP)');
      return;
    }

    try {
      setCardImageUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiRequest('/admin/upload', {
        method: 'POST',
        body: formData
      });
      if (res && res.url) {
        setNewPlanForm(prev => ({
          ...prev,
          image: res.url
        }));
      }
    } catch (err) {
      console.error('Card image upload error:', err);
      alert('Image upload failed: ' + (err.message || 'Please check file format or size'));
    } finally {
      setCardImageUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const notifyMembershipChanged = () => {
    try {
      window.dispatchEvent(new CustomEvent('membership_plans_updated'));
      const bc = new BroadcastChannel('membership_sync');
      bc.postMessage({ type: 'MEMBERSHIP_UPDATED', timestamp: Date.now() });
      bc.close();
    } catch (e) {}
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
        benefits: newPlanForm.benefits.map(benefit => benefit.trim()).filter(Boolean).length > 0
          ? newPlanForm.benefits.map(benefit => benefit.trim()).filter(Boolean)
          : ['Exclusive tailored beauty treatment privileges'],
        discount_percent: Number(newPlanForm.discountPercent) || 0
      };

      const res = await apiRequest('/memberships/plans', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res && res.success) {
        setShowAddPlanModal(false);
        setIsInlineAddingPlan(false);
        setNewPlanForm({
          name: '',
          fullName: '',
          tier: '',
          tierNumber: '',
          price: '',
          validity: 'Valid for 1 year',
          validityBadge: 'VALID FOR 1 YEAR',
          durationLabel: '(per year)',
          discountPercent: 0,
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
        notifyMembershipChanged();
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

  const handleStartInlineAddPlan = () => {
    setNewPlanForm({
      name: '',
      fullName: '',
      tier: '',
      tierNumber: `0${plans.length + 1} — SERVICE`,
      price: '',
      validity: 'Valid for 1 year',
      validityBadge: 'VALID FOR 1 YEAR',
      durationLabel: '(per year)',
      discountPercent: 0,
      image: '',
      tagline: '',
      benefitInput: '',
      benefits: ['', '', '']
    });
    setIsInlineAddingPlan(true);
  };

  const currentValidityMatch = (newPlanForm.validity || '').match(/(\d+)\s+(days?|months?|years?)/i);
  const currentValidityValue = currentValidityMatch ? currentValidityMatch[1] : '1';
  const currentValidityUnit = currentValidityMatch ? currentValidityMatch[2].replace(/s$/i, '').toLowerCase() : 'year';
  const updateNewPlanValidity = (value, unit) => {
    const safeValue = Math.max(1, Number(value) || 1);
    const pluralUnit = safeValue === 1 ? unit : `${unit}s`;
    const validity = `Valid for ${safeValue} ${pluralUnit}`;
    const durationLabel = `(per ${safeValue} ${pluralUnit})`;
    setNewPlanForm(prev => ({ ...prev, validity, validityBadge: validity.toUpperCase(), durationLabel }));
  };

  const handleSaveTitle = async () => {
    if (!tempTitle || !tempTitle.trim()) return;
    try {
      setSavingTitle(true);
      const res = await apiRequest('/memberships/title', {
        method: 'PUT',
        body: JSON.stringify({ title: tempTitle.trim() })
      });
      if (res && res.success) {
        setProgramTitle(res.program_title);
        setTempTitle(res.program_title);
        setIsEditingTitle(false);
        notifyMembershipChanged();
      } else {
        alert(res?.error || 'Failed to update title');
      }
    } catch (err) {
      console.error('Save title error:', err);
      alert('Failed to update title: ' + err.message);
    } finally {
      setSavingTitle(false);
    }
  };

  const handleOpenEditPlan = (p) => {
    setEditingPlan(p);
    setEditPlanForm({
      name: p.name || '',
      fullName: p.fullName || (p.name ? `${p.name.toUpperCase()} MEMBERSHIP` : ''),
      tier: p.tier || p.name || '',
      tierNumber: p.tierNumber || '',
      price: p.price !== undefined ? p.price : '',
      validity: p.validity || 'Valid for 1 year',
      validityBadge: p.validityBadge || (p.validity ? p.validity.toUpperCase() : 'VALID FOR 1 YEAR'),
      durationLabel: p.durationLabel || `(${p.validity || 'per year'})`,
      discountPercent: p.discount_percent ?? 0,
      image: p.image || '/memberships/card_infini_3d.jpg',
      tagline: p.tagline || 'Exclusive personalized aesthetic luxury membership.',
      benefitInput: '',
      benefits: Array.isArray(p.benefits) ? [...p.benefits] : []
    });
    setShowEditPlanModal(true);
  };

  const handleAddEditBenefit = () => {
    if (!editPlanForm.benefitInput.trim()) return;
    setEditPlanForm(prev => ({
      ...prev,
      benefits: [...prev.benefits, prev.benefitInput.trim()],
      benefitInput: ''
    }));
  };

  const handleRemoveEditBenefit = (idx) => {
    setEditPlanForm(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== idx)
    }));
  };

  const handleEditCardImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, JPEG, WEBP)');
      return;
    }

    try {
      setEditCardImageUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiRequest('/admin/upload', {
        method: 'POST',
        body: formData
      });
      if (res && res.url) {
        setEditPlanForm(prev => ({
          ...prev,
          image: res.url
        }));
      }
    } catch (err) {
      console.error('Card image upload error:', err);
      alert('Image upload failed: ' + (err.message || 'Please check file format or size'));
    } finally {
      setEditCardImageUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSaveEditPlan = async (e) => {
    e.preventDefault();
    if (!editingPlan) return;
    if (!editPlanForm.name.trim() || !editPlanForm.price) {
      alert('Please enter a tier name and price.');
      return;
    }
    try {
      setSavingEditPlan(true);
      const tierVal = editPlanForm.tier.trim() || editPlanForm.name.trim();
      const payload = {
        name: editPlanForm.name.trim(),
        fullName: editPlanForm.fullName.trim() || `${editPlanForm.name.trim().toUpperCase()} MEMBERSHIP`,
        tier: tierVal,
        tierNumber: editPlanForm.tierNumber.trim() || editingPlan.tierNumber || '01 — SERVICE',
        price: Number(editPlanForm.price),
        credits: Number(editPlanForm.price),
        validity: editPlanForm.validity,
        validityBadge: editPlanForm.validityBadge || editPlanForm.validity.toUpperCase(),
        durationLabel: editPlanForm.durationLabel || `(${editPlanForm.validity.toLowerCase()})`,
        image: editPlanForm.image,
        tagline: editPlanForm.tagline,
        benefits: editPlanForm.benefits.length > 0 ? editPlanForm.benefits : ['Exclusive tailored beauty treatment privileges'],
        discount_percent: Number(editPlanForm.discountPercent) || 0
      };

      const res = await apiRequest(`/memberships/plans/${editingPlan.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (res && res.success) {
        setShowEditPlanModal(false);
        setEditingPlan(null);
        await fetchMemberships();
        notifyMembershipChanged();
      } else {
        alert(res?.error || 'Failed to update membership plan');
      }
    } catch (err) {
      console.error('Update plan error:', err);
      alert('Error updating plan: ' + err.message);
    } finally {
      setSavingEditPlan(false);
    }
  };

  const handleOpenDeleteConfirm = (planId, planName) => {
    setDeleteConfirmModal({
      open: true,
      planId,
      planName,
      deleting: false
    });
  };

  const handleConfirmDeletePlan = async () => {
    if (!deleteConfirmModal.planId) return;
    try {
      setDeleteConfirmModal(prev => ({ ...prev, deleting: true }));
      const res = await apiRequest(`/memberships/plans/${deleteConfirmModal.planId}`, {
        method: 'DELETE'
      });
      if (res && res.success) {
        setDeleteConfirmModal({ open: false, planId: null, planName: '', deleting: false });
        await fetchMemberships();
        notifyMembershipChanged();
      } else {
        alert(res?.error || 'Failed to delete plan');
        setDeleteConfirmModal(prev => ({ ...prev, deleting: false }));
      }
    } catch (err) {
      console.error('Delete plan error:', err);
      alert('Error deleting plan: ' + err.message);
      setDeleteConfirmModal(prev => ({ ...prev, deleting: false }));
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', color: '#1C1917', margin: 0, fontWeight: '700', paddingLeft: '20px' }}>
            Membership Tiers & Privileges
          </h1>
        </div>

      </div>

      {/* SECTION 1: WORLD OF PRIVILEGES SHOWCASE (MATCHING IMAGE 2) */}
      <div>
        <div style={{ textAlign: 'center', marginBottom: '22px', position: 'relative' }}>
          {isEditingTitle ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                style={{
                  fontSize: 'clamp(18px, 2vw, 24px)',
                  fontWeight: '800',
                  color: '#1C1917',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '2px solid #B88B4A',
                  outline: 'none',
                  background: '#FFFFFF',
                  textAlign: 'center',
                  minWidth: '280px',
                  maxWidth: '100%'
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setIsEditingTitle(false);
                    setTempTitle(programTitle);
                  }
                }}
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                disabled={savingTitle}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #B88B4A 0%, #9F7335 100%)',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '12px',
                  border: 'none',
                  cursor: savingTitle ? 'wait' : 'pointer'
                }}
              >
                {savingTitle ? 'Saving...' : 'Save Title'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingTitle(false);
                  setTempTitle(programTitle);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: '#F5F5F4',
                  color: '#57534E',
                  fontWeight: '600',
                  fontSize: '12px',
                  border: '1px solid #D6D3D1',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <h2 style={{
                fontSize: 'clamp(22px, 2.2vw, 26px)',
                color: '#1C1917',
                fontWeight: '800',
                letterSpacing: '0.04em',
                margin: 0,
                textTransform: 'uppercase'
              }}>
                {programTitle}
              </h2>
              {canManagePlans && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingTitle(true);
                    setTempTitle(programTitle);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: '#FAF6EE',
                    border: '1px solid #DAC493',
                    color: '#8C6228',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Click to edit program title"
                >
                  <Edit2 size={12} />
                  <span>Edit Title</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '18px'
        }}>
          {plans.map(p => {
            const isSelected = selectedTier === p.tier;
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

                  {Number(p.discount_percent) > 0 && (
                    <div style={{ textAlign: 'center', margin: '-4px 0 10px' }}>
                      <span style={{ display: 'inline-block', borderRadius: '9999px', padding: '3px 9px', background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', fontSize: '9px', fontWeight: '800' }}>
                        {Number(p.discount_percent)}% SERVICE DISCOUNT
                      </span>
                    </div>
                  )}

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
                      onClick={() => setSelectedTier(isSelected ? null : p.tier)}
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

                    {/* Plan Management Actions (Master Admin & Main Admin only) */}
                    {canManagePlans && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditPlan(p);
                          }}
                          style={{
                            flex: 1,
                            padding: '7px 10px',
                            borderRadius: '7px',
                            background: '#FAF6EE',
                            border: '1px solid #DAC493',
                            color: '#8C6228',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Edit2 size={12} />
                          Edit Plan
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeleteConfirm(p.id, p.name || p.fullName);
                          }}
                          style={{
                            padding: '7px 12px',
                            borderRadius: '7px',
                            background: '#FEF2F2',
                            border: '1px solid #FECACA',
                            color: '#DC2626',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          title="Delete membership plan"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add New Membership Card Tile for Master or Main Admin */}
          {canManagePlans && (
            <div
              role={isInlineAddingPlan ? undefined : 'button'}
              tabIndex={isInlineAddingPlan ? -1 : 0}
              aria-label="Add a membership plan"
              onClick={isInlineAddingPlan ? undefined : handleStartInlineAddPlan}
              onKeyDown={(e) => {
                if (!isInlineAddingPlan && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleStartInlineAddPlan();
                }
              }}
              style={{
                background: '#FFFFFF',
                gridColumn: '1',
                gridRow: '1',
                borderRadius: '18px',
                border: '1px solid #E8DCCB',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                cursor: isInlineAddingPlan ? 'default' : 'pointer',
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
                e.currentTarget.style.borderColor = '#E8DCCB';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 3px 14px rgba(184, 139, 74, 0.05)';
              }}
            >
              {isInlineAddingPlan ? (
                <form onSubmit={handleCreatePlan} style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '9px', height: '100%' }}>
                  <input
                    type="file"
                    ref={cardImageInputRef}
                    onChange={handleCardImageUpload}
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => cardImageInputRef.current?.click()}
                    style={{
                      height: '150px',
                      flexShrink: 0,
                      borderRadius: '12px',
                      border: '1px dashed #D8BC8F',
                      background: newPlanForm.image ? '#F8F5EF' : 'linear-gradient(135deg, #FBF8F3 0%, #F3EBDD 100%)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '7px',
                      color: '#9E7437',
                      cursor: 'pointer'
                    }}
                  >
                    {newPlanForm.image ? (
                      <img src={newPlanForm.image} alt="Membership card artwork" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <>
                        <Plus size={22} />
                        <span style={{ fontSize: '10px', fontWeight: '800' }}>{cardImageUploading ? 'UPLOADING...' : 'ADD CARD IMAGE'}</span>
                      </>
                    )}
                  </button>

                  <input
                    aria-label="Membership name"
                    required
                    placeholder="Membership name"
                    value={newPlanForm.name}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewPlanForm(prev => ({ ...prev, name: value, fullName: value ? `${value.toUpperCase()} MEMBERSHIP` : '', tier: value }));
                    }}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 9px', border: '1px solid #E7D8C4', borderRadius: '7px', textAlign: 'center', fontWeight: '700', fontSize: '12px' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
                    <input
                      aria-label="Membership amount"
                      required
                      type="number"
                      min="1"
                      placeholder="Amount ₹"
                      value={newPlanForm.price}
                      onChange={(e) => setNewPlanForm(prev => ({ ...prev, price: e.target.value }))}
                      style={{ minWidth: 0, boxSizing: 'border-box', padding: '8px', border: '1px solid #E7D8C4', borderRadius: '7px', textAlign: 'center', fontWeight: '700', fontSize: '12px' }}
                    />
                    <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '4px', padding: '0 6px', border: '1px solid #E7D8C4', borderRadius: '7px', background: '#FFFFFF' }}>
                      <Calendar size={12} color="#9E7437" />
                      <input
                        aria-label="Membership duration"
                        type="number"
                        min="1"
                        value={currentValidityValue}
                        onChange={(e) => updateNewPlanValidity(e.target.value, currentValidityUnit)}
                        style={{ width: '34px', minWidth: 0, border: 0, outline: 'none', padding: '8px 0', fontSize: '10px' }}
                      />
                      <select
                        aria-label="Membership duration unit"
                        value={currentValidityUnit}
                        onChange={(e) => updateNewPlanValidity(currentValidityValue, e.target.value)}
                        style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', fontSize: '10px' }}
                      >
                        <option value="day">days</option>
                        <option value="month">months</option>
                        <option value="year">years</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label htmlFor="inline-membership-discount" style={{ flex: 1, color: '#57534E', fontSize: '10px', fontWeight: '700' }}>SERVICE DISCOUNT</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '82px', border: '1px solid #E7D8C4', borderRadius: '7px', padding: '0 7px', background: '#FFFFFF' }}>
                      <input
                        id="inline-membership-discount"
                        aria-label="Membership service discount percentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={newPlanForm.discountPercent}
                        onChange={(e) => setNewPlanForm(prev => ({ ...prev, discountPercent: e.target.value }))}
                        style={{ width: '100%', minWidth: 0, border: 0, outline: 'none', padding: '7px 0', fontSize: '11px', textAlign: 'right' }}
                      />
                      <span style={{ color: '#9E7437', fontSize: '11px', fontWeight: '800' }}>%</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#B88B4A', fontSize: '10px', fontWeight: '800', letterSpacing: '0.06em' }}>BENEFITS</span>
                    <button
                      type="button"
                      onClick={() => setNewPlanForm(prev => ({ ...prev, benefits: [...prev.benefits, ''] }))}
                      style={{ padding: '4px 7px', border: '1px solid #E7D8C4', borderRadius: '6px', background: '#FAF6EE', color: '#8E633A', fontSize: '9px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      + Add Benefit
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {newPlanForm.benefits.map((benefit, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ color: '#D4AF37', fontSize: '10px' }}>•</span>
                        <input
                          aria-label={`Membership benefit ${index + 1}`}
                          placeholder={`Add benefit ${index + 1}`}
                          value={benefit}
                          onChange={(e) => setNewPlanForm(prev => ({ ...prev, benefits: prev.benefits.map((item, itemIndex) => itemIndex === index ? e.target.value : item) }))}
                          style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '6px 7px', border: '1px solid #EFE7DC', borderRadius: '6px', fontSize: '10px' }}
                        />
                        {newPlanForm.benefits.length > 1 && (
                          <button type="button" aria-label={`Remove benefit ${index + 1}`} onClick={() => handleRemoveBenefit(index)} style={{ border: 0, background: 'transparent', color: '#A8A29E', cursor: 'pointer', fontSize: '14px', padding: '0 2px' }}>×</button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '7px', marginTop: 'auto' }}>
                    <button type="button" onClick={() => setIsInlineAddingPlan(false)} style={{ flex: 1, padding: '8px 5px', border: '1px solid #E7D8C4', borderRadius: '7px', background: '#FFFFFF', color: '#57534E', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" disabled={savingPlan} style={{ flex: 1.4, padding: '8px 5px', border: '1px solid #D8BC8F', borderRadius: '7px', background: '#FAF6EE', color: '#8E633A', fontSize: '10px', fontWeight: '800', cursor: savingPlan ? 'wait' : 'pointer' }}>{savingPlan ? 'SAVING...' : '+ ADD MEMBERSHIP'}</button>
                  </div>
                </form>
              ) : (
                <>
              <div style={{
                height: '210px',
                flexShrink: 0,
                margin: '10px 10px 0',
                borderRadius: '12px',
                border: '1px dashed #D8BC8F',
                background: 'linear-gradient(135deg, #FBF8F3 0%, #F3EBDD 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#9E7437'
              }}>
                <span style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  border: '1px solid #D8BC8F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Plus size={22} />
                </span>
                <span style={{ fontSize: '11px', fontWeight: '700' }}>ADD CARD IMAGE</span>
              </div>

              <div style={{ padding: '16px 17px 14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#A8A29E', letterSpacing: '0.04em' }}>MEMBERSHIP NAME</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#C49A5A', marginTop: '3px' }}>₹ —</div>
                  <div style={{ fontSize: '10px', color: '#A8A29E' }}>PRICE AND VALIDITY</div>
                </div>

                <div style={{ color: '#B88B4A', fontSize: '10px', fontWeight: '800', letterSpacing: '0.08em', marginBottom: '7px' }}>
                  BENEFITS
                </div>
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '7px' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#D4AF37', flexShrink: 0 }} />
                    <span style={{ fontSize: '10px', color: '#B8B1A8' }}>ADD BENEFIT {item + 1}</span>
                  </div>
                ))}

                <span style={{
                  marginTop: 'auto',
                  padding: '9px 10px',
                  borderRadius: '8px',
                  border: '1px solid #D8BC8F',
                  background: '#FAF6EE',
                  color: '#8E633A',
                  textAlign: 'center',
                  fontSize: '10px',
                  fontWeight: '800',
                  letterSpacing: '0.05em'
                }}>
                  + ADD MEMBERSHIP
                </span>
              </div>
                </>
              )}
            </div>
          )}
        </div>
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

              {/* 3D Metallic Card Image Finish Selector & Direct Image Uploader */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#44403C', margin: 0 }}>
                    Choose 3D Metallic Card Artwork or Upload Custom
                  </label>
                  <input
                    type="file"
                    ref={cardImageInputRef}
                    onChange={handleCardImageUpload}
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    style={{ display: 'none' }}
                  />
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))',
                  gap: '10px'
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

                  {/* 5th Tile: Custom Upload Tile with Real-time Preview */}
                  {(() => {
                    const presetPaths = [
                      '/memberships/card_infini_3d.jpg',
                      '/memberships/card_lumiere_3d.jpg',
                      '/memberships/card_eclat_3d.jpg',
                      '/memberships/card_eternal_3d.jpg'
                    ];
                    const hasCustomImage = Boolean(newPlanForm.image && !presetPaths.includes(newPlanForm.image));

                    return (
                      <div
                        onClick={() => {
                          if (!hasCustomImage) {
                            cardImageInputRef.current?.click();
                          }
                        }}
                        style={{
                          borderRadius: '10px',
                          border: hasCustomImage ? '2px solid #B88B4A' : '1.5px dashed #DAC493',
                          padding: '6px',
                          cursor: 'pointer',
                          background: hasCustomImage ? '#FAF6EE' : '#FFFDF9',
                          transition: 'all 0.15s ease',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: hasCustomImage ? '0 4px 12px rgba(184, 139, 74, 0.2)' : 'none'
                        }}
                      >
                        {hasCustomImage ? (
                          <>
                            <div style={{ width: '100%', height: '65px', borderRadius: '6px', overflow: 'hidden', marginBottom: '6px', position: 'relative' }}>
                              <img src={newPlanForm.image} alt="Custom Artwork" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#8E633A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                              <span>✓ Uploaded</span>
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cardImageInputRef.current?.click();
                                }}
                                style={{ textDecoration: 'underline', color: '#B88B4A', cursor: 'pointer', fontSize: '10px', marginLeft: '3px' }}
                                title="Change custom uploaded image"
                              >
                                Change
                              </span>
                            </div>
                          </>
                        ) : (
                          <div style={{ minHeight: '84px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <Upload size={18} color="#B88B4A" />
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#8E633A' }}>
                              {cardImageUploading ? 'Uploading...' : '+ Upload Custom'}
                            </span>
                            <span style={{ fontSize: '9.5px', color: '#78716C' }}>PNG, JPG, WEBP</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div style={{ maxWidth: '260px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#44403C', marginBottom: '6px' }}>
                  Service Discount (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={editPlanForm.discountPercent}
                  onChange={(e) => setEditPlanForm(prev => ({ ...prev, discountPercent: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D6D3D1', fontSize: '13px', boxSizing: 'border-box' }}
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

      {/* EDIT MEMBERSHIP PLAN MODAL (MASTER ADMIN & MAIN ADMIN ONLY) */}
      {showEditPlanModal && canManagePlans && (
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
          {/* Hidden File Input for Card Image */}
          <input
            type="file"
            ref={editCardImageInputRef}
            onChange={handleEditCardImageUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />

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
                  Admin Privilege • Edit Membership Tier
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1C1917', margin: '4px 0 0 0' }}>
                  Edit Plan: {editPlanForm.name || editingPlan?.name || 'Tier Plan'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditPlanModal(false)}
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
            <form onSubmit={handleSaveEditPlan} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#44403C', marginBottom: '6px' }}>
                    Tier Name <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ECLAT MEMBER, INFINI MEMBER"
                    value={editPlanForm.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditPlanForm(prev => ({
                        ...prev,
                        name: val,
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
                    placeholder="e.g. ECLAT PRIVILEGE MEMBERSHIP"
                    value={editPlanForm.fullName}
                    onChange={(e) => setEditPlanForm({ ...editPlanForm, fullName: e.target.value })}
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
                      placeholder="e.g. 25000"
                      value={editPlanForm.price}
                      onChange={(e) => setEditPlanForm({ ...editPlanForm, price: e.target.value })}
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
                    placeholder="01 — SERVICE"
                    value={editPlanForm.tierNumber}
                    onChange={(e) => setEditPlanForm({ ...editPlanForm, tierNumber: e.target.value })}
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
                    value={editPlanForm.validity}
                    onChange={(e) => {
                      const val = e.target.value;
                      let dur = '(per year)';
                      if (val.includes('3 months')) dur = '(per 3 months)';
                      else if (val.includes('6 months')) dur = '(per 6 months)';
                      else if (val.includes('2 years')) dur = '(per 2 years)';
                      setEditPlanForm({
                        ...editPlanForm,
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

              {/* 3D Metallic Card Image Finish Selector & Direct Image Uploader */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#44403C', margin: 0 }}>
                    Choose 3D Metallic Card Artwork or Upload Custom
                  </label>
                  <button
                    type="button"
                    onClick={() => editCardImageInputRef.current?.click()}
                    disabled={editCardImageUploading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #DAC493',
                      background: '#FAF6EE',
                      color: '#8E633A',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: editCardImageUploading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Upload size={12} />
                    {editCardImageUploading ? 'Uploading...' : 'Upload Image'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '10px' }}>
                  {[
                    { label: 'Gold (Infini)', img: '/memberships/card_infini_3d.jpg' },
                    { label: 'Platinum (Éclat)', img: '/memberships/card_eclat_3d.jpg' },
                    { label: 'Bronze (Eternal)', img: '/memberships/card_eternal_3d.jpg' },
                    { label: 'Obsidian (Lumière)', img: '/memberships/card_lumiere_3d.jpg' }
                  ].map((preset) => {
                    const isSelected = editPlanForm.image === preset.img;
                    return (
                      <div
                        key={preset.img}
                        onClick={() => setEditPlanForm({ ...editPlanForm, image: preset.img })}
                        style={{
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #B88B4A' : '1px solid #E7E5E4',
                          background: isSelected ? '#FAF6EE' : '#FFFFFF',
                          padding: '6px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          boxShadow: isSelected ? '0 2px 8px rgba(184, 139, 74, 0.25)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ width: '100%', height: '65px', borderRadius: '6px', overflow: 'hidden', marginBottom: '6px' }}>
                          <img src={preset.img} alt={preset.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span style={{ fontSize: '10.5px', fontWeight: isSelected ? '800' : '600', color: isSelected ? '#8E633A' : '#78716C' }}>
                          {preset.label}
                        </span>
                      </div>
                    );
                  })}

                  {/* Custom Upload Tile */}
                  {(() => {
                    const isCustom = editPlanForm.image && !editPlanForm.image.startsWith('/memberships/');
                    return (
                      <div
                        onClick={() => {
                          if (!isCustom) {
                            editCardImageInputRef.current?.click();
                          }
                        }}
                        style={{
                          borderRadius: '8px',
                          border: isCustom ? '2px solid #B88B4A' : '1.5px dashed #DAC493',
                          background: isCustom ? '#FAF6EE' : '#FAF6EE40',
                          padding: '6px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          boxShadow: isCustom ? '0 2px 8px rgba(184, 139, 74, 0.25)' : 'none'
                        }}
                      >
                        {isCustom ? (
                          <>
                            <div style={{ width: '100%', height: '65px', borderRadius: '6px', overflow: 'hidden', marginBottom: '6px', position: 'relative' }}>
                              <img src={editPlanForm.image} alt="Custom Artwork" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#8E633A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                              <span>✓ Uploaded</span>
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  editCardImageInputRef.current?.click();
                                }}
                                style={{ textDecoration: 'underline', color: '#B88B4A', cursor: 'pointer', fontSize: '10px', marginLeft: '3px' }}
                                title="Change custom uploaded image"
                              >
                                Change
                              </span>
                            </div>
                          </>
                        ) : (
                          <div style={{ minHeight: '84px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <Upload size={18} color="#B88B4A" />
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#8E633A' }}>
                              {editCardImageUploading ? 'Uploading...' : '+ Upload Custom'}
                            </span>
                            <span style={{ fontSize: '9.5px', color: '#78716C' }}>PNG, JPG, WEBP</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Tagline */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#44403C', marginBottom: '6px' }}>
                  Tagline / Overview
                </label>
                <input
                  type="text"
                  placeholder="e.g. Unmatched aesthetic brilliance and personalized luxury."
                  value={editPlanForm.tagline}
                  onChange={(e) => setEditPlanForm({ ...editPlanForm, tagline: e.target.value })}
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
                  Privileges & Benefits ({editPlanForm.benefits.length})
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
                  {editPlanForm.benefits.map((b, idx) => (
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
                        onClick={() => handleRemoveEditBenefit(idx)}
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
                  {editPlanForm.benefits.length === 0 && (
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
                    value={editPlanForm.benefitInput}
                    onChange={(e) => setEditPlanForm({ ...editPlanForm, benefitInput: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEditBenefit();
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
                    onClick={handleAddEditBenefit}
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
                  onClick={() => setShowEditPlanModal(false)}
                  className="btn-secondary"
                  style={{ padding: '10px 18px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditPlan}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #B88B4A 0%, #8E633A 100%)',
                    color: '#FFFFFF',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    cursor: savingEditPlan ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(184, 139, 74, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Crown size={15} />
                  {savingEditPlan ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MEMBERSHIP PLAN CONFIRMATION MODAL */}
      {deleteConfirmModal.open && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            maxWidth: '440px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
            border: '1px solid #FECACA',
            position: 'relative',
            overflow: 'hidden',
            textAlign: 'center'
          }}>
            {/* Top Red Bar */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: '#DC2626'
            }} />

            {/* Alert Icon */}
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: '#FEE2E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px'
            }}>
              <AlertCircle size={28} color="#DC2626" />
            </div>

            <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#1C1917', margin: '0 0 8px 0' }}>
              Confirm Permanent Deletion
            </h3>

            <p style={{ fontSize: '13.5px', color: '#57534E', lineHeight: 1.5, margin: '0 0 14px 0' }}>
              Do you need to delete <strong>"{deleteConfirmModal.planName}"</strong>?
            </p>

            <div style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              fontSize: '12.5px',
              color: '#991B1B',
              lineHeight: 1.45,
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <strong>Confirm:</strong> This will be completely deleting the membership card permanently from both the membership page and the visitor membership screen.
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmModal({ open: false, planId: null, planName: '', deleting: false })}
                disabled={deleteConfirmModal.deleting}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid #D6D3D1',
                  background: '#FFFFFF',
                  color: '#44403C',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: deleteConfirmModal.deleting ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePlan}
                disabled={deleteConfirmModal.deleting}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: deleteConfirmModal.deleting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)'
                }}
              >
                <Trash2 size={14} />
                {deleteConfirmModal.deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

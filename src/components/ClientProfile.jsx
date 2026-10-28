import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Phone, Calendar, Clock, Sparkles, 
  Receipt, Check, User, DollarSign, ShieldAlert, FileText,
  Mail, MapPin, MessageCircle, Crown, Award, CalendarPlus,
  ShieldCheck, CheckCircle2, AlertCircle, Edit3, X, RefreshCw,
  Repeat, CalendarDays, PlusCircle, CheckCircle, ChevronRight
} from 'lucide-react';
import { apiRequest, formatCurrency, formatDate, formatPhone } from '../utils/api';

export default function ClientProfile({ clientId, onBack, onOpenReceipt }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('services'); // 'courses' | 'services' | 'payments'

  // Membership Validity Extension States
  const [showValidityModal, setShowValidityModal] = useState(false);
  const [updatingValidity, setUpdatingValidity] = useState(false);
  const [validitySuccess, setValiditySuccess] = useState('');
  const [validityError, setValidityError] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('active');

  // Treatment Course Management States
  const [extendModal, setExtendModal] = useState({ open: false, course: null, additionalSessions: 1, intervalValue: 15, intervalUnit: 'days' });
  const [extendingCourse, setExtendingCourse] = useState(false);
  const [extendError, setExtendError] = useState('');
  const [extendSuccess, setExtendSuccess] = useState('');

  const [newCourseModal, setNewCourseModal] = useState({ open: false, serviceId: '', totalSessions: 3, intervalValue: 15, intervalUnit: 'days', notes: '' });
  const [availableServices, setAvailableServices] = useState([]);
  const [startingCourse, setStartingCourse] = useState(false);
  const [newCourseError, setNewCourseError] = useState('');
  const [newCourseSuccess, setNewCourseSuccess] = useState('');

  const openExtendModal = (course) => {
    setExtendModal({
      open: true,
      course,
      additionalSessions: 1,
      intervalValue: course.interval_value || 15,
      intervalUnit: course.interval_unit || 'days'
    });
    setExtendError('');
    setExtendSuccess('');
  };

  const handleExtendCourse = async (e) => {
    if (e) e.preventDefault();
    if (!extendModal.course) return;
    try {
      setExtendingCourse(true);
      setExtendError('');
      setExtendSuccess('');
      await apiRequest(`/treatment-courses/${extendModal.course.course_id}/extend`, {
        method: 'PATCH',
        body: JSON.stringify({
          additional_sessions: parseInt(extendModal.additionalSessions, 10) || 1,
          interval_value: parseInt(extendModal.intervalValue, 10),
          interval_unit: extendModal.intervalUnit
        })
      });
      setExtendSuccess('Treatment plan successfully extended!');
      const refreshed = await apiRequest(`/clients/${clientId}`);
      setData(refreshed);
      setTimeout(() => {
        setExtendSuccess('');
        setExtendModal({ open: false, course: null, additionalSessions: 1, intervalValue: 15, intervalUnit: 'days' });
      }, 1200);
    } catch (err) {
      setExtendError(err.message || 'Failed to extend course');
    } finally {
      setExtendingCourse(false);
    }
  };

  const openNewCourseModal = async () => {
    try {
      const res = await apiRequest('/categories');
      const allServs = [];
      (res.categories || []).forEach(cat => {
        (cat.services || []).forEach(serv => {
          allServs.push({ ...serv, category_name: cat.category_name });
        });
      });
      setAvailableServices(allServs);
      const firstWithSessions = allServs.find(s => s.has_sessions === 1) || allServs[0];
      setNewCourseModal({
        open: true,
        serviceId: firstWithSessions ? firstWithSessions.service_id : '',
        totalSessions: firstWithSessions?.total_sessions || 3,
        intervalValue: firstWithSessions?.session_interval !== undefined ? firstWithSessions.session_interval : 15,
        intervalUnit: firstWithSessions?.session_interval_unit || 'days',
        notes: ''
      });
      setNewCourseError('');
      setNewCourseSuccess('');
    } catch (err) {
      console.error('Failed to load services for new course:', err);
    }
  };

  const handleStartNewCourse = async (e) => {
    if (e) e.preventDefault();
    if (!newCourseModal.serviceId) return;
    try {
      setStartingCourse(true);
      setNewCourseError('');
      setNewCourseSuccess('');
      await apiRequest('/treatment-courses', {
        method: 'POST',
        body: JSON.stringify({
          client_id: clientId,
          service_id: newCourseModal.serviceId,
          total_planned_sessions: parseInt(newCourseModal.totalSessions, 10) || 1,
          interval_value: parseInt(newCourseModal.intervalValue, 10) || 0,
          interval_unit: newCourseModal.intervalUnit,
          notes: newCourseModal.notes
        })
      });
      setNewCourseSuccess('Treatment plan successfully started!');
      const refreshed = await apiRequest(`/clients/${clientId}`);
      setData(refreshed);
      setActiveTab('courses');
      setTimeout(() => {
        setNewCourseSuccess('');
        setNewCourseModal(prev => ({ ...prev, open: false }));
      }, 1200);
    } catch (err) {
      setNewCourseError(err.message || 'Failed to start treatment course');
    } finally {
      setStartingCourse(false);
    }
  };

  useEffect(() => {
    async function loadClient() {
      try {
        setLoading(true);
        const res = await apiRequest(`/clients/${clientId}`);
        setData(res);
        if (res?.treatment_courses?.length > 0) {
          setActiveTab('courses');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadClient();
  }, [clientId]);

  const openValidityModal = () => {
    const currentExp = data?.client?.membership_expires_at;
    let initialExp = currentExp;
    if (!initialExp) {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      initialExp = d.toISOString().split('T')[0];
    }
    setNewExpiryDate(initialExp);
    setSelectedTier(data?.client?.membership_tier || 'Lumière Privilege');
    setSelectedStatus(data?.client?.membership_status || 'active');
    setValiditySuccess('');
    setValidityError('');
    setShowValidityModal(true);
  };

  const handleQuickExtend = (months) => {
    let base = new Date();
    if (newExpiryDate) {
      const parsed = new Date(newExpiryDate);
      if (!isNaN(parsed.getTime())) {
        base = parsed;
      }
    }
    const target = new Date(base);
    target.setMonth(target.getMonth() + months);
    setNewExpiryDate(target.toISOString().split('T')[0]);
  };

  const handleSaveValidity = async (e) => {
    if (e) e.preventDefault();
    if (!data?.client) return;
    try {
      setUpdatingValidity(true);
      setValidityError('');
      setValiditySuccess('');
      
      const payload = {
        membership_expires_at: newExpiryDate,
        membership_tier: selectedTier,
        membership_status: selectedStatus
      };

      const res = await apiRequest(`/clients/${data.client.client_id}/membership-validity`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      setData(prev => ({
        ...prev,
        client: {
          ...prev.client,
          ...(res.client || {}),
          membership_tier: selectedTier === 'Non-Member' ? null : selectedTier,
          membership_expires_at: newExpiryDate,
          membership_status: selectedStatus
        }
      }));

      setValiditySuccess(`Validity extended successfully until ${formatDate(newExpiryDate)}!`);
      setTimeout(() => {
        setValiditySuccess('');
        setShowValidityModal(false);
      }, 1400);
    } catch (err) {
      setValidityError(err.message || 'Failed to update validity');
    } finally {
      setUpdatingValidity(false);
    }
  };

  const getValidityDetails = (expiresAt) => {
    if (!expiresAt) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const exp = new Date(expiresAt);
    exp.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return {
        isExpired: true,
        text: `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`,
        color: '#DC2626',
        bg: '#FEF2F2',
        border: '#FECACA'
      };
    } else if (diffDays === 0) {
      return {
        isExpired: false,
        text: 'Expires today',
        color: '#D97706',
        bg: '#FFFBEB',
        border: '#FDE68A'
      };
    } else if (diffDays <= 30) {
      return {
        isExpired: false,
        text: `${diffDays} day${diffDays === 1 ? '' : 's'} remaining`,
        color: '#D97706',
        bg: '#FFFBEB',
        border: '#FDE68A'
      };
    } else {
      return {
        isExpired: false,
        text: `${diffDays} days remaining`,
        color: '#166534',
        bg: '#F0FDF4',
        border: '#BBF7D0'
      };
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '40px auto', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading client profile...
      </div>
    );
  }

  if (error || !data?.client) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
        <p style={{ color: '#DC2626', marginBottom: '16px' }}>{error || 'Client not found'}</p>
        <button onClick={onBack} className="btn-secondary">
          ← Back
        </button>
      </div>
    );
  }

  const { client, all_service_history = [], visit_history = [], treatment_courses = [] } = data;

  return (
    <div className="animate-fade-in" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
        <button
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      {/* Client Profile Header (Section 19 Requirement) */}
      <div className="card" style={{
        padding: '32px',
        background: 'linear-gradient(135deg, #FAF7F2 0%, #FFFFFF 100%)',
        border: '1.5px solid var(--primary-border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              color: '#B88B4A',
              fontWeight: '700',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>Client Dossier</span>
              {client.reg_no && (
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'var(--primary-subtle)',
                  border: '1px solid var(--primary-border)',
                  color: '#B88B4A',
                  fontSize: '11px',
                  fontWeight: '700'
                }}>
                  {client.reg_no}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '32px', color: '#1C1917', lineHeight: 1.1 }}>
              {[client.name, client.surname].filter(Boolean).join(' ').toUpperCase()}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginTop: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', color: '#B88B4A' }}>
                <Phone size={15} />
                <span>{formatPhone(client.phone)}</span>
              </div>
              {client.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={15} />
                  <span>{client.email}</span>
                </div>
              )}
              {client.gender && (
                <span className="badge badge-neutral">
                  {client.gender}
                </span>
              )}
              {/* 90-Day Engagement Status Badge */}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: '700',
                background: client.status === 'active' ? '#ECFDF5' : '#FEE2E2',
                color: client.status === 'active' ? '#065F46' : '#991B1B',
                border: `1px solid ${client.status === 'active' ? '#A7F3D0' : '#FECACA'}`
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: client.status === 'active' ? '#10B981' : '#EF4444' }} />
                {client.status === 'active' 
                  ? (client.days_since_last_visit !== null && client.days_since_last_visit !== undefined 
                      ? `Active (${client.days_since_last_visit === 0 ? 'Visited Today' : client.days_since_last_visit + 'd ago'})` 
                      : 'Active Client')
                  : (client.days_since_last_visit 
                      ? `Inactive (${client.days_since_last_visit}d > 90d)` 
                      : 'Inactive (>90d)')}
              </span>
              {client.marital_status && (
                <span className="badge badge-neutral" style={{ background: '#FAF6EE', border: '1px solid #DAC493', color: '#B88B4A', fontWeight: '600' }}>
                  {client.marital_status}
                </span>
              )}
              {client.dob && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
                  <Calendar size={13} color="#B88B4A" />
                  <span>DOB: {formatDate(client.dob)}</span>
                </div>
              )}
              {client.marital_status === 'Married' && client.anniversary_date && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
                  <Calendar size={13} color="#B88B4A" />
                  <span>Anniversary: {formatDate(client.anniversary_date)}</span>
                </div>
              )}
            </div>

            {/* Address */}
            {[client.address_line1, client.address_line2, client.city, client.state, client.pincode].filter(Boolean).length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <MapPin size={14} color="#B88B4A" />
                <span>
                  {[client.address_line1, client.address_line2, client.city, client.state, client.pincode].filter(Boolean).join(', ')}
                </span>
              </div>
            )}

            {/* Membership Controls (when member) OR Direct Communication (when non-member) */}
            {(() => {
              const isMember = Boolean(client.membership_tier && client.membership_tier !== 'Non-Member');
              const validityInfo = isMember ? getValidityDetails(client.membership_expires_at) : null;

              if (isMember) {
                return (
                  <div style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #FAF7F2 0%, #FFFFFF 100%)',
                    border: '1.5px solid #DAC493',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(184, 139, 74, 0.08)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '9px',
                        background: '#1C1917',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#D4AF37'
                      }}>
                        <Crown size={18} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            background: '#1C1917',
                            color: '#D4AF37',
                            fontSize: '11px',
                            fontWeight: '700',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Sparkles size={11} color="#D4AF37" />
                            {client.membership_tier}
                          </span>

                          {validityInfo && (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              background: validityInfo.bg,
                              border: `1px solid ${validityInfo.border}`,
                              color: validityInfo.color,
                              fontSize: '11px',
                              fontWeight: '700'
                            }}>
                              {validityInfo.text}
                            </span>
                          )}

                          {client.membership_status && (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              background: client.membership_status === 'active' ? '#ECFDF5' : '#FEF2F2',
                              border: `1px solid ${client.membership_status === 'active' ? '#A7F3D0' : '#FECACA'}`,
                              color: client.membership_status === 'active' ? '#047857' : '#B91C1C',
                              fontSize: '11px',
                              fontWeight: '700',
                              textTransform: 'capitalize'
                            }}>
                              ● {client.membership_status}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Validity Expiry: <strong style={{ color: validityInfo?.isExpired ? '#DC2626' : '#1C1917' }}>
                            {client.membership_expires_at ? formatDate(client.membership_expires_at) : 'No Expiry Set'}
                          </strong>
                          {client.membership_balance !== undefined && client.membership_balance !== null && (
                            <span style={{ marginLeft: '10px', color: '#166534', fontWeight: '600' }}>
                              • Available Balance: {formatCurrency(client.membership_balance)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={openValidityModal}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'linear-gradient(135deg, #B88B4A 0%, #966E33 100%)',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(184, 139, 74, 0.25)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <CalendarPlus size={15} />
                        ⚡ Increase Validity
                      </button>
                    </div>
                  </div>
                );
              }

              // Non-Member view
              return (
                <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const phone = (client.phone || '').replace(/\D/g, '');
                      const fullPhone = phone.startsWith('91') ? phone : `91${phone}`;
                      const name = [client.name, client.surname].filter(Boolean).join(' ');
                      const regNo = client.reg_no || `MB-REG-${String(client.client_id).padStart(5, '0')}`;
                      const msg = `Dear ${name},\n\nThank you for being a valued client at Maison BeYou Aesthetic & Beauty Studio!\n\n✨ Your Registration No: *${regNo}*\n\nWe look forward to welcoming you for your next bespoke luxury treatment.\n\nWarm regards,\nMaison BeYou Concierge`;
                      window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: '#25D366',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    <MessageCircle size={14} />
                    WhatsApp Thank You
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const name = [client.name, client.surname].filter(Boolean).join(' ');
                      const regNo = client.reg_no || `MB-REG-${String(client.client_id).padStart(5, '0')}`;
                      const subject = `Welcome to Maison BeYou | Registration No: ${regNo}`;
                      const body = `Dear ${name},\n\nThank you for choosing Maison BeYou Aesthetic Studio!\n\nYour Registration Number is: ${regNo}\n\nWarm regards,\nMaison BeYou Concierge Team`;
                      window.location.href = `mailto:${client.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: '#FAF6EE',
                      color: '#B88B4A',
                      border: '1px solid #DAC493',
                      fontSize: '12px',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    <Mail size={14} />
                    Email Mailer
                  </button>

                  <button
                    type="button"
                    onClick={openValidityModal}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'linear-gradient(135deg, #B88B4A 0%, #966E33 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(184, 139, 74, 0.2)'
                    }}
                  >
                    <Crown size={14} />
                    + Assign Membership
                  </button>
                </div>
              );
            })()}
          </div>

          {/* Stats Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
            gap: '16px',
            background: '#FFFFFF',
            padding: '16px 24px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>
                First Visit
              </div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>
                {formatDate(client.first_visit_date)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>
                Last Visit
              </div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>
                {formatDate(client.last_visit_date)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>
                Total Visits
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#1E40AF', marginTop: '1px' }}>
                {client.total_visits}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>
                Lifetime Spend
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#166534', marginTop: '1px' }}>
                {formatCurrency(client.total_spend)}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Tabs: Treatment Plans vs Service History vs Payment History */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-surface)',
          padding: '0 16px',
          gap: '8px',
          overflowX: 'auto'
        }}>
          <button
            onClick={() => setActiveTab('courses')}
            style={{
              padding: '16px 20px',
              fontSize: '14px',
              fontWeight: activeTab === 'courses' ? '700' : '500',
              color: activeTab === 'courses' ? '#B88B4A' : 'var(--text-muted)',
              borderBottom: `2px solid ${activeTab === 'courses' ? '#B88B4A' : 'transparent'}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Repeat size={15} />
            Treatment Plans ({treatment_courses.length})
          </button>

          <button
            onClick={() => setActiveTab('services')}
            style={{
              padding: '16px 20px',
              fontSize: '14px',
              fontWeight: activeTab === 'services' ? '700' : '500',
              color: activeTab === 'services' ? '#B88B4A' : 'var(--text-muted)',
              borderBottom: `2px solid ${activeTab === 'services' ? '#B88B4A' : 'transparent'}`
            }}
          >
            Service History ({all_service_history.length})
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            style={{
              padding: '16px 20px',
              fontSize: '14px',
              fontWeight: activeTab === 'payments' ? '700' : '500',
              color: activeTab === 'payments' ? '#B88B4A' : 'var(--text-muted)',
              borderBottom: `2px solid ${activeTab === 'payments' ? '#B88B4A' : 'transparent'}`
            }}
          >
            Visit & Payment History ({visit_history.length})
          </button>
        </div>

        {/* Tab 0: Treatment Courses & Session Tracking */}
        {activeTab === 'courses' && (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Bar inside Tab */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1C1917', margin: 0 }}>
                  Active Treatment Plans & Clinical Session Tracking
                </h3>
              </div>

              <button
                type="button"
                onClick={openNewCourseModal}
                className="btn-primary"
                style={{
                  padding: '8px 16px',
                  fontSize: '12.5px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <PlusCircle size={15} />
                + Start New Treatment Plan
              </button>
            </div>

            {treatment_courses.length === 0 ? (
              <div style={{
                padding: '48px 24px',
                textAlign: 'center',
                background: '#FAF7F2',
                borderRadius: '16px',
                border: '1.5px dashed #DAC493'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(184, 139, 74, 0.12)',
                  color: '#B88B4A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto'
                }}>
                  <Repeat size={22} />
                </div>
                <h4 style={{ fontSize: '16px', color: '#1C1917', margin: '0 0 6px 0', fontWeight: '700' }}>
                  No Multi-Session Treatment Plans Yet
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 18px auto', lineHeight: '1.5' }}>
                  When the client receives a service with session tracking enabled (configured in Service Management), their multi-session course and next due date schedule will appear here automatically.
                </p>
                <button
                  type="button"
                  onClick={openNewCourseModal}
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '13px' }}
                >
                  + Start First Treatment Plan
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {treatment_courses.map(course => (
                  <div
                    key={course.course_id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '16px',
                      border: course.status === 'completed' ? '1px solid #E5E7EB' : '1.5px solid #EADBCC',
                      boxShadow: '0 4px 16px rgba(28, 25, 23, 0.05)',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Course Card Top Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: '#B88B4A'
                          }}>
                            Treatment Plan #{course.course_id}
                          </span>

                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            background: course.status === 'completed' ? '#ECFDF5' : '#FFFBEB',
                            color: course.status === 'completed' ? '#047857' : '#B45309',
                            border: `1px solid ${course.status === 'completed' ? '#A7F3D0' : '#FDE68A'}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            {course.status === 'completed' ? (
                              <>
                                <CheckCircle size={12} />
                                Course Complete
                              </>
                            ) : (
                              <>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#B45309' }} />
                                Active Course
                              </>
                            )}
                          </span>

                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            background: 'rgba(184, 139, 74, 0.1)',
                            color: '#8A6D3B',
                            border: '1px solid rgba(184, 139, 74, 0.25)'
                          }}>
                            Session {course.is_completed ? course.total_planned : (course.completed_sessions + 1)} of {course.total_planned}
                          </span>
                        </div>

                        <h4 style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: '20px',
                          color: '#1C1917',
                          margin: 0,
                          fontWeight: '700'
                        }}>
                          {course.service_name_snapshot}
                        </h4>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => openExtendModal(course)}
                          style={{
                            padding: '7px 14px',
                            borderRadius: 'var(--radius-sm)',
                            background: '#FAF6EE',
                            color: '#B88B4A',
                            border: '1px solid #DAC493',
                            fontSize: '12px',
                            fontWeight: '700',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer'
                          }}
                        >
                          <CalendarPlus size={14} />
                          Extend Course (+ Sessions)
                        </button>
                      </div>
                    </div>

                    {/* Luxury Status Announcement Banner */}
                    <div style={{
                      padding: '12px 18px',
                      borderRadius: '12px',
                      background: course.status === 'completed' ? '#F0FDF4' : 'linear-gradient(135deg, #FAF7F2 0%, #FFFFFF 100%)',
                      border: course.status === 'completed' ? '1px solid #BBF7D0' : '1px solid #EADBCC',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: course.status === 'completed' ? '#DCFCE7' : 'rgba(184, 139, 74, 0.14)',
                        color: course.status === 'completed' ? '#166534' : '#B88B4A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {course.status === 'completed' ? <CheckCircle size={17} /> : <Sparkles size={17} />}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13.5px', fontWeight: '700', color: course.status === 'completed' ? '#166534' : '#1C1917' }}>
                          {course.status_message}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {course.is_completed
                            ? 'Client has fulfilled all treatment sessions planned in this clinical cycle.'
                            : `${course.remaining_sessions} session${course.remaining_sessions === 1 ? '' : 's'} remaining in this bespoke treatment plan.`}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar & Protocol Metrics */}
                    <div style={{
                      background: 'var(--bg-surface)',
                      borderRadius: '12px',
                      padding: '16px 20px',
                      border: '1px solid var(--border-light)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}>
                      {/* Bar */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                          <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                            Course Completion Progress
                          </span>
                          <span style={{ fontWeight: '700', color: '#B88B4A' }}>
                            {course.completed_sessions} of {course.total_planned} Sessions ({course.progress_percent}%)
                          </span>
                        </div>
                        <div style={{
                          height: '8px',
                          background: '#E5E7EB',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${course.progress_percent}%`,
                            height: '100%',
                            background: course.status === 'completed'
                              ? '#10B981'
                              : 'linear-gradient(90deg, #B88B4A 0%, #D4AF37 100%)',
                            borderRadius: '4px',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                      </div>

                      {/* 3 Metric Chips */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '12px'
                      }}>
                        <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>
                            Configured Interval
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#1C1917', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Clock size={14} color="#B88B4A" />
                            <span>Every {course.interval_value} {course.interval_unit || 'days'}</span>
                          </div>
                        </div>

                        <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>
                            Last Completed Session
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#1C1917', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Calendar size={14} color="#B88B4A" />
                            <span>{course.last_completed_date ? formatDate(course.last_completed_date) : 'Pending Session 1'}</span>
                          </div>
                        </div>

                        <div style={{
                          background: course.next_due_date ? '#FFFBEB' : '#FFFFFF',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: course.next_due_date ? '1.5px solid #FDE68A' : '1px solid var(--border-light)'
                        }}>
                          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: course.next_due_date ? '#92400E' : 'var(--text-muted)', fontWeight: '700' }}>
                            Next Session Due Date
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: course.next_due_date ? '#B45309' : '#166534', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <CalendarDays size={14} color={course.next_due_date ? '#B45309' : '#166534'} />
                            <span>{course.next_due_date ? formatDate(course.next_due_date) : (course.is_completed ? 'Plan Completed' : 'Schedule When Ready')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recorded Sessions Timeline */}
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>
                        Session History ({course.sessions?.length || 0})
                      </div>

                      {(!course.sessions || course.sessions.length === 0) ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                          No sessions recorded yet. Completed appointments for this service will automatically appear in this sequence.
                        </div>
                      ) : (
                        <div className="horizontal-scroller" style={{ overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: '10px' }}>
                          <table style={{ width: '100%', minWidth: '550px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead>
                              <tr style={{ background: '#FAF7F2', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                                <th style={{ padding: '10px 16px', fontWeight: '700' }}>Sequence</th>
                                <th style={{ padding: '10px 16px', fontWeight: '700' }}>Date</th>
                                <th style={{ padding: '10px 16px', fontWeight: '700' }}>Provider</th>
                                <th style={{ padding: '10px 16px', fontWeight: '700' }}>Status</th>
                                <th style={{ padding: '10px 16px', fontWeight: '700' }}>Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {course.sessions.map((sess, sIdx) => (
                                <tr key={sess.session_id || sIdx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                  <td style={{ padding: '10px 16px', fontWeight: '700', color: '#1C1917' }}>
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      background: 'rgba(184, 139, 74, 0.1)',
                                      color: '#B88B4A',
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      fontSize: '11.5px'
                                    }}>
                                      Session {sess.session_number} of {course.total_planned}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 16px', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                                    {formatDate(sess.session_date)}
                                  </td>
                                  <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>
                                    {sess.staff_name || 'Assigned Specialist'}
                                  </td>
                                  <td style={{ padding: '10px 16px' }}>
                                    <span style={{
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      textTransform: 'capitalize',
                                      background: sess.status === 'completed' ? '#ECFDF5' : (sess.status === 'upcoming' ? '#EFF6FF' : '#FEF2F2'),
                                      color: sess.status === 'completed' ? '#047857' : (sess.status === 'upcoming' ? '#1D4ED8' : '#DC2626'),
                                      border: `1px solid ${sess.status === 'completed' ? '#A7F3D0' : (sess.status === 'upcoming' ? '#BFDBFE' : '#FECACA')}`
                                    }}>
                                      {sess.status === 'no_show' ? 'No Show' : sess.status}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                                    {sess.notes || '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Service History Table (Section 19 Requirement) */}
        {activeTab === 'services' && (
          <div className="horizontal-scroller" style={{ overflowX: 'auto' }}>
            {all_service_history.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No service history found.
              </div>
            ) : (
              <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '14px 20px', fontWeight: '600' }}>Date</th>
                    <th style={{ padding: '14px 16px', fontWeight: '600' }}>Service</th>
                    <th style={{ padding: '14px 16px', fontWeight: '600' }}>Staff Provider</th>
                    <th style={{ padding: '14px 20px', fontWeight: '600', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {all_service_history.map(s => (
                    <tr key={s.visit_service_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '14px 20px', fontWeight: '500', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                        {formatDate(s.visit_date)}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '600', color: '#1C1917' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span>{s.service_name_snapshot}</span>
                          {s.session_number ? (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '700',
                              background: 'rgba(184, 139, 74, 0.1)',
                              color: '#B88B4A',
                              border: '1px solid rgba(184, 139, 74, 0.25)'
                            }}>
                              Session {s.session_number} of {s.total_sessions}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                        {s.staff_name || 'Assigned'}
                      </td>
                      <td style={{ padding: '14px 20px', fontWeight: '700', color: '#B88B4A', textAlign: 'right' }}>
                        {formatCurrency(s.price_snapshot)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Visit & Payment History Table (Section 19 Requirement) */}
        {activeTab === 'payments' && (
          <div className="horizontal-scroller" style={{ overflowX: 'auto' }}>
            {visit_history.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No visit records found.
              </div>
            ) : (
              <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '14px 20px', fontWeight: '600' }}>Visit Date</th>
                    <th style={{ padding: '14px 16px', fontWeight: '600' }}>Services Performed</th>
                    <th style={{ padding: '14px 16px', fontWeight: '600' }}>Subtotal</th>
                    <th style={{ padding: '14px 16px', fontWeight: '600' }}>Discount</th>
                    <th style={{ padding: '14px 16px', fontWeight: '600' }}>Total</th>
                    <th style={{ padding: '14px 16px', fontWeight: '600' }}>Paid</th>
                    <th style={{ padding: '14px 16px', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '14px 20px', fontWeight: '600', textAlign: 'right' }}>Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {visit_history.map(v => (
                    <tr key={v.visit_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '14px 20px', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                        {formatDate(v.visit_date)}
                      </td>
                      <td style={{ padding: '14px 16px', maxWidth: '320px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {v.services?.map(s => (
                            <div key={s.visit_service_id || s.service_name_snapshot} style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ color: '#1C1917', fontWeight: '500' }}>{s.service_name_snapshot}</span>
                              {s.session_number ? (
                                <span style={{
                                  fontSize: '10.5px',
                                  fontWeight: '700',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(184, 139, 74, 0.1)',
                                  color: '#B88B4A',
                                  border: '1px solid rgba(184, 139, 74, 0.2)'
                                }}>
                                  Session {s.session_number}/{s.total_sessions}
                                </span>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                        {formatCurrency(v.subtotal)}
                      </td>
                      <td style={{ padding: '14px 16px', color: v.discount_amount > 0 ? '#DC2626' : 'var(--text-muted)' }}>
                        {v.discount_amount > 0 ? `-${formatCurrency(v.discount_amount)}` : '—'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '700', color: '#1C1917' }}>
                        {formatCurrency(v.total_amount)}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '700', color: '#166534' }}>
                        {formatCurrency(v.amount_paid)}
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                          via {v.payment_method}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge ${
                          v.payment_status === 'Paid' ? 'badge-paid' : (v.payment_status === 'Partially Paid' ? 'badge-partial' : 'badge-pending')
                        }`}>
                          {v.payment_status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <button
                          onClick={() => onOpenReceipt(v.visit_id)}
                          style={{
                            padding: '6px 10px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--text-main)'
                          }}
                        >
                          <Receipt size={14} color="#B88B4A" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* MANUAL MEMBERSHIP VALIDITY EXTENSION MODAL */}
      {showValidityModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(28, 25, 23, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px',
          boxSizing: 'border-box'
        }}>
          <div className="animate-fade-in" style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-lg, 16px)',
            maxWidth: '560px',
            width: '100%',
            border: '1.5px solid #DAC493',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, #FAF7F2 0%, #FFFFFF 100%)',
              borderBottom: '1px solid #E7DEC8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#FAF4E6',
                  border: '1px solid #DAC493',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#B88B4A'
                }}>
                  <CalendarPlus size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1C1917', margin: 0 }}>
                    Manage Membership Validity
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {client.name} {client.surname || ''} • {client.reg_no || 'Client'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowValidityModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveValidity} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {validityError && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} />
                  <span>{validityError}</span>
                </div>
              )}

              {validitySuccess && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#047857',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle2 size={16} />
                  <span>{validitySuccess}</span>
                </div>
              )}

              {/* Current Details Pill */}
              <div style={{
                padding: '12px 16px',
                background: '#FAF7F2',
                borderRadius: '10px',
                border: '1px solid #E7DEC8',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '12px',
                fontSize: '12px'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Current Tier:</span>
                  <strong style={{ color: '#B88B4A', fontSize: '13px' }}>{client.membership_tier || 'None'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Current Expiry:</span>
                  <strong style={{ color: '#1C1917', fontSize: '13px' }}>
                    {client.membership_expires_at ? formatDate(client.membership_expires_at) : 'Not Set'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Status:</span>
                  <strong style={{ color: client.membership_status === 'active' ? '#166534' : '#DC2626', fontSize: '13px', textTransform: 'capitalize' }}>
                    {client.membership_status || 'Inactive'}
                  </strong>
                </div>
              </div>

              {/* Quick Extend Buttons */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '8px' }}>
                  Quick Extend Duration:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[
                    { label: '+1 Month', months: 1 },
                    { label: '+3 Months', months: 3 },
                    { label: '+6 Months', months: 6 },
                    { label: '+1 Year', months: 12 }
                  ].map(btn => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => handleQuickExtend(btn.months)}
                      style={{
                        padding: '9px 6px',
                        borderRadius: '8px',
                        background: '#FAF6EE',
                        border: '1.5px solid #DAC493',
                        color: '#B88B4A',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#B88B4A';
                        e.currentTarget.style.color = '#FFFFFF';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#FAF6EE';
                        e.currentTarget.style.color = '#B88B4A';
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Input */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1C1917', marginBottom: '8px' }}>
                  Or Choose Exact Expiration Date:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    required
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '1.5px solid var(--border-color)',
                      background: 'var(--bg-card-subtle, #FAF7F2)',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1C1917',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                {newExpiryDate && (
                  <div style={{ fontSize: '12px', color: '#166534', marginTop: '6px', fontWeight: '600' }}>
                    ✓ New validity expiry date: <strong>{formatDate(newExpiryDate)}</strong>
                  </div>
                )}
              </div>

              {/* Membership Tier & Status Dropdowns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                    Membership Tier:
                  </label>
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border-color)',
                      background: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#1C1917',
                      outline: 'none'
                    }}
                  >
                    <option value="Non-Member">Non-Member (Revoke)</option>
                    <option value="Éclat Privilege">Éclat Privilege (₹6,000)</option>
                    <option value="Éternal Privilege">Éternal Privilege (₹15,000)</option>
                    <option value="Infini Privilege">Infini Privilege (₹25,000)</option>
                    <option value="Lumière Privilege">Lumière Privilege (₹50,000)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                    Membership Status:
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border-color)',
                      background: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#1C1917',
                      outline: 'none'
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '12px',
                marginTop: '8px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-color)'
              }}>
                <button
                  type="button"
                  onClick={() => setShowValidityModal(false)}
                  disabled={updatingValidity}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    background: '#F5F5F4',
                    border: '1px solid #D6D3D1',
                    color: '#44403C',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={updatingValidity || !newExpiryDate}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #B88B4A 0%, #966E33 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: updatingValidity ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(184, 139, 74, 0.3)'
                  }}
                >
                  {updatingValidity ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      Save Validity Extension
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Extend Treatment Course */}
      {extendModal.open && extendModal.course && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(28, 25, 23, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            border: '1px solid #EADBCC'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#B88B4A', letterSpacing: '0.06em' }}>
                  Clinical Protocol Adjustment
                </span>
                <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '20px', color: '#1C1917', margin: '4px 0 0 0' }}>
                  Extend Treatment Plan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExtendModal({ open: false, course: null, additionalSessions: 1, intervalValue: 15, intervalUnit: 'days' })}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: '#FAF7F2',
              borderRadius: '10px',
              padding: '12px 16px',
              border: '1px solid #EADBCC',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#1C1917' }}>
                {extendModal.course.service_name_snapshot}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Currently: <strong>{extendModal.course.completed_sessions}</strong> completed of <strong>{extendModal.course.total_planned}</strong> planned sessions.
              </div>
            </div>

            {extendError && (
              <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#DC2626', fontSize: '13px', marginBottom: '16px' }}>
                {extendError}
              </div>
            )}
            {extendSuccess && (
              <div style={{ padding: '10px 14px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', color: '#166534', fontSize: '13px', marginBottom: '16px' }}>
                {extendSuccess}
              </div>
            )}

            <form onSubmit={handleExtendCourse} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                  Additional Sessions to Add:
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={extendModal.additionalSessions}
                  onChange={(e) => setExtendModal(prev => ({ ...prev, additionalSessions: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-color)',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  New total planned sessions will be: {(parseInt(extendModal.course.total_planned, 10) || 0) + (parseInt(extendModal.additionalSessions, 10) || 0)}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                    Interval Between Sessions:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={extendModal.intervalValue}
                    onChange={(e) => setExtendModal(prev => ({ ...prev, intervalValue: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border-color)',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                    Interval Unit:
                  </label>
                  <select
                    value={extendModal.intervalUnit}
                    onChange={(e) => setExtendModal(prev => ({ ...prev, intervalUnit: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border-color)',
                      background: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setExtendModal({ open: false, course: null, additionalSessions: 1, intervalValue: 15, intervalUnit: 'days' })}
                  disabled={extendingCourse}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    background: '#F5F5F4',
                    border: '1px solid #D6D3D1',
                    color: '#44403C',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={extendingCourse}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #B88B4A 0%, #966E33 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: extendingCourse ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(184, 139, 74, 0.3)'
                  }}
                >
                  {extendingCourse ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  Confirm & Extend Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Start New Treatment Course */}
      {newCourseModal.open && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(28, 25, 23, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            border: '1px solid #EADBCC'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#B88B4A', letterSpacing: '0.06em' }}>
                  New Clinical Program
                </span>
                <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '20px', color: '#1C1917', margin: '4px 0 0 0' }}>
                  Initiate Treatment Plan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNewCourseModal(prev => ({ ...prev, open: false }))}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {newCourseError && (
              <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#DC2626', fontSize: '13px', marginBottom: '16px' }}>
                {newCourseError}
              </div>
            )}
            {newCourseSuccess && (
              <div style={{ padding: '10px 14px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', color: '#166534', fontSize: '13px', marginBottom: '16px' }}>
                {newCourseSuccess}
              </div>
            )}

            <form onSubmit={handleStartNewCourse} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                  Target Clinical Service:
                </label>
                <select
                  value={newCourseModal.serviceId}
                  onChange={(e) => {
                    const sId = e.target.value;
                    const serv = availableServices.find(s => String(s.service_id) === String(sId));
                    setNewCourseModal(prev => ({
                      ...prev,
                      serviceId: sId,
                      totalSessions: serv?.has_sessions ? (serv.total_sessions || 3) : (prev.totalSessions || 3),
                      intervalValue: (serv?.has_sessions && serv.session_interval !== undefined) ? serv.session_interval : (prev.intervalValue || 15),
                      intervalUnit: (serv?.has_sessions && serv.session_interval_unit) ? serv.session_interval_unit : (prev.intervalUnit || 'days')
                    }));
                  }}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-color)',
                    background: '#FFFFFF',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    color: '#1C1917'
                  }}
                >
                  <option value="" disabled>Select a treatment service...</option>
                  {availableServices.map(s => (
                    <option key={s.service_id} value={s.service_id}>
                      {s.service_name} {s.has_sessions ? `(${s.total_sessions} sess / ${s.session_interval} ${s.session_interval_unit})` : ''} — {s.category_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                    Total Sessions:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newCourseModal.totalSessions}
                    onChange={(e) => setNewCourseModal(prev => ({ ...prev, totalSessions: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border-color)',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                    Interval:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newCourseModal.intervalValue}
                    onChange={(e) => setNewCourseModal(prev => ({ ...prev, intervalValue: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border-color)',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                    Unit:
                  </label>
                  <select
                    value={newCourseModal.intervalUnit}
                    onChange={(e) => setNewCourseModal(prev => ({ ...prev, intervalUnit: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border-color)',
                      background: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                  Clinical Protocol Notes (Optional):
                </label>
                <textarea
                  rows={2}
                  value={newCourseModal.notes}
                  onChange={(e) => setNewCourseModal(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Bespoke peeling and hydration treatment sequence"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-color)',
                    fontSize: '13px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setNewCourseModal(prev => ({ ...prev, open: false }))}
                  disabled={startingCourse}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    background: '#F5F5F4',
                    border: '1px solid #D6D3D1',
                    color: '#44403C',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={startingCourse}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #B88B4A 0%, #966E33 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: startingCourse ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(184, 139, 74, 0.3)'
                  }}
                >
                  {startingCourse ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Initiate Treatment Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

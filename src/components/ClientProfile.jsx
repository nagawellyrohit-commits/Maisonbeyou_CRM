import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Phone, Calendar, Clock, Sparkles, 
  Receipt, Check, User, DollarSign, ShieldAlert, FileText,
  Mail, MapPin, MessageCircle
} from 'lucide-react';
import { apiRequest, formatCurrency, formatDate, formatPhone } from '../utils/api';

export default function ClientProfile({ clientId, onBack, onOpenReceipt }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('services'); // 'services' | 'payments'

  useEffect(() => {
    async function loadClient() {
      try {
        setLoading(true);
        const res = await apiRequest(`/clients/${clientId}`);
        setData(res);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadClient();
  }, [clientId]);

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

  const { client, all_service_history = [], visit_history = [] } = data;

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

            {/* Direct Communication Hub (Image 2) */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
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
            </div>
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

      {/* Tabs: Service History vs Payment History */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-surface)',
          padding: '0 16px'
        }}>
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
                        {s.service_name_snapshot}
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
                      <td style={{ padding: '14px 16px', maxWidth: '240px' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.services?.map(s => s.service_name_snapshot).join(', ')}
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
    </div>
  );
}

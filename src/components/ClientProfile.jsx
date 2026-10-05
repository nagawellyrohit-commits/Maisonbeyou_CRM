import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Phone, Calendar, Clock, Sparkles, Plus, 
  Receipt, Edit2, Check, User, DollarSign, ShieldAlert, FileText 
} from 'lucide-react';
import { apiRequest, formatCurrency, formatDate, formatPhone } from '../utils/api';

export default function ClientProfile({ clientId, onBack, onStartVisit, onOpenReceipt }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('services'); // 'services' | 'payments'
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    async function loadClient() {
      try {
        setLoading(true);
        const res = await apiRequest(`/clients/${clientId}`);
        setData(res);
        setNotes(res.client?.notes || '');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadClient();
  }, [clientId]);

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      await apiRequest(`/clients/${clientId}`, {
        method: 'PUT',
        body: JSON.stringify({ notes })
      });
      setIsEditingNotes(false);
      setData(prev => ({
        ...prev,
        client: { ...prev.client, notes }
      }));
    } catch (err) {
      alert('Failed to save notes: ' + err.message);
    } finally {
      setSavingNotes(false);
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

  const { client, all_service_history = [], visit_history = [] } = data;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px', margin: '20px auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <button
          onClick={() => onStartVisit('regular', client)}
          className="btn-primary"
          style={{ padding: '10px 20px', fontSize: '14px' }}
        >
          <Plus size={16} />
          + Start New Visit for {client.name}
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
              marginBottom: '4px'
            }}>
              Client Dossier
            </div>
            <h1 style={{ fontSize: '32px', color: '#1C1917', lineHeight: 1.1 }}>
              {client.name.toUpperCase()}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '16px', fontWeight: '600', color: '#B88B4A' }}>
              <Phone size={16} />
              <span>{formatPhone(client.phone)}</span>
            </div>
          </div>

          {/* Stats Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
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

        {/* Client Notes / Aesthetic Preferences */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700', color: 'var(--text-muted)' }}>
              Client Notes & Treatment Preferences
            </span>
            {!isEditingNotes ? (
              <button
                onClick={() => setIsEditingNotes(true)}
                style={{ fontSize: '12px', color: '#B88B4A', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Edit2 size={13} /> Edit Notes
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setIsEditingNotes(false)}
                  style={{ fontSize: '12px', color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  style={{ fontSize: '12px', color: '#166534', fontWeight: '700' }}
                >
                  {savingNotes ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {isEditingNotes ? (
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add skin sensitivity notes, tea preferences, favorite therapists..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                outline: 'none',
                background: '#FFFFFF',
                fontSize: '13px'
              }}
            />
          ) : (
            <div style={{ fontSize: '14px', color: client.notes ? 'var(--text-main)' : 'var(--text-light)', fontStyle: client.notes ? 'normal' : 'italic' }}>
              {client.notes || 'No treatment preferences or allergy notes recorded yet.'}
            </div>
          )}
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
          <div>
            {all_service_history.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No service history found.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
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
          <div>
            {visit_history.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No visit records found.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
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

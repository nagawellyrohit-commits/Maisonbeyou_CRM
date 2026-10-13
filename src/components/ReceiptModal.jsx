import React, { useState, useEffect } from 'react';
import { X, Printer, Sparkles, CheckCircle2, Phone, Calendar, MessageCircle, Mail } from 'lucide-react';
import { apiRequest, formatCurrency, formatDate, formatPhone } from '../utils/api';
import logoImg from '../assets/logo.png';

export default function ReceiptModal({ visitId, onClose }) {
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReceipt() {
      try {
        setLoading(true);
        const res = await apiRequest(`/visits/${visitId}`);
        setVisit(res.visit);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (visitId) {
      fetchReceipt();
    }
  }, [visitId]);

  const handlePrint = () => {
    window.print();
  };

  if (!visitId) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(28,25,23,0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '20px'
    }}>
      <div className="card animate-fade-in" style={{
        maxWidth: '540px',
        width: '100%',
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div className="no-print" style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-surface)'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="#B88B4A" />
            Official Visit Receipt
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handlePrint}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                background: '#FFFFFF',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Printer size={14} color="#B88B4A" />
              Print Receipt
            </button>
            <button onClick={onClose} style={{ padding: '6px', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading invoice details...
          </div>
        ) : !visit ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#DC2626' }}>
            Invoice not found.
          </div>
        ) : (
          <div style={{ padding: '32px', overflowY: 'auto' }}>
            
            {/* Studio Header */}
            <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '20px' }}>
              <img 
                src={logoImg} 
                alt="Maison BeYou" 
                style={{ width: '52px', height: '52px', objectFit: 'contain', margin: '0 auto 8px auto', display: 'block' }} 
              />
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', letterSpacing: '0.04em', color: '#1C1917', marginBottom: '2px' }}>
                MAISON BEYOU
              </h1>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#B88B4A', fontWeight: '700' }}>
                Women's Aesthetic & Beauty Studio
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Luxury Skin • Laser • Medi-Facials • Contouring
              </div>
            </div>

            {/* Visit Details */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>Billed To</div>
                <div style={{ fontWeight: '700', fontSize: '15px', color: '#1C1917' }}>
                  {visit.client_name} {visit.client_surname || ''}
                </div>
                <div style={{ color: '#B88B4A', fontWeight: '500' }}>{formatPhone(visit.client_phone)}</div>
                {visit.client_reg_no && (
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: '700', marginTop: '2px' }}>
                    Reg No: {visit.client_reg_no}
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>Invoice No</div>
                <div style={{ fontWeight: '700', color: '#1C1917' }}>INV-MBY-{String(visit.visit_id).padStart(5, '0')}</div>
                <div style={{ color: 'var(--text-muted)' }}>{formatDate(visit.visit_date)}</div>
              </div>
            </div>

            {/* Services Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--border-color)', textTransform: 'uppercase', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0' }}>Service</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>Provider</th>
                  <th style={{ textAlign: 'right', padding: '8px 0' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {visit.services?.map((s, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '10px 0', fontWeight: '600', color: '#1C1917' }}>
                      {s.service_name_snapshot}
                    </td>
                    <td style={{ padding: '10px 10px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {s.staff_name || 'Staff'}
                    </td>
                    <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: '700', color: '#1C1917' }}>
                      {formatCurrency(s.price_snapshot)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Calculations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: '600', color: '#1C1917' }}>{formatCurrency(visit.subtotal)}</span>
              </div>

              {visit.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626' }}>
                  <span>Discount ({visit.discount_type === 'percentage' ? `${visit.discount_value}%` : 'Fixed'}):</span>
                  <span>- {formatCurrency(visit.discount_amount)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '700', color: '#1C1917', paddingTop: '4px', borderTop: '1px solid var(--border-light)' }}>
                <span>Net Total:</span>
                <span style={{ color: '#B88B4A' }}>{formatCurrency(visit.total_amount)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534', fontWeight: '600', paddingTop: '4px' }}>
                <span>Amount Paid ({visit.payment_method}):</span>
                <span>{formatCurrency(visit.amount_paid)}</span>
              </div>

              {visit.balance > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626', fontWeight: '700' }}>
                  <span>Balance Due:</span>
                  <span>{formatCurrency(visit.balance)}</span>
                </div>
              )}
            </div>

            {/* Footer message */}
            <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px dashed var(--border-color)', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
              <p>Thank you for choosing Maison BeYou for your aesthetic journey.</p>
              <p style={{ marginTop: '2px', fontSize: '11px', color: 'var(--text-light)' }}>
                Reception Desk • Operational CRM Records
              </p>
            </div>

            {/* Communication Actions (Screen only) */}
            <div className="no-print" style={{
              marginTop: '16px',
              display: 'flex',
              gap: '10px'
            }}>
              <button
                type="button"
                onClick={() => {
                  const phone = visit.client_phone?.replace(/\D/g, '') || '';
                  const fullPhone = phone.startsWith('91') ? phone : `91${phone}`;
                  const name = [visit.client_name, visit.client_surname].filter(Boolean).join(' ');
                  const regNo = visit.client_reg_no || '';
                  const msg = `Dear ${name},\n\nThank you for visiting Maison BeYou Aesthetic Studio!\n\n✨ Registration No: *${regNo}*\nInvoice: *INV-MBY-${String(visit.visit_id).padStart(5, '0')}*\nTotal Paid: *${formatCurrency(visit.amount_paid)}*\n\nWe look forward to curating your next aesthetic privilege.`;
                  window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#25D366',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <MessageCircle size={15} />
                WhatsApp Thank You
              </button>

              <button
                type="button"
                onClick={() => {
                  const email = visit.client_email || '';
                  const name = [visit.client_name, visit.client_surname].filter(Boolean).join(' ');
                  const regNo = visit.client_reg_no || '';
                  const subject = `Thank you for visiting Maison BeYou | Invoice INV-MBY-${String(visit.visit_id).padStart(5, '0')}`;
                  const body = `Dear ${name},\n\nThank you for your visit to Maison BeYou Aesthetic & Beauty Studio!\n\nRegistration No: ${regNo}\nInvoice Number: INV-MBY-${String(visit.visit_id).padStart(5, '0')}\nTotal: ${formatCurrency(visit.total_amount)}\nAmount Paid: ${formatCurrency(visit.amount_paid)}\n\nWarm regards,\nMaison BeYou Concierge`;
                  window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                }}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#FAF6EE',
                  color: '#B88B4A',
                  border: '1px solid #DAC493',
                  fontSize: '12px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Mail size={15} />
                Email Mailer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

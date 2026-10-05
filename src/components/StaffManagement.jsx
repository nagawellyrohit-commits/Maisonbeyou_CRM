import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Phone, Award, Sparkles, User, Check, X } from 'lucide-react';
import { apiRequest, formatCurrency, formatPhone } from '../utils/api';

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/admin/staff');
      setStaff(res.staff || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleOpenModal = (s = null) => {
    if (s) {
      setModal({ open: true, mode: 'edit', data: s });
      setName(s.name);
      setRole(s.role);
      setPhone(s.phone || '');
    } else {
      setModal({ open: true, mode: 'create', data: null });
      setName('');
      setRole('Senior Aesthetician');
      setPhone('');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'create') {
        await apiRequest('/admin/staff', {
          method: 'POST',
          body: JSON.stringify({ name, role, phone })
        });
      } else {
        await apiRequest(`/admin/staff/${modal.data.staff_id}`, {
          method: 'PUT',
          body: JSON.stringify({ name, role, phone })
        });
      }
      setModal({ open: false, mode: 'create', data: null });
      fetchStaff();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleActive = async (s) => {
    try {
      await apiRequest(`/admin/staff/${s.staff_id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: s.active === 1 ? 0 : 1 })
      });
      fetchStaff();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#B88B4A', fontWeight: '700' }}>
            Team Management
          </div>
          <h1 style={{ fontSize: '28px', color: '#1C1917' }}>
            STUDIO PRACTITIONERS & STAFF
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Service providers assigned during visit reception with treatment performance metrics.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="btn-primary"
          style={{ padding: '10px 20px', fontSize: '14px' }}
        >
          <Plus size={16} />
          + Add Staff Member
        </button>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading staff directory...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {staff.map(s => (
            <div
              key={s.staff_id}
              className="card"
              style={{
                padding: '24px',
                opacity: s.active === 1 ? 1 : 0.65,
                border: s.active === 1 ? '1px solid var(--border-color)' : '1px dashed var(--border-color)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'var(--primary-subtle)',
                    color: '#B88B4A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '18px'
                  }}>
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '18px', color: '#1C1917' }}>
                      {s.name}
                    </h2>
                    <div style={{ fontSize: '13px', color: '#B88B4A', fontWeight: '600' }}>
                      {s.role}
                    </div>
                  </div>
                </div>

                <span className={`badge ${s.active === 1 ? 'badge-paid' : 'badge-neutral'}`} style={{ fontSize: '11px' }}>
                  {s.active === 1 ? 'Active' : 'Inactive'}
                </span>
              </div>

              {s.phone && (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px' }}>
                  <Phone size={14} color="#B88B4A" />
                  <span>{formatPhone(s.phone)}</span>
                </div>
              )}

              {/* Performance Stats */}
              <div style={{
                marginTop: '16px',
                padding: '12px 14px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>
                    Services Done
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>
                    {s.total_services || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>
                    Revenue Handled
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#166534', marginTop: '2px' }}>
                    {formatCurrency(s.total_revenue || 0)}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--border-light)' }}>
                <button
                  onClick={() => handleToggleActive(s)}
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: '#FFFFFF',
                    color: s.active === 1 ? '#DC2626' : '#166534',
                    fontWeight: '600'
                  }}
                >
                  {s.active === 1 ? 'Set Inactive' : 'Set Active'}
                </button>

                <button
                  onClick={() => handleOpenModal(s)}
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: '#FFFFFF',
                    color: 'var(--text-main)',
                    fontWeight: '600',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Edit2 size={13} />
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Staff Modal */}
      {modal.open && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28,25,23,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card animate-fade-in" style={{ maxWidth: '440px', width: '100%', padding: '28px' }}>
            <h2 style={{ fontSize: '20px', color: '#1C1917', marginBottom: '4px' }}>
              {modal.mode === 'create' ? 'Add Staff Member' : 'Edit Staff Details'}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Staff members are selectable during service provider assignment.
            </p>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Ananya Sharma"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Designation / Role *
                </label>
                <input
                  type="text"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Senior Aesthetician / Laser Specialist"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98201 11223"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModal({ open: false, mode: 'create', data: null })}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

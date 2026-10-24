import React, { useState, useEffect } from 'react';
import { Search, UserCheck, Eye, ArrowRight, Clock, AlertCircle, CheckCircle2, UserX } from 'lucide-react';
import { apiRequest, formatCurrency, formatDate, formatPhone } from '../utils/api';

export default function ClientsList({ onOpenClient, onBackToDashboard }) {
  const [clients, setClients] = useState([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'

  useEffect(() => {
    async function loadClients() {
      try {
        setLoading(true);
        const url = `/clients/search?q=${encodeURIComponent(query)}&status=${statusFilter === 'all' ? '' : statusFilter}`;
        const res = await apiRequest(url);
        setClients(res.clients || []);
        if (res.totalCount !== undefined) {
          setCounts({
            total: res.totalCount || 0,
            active: res.activeCount || 0,
            inactive: res.inactiveCount || 0
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    const timer = setTimeout(loadClients, 200);
    return () => clearTimeout(timer);
  }, [query, statusFilter]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', color: '#1C1917', margin: '0 0 6px 0' }}>Client Directory</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Search registered clients, review treatment dossiers, and track 90-day engagement status.
          </p>
        </div>

        {/* 90-Day Policy Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: '#FAF6EE',
          border: '1px solid #DAC493',
          padding: '6px 14px',
          borderRadius: '9999px',
          fontSize: '12px',
          color: '#8C6228',
          fontWeight: '600'
        }}>
          <Clock size={14} color="#B88B4A" />
          <span>90-Day Inactivity Rule: Clients with no visit in &gt;90 days are marked Inactive</span>
        </div>
      </div>

      {/* Controls: Search + Status Filter Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Search Input */}
        <div className="card" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', width: '100%', maxWidth: '440px' }}>
          <Search size={17} color="#B88B4A" style={{ marginRight: '10px', flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, registration ID or phone..."
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: '13.5px'
            }}
          />
        </div>

        {/* Status Filter Segmented Controls */}
        <div style={{
          display: 'inline-flex',
          background: '#FAF6EE',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid #DAC493',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: statusFilter === 'all' ? 'linear-gradient(135deg, #B88B4A 0%, #9F7335 100%)' : 'transparent',
              color: statusFilter === 'all' ? '#FFFFFF' : '#8C6228',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <span>All Clients</span>
            {counts.total > 0 && (
              <span style={{
                background: statusFilter === 'all' ? 'rgba(255,255,255,0.25)' : '#EEDBBE',
                color: statusFilter === 'all' ? '#FFFFFF' : '#6A491A',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '10.5px'
              }}>
                {counts.total}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: statusFilter === 'active' ? '#16a34a' : 'transparent',
              color: statusFilter === 'active' ? '#FFFFFF' : '#166534',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusFilter === 'active' ? '#FFFFFF' : '#16a34a' }} />
            <span>Active</span>
            {counts.active > 0 && (
              <span style={{
                background: statusFilter === 'active' ? 'rgba(255,255,255,0.25)' : '#DCFCE7',
                color: statusFilter === 'active' ? '#FFFFFF' : '#166534',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '10.5px'
              }}>
                {counts.active}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: statusFilter === 'inactive' ? '#dc2626' : 'transparent',
              color: statusFilter === 'inactive' ? '#FFFFFF' : '#991B1B',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusFilter === 'inactive' ? '#FFFFFF' : '#dc2626' }} />
            <span>Inactive</span>
            {counts.inactive > 0 && (
              <span style={{
                background: statusFilter === 'inactive' ? 'rgba(255,255,255,0.25)' : '#FEE2E2',
                color: statusFilter === 'inactive' ? '#FFFFFF' : '#991B1B',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '10.5px'
              }}>
                {counts.inactive}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Clients Table Card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading clients...
          </div>
        ) : clients.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No clients found matching "{query}" {statusFilter !== 'all' ? `(${statusFilter})` : ''}.
          </div>
        ) : (
          <div className="horizontal-scroller" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 20px', fontWeight: '600' }}>Client Name</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Mobile Number</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Total Visits</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Lifetime Spend</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Last Visit</th>
                  <th style={{ padding: '14px 20px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => {
                  const isInactive = c.status === 'inactive' || c.is_inactive;
                  const daysAgo = c.days_since_last_visit;

                  return (
                    <tr
                      key={c.client_id}
                      style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-subtle)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* 1. Client Name + Registration No */}
                      <td style={{ padding: '14px 20px', fontWeight: '600', color: '#1C1917' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span
                            onClick={() => onOpenClient(c.client_id)}
                            style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'text-decoration-color 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecorationColor = '#B88B4A'}
                            onMouseLeave={(e) => e.currentTarget.style.textDecorationColor = 'transparent'}
                          >
                            {[c.name, c.surname].filter(Boolean).join(' ')}
                          </span>
                          {c.reg_no && (
                            <span style={{ fontSize: '11px', color: '#B88B4A', fontWeight: '600', marginTop: '2px' }}>
                              {c.reg_no}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Mobile Number */}
                      <td style={{ padding: '14px 16px', color: '#B88B4A', fontWeight: '500' }}>
                        {formatPhone(c.phone)}
                      </td>

                      {/* 3. Dynamic Active / Inactive Status (90-Day Rule) */}
                      <td style={{ padding: '14px 16px' }}>
                        {isInactive ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: '#FEE2E2',
                            color: '#991B1B',
                            border: '1px solid #FECACA',
                            whiteSpace: 'nowrap'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#DC2626' }} />
                            Inactive
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: '#ECFDF5',
                            color: '#065F46',
                            border: '1px solid #A7F3D0',
                            whiteSpace: 'nowrap'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                            Active
                          </span>
                        )}
                      </td>

                      {/* 4. Total Visits */}
                      <td style={{ padding: '14px 16px', fontWeight: '600' }}>
                        <span className="badge badge-neutral">
                          {c.total_visits} visits
                        </span>
                      </td>

                      {/* 5. Lifetime Spend */}
                      <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--text-main)' }}>
                        {formatCurrency(c.total_spend)}
                      </td>

                      {/* 6. Last Visit with Days Ago Recency */}
                      <td style={{ padding: '14px 16px' }}>
                        {c.last_visit_date ? (
                          <div>
                            <div style={{ color: '#1C1917', fontWeight: '500' }}>
                              {formatDate(c.last_visit_date)}
                            </div>
                            <div style={{
                              fontSize: '11px',
                              color: isInactive ? '#DC2626' : '#059669',
                              fontWeight: '600',
                              marginTop: '2px'
                            }}>
                              {daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`}
                              {isInactive && ' (>90 days)'}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Never</span>
                            <span style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginTop: '2px' }}>
                              No visit on file
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 7. Actions */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => onOpenClient(c.client_id)}
                            style={{
                              padding: '6px 14px',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '12px',
                              fontWeight: '600',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#FAF6EE';
                              e.currentTarget.style.borderColor = '#B88B4A';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'var(--bg-surface)';
                              e.currentTarget.style.borderColor = 'var(--border-color)';
                            }}
                          >
                            <Eye size={14} color="#B88B4A" />
                            View Dossier
                          </button>
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
    </div>
  );
}

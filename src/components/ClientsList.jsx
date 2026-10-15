import React, { useState, useEffect } from 'react';
import { Search, UserCheck, Eye, ArrowRight } from 'lucide-react';
import { apiRequest, formatCurrency, formatDate, formatPhone } from '../utils/api';

export default function ClientsList({ onOpenClient, onBackToDashboard }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    async function loadClients() {
      try {
        setLoading(true);
        const res = await apiRequest(`/clients/search?q=${encodeURIComponent(query)}`);
        setClients(res.clients || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    const timer = setTimeout(loadClients, 200);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', color: '#1C1917' }}>Client Directory</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Search registered clients, review treatment dossiers, and initiate check-ins.
          </p>
        </div>

      </div>

      {/* Search Input */}
      <div className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', maxWidth: '520px' }}>
        <Search size={18} color="#B88B4A" style={{ marginRight: '10px' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name or mobile number..."
          style={{
            border: 'none',
            background: 'transparent',
            outline: 'none',
            width: '100%',
            fontSize: '14px'
          }}
        />
      </div>

      {/* Clients Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading clients...
          </div>
        ) : clients.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No clients found matching "{query}".
          </div>
        ) : (
          <div className="horizontal-scroller" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 20px', fontWeight: '600' }}>Client Name</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Mobile Number</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Total Visits</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Lifetime Spend</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Last Visit</th>
                  <th style={{ padding: '14px 20px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr
                    key={c.client_id}
                    style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-subtle)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
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
                    <td style={{ padding: '14px 16px', color: '#B88B4A', fontWeight: '500' }}>
                      {formatPhone(c.phone)}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '600' }}>
                      <span className="badge badge-neutral">
                        {c.total_visits} visits
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--text-main)' }}>
                      {formatCurrency(c.total_spend)}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                      {formatDate(c.last_visit_date)}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', whiteSpace: 'nowrap' }}>
                        <button
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
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <Eye size={14} color="#B88B4A" />
                          View Dossier
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

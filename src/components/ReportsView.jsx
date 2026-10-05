import React, { useState, useEffect } from 'react';
import { 
  BarChart3, IndianRupee, Users, Sparkles, Award, 
  TrendingUp, Calendar, ChevronRight 
} from 'lucide-react';
import { apiRequest, formatCurrency } from '../utils/api';

export default function ReportsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true);
        const res = await apiRequest('/reports');
        setData(res);
        setError('');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Generating studio operational reports...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#DC2626' }}>
        {error || 'Failed to load reports'}
      </div>
    );
  }

  const { revenue, clients, top_services = [], categories = [], staff_performance = [] } = data;

  const maxServiceCount = Math.max(...top_services.map(s => s.times_performed), 1);
  const maxStaffRevenue = Math.max(...staff_performance.map(s => s.revenue_generated), 1);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Title */}
      <div>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#B88B4A', fontWeight: '700' }}>
          Studio Performance
        </div>
        <h1 style={{ fontSize: '28px', color: '#1C1917' }}>
          EXECUTIVE REPORTING & ANALYTICS
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Phase 1 business intelligence for revenue, clients, service distribution, and staff productivity.
        </p>
      </div>

      {/* Revenue Section (Today, This Week, This Month, All Time) */}
      <div>
        <h2 style={{ fontSize: '16px', color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IndianRupee size={18} color="#B88B4A" />
          REVENUE BREAKDOWN
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>
              Today's Revenue
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#1C1917', marginTop: '6px' }}>
              {formatCurrency(revenue.today)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {revenue.today_visits} visits recorded today
            </div>
          </div>

          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>
              Last 7 Days (Week)
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#1C1917', marginTop: '6px' }}>
              {formatCurrency(revenue.week)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {revenue.week_visits} total visits completed
            </div>
          </div>

          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>
              This Month
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#166534', marginTop: '6px' }}>
              {formatCurrency(revenue.month)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {revenue.month_visits} visits this calendar month
            </div>
          </div>

          <div className="card" style={{ padding: '20px 22px', background: 'linear-gradient(135deg, #FAF7F2 0%, #FFFFFF 100%)', border: '1px solid var(--primary-border)' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#B88B4A', fontWeight: '700' }}>
              Lifetime Studio Gross
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#B88B4A', marginTop: '6px' }}>
              {formatCurrency(revenue.all_time)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {revenue.total_visits} total recorded transactions
            </div>
          </div>
        </div>
      </div>

      {/* Clients Section (New vs Returning) */}
      <div>
        <h2 style={{ fontSize: '16px', color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} color="#B88B4A" />
          CLIENT RETENTION & ACQUISITION
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>
              Total Registered Clients
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-main)', marginTop: '4px' }}>
              {clients.total}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Unique clients in CRM database</div>
          </div>

          <div className="card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>
              New Clients (1 Visit)
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#166534', marginTop: '4px' }}>
              {clients.new}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {clients.total > 0 ? Math.round((clients.new / clients.total) * 100) : 0}% acquisition share
            </div>
          </div>

          <div className="card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>
              Returning Clients (2+ Visits)
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#1E40AF', marginTop: '4px' }}>
              {clients.regular}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {clients.total > 0 ? Math.round((clients.regular / clients.total) * 100) : 0}% regular repeat rate
            </div>
          </div>
        </div>
      </div>

      {/* Services Breakdown (Most performed & Revenue by category) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        
        {/* Most Performed Services */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', color: 'var(--text-main)', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            TOP PERFORMED SERVICES
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {top_services.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No service data yet</div>
            ) : (
              top_services.map((s, idx) => {
                const percentage = Math.round((s.times_performed / maxServiceCount) * 100);
                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600', color: '#1C1917' }}>
                        {idx + 1}. {s.service_name}
                      </span>
                      <span style={{ fontWeight: '700', color: '#B88B4A' }}>
                        {s.times_performed} sessions ({formatCurrency(s.total_revenue)})
                      </span>
                    </div>
                    <div style={{ height: '7px', background: 'var(--bg-surface)', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${percentage}%`,
                        background: 'linear-gradient(90deg, #B88B4A 0%, #D4AF37 100%)',
                        borderRadius: '9999px'
                      }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Revenue by Category */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', color: 'var(--text-main)', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            REVENUE BY CATEGORY
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {categories.map((c, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: 'var(--bg-card-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: '#1C1917' }}>
                    {c.category_name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {c.total_services} treatments performed
                  </div>
                </div>
                <div style={{ fontWeight: '700', color: '#B88B4A', fontSize: '14px' }}>
                  {formatCurrency(c.total_revenue)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff Productivity & Revenue Handled */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', color: 'var(--text-main)', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          PRACTITIONER & STAFF PERFORMANCE
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {staff_performance.map((sp, idx) => (
            <div
              key={idx}
              style={{
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: '#1C1917' }}>
                    {sp.staff_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#B88B4A', fontWeight: '500' }}>
                    {sp.role}
                  </div>
                </div>
                <span className="badge badge-gold">
                  {sp.services_count} services
                </span>
              </div>

              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Revenue Handled:</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#166534' }}>
                  {formatCurrency(sp.revenue_generated)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

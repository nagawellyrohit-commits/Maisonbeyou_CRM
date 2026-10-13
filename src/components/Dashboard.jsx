import React, { useState, useEffect, useRef } from 'react';
import {
  Users, UserPlus, UserCheck, Sparkles, IndianRupee, AlertCircle,
  Search, ArrowRight, Clock, Plus, Receipt, Eye, CheckCircle2, LayoutDashboard,
  Menu, ChevronDown, Scissors, Award, BarChart3
} from 'lucide-react';
import { apiRequest, formatCurrency, formatDate, formatPhone } from '../utils/api';

export default function Dashboard({ currentUser, onStartVisit, onOpenClient, onOpenReceipt, onBackToDashboard, onNavigateTab }) {
  const isAdmin = currentUser?.role === 'admin';
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const adminMenuRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ summary: {}, visits: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function handleClickOutside(event) {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target)) {
        setShowAdminMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/dashboard/today');
      setData(res);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
      fetchDashboardData();
    }, []);

  // Live client search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
          const res = await apiRequest(`/clients/search?q=${encodeURIComponent(searchQuery.trim())}`);
          setSearchResults(res.clients || []);
        } catch (e) {
          console.error(e);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const summary = data.summary || {
    total_clients: 0,
    new_clients: 0,
    regular_clients: 0,
    total_services: 0,
    total_revenue: 0,
    pending_balance: 0
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

      {/* Top Banner / Hero with Search & Quick Action */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-xl)',
        padding: '28px 32px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        <div style={{ maxWidth: '420px' }}>
          <div style={{
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: '#B88B4A',
            fontWeight: '700',
            marginBottom: '4px'
          }}>
            Reception Operations
          </div>
          <h1 style={{ fontSize: '26px', color: '#1C1917', lineHeight: 1.2 }}>
            Today's Studio Overview
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Fast client check-in, service selection, and instant history lookup.
          </p>
        </div>

        {/* Instant Client Search Bar (Prominent requirement) */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '460px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-card-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--border-color)',
            padding: '4px 14px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            transition: 'border-color 0.2s'
          }}>
            <Search size={18} color="#B88B4A" style={{ marginRight: '10px' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search client by mobile (e.g. 98201...) or name"
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                width: '100%',
                padding: '10px 0',
                fontSize: '14px',
                color: 'var(--text-main)'
              }}
            />
            {isSearching && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Searching...</span>
            )}
          </div>

          {/* Instant Search Results Dropdown */}
          {searchQuery.trim().length >= 2 && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              background: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)',
              maxHeight: '340px',
              overflowY: 'auto',
              zIndex: 100,
              padding: '6px'
            }}>
              {searchResults.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {isSearching ? 'Looking up client database...' : 'No client found matching your search. Create a new client visit below.'}
                </div>
              ) : (
                searchResults.map(c => (
                  <div
                    key={c.client_id}
                    onClick={() => {
                      if (isAdmin) {
                        onOpenClient(c.client_id);
                      } else {
                        onStartVisit('regular', c);
                      }
                      setSearchQuery('');
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-light)',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-subtle)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-main)' }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '12px', marginTop: '2px' }}>
                        <span>{formatPhone(c.phone)}</span>
                        <span>•</span>
                        <span>{c.total_visits} Visits</span>
                        <span>•</span>
                        <span>Last: {formatDate(c.last_visit_date)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartVisit('regular', c);
                          setSearchQuery('');
                        }}
                        style={{
                          fontSize: '12px',
                          padding: '5px 10px',
                          background: 'var(--primary-subtle)',
                          color: '#B88B4A',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: '600',
                          border: '1px solid var(--primary-border)'
                        }}
                      >
                        + New Visit
                      </button>
                      <ArrowRight size={16} color="var(--text-light)" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onStartVisit()}
            className="btn-primary"
            style={{ padding: '13px 22px', fontSize: '14px' }}
          >
            <Plus size={18} />
            Record New Visit
          </button>

          {isAdmin ? (
            <div ref={adminMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowAdminMenu(prev => !prev)}
                title="Admin Management Menu"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 20px',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#44403C',
                  background: showAdminMenu ? '#F5ECE0' : '#FAF6EE',
                  border: `1px solid ${showAdminMenu ? '#B88B4A' : 'rgba(218, 196, 147, 0.45)'}`,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F5ECE0';
                  e.currentTarget.style.borderColor = '#B88B4A';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = showAdminMenu ? '#F5ECE0' : '#FAF6EE';
                  e.currentTarget.style.borderColor = showAdminMenu ? '#B88B4A' : 'rgba(218, 196, 147, 0.45)';
                }}
              >
                <Menu size={16} color="#B88B4A" />
                <span>Menu</span>
                <ChevronDown
                  size={14}
                  color="#B88B4A"
                  style={{
                    transform: showAdminMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }}
                />
              </button>

              {/* Admin Menu Dropdown */}
              {showAdminMenu && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  width: '230px',
                  background: '#FFFFFF',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--border-color)',
                  padding: '8px',
                  zIndex: 100,
                  animation: 'fadeIn 0.15s ease-out'
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#B88B4A',
                    padding: '6px 10px 8px 10px',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '6px'
                  }}>
                    Admin Modules
                  </div>

                  {[
                    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                    { id: 'clients', label: 'Clients', icon: Users },
                    { id: 'services', label: 'Services', icon: Scissors },
                    { id: 'staff', label: 'Staff', icon: Award },
                    { id: 'reports', label: 'Reports', icon: BarChart3 }
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setShowAdminMenu(false);
                          if (item.id === 'dashboard') {
                            setSearchQuery('');
                            fetchDashboardData();
                            if (onBackToDashboard) onBackToDashboard();
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          } else {
                            if (onNavigateTab) onNavigateTab(item.id);
                          }
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '9px 12px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '13.5px',
                          fontWeight: item.id === 'dashboard' ? '600' : '500',
                          color: item.id === 'dashboard' ? '#B88B4A' : 'var(--text-main)',
                          background: item.id === 'dashboard' ? 'var(--primary-subtle)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          cursor: 'pointer',
                          transition: 'background 0.1s ease',
                          border: 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (item.id !== 'dashboard') e.currentTarget.style.background = 'var(--bg-card-subtle)';
                        }}
                        onMouseLeave={(e) => {
                          if (item.id !== 'dashboard') e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Icon size={16} color={item.id === 'dashboard' ? '#B88B4A' : 'var(--text-muted)'} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                fetchDashboardData();
                if (onBackToDashboard) onBackToDashboard();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 20px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#B88B4A',
                background: '#FAF6EE',
                border: '1px solid rgba(218, 196, 147, 0.45)',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
            >
              <LayoutDashboard size={17} color="#B88B4A" />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Today's Summary Grid (Section 3 Requirement) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '18px', color: 'var(--text-main)' }}>TODAY'S SUMMARY</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>• Real-time operational metrics</span>
          </div>
          <button
            onClick={fetchDashboardData}
            style={{ fontSize: '12px', color: '#B88B4A', fontWeight: '600' }}
          >
            ↻ Refresh Data
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {/* Total Clients */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>
                  Clients Today
                </div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-main)', marginTop: '4px', fontFamily: 'var(--font-sans)' }}>
                  {summary.total_clients}
                </div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={20} color="#B88B4A" />
              </div>
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Studio appointments & walk-ins
            </div>
          </div>

          {/* New Clients */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>
                  New Clients
                </div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#166534', marginTop: '4px', fontFamily: 'var(--font-sans)' }}>
                  {summary.new_clients}
                </div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserPlus size={20} color="#166534" />
              </div>
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
              First-time studio registrations
            </div>
          </div>

          {/* Returning / Regular Clients */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>
                  Regular Clients
                </div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#1E40AF', marginTop: '4px', fontFamily: 'var(--font-sans)' }}>
                  {summary.regular_clients}
                </div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCheck size={20} color="#1E40AF" />
              </div>
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Returning repeat clients
            </div>
          </div>

          {/* Total Services */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>
                  Total Services
                </div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#7E22CE', marginTop: '4px', fontFamily: 'var(--font-sans)' }}>
                  {summary.total_services}
                </div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#FAF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={20} color="#7E22CE" />
              </div>
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Procedures & treatments performed
            </div>
          </div>

          {/* Total Revenue */}
          <div className="card" style={{ padding: '20px 22px', background: 'linear-gradient(135deg, #FAF6EE 0%, #FFFFFF 100%)', border: '1px solid var(--primary-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#B88B4A', fontWeight: '700', letterSpacing: '0.05em' }}>
                  Revenue Today
                </div>
                <div style={{ fontSize: '30px', fontWeight: '700', color: '#1C1917', marginTop: '4px', fontFamily: 'var(--font-sans)' }}>
                  {formatCurrency(summary.total_revenue)}
                </div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IndianRupee size={20} color="#B88B4A" />
              </div>
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#B88B4A', fontWeight: '500' }}>
              Collected across Cash, UPI & Card
            </div>
          </div>

          {/* Pending Balance */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.05em' }}>
                  Pending Balance
                </div>
                <div style={{ fontSize: '30px', fontWeight: '700', color: summary.pending_balance > 0 ? '#DC2626' : 'var(--text-main)', marginTop: '4px', fontFamily: 'var(--font-sans)' }}>
                  {formatCurrency(summary.pending_balance)}
                </div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: summary.pending_balance > 0 ? 'var(--danger-bg)' : 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={20} color={summary.pending_balance > 0 ? '#DC2626' : 'var(--text-muted)'} />
              </div>
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Outstanding customer balances
            </div>
          </div>
        </div>
      </div>

      {/* Today's Visits Table (Section 3 Requirement) */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: '18px', color: 'var(--text-main)' }}>TODAY'S VISITS</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              All client visits, assigned therapists, billing, and payment records for today
            </p>
          </div>
          <span className="badge badge-gold">
            {data.visits.length} Visits Logged
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading today's records...
          </div>
        ) : data.visits.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Sparkles size={36} color="#B88B4A" style={{ marginBottom: '12px', opacity: 0.8 }} />
            <h3 style={{ fontSize: '18px', color: 'var(--text-main)', marginBottom: '6px' }}>No Visits Recorded Today Yet</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Click below to register the first client walk-in or returning client visit.
            </p>
            <button onClick={() => onStartVisit()} className="btn-primary">
              <Plus size={16} />
              + Create First Visit Today
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '14px 20px', fontWeight: '600' }}>Client Name</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Type</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Services</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Amount</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Payment Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Staff</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Time</th>
                  <th style={{ padding: '14px 20px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.visits.map((v) => {
                  const visitTime = v.created_at ? new Date(v.created_at).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  }) : '—';

                  let statusBadgeClass = 'badge-paid';
                  if (v.payment_status === 'Partially Paid') statusBadgeClass = 'badge-partial';
                  if (v.payment_status === 'Pending') statusBadgeClass = 'badge-pending';

                  return (
                    <tr
                      key={v.visit_id}
                      style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-subtle)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Client Name */}
                      <td style={{ padding: '14px 20px' }}>
                        {isAdmin ? (
                          <div
                            onClick={() => onOpenClient(v.client_id)}
                            style={{ fontWeight: '600', color: '#1C1917', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'text-decoration-color 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecorationColor = '#B88B4A'}
                            onMouseLeave={(e) => e.currentTarget.style.textDecorationColor = 'transparent'}
                          >
                            {v.client_name}
                          </div>
                        ) : (
                          <div style={{ fontWeight: '600', color: '#1C1917' }}>
                            {v.client_name}
                          </div>
                        )}
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {formatPhone(v.client_phone)}
                        </div>
                      </td>

                      {/* New / Regular */}
                      <td style={{ padding: '14px 16px' }}>
                        {v.is_new_client ? (
                          <span className="badge badge-paid" style={{ fontSize: '11px' }}>
                            New Client
                          </span>
                        ) : (
                          <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                            Regular Client
                          </span>
                        )}
                      </td>

                      {/* Services */}
                      <td style={{ padding: '14px 16px', maxWidth: '280px' }}>
                        <div style={{ fontWeight: '500', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.service_names}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {v.services_count} service{v.services_count > 1 ? 's' : ''}
                        </div>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                          {formatCurrency(v.total_amount)}
                        </div>
                        {v.balance > 0 && (
                          <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: '500' }}>
                            Bal: {formatCurrency(v.balance)}
                          </div>
                        )}
                      </td>

                      {/* Payment Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge ${statusBadgeClass}`}>
                          {v.payment_status}
                        </span>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Via {v.payment_method}
                        </div>
                      </td>

                      {/* Staff */}
                      <td style={{ padding: '14px 16px', color: 'var(--text-main)', fontSize: '13px' }}>
                        {v.staff_summary}
                      </td>

                      {/* Time */}
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={13} color="var(--text-light)" />
                          {visitTime}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => onOpenReceipt(v.visit_id)}
                            title="View / Print Receipt"
                            style={{
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-color)',
                              fontSize: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: '500',
                              color: 'var(--text-main)'
                            }}
                          >
                            <Receipt size={14} color="#B88B4A" />
                            Bill
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => onOpenClient(v.client_id)}
                              title="Open Client Profile"
                              style={{
                                padding: '6px 10px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--primary-subtle)',
                                border: '1px solid var(--primary-border)',
                                fontSize: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: '600',
                                color: '#B88B4A'
                              }}
                            >
                              <Eye size={14} />
                              Profile
                            </button>
                          )}
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

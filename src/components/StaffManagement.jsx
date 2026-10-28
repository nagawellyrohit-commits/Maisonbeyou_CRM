import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Phone, Award, Sparkles, User, Check, X,
  Upload, FileText, ExternalLink, Trash2, ShieldCheck,
  DollarSign, Percent, Calculator, AlertCircle, FileCheck, Landmark
} from 'lucide-react';
import { apiRequest, formatCurrency, formatPhone } from '../utils/api';

const ROLE_PRESETS = [
  'Senior Aesthetician',
  'Laser Specialist',
  'Dermatologist',
  'Cosmetologist',
  'Trichologist',
  'Beauty Therapist',
  'Clinic Consultant'
];

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState('Senior Aesthetician');
  const [phone, setPhone] = useState('');

  // KYC & ID states
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarDoc, setAadhaarDoc] = useState('');
  const [aadhaarUploading, setAadhaarUploading] = useState(false);

  const [panNumber, setPanNumber] = useState('');
  const [panDoc, setPanDoc] = useState('');
  const [panUploading, setPanUploading] = useState(false);

  // Compensation / Salary Category states
  const [salaryType, setSalaryType] = useState('fixed'); // 'fixed' | 'salary_plus_incentive'
  const [salaryAmount, setSalaryAmount] = useState('');
  const [incentivePercentage, setIncentivePercentage] = useState('');

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
      setName(s.name || '');
      setRole(s.role || '');
      setPhone(s.phone || '');
      setAadhaarNumber(s.aadhaar_number || '');
      setAadhaarDoc(s.aadhaar_doc || '');
      setPanNumber(s.pan_number || '');
      setPanDoc(s.pan_doc || '');
      setSalaryType(s.salary_type || 'fixed');
      setSalaryAmount(s.salary_amount !== undefined && s.salary_amount !== null ? String(s.salary_amount) : '');
      setIncentivePercentage(s.incentive_percentage !== undefined && s.incentive_percentage !== null ? String(s.incentive_percentage) : '');
    } else {
      setModal({ open: true, mode: 'create', data: null });
      setName('');
      setRole('Senior Aesthetician');
      setPhone('');
      setAadhaarNumber('');
      setAadhaarDoc('');
      setPanNumber('');
      setPanDoc('');
      setSalaryType('fixed');
      setSalaryAmount('');
      setIncentivePercentage('');
    }
  };

  const handleFileUpload = async (e, docType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isAadhaar = docType === 'aadhaar';
    if (isAadhaar) setAadhaarUploading(true);
    else setPanUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiRequest('/admin/upload', {
        method: 'POST',
        body: formData
      });
      if (res.url) {
        if (isAadhaar) {
          setAadhaarDoc(res.url);
        } else {
          setPanDoc(res.url);
        }
      }
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Upload failed: ' + (err.message || 'Please check file format/size'));
    } finally {
      if (isAadhaar) setAadhaarUploading(false);
      else setPanUploading(false);
      e.target.value = '';
    }
  };

  // Format Aadhaar: 12 digits formatted as XXXX XXXX XXXX
  const handleAadhaarChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    setAadhaarNumber(formatted);
  };

  // Format PAN: 10 chars uppercase alphanumeric
  const handlePanChange = (e) => {
    const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    setPanNumber(cleaned);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: name.trim(),
        role: role.trim(),
        phone: phone.trim(),
        aadhaar_number: aadhaarNumber.trim(),
        aadhaar_doc: aadhaarDoc,
        pan_number: panNumber.trim().toUpperCase(),
        pan_doc: panDoc,
        salary_type: salaryType,
        salary_amount: Number(salaryAmount) || 0,
        incentive_percentage: salaryType === 'salary_plus_incentive' ? (Number(incentivePercentage) || 0) : 0
      };

      if (modal.mode === 'create') {
        await apiRequest('/admin/staff', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest(`/admin/staff/${modal.data.staff_id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
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
          <h1 style={{ fontSize: '26px', color: '#1C1917', margin: 0, paddingLeft: '20px' }}>
            Studio Practitioners & Team
          </h1>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="btn-primary"
          style={{ padding: '10px 20px', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', marginRight: '20px' }}
        >
          <Plus size={16} />
          Add Team Member
        </button>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading staff directory...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '20px' }}>
          {staff.map(s => {
            const hasSalaryPlusIncentive = s.salary_type === 'salary_plus_incentive';
            const incentivePct = Number(s.incentive_percentage) || 0;
            const salaryAmt = Number(s.salary_amount) || 0;
            const totalRevenue = Number(s.total_revenue) || 0;
            const earnedIncentive = Number(s.earned_incentive) || (hasSalaryPlusIncentive ? Math.round((totalRevenue * incentivePct) / 100) : 0);
            const totalPayout = Number(s.total_estimated_payout) || (hasSalaryPlusIncentive ? (salaryAmt + earnedIncentive) : salaryAmt);

            const hasKyc = !!(s.aadhaar_number || s.aadhaar_doc || s.pan_number || s.pan_doc);

            return (
              <div
                key={s.staff_id}
                className="card"
                style={{
                  padding: '24px',
                  opacity: s.active === 1 ? 1 : 0.65,
                  border: s.active === 1 ? '1px solid #EADBBE' : '1px dashed #D6D3D1',
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  transition: 'box-shadow 0.2s ease'
                }}
              >
                <div>
                  {/* Card Header: Avatar, Name, Role, Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: '#FAF8F5',
                        color: '#8C6228',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '17px',
                        border: '1px solid #EADBBE'
                      }}>
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <h2 style={{ fontSize: '17px', color: '#1C1917', fontWeight: '700', margin: 0 }}>
                          {s.name}
                        </h2>
                        <div style={{ fontSize: '12.5px', color: '#8C6228', fontWeight: '600', marginTop: '2px' }}>
                          {s.role}
                        </div>
                      </div>
                    </div>

                    <span style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: '#FAF8F5',
                      color: s.active === 1 ? '#57534E' : '#78716C',
                      border: '1px solid #EADBBE'
                    }}>
                      {s.active === 1 ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Contact & Remuneration Model Details (Single unified style, no blue/yellow boxes) */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginTop: '14px', fontSize: '12.5px', color: '#57534E' }}>
                    {s.phone && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Phone size={13} color="#8C6228" />
                        <span>{formatPhone(s.phone)}</span>
                      </div>
                    )}

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#1C1917', fontWeight: '600' }}>
                      <DollarSign size={13} color="#8C6228" />
                      <span>
                        {hasSalaryPlusIncentive
                          ? `Base ${formatCurrency(salaryAmt)} + ${incentivePct}% Incentive`
                          : `Fixed Salary: ${formatCurrency(salaryAmt)}/mo`}
                      </span>
                    </div>
                  </div>

                  {/* KYC Details Strip (Clean inline border, single background color) */}
                  <div style={{
                    marginTop: '14px',
                    padding: '12px 0',
                    borderTop: '1px solid #F0ECE4',
                    borderBottom: '1px solid #F0ECE4',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', color: '#78716C', letterSpacing: '0.04em' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <ShieldCheck size={13} color="#8C6228" />
                        KYC & IDENTIFICATION
                      </span>
                      <span style={{ color: hasKyc ? '#8C6228' : '#78716C', fontWeight: '600' }}>
                        {hasKyc ? 'Verified' : 'Pending'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '12px', color: '#44403C' }}>
                      {/* Aadhaar */}
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#78716C' }}>Aadhaar:</span>
                        <span style={{ fontWeight: '500' }}>{s.aadhaar_number ? s.aadhaar_number : 'Not added'}</span>
                        {s.aadhaar_doc && (
                          <a
                            href={s.aadhaar_doc}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              marginLeft: '3px',
                              color: '#8C6228',
                              fontSize: '11px',
                              fontWeight: '600',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              textDecoration: 'underline'
                            }}
                          >
                            <FileText size={11} />
                            Doc
                          </a>
                        )}
                      </div>

                      {/* PAN */}
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#78716C' }}>PAN:</span>
                        <span style={{ fontWeight: '500' }}>{s.pan_number ? s.pan_number : 'Not added'}</span>
                        {s.pan_doc && (
                          <a
                            href={s.pan_doc}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              marginLeft: '3px',
                              color: '#8C6228',
                              fontSize: '11px',
                              fontWeight: '600',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              textDecoration: 'underline'
                            }}
                          >
                            <FileText size={11} />
                            Doc
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Performance & Payout Stats (Clean layout on card, no colored background block) */}
                  <div style={{
                    marginTop: '12px',
                    display: 'grid',
                    gridTemplateColumns: hasSalaryPlusIncentive ? '1fr 1fr' : '1fr 1fr 1fr',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#78716C', fontWeight: '700', letterSpacing: '0.04em' }}>
                        Services Done
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#1C1917', marginTop: '3px' }}>
                        {s.total_services || 0}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#78716C', fontWeight: '700', letterSpacing: '0.04em' }}>
                        Revenue Handled
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#1C1917', marginTop: '3px' }}>
                        {formatCurrency(totalRevenue)}
                      </div>
                    </div>

                    {hasSalaryPlusIncentive ? (
                      <>
                        <div>
                          <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#78716C', fontWeight: '700', letterSpacing: '0.04em' }}>
                            Earned Inc. ({incentivePct}%)
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#8C6228', marginTop: '3px' }}>
                            +{formatCurrency(earnedIncentive)}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#78716C', fontWeight: '700', letterSpacing: '0.04em' }}>
                            Est. Total Payout
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#1C1917', marginTop: '3px' }}>
                            {formatCurrency(totalPayout)}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div>
                        <div style={{ fontSize: '10.5px', textTransform: 'uppercase', color: '#78716C', fontWeight: '700', letterSpacing: '0.04em' }}>
                          Monthly Salary
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#1C1917', marginTop: '3px' }}>
                          {formatCurrency(salaryAmt)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions: Clean unified buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '14px', borderTop: '1px solid #F0ECE4' }}>
                  <button
                    onClick={() => handleToggleActive(s)}
                    style={{
                      fontSize: '12px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #E7E5E4',
                      background: '#FFFFFF',
                      color: '#57534E',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {s.active === 1 ? 'Set Inactive' : 'Set Active'}
                  </button>

                  <button
                    onClick={() => handleOpenModal(s)}
                    style={{
                      fontSize: '12px',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid #DAC493',
                      background: '#FAF8F5',
                      color: '#8C6228',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    <Edit2 size={13} />
                    Edit Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Staff Modal */}
      {modal.open && (
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
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#FFFDF9',
              borderRadius: '16px',
              border: '1px solid #EADBBE',
              boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
              padding: '28px 32px'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <h2 style={{ fontSize: '21px', color: '#1C1917', fontWeight: '700', margin: 0 }}>
                  {modal.mode === 'create' ? 'Add Team Member' : 'Edit Team Member Details'}
                </h2>
                <p style={{ fontSize: '13px', color: '#78716C', marginTop: '4px', margin: 0 }}>
                  Enter practitioner profile, Aadhaar & PAN KYC documents, and compensation model.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModal({ open: false, mode: 'create', data: null })}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#78716C',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* SECTION 1: Personal & Role Details */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                padding: '18px',
                border: '1px solid #EADBBE',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8C6228', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} />
                  Basic Profile
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#292524', marginBottom: '6px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Ananya Sharma"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #D6D3D1',
                      background: '#FFFDF9',
                      fontSize: '13.5px',
                      outline: 'none',
                      color: '#1C1917'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#292524', marginBottom: '6px' }}>
                    Designation / Role *
                  </label>
                  <input
                    type="text"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Senior Aesthetician"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #D6D3D1',
                      background: '#FFFDF9',
                      fontSize: '13.5px',
                      outline: 'none',
                      color: '#1C1917',
                      marginBottom: '8px'
                    }}
                  />
                  {/* Quick role preset pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {ROLE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRole(preset)}
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: role === preset ? '1px solid #B88B4A' : '1px solid #E7E5E4',
                          background: role === preset ? '#FAF6EE' : '#F5F5F4',
                          color: role === preset ? '#8C6228' : '#78716C',
                          fontWeight: role === preset ? '700' : '500',
                          cursor: 'pointer'
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#292524', marginBottom: '6px' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98201 11223"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #D6D3D1',
                      background: '#FFFDF9',
                      fontSize: '13.5px',
                      outline: 'none',
                      color: '#1C1917'
                    }}
                  />
                </div>
              </div>

              {/* SECTION 2: Aadhaar & PAN KYC Identification */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                padding: '18px',
                border: '1px solid #EADBBE',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8C6228', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} />
                  KYC & Identification Details
                </div>

                {/* Aadhaar Details Row */}
                <div style={{
                  padding: '14px',
                  borderRadius: '10px',
                  background: '#FAFAF9',
                  border: '1px solid #E7E5E4',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#292524', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Landmark size={14} color="#8C6228" />
                      Aadhaar Card Details
                    </label>
                    {aadhaarDoc && (
                      <span style={{ fontSize: '11px', color: '#166534', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <FileCheck size={12} />
                        Document Attached
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={aadhaarNumber}
                      onChange={handleAadhaarChange}
                      placeholder="Aadhaar No. (e.g. 5412 8765 4321)"
                      maxLength={14}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #D6D3D1',
                        background: '#FFFFFF',
                        fontSize: '13.5px',
                        outline: 'none',
                        letterSpacing: '0.04em'
                      }}
                    />

                    {/* Aadhaar Upload Button */}
                    <div>
                      <input
                        type="file"
                        id="aadhaar-file-input"
                        accept="image/*,.pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileUpload(e, 'aadhaar')}
                      />
                      <label
                        htmlFor="aadhaar-file-input"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #DAC493',
                          background: aadhaarDoc ? '#F0FDF4' : '#FAF6EE',
                          color: aadhaarDoc ? '#166534' : '#8C6228',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: aadhaarUploading ? 'wait' : 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <Upload size={14} />
                        {aadhaarUploading ? 'Uploading...' : (aadhaarDoc ? 'Replace Doc' : 'Upload Aadhaar')}
                      </label>
                    </div>
                  </div>

                  {aadhaarDoc && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', padding: '6px 10px', background: '#FFFFFF', borderRadius: '6px', border: '1px solid #E7E5E4' }}>
                      <a
                        href={aadhaarDoc}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#8C6228', fontWeight: '600', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <ExternalLink size={12} />
                        View Uploaded Aadhaar File
                      </a>
                      <button
                        type="button"
                        onClick={() => setAadhaarDoc('')}
                        style={{ border: 'none', background: 'transparent', color: '#DC2626', fontSize: '11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      >
                        <Trash2 size={11} />
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* PAN Details Row */}
                <div style={{
                  padding: '14px',
                  borderRadius: '10px',
                  background: '#FAFAF9',
                  border: '1px solid #E7E5E4',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#292524', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={14} color="#8C6228" />
                      PAN Card Details
                    </label>
                    {panDoc && (
                      <span style={{ fontSize: '11px', color: '#166534', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <FileCheck size={12} />
                        Document Attached
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={panNumber}
                      onChange={handlePanChange}
                      placeholder="PAN Card No. (e.g. ABCDE1234F)"
                      maxLength={10}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #D6D3D1',
                        background: '#FFFFFF',
                        fontSize: '13.5px',
                        outline: 'none',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase'
                      }}
                    />

                    {/* PAN Upload Button */}
                    <div>
                      <input
                        type="file"
                        id="pan-file-input"
                        accept="image/*,.pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileUpload(e, 'pan')}
                      />
                      <label
                        htmlFor="pan-file-input"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #DAC493',
                          background: panDoc ? '#F0FDF4' : '#FAF6EE',
                          color: panDoc ? '#166534' : '#8C6228',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: panUploading ? 'wait' : 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <Upload size={14} />
                        {panUploading ? 'Uploading...' : (panDoc ? 'Replace Doc' : 'Upload PAN')}
                      </label>
                    </div>
                  </div>

                  {panDoc && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', padding: '6px 10px', background: '#FFFFFF', borderRadius: '6px', border: '1px solid #E7E5E4' }}>
                      <a
                        href={panDoc}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#8C6228', fontWeight: '600', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <ExternalLink size={12} />
                        View Uploaded PAN File
                      </a>
                      <button
                        type="button"
                        onClick={() => setPanDoc('')}
                        style={{ border: 'none', background: 'transparent', color: '#DC2626', fontSize: '11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      >
                        <Trash2 size={11} />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 3: Compensation Category & Service Incentive */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                padding: '18px',
                border: '1px solid #EADBBE',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8C6228', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={14} />
                  Salary & Service Incentive Category
                </div>

                {/* Category Selection Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Option 1: Fixed Salary */}
                  <div
                    onClick={() => setSalaryType('fixed')}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: salaryType === 'fixed' ? '2px solid #B88B4A' : '1px solid #E7E5E4',
                      background: salaryType === 'fixed' ? '#FAF6EE' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: salaryType === 'fixed' ? '5px solid #8C6228' : '2px solid #D6D3D1',
                        background: '#FFFFFF'
                      }} />
                      <div style={{ fontSize: '13.5px', fontWeight: '700', color: salaryType === 'fixed' ? '#8C6228' : '#292524' }}>
                        Fixed Salary
                      </div>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#78716C', marginTop: '6px', paddingLeft: '26px' }}>
                      Flat fixed monthly compensation regardless of service count.
                    </div>
                  </div>

                  {/* Option 2: Salary + Incentive */}
                  <div
                    onClick={() => setSalaryType('salary_plus_incentive')}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: salaryType === 'salary_plus_incentive' ? '2px solid #B88B4A' : '1px solid #E7E5E4',
                      background: salaryType === 'salary_plus_incentive' ? '#FAF6EE' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: salaryType === 'salary_plus_incentive' ? '5px solid #8C6228' : '2px solid #D6D3D1',
                        background: '#FFFFFF'
                      }} />
                      <div style={{ fontSize: '13.5px', fontWeight: '700', color: salaryType === 'salary_plus_incentive' ? '#8C6228' : '#292524' }}>
                        Salary + Incentive
                      </div>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#78716C', marginTop: '6px', paddingLeft: '26px' }}>
                      Base monthly salary plus percentage commission on performed services.
                    </div>
                  </div>
                </div>

                {/* Conditional Inputs Based on Category */}
                {salaryType === 'fixed' ? (
                  /* Fixed Salary Amount Input */
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#292524', marginBottom: '6px' }}>
                      Fixed Monthly Salary (₹) *
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: '12px', color: '#8C6228', fontWeight: '700', fontSize: '14px' }}>
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={salaryAmount}
                        onChange={(e) => setSalaryAmount(e.target.value)}
                        placeholder="e.g. 35000"
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 28px',
                          borderRadius: '8px',
                          border: '1px solid #D6D3D1',
                          background: '#FFFDF9',
                          fontSize: '14px',
                          fontWeight: '600',
                          outline: 'none',
                          color: '#1C1917'
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '12px', color: '#78716C', marginTop: '6px' }}>
                      Staff member will receive a flat compensation of {formatCurrency(Number(salaryAmount) || 0)} per month.
                    </div>
                  </div>
                ) : (
                  /* Salary + Incentive Row */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '10px', alignItems: 'flex-end' }}>
                      {/* Base Salary Input */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#292524', marginBottom: '6px' }}>
                          Base Salary (₹)
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <span style={{ position: 'absolute', left: '12px', color: '#8C6228', fontWeight: '700', fontSize: '14px' }}>
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={salaryAmount}
                            onChange={(e) => setSalaryAmount(e.target.value)}
                            placeholder="e.g. 20000"
                            style={{
                              width: '100%',
                              padding: '10px 12px 10px 28px',
                              borderRadius: '8px',
                              border: '1px solid #D6D3D1',
                              background: '#FFFDF9',
                              fontSize: '14px',
                              fontWeight: '600',
                              outline: 'none',
                              color: '#1C1917'
                            }}
                          />
                        </div>
                      </div>

                      {/* Plus sign */}
                      <div style={{
                        height: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        fontWeight: '800',
                        color: '#B88B4A',
                        padding: '0 4px'
                      }}>
                        +
                      </div>

                      {/* Incentive Percentage Input */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#292524', marginBottom: '6px' }}>
                          Service Incentive (%)
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={incentivePercentage}
                            onChange={(e) => setIncentivePercentage(e.target.value)}
                            placeholder="e.g. 10"
                            style={{
                              width: '100%',
                              padding: '10px 28px 10px 14px',
                              borderRadius: '8px',
                              border: '1px solid #D6D3D1',
                              background: '#FFFDF9',
                              fontSize: '14px',
                              fontWeight: '600',
                              outline: 'none',
                              color: '#1C1917'
                            }}
                          />
                          <span style={{ position: 'absolute', right: '12px', color: '#8C6228', fontWeight: '700', fontSize: '14px' }}>
                            %
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Calculation Formula & Live Preview */}
                    <div style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: '#FAF6EE',
                      border: '1px solid #EADBBE',
                      fontSize: '12px',
                      color: '#44403C',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ fontWeight: '700', color: '#8C6228', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calculator size={13} />
                        Automated Service Incentive Formula:
                      </div>
                      <div style={{ fontWeight: '600', color: '#1C1917', fontFamily: 'monospace', fontSize: '12.5px' }}>
                        Total Payout = {formatCurrency(Number(salaryAmount) || 0)} Base + ({Number(incentivePercentage) || 0}% × Total Service Revenue Performed)
                      </div>
                      <div style={{ color: '#78716C', marginTop: '2px' }}>
                        Example: If this practitioner performs ₹1,00,000 in clinical services, their incentive is ₹{formatCurrency(100000 * (Number(incentivePercentage) || 0) / 100)}, totaling {formatCurrency((Number(salaryAmount) || 0) + (100000 * (Number(incentivePercentage) || 0) / 100))}.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setModal({ open: false, mode: 'create', data: null })}
                  className="btn-secondary"
                  style={{ padding: '10px 20px', borderRadius: '8px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: '700' }}
                >
                  {modal.mode === 'create' ? 'Save Team Member' : 'Update Team Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

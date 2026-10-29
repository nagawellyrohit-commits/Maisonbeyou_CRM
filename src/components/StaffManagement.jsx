import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Edit2, Award, User, X, Upload, FileText, ExternalLink, Trash2, Camera, Phone, BriefcaseBusiness,
  ShieldCheck, Calculator, FileCheck, Landmark
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
  const [detailsStaff, setDetailsStaff] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState('Senior Aesthetician');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoToCrop, setPhotoToCrop] = useState('');
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropImageSize, setCropImageSize] = useState({ width: 0, height: 0 });
  const [cropDragging, setCropDragging] = useState(false);
  const cropDragStart = useRef(null);
  const cropViewportSize = 260;

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
      setStaff(currentStaff => (res.staff || []).map(nextStaff => {
        const current = currentStaff.find(item => item.staff_id === nextStaff.staff_id);
        // Keep the just-saved photo visible if an older API response omits this field.
        return nextStaff.photo_url === undefined && current?.photo_url
          ? { ...nextStaff, photo_url: current.photo_url }
          : nextStaff;
      }));
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
      setPhotoUrl(s.photo_url || '');
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
      setPhotoUrl('');
      setAadhaarNumber('');
      setAadhaarDoc('');
      setPanNumber('');
      setPanDoc('');
      setSalaryType('fixed');
      setSalaryAmount('');
      setIncentivePercentage('');
    }
  };

  const handlePhotoSelection = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      e.target.value = '';
      return;
    }
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setCropImageSize({ width: image.naturalWidth, height: image.naturalHeight });
    image.src = imageUrl;
    setPhotoToCrop(imageUrl);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    e.target.value = '';
  };

  const closePhotoCrop = () => {
    if (photoToCrop) URL.revokeObjectURL(photoToCrop);
    setPhotoToCrop('');
    setCropImageSize({ width: 0, height: 0 });
    setCropDragging(false);
    cropDragStart.current = null;
  };

  const handlePhotoUpload = async () => {
    if (!photoToCrop || photoUploading) return;
    const image = new Image();
    image.src = photoToCrop;
    try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });
      const baseScale = Math.max(cropViewportSize / image.naturalWidth, cropViewportSize / image.naturalHeight);
      const scale = baseScale * cropZoom;
      const cropSize = cropViewportSize / scale;
      const sourceX = Math.max(0, Math.min(image.naturalWidth - cropSize, (image.naturalWidth - cropSize) / 2 - cropOffset.x / scale));
      const sourceY = Math.max(0, Math.min(image.naturalHeight - cropSize, (image.naturalHeight - cropSize) / 2 - cropOffset.y / scale));
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext('2d');
      context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, 512, 512);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('Could not prepare the cropped image.');
      setPhotoUploading(true);
      const formData = new FormData();
      formData.append('file', new File([blob], 'team-photo.jpg', { type: 'image/jpeg' }));
      const res = await apiRequest('/admin/upload', { method: 'POST', body: formData });
      if (res.url) setPhotoUrl(res.url);
      closePhotoCrop();
    } catch (err) {
      alert('Photo upload failed: ' + (err.message || 'Please try another image'));
    } finally {
      setPhotoUploading(false);
    }
  };

  const startCropDrag = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    cropDragStart.current = { x: e.clientX, y: e.clientY, offset: cropOffset };
    setCropDragging(true);
  };

  const moveCrop = (e) => {
    if (!cropDragStart.current) return;
    const start = cropDragStart.current;
    if (!cropImageSize.width) return;
    const baseScale = Math.max(cropViewportSize / cropImageSize.width, cropViewportSize / cropImageSize.height);
    const halfOverflowX = Math.max(0, (cropImageSize.width * baseScale * cropZoom - cropViewportSize) / 2);
    const halfOverflowY = Math.max(0, (cropImageSize.height * baseScale * cropZoom - cropViewportSize) / 2);
    setCropOffset({
      x: Math.max(-halfOverflowX, Math.min(halfOverflowX, start.offset.x + e.clientX - start.x)),
      y: Math.max(-halfOverflowY, Math.min(halfOverflowY, start.offset.y + e.clientY - start.y))
    });
  };

  const handleCropZoom = (value) => {
    const zoom = Number(value);
    setCropZoom(zoom);
    if (!cropImageSize.width) return;
    const baseScale = Math.max(cropViewportSize / cropImageSize.width, cropViewportSize / cropImageSize.height);
    const overflowX = Math.max(0, (cropImageSize.width * baseScale * zoom - cropViewportSize) / 2);
    const overflowY = Math.max(0, (cropImageSize.height * baseScale * zoom - cropViewportSize) / 2);
    setCropOffset(offset => ({ x: Math.max(-overflowX, Math.min(overflowX, offset.x)), y: Math.max(-overflowY, Math.min(overflowY, offset.y)) }));
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
        photo_url: photoUrl,
        aadhaar_number: aadhaarNumber.trim(),
        aadhaar_doc: aadhaarDoc,
        pan_number: panNumber.trim().toUpperCase(),
        pan_doc: panDoc,
        salary_type: salaryType,
        salary_amount: Number(salaryAmount) || 0,
        incentive_percentage: salaryType === 'salary_plus_incentive' ? (Number(incentivePercentage) || 0) : 0
      };

      if (modal.mode === 'create') {
        const res = await apiRequest('/admin/staff', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (res.staff) setStaff(current => [...current, { ...res.staff, photo_url: res.staff.photo_url || photoUrl }]);
      } else {
        const res = await apiRequest(`/admin/staff/${modal.data.staff_id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setStaff(current => current.map(item => item.staff_id === modal.data.staff_id
          ? { ...item, ...(res.staff || {}), photo_url: res.staff?.photo_url || photoUrl }
          : item));
      }
      setModal({ open: false, mode: 'create', data: null });
      await fetchStaff();
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

      </div>

      {/* Staff Grid */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading staff directory...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', columnGap: '20px', rowGap: '28px' }}>
          <button
            type="button"
            className="card"
            onClick={() => handleOpenModal()}
            style={{
              padding: '28px',
              minHeight: '250px',
              boxSizing: 'border-box',
              background: '#FFFFFF',
              border: '1px solid #D99A64',
              borderRadius: '22px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: '#1C1917',
              textAlign: 'center',
              cursor: 'pointer',
              boxShadow: '0 6px 18px rgba(87, 58, 32, 0.06)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={event => {
              event.currentTarget.style.borderColor = '#C6A36A';
              event.currentTarget.style.boxShadow = '0 10px 24px rgba(198,163,106,0.14)';
              event.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={event => {
              event.currentTarget.style.borderColor = '#D99A64';
              event.currentTarget.style.boxShadow = '0 6px 18px rgba(87, 58, 32, 0.06)';
              event.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span style={{ width: 56, height: 56, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#B88B4A', background: '#FAF6EE', border: '1px solid #EADBBE' }}>
              <Plus size={24} />
            </span>
            <span style={{ fontSize: '18px', fontWeight: 700 }}>Add Team Member</span>
            <span style={{ maxWidth: 240, color: '#78716C', fontSize: '12.5px', lineHeight: 1.5 }}>Add a practitioner to this branch team.</span>
          </button>
          {staff.map(s => {
            return (
              <div
                key={s.staff_id}
                className="card"
                style={{
                  padding: '28px',
                  minHeight: '250px',
                  opacity: s.active === 1 ? 1 : 0.65,
                  border: '1px solid #D99A64',
                  background: '#FFFFFF',
                  borderRadius: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  gap: '20px',
                  boxShadow: '0 6px 18px rgba(87, 58, 32, 0.06)',
                  transition: 'box-shadow 0.2s ease'
                }}
              >
                <div>
                  {/* Card Header: Avatar, Name, Role, Status */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 0, paddingRight: '58px' }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', minWidth: 0, width: '100%' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
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
                        {s.photo_url ? <img src={s.photo_url} alt={`${s.name} profile`} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : s.name.charAt(0)}
                      </div>
                      <div style={{ minWidth: 0, paddingTop: '1px' }}>
                        <h2 style={{ fontSize: '17px', color: '#1C1917', fontWeight: '700', margin: 0, lineHeight: 1.3 }}>
                          {s.name}
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontSize: '12.5px', marginTop: '6px', minWidth: 0, lineHeight: 1.35 }}>
                          <BriefcaseBusiness size={13} color="#8C6228" aria-hidden="true" style={{ flexShrink: 0 }} />
                          <span style={{ minWidth: 0, color: '#78716C' }}>
                            <span style={{ whiteSpace: 'nowrap' }}>Designation: </span>
                            <span style={{ display: 'inline', color: '#8C6228', fontWeight: 600 }}>{s.role || 'Not added'}</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '20px', fontSize: '13px', color: '#57534E', lineHeight: 1.4 }}>
                          <Phone size={14} color="#8C6228" aria-hidden="true" />
                          <span>{s.phone ? formatPhone(s.phone) : 'No phone number added'}</span>
                        </div>
                      </div>
                    </div>

                    <span style={{
                      position: 'absolute',
                      top: '28px',
                      right: '28px',
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

                </div>

                {/* Actions: Clean unified buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #EAD9C8' }}>
                  <button
                    onClick={() => handleToggleActive(s)}
                    style={{
                      fontSize: '12px',
                      padding: '8px 14px',
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
                    onClick={() => setDetailsStaff(s)}
                    style={{
                      fontSize: '12px',
                      padding: '8px 16px',
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
                    <FileText size={13} />
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Staff details popup */}
      {photoToCrop && (
        createPortal(<div style={{ position: 'fixed', inset: 0, background: 'rgba(28,25,23,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1200, padding: '28px 20px 20px', overflowY: 'auto', boxSizing: 'border-box' }}>
          <div role="dialog" aria-modal="true" aria-labelledby="photo-crop-title" style={{ width: '100%', maxWidth: 400, background: '#FFFDF9', border: '1px solid #EADBBE', borderRadius: 16, padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <h2 id="photo-crop-title" style={{ margin: '0 0 6px', fontSize: 19, color: '#1C1917' }}>Adjust team photo</h2>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: '#78716C' }}>Drag the photo to position it in the circle, then adjust the zoom.</p>
            <div
              data-staff-photo-crop
              onPointerDown={startCropDrag}
              onPointerMove={moveCrop}
              onPointerUp={() => { setCropDragging(false); cropDragStart.current = null; }}
              onPointerCancel={() => { setCropDragging(false); cropDragStart.current = null; }}
              style={{ position: 'relative', width: cropViewportSize, height: cropViewportSize, maxWidth: '100%', margin: '0 auto 18px', borderRadius: '50%', overflow: 'hidden', background: '#F5F5F4', touchAction: 'none', cursor: cropDragging ? 'grabbing' : 'grab', border: '2px solid #EADBBE' }}
            >
              {cropImageSize.width > 0 && <img src={photoToCrop} alt="Crop preview" draggable="false" style={{ position: 'absolute', maxWidth: 'none', width: cropImageSize.width * Math.max(cropViewportSize / cropImageSize.width, cropViewportSize / cropImageSize.height) * cropZoom, height: cropImageSize.height * Math.max(cropViewportSize / cropImageSize.width, cropViewportSize / cropImageSize.height) * cropZoom, left: `calc(50% + ${cropOffset.x}px)`, top: `calc(50% + ${cropOffset.y}px)`, transform: 'translate(-50%, -50%)', pointerEvents: 'none', userSelect: 'none' }} />}
            </div>
            <label style={{ display: 'block', color: '#57534E', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Zoom</label>
            <input type="range" min="1" max="3" step="0.01" value={cropZoom} onChange={e => handleCropZoom(e.target.value)} style={{ width: '100%', accentColor: '#9F7335' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" onClick={closePhotoCrop} disabled={photoUploading} style={{ padding: '9px 13px', border: '1px solid #E7E5E4', borderRadius: 7, background: '#fff', color: '#57534E', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={handlePhotoUpload} disabled={photoUploading || !cropImageSize.width} style={{ padding: '9px 13px', border: '1px solid #DAC493', borderRadius: 7, background: '#FAF6EE', color: '#8C6228', fontWeight: 700, cursor: photoUploading ? 'wait' : 'pointer' }}>{photoUploading ? 'Saving…' : 'Use this photo'}</button>
            </div>
          </div>
        </div>, document.body)
      )}

      {detailsStaff && (() => {
        const s = detailsStaff;
        const incentive = s.salary_type === 'salary_plus_incentive';
        const salary = Number(s.salary_amount) || 0;
        const revenue = Number(s.total_revenue) || 0;
        const pct = Number(s.incentive_percentage) || 0;
        const earned = Number(s.earned_incentive) || Math.round(revenue * pct / 100);
        const kycComplete = !!(s.aadhaar_number || s.aadhaar_doc || s.pan_number || s.pan_doc);
        const detailRow = (label, value) => (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '10px 0', borderBottom: '1px solid #F0ECE4' }}>
            <span style={{ color: '#78716C' }}>{label}</span>
            <span style={{ color: '#1C1917', fontWeight: 600, textAlign: 'right' }}>{value}</span>
          </div>
        );
        return createPortal(
          <div onClick={() => setDetailsStaff(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(28,25,23,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '28px 20px 20px', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div role="dialog" aria-modal="true" aria-labelledby="staff-details-title" onClick={e => e.stopPropagation()} className="animate-fade-in" style={{ maxWidth: '540px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#FFFDF9', borderRadius: '16px', border: '1px solid #EADBBE', boxShadow: '0 20px 50px rgba(0,0,0,0.18)', padding: '26px 30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                <div>
                  <h2 id="staff-details-title" style={{ margin: 0, color: '#1C1917', fontSize: '21px' }}>{s.name}</h2>
                  <div style={{ color: '#8C6228', marginTop: '4px', fontWeight: 600 }}>{s.role}</div>
                </div>
                <button type="button" aria-label="Close details" onClick={() => setDetailsStaff(null)} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#78716C', padding: 4 }}><X size={20} /></button>
              </div>
              {detailRow('Status', s.active === 1 ? 'Active' : 'Inactive')}
              {s.photo_url && <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 14px' }}><img src={s.photo_url} alt={`${s.name} profile`} style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '1px solid #EADBBE' }} /></div>}
              {detailRow('Phone', s.phone ? formatPhone(s.phone) : 'Not added')}
              {detailRow('Compensation', incentive ? `Base ${formatCurrency(salary)} + ${pct}% incentive` : `Fixed salary: ${formatCurrency(salary)}/mo`)}
              <h3 style={{ margin: '20px 0 4px', fontSize: '12px', color: '#78716C', letterSpacing: '0.05em' }}>KYC & IDENTIFICATION · {kycComplete ? 'VERIFIED' : 'PENDING'}</h3>
              {detailRow('Aadhaar', s.aadhaar_number || 'Not added')}
              {s.aadhaar_doc && <div style={{ padding: '6px 0' }}><a href={s.aadhaar_doc} target="_blank" rel="noopener noreferrer" style={{ color: '#8C6228' }}>View Aadhaar document</a></div>}
              {detailRow('PAN', s.pan_number || 'Not added')}
              {s.pan_doc && <div style={{ padding: '6px 0' }}><a href={s.pan_doc} target="_blank" rel="noopener noreferrer" style={{ color: '#8C6228' }}>View PAN document</a></div>}
              <h3 style={{ margin: '20px 0 4px', fontSize: '12px', color: '#78716C', letterSpacing: '0.05em' }}>PERFORMANCE</h3>
              {detailRow('Services done', s.total_services || 0)}
              {detailRow('Revenue handled', formatCurrency(revenue))}
              {incentive ? <>{detailRow(`Earned incentive (${pct}%)`, formatCurrency(earned))}{detailRow('Estimated total payout', formatCurrency(Number(s.total_estimated_payout) || salary + earned))}</> : detailRow('Monthly salary', formatCurrency(salary))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
                <button type="button" onClick={() => setDetailsStaff(null)} style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #E7E5E4', background: '#fff', color: '#57534E', cursor: 'pointer' }}>Close</button>
                <button type="button" onClick={() => { setDetailsStaff(null); handleOpenModal(s); }} style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #DAC493', background: '#FAF8F5', color: '#8C6228', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><Edit2 size={14} />Edit Details</button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* Staff Modal */}
      {modal.open && (
        createPortal(<div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28,25,23,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '28px 20px 20px',
          overflowY: 'auto',
          boxSizing: 'border-box'
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

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#292524', marginBottom: '8px' }}>Team Photo</label>
                  {photoUrl && <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}><img src={photoUrl} alt="Team member preview" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '1px solid #EADBBE' }} /><button type="button" onClick={() => setPhotoUrl('')} style={{ border: 0, background: 'transparent', color: '#DC2626', cursor: 'pointer' }}>Remove photo</button></div>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <input type="file" accept="image/*" capture="user" disabled={photoUploading} onChange={handlePhotoSelection} style={{ display: 'none' }} id="staff-camera-input" />
                    <label htmlFor="staff-camera-input" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 12px', border: '1px solid #DAC493', borderRadius: 8, background: '#FAF6EE', color: '#8C6228', fontSize: 12, fontWeight: 700, cursor: photoUploading ? 'wait' : 'pointer' }}><Camera size={15} />Take photo</label>
                    <input type="file" accept="image/*" disabled={photoUploading} onChange={handlePhotoSelection} style={{ display: 'none' }} id="staff-gallery-input" />
                    <label htmlFor="staff-gallery-input" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 12px', border: '1px solid #E7E5E4', borderRadius: 8, background: '#fff', color: '#57534E', fontSize: 12, fontWeight: 700, cursor: photoUploading ? 'wait' : 'pointer' }}><Upload size={15} />Choose from device</label>
                    {photoUploading && <span style={{ alignSelf: 'center', fontSize: 12, color: '#78716C' }}>Uploading photo…</span>}
                  </div>
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
                  Branch Details
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
        </div>, document.body)
      )}
    </div>
  );
}

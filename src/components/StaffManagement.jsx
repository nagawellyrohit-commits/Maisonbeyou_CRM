import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Edit2, Award, User, X, Upload, FileText, ExternalLink, Trash2, Camera, Phone, BriefcaseBusiness,
  ShieldCheck, Calculator, FileCheck, Landmark, Settings, ChevronDown, Mail, MapPin
} from 'lucide-react';
import { apiRequest, formatCurrency, formatPhone } from '../utils/api';

const teamMasterRequestError = (error) => /API endpoint not found/i.test(String(error?.message || ''))
  ? 'The backend on port 5001 is an older version. Stop it and restart the server from this project folder, then refresh the page.'
  : error?.message || 'Could not load Team Master data.';

const SUGGESTED_STUDIO_DEPARTMENTS = [
  'Skin & Aesthetic Care',
  'Laser Treatments',
  'Hair & Scalp Care',
  'Salon & Beauty',
  'Front Desk & Client Care',
  'Operations & Administration'
];

export default function StaffManagement({ branding, currentUser, initialMasterView = false, masterOptionType = null }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [detailsStaff, setDetailsStaff] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [role, setRole] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [teamOptions, setTeamOptions] = useState({ roles: [], designations: [] });
  const [teamDepartments, setTeamDepartments] = useState([]);
  const [teamHierarchy, setTeamHierarchy] = useState([]);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [hierarchyDraft, setHierarchyDraft] = useState({ department_id: '', role_option_id: '', designation_option_id: '', reports_to_staff_id: '' });
  const [showTeamMaster, setShowTeamMaster] = useState(false);
  const [newTeamOption, setNewTeamOption] = useState({ role: '', designation: '' });
  const [savingTeamOption, setSavingTeamOption] = useState('');
  const [teamMasterError, setTeamMasterError] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [upiId, setUpiId] = useState('');
  const [qrUploading, setQrUploading] = useState(false);
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
  const [aadhaarBackDoc, setAadhaarBackDoc] = useState('');
  const [aadhaarUploading, setAadhaarUploading] = useState(false);

  const [panNumber, setPanNumber] = useState('');
  const [panDoc, setPanDoc] = useState('');
  const [panBackDoc, setPanBackDoc] = useState('');
  const [panUploading, setPanUploading] = useState(false);
  const [previewDocumentUrl, setPreviewDocumentUrl] = useState('');

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

  const fetchTeamOptions = async () => {
    try {
      const response = await apiRequest('/admin/team-options');
      const roles = response.roles || [];
      const designations = response.designations || [];
      setTeamOptions({ roles, designations });
      if (!roles.length && !designations.length) {
        setTeamMasterError('The server returned an empty Team Master list. Restart the backend, then refresh this page.');
      } else setTeamMasterError('');
    } catch (err) {
      console.error('Failed to load Team Master options:', err);
      setTeamMasterError(teamMasterRequestError(err));
    }
  };

  const fetchTeamDepartments = async () => {
    try {
      const response = await apiRequest('/admin/team-departments');
      setTeamDepartments(response.departments || []);
    } catch (err) { console.error('Failed to load departments:', err); setTeamMasterError(teamMasterRequestError(err)); }
  };

  const fetchTeamHierarchy = async () => {
    try {
      const response = await apiRequest('/admin/team-hierarchy');
      setTeamHierarchy(response.hierarchy || []);
    } catch (err) { console.error('Failed to load team hierarchy:', err); setTeamMasterError(teamMasterRequestError(err)); }
  };

  useEffect(() => {
    fetchStaff();
    fetchTeamOptions();
    fetchTeamDepartments();
    fetchTeamHierarchy();
  }, []);

  useEffect(() => {
    setShowTeamMaster(Boolean(initialMasterView));
  }, [initialMasterView]);

  const handleOpenModal = (s = null) => {
    if (s) {
      setModal({ open: true, mode: 'edit', data: s });
      const storedName = String(s.name || '').trim();
      const storedSurname = String(s.surname || '').trim();
      if (storedSurname && storedName.toLowerCase().endsWith(` ${storedSurname}`.toLowerCase())) {
        setName(storedName.slice(0, -(storedSurname.length + 1)));
        setSurname(storedSurname);
      } else if (storedSurname) {
        setName(storedName);
        setSurname(storedSurname);
      } else {
        const nameParts = storedName.split(/\s+/).filter(Boolean);
        setName(nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : storedName);
        setSurname(nameParts.length > 1 ? nameParts[nameParts.length - 1] : '');
      }
      setRole(s.role || '');
      setDesignation(s.designation || '');
      setDepartment(s.department || '');
      setAddress(s.address || '');
      setPincode(s.pincode || '');
      setCity(s.city || '');
      setStateName(s.state || '');
      setPhone(s.phone || '');
      setEmail(s.email || '');
      setBankAccountName(s.bank_account_name || '');
      setBankName(s.bank_name || '');
      setIfscCode(s.ifsc_code || '');
      setQrCodeUrl(s.qr_code_url || '');
      setUpiId(s.upi_id || '');
      setPhotoUrl(s.photo_url || '');
      setAadhaarNumber(s.aadhaar_number || '');
      setAadhaarDoc(s.aadhaar_doc || '');
      setAadhaarBackDoc(s.aadhaar_back_doc || '');
      setPanNumber(s.pan_number || '');
      setPanDoc(s.pan_doc || '');
      setPanBackDoc(s.pan_back_doc || '');
      setSalaryType(s.salary_type || 'fixed');
      setSalaryAmount(s.salary_amount !== undefined && s.salary_amount !== null ? String(s.salary_amount) : '');
      setIncentivePercentage(s.incentive_percentage !== undefined && s.incentive_percentage !== null ? String(s.incentive_percentage) : '');
    } else {
      setModal({ open: true, mode: 'create', data: null });
      setName('');
      setSurname('');
      setRole('');
      setDesignation('');
      setDepartment('');
      setAddress('');
      setPincode('');
      setCity('');
      setStateName('');
      setPhone('');
      setEmail('');
      setBankAccountName('');
      setBankName('');
      setIfscCode('');
      setQrCodeUrl('');
      setUpiId('');
      setPhotoUrl('');
      setAadhaarNumber('');
      setAadhaarDoc('');
      setAadhaarBackDoc('');
      setPanNumber('');
      setPanDoc('');
      setPanBackDoc('');
      setSalaryType('fixed');
      setSalaryAmount('');
      setIncentivePercentage('');
    }
  };

  const handleAddTeamOption = async (type) => {
    const optionName = newTeamOption[type].trim();
    if (!optionName || savingTeamOption) return;
    setSavingTeamOption(type);
    setTeamMasterError('');
    try {
      await apiRequest('/admin/team-options', {
        method: 'POST',
        body: JSON.stringify({ option_type: type, option_name: optionName })
      });
      setNewTeamOption(current => ({ ...current, [type]: '' }));
      await fetchTeamOptions();
    } catch (err) {
      setTeamMasterError(err.message || 'Could not save this option.');
    } finally {
      setSavingTeamOption('');
    }
  };

  const handleRemoveTeamOption = async (option) => {
    setTeamMasterError('');
    try {
      await apiRequest(`/admin/team-options/${option.option_id}`, { method: 'DELETE' });
      await fetchTeamOptions();
    } catch (err) {
      setTeamMasterError(err.message || 'Could not remove this option.');
    }
  };

  const saveDepartment = async (value) => {
    const department_name = value.trim();
    if (!department_name) return;
    setTeamMasterError('');
    try {
      await apiRequest('/admin/team-departments', { method: 'POST', body: JSON.stringify({ department_name }) });
      setNewDepartmentName(current => current.trim().toLowerCase() === department_name.toLowerCase() ? '' : current);
      await fetchTeamDepartments();
    } catch (err) { setTeamMasterError(err.message || 'Could not add department.'); }
  };

  const addDepartment = async (event) => {
    event.preventDefault();
    await saveDepartment(newDepartmentName);
  };

  const removeDepartment = async (item) => {
    setTeamMasterError('');
    try {
      await apiRequest(`/admin/team-departments/${item.department_id}`, { method: 'DELETE' });
      await fetchTeamDepartments();
    } catch (err) { setTeamMasterError(err.message || 'Could not remove department.'); }
  };

  const addHierarchyPosition = async (event) => {
    event.preventDefault();
    setTeamMasterError('');
    try {
      await apiRequest('/admin/team-hierarchy', { method: 'POST', body: JSON.stringify(hierarchyDraft) });
      setHierarchyDraft(current => ({ ...current, role_option_id: '', designation_option_id: '', reports_to_staff_id: '' }));
      await fetchTeamHierarchy();
    } catch (err) { setTeamMasterError(err.message || 'Could not save reporting line.'); }
  };

  const removeHierarchyPosition = async (item) => {
    setTeamMasterError('');
    try {
      await apiRequest(`/admin/team-hierarchy/${item.hierarchy_id}`, { method: 'DELETE' });
      await fetchTeamHierarchy();
    } catch (err) { setTeamMasterError(err.message || 'Could not remove this position.'); }
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

    const isAadhaar = docType.startsWith('aadhaar');
    const isPan = docType.startsWith('pan');
    const isBack = docType.endsWith('_back');
    if (isAadhaar) setAadhaarUploading(true);
    else if (isPan) setPanUploading(true);
    else setQrUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiRequest('/admin/upload', {
        method: 'POST',
        body: formData
      });
      if (res.url) {
        if (isAadhaar) (isBack ? setAadhaarBackDoc : setAadhaarDoc)(res.url);
        else if (isPan) (isBack ? setPanBackDoc : setPanDoc)(res.url);
        else setQrCodeUrl(res.url);
      }
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Upload failed: ' + (err.message || 'Please check file format/size'));
    } finally {
      if (isAadhaar) setAadhaarUploading(false);
      else if (isPan) setPanUploading(false);
      else setQrUploading(false);
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

  const fieldLabel = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#292524' };
  const fieldInput = { width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 8, border: '1px solid #D6D3D1', background: '#FFFDF9', fontSize: 13.5, outline: 'none', color: '#1C1917' };
  const canManageTeamMaster = ['admin', 'master_admin'].includes(currentUser?.role);
  const renderDocumentPreview = (url, label, onRemove) => {
    if (!url) return null;
    const isImage = /\.(png|jpe?g|webp|gif|bmp|avif)(\?.*)?$/i.test(url);
    return <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, padding: 8, background: '#FFFFFF', border: '1px solid #E7E5E4', borderRadius: 8 }}>
      {isImage
        ? <button type="button" aria-label={`Preview ${label}`} onMouseEnter={() => setPreviewDocumentUrl(url)} onMouseLeave={() => setPreviewDocumentUrl('')} onFocus={() => setPreviewDocumentUrl(url)} onBlur={() => setPreviewDocumentUrl('')} style={{ flexShrink: 0, width: 76, height: 54, padding: 0, overflow: 'hidden', border: '1px solid #EADBBE', borderRadius: 6, background: '#FAF8F5', cursor: 'zoom-in' }}><img src={url} alt={`${label} thumbnail`} style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} /></button>
        : <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#8C6228', fontSize: 12, fontWeight: 600, textDecoration: 'underline' }}>Open {label} file</a>}
      <span style={{ flex: 1, minWidth: 0, color: '#57534E', fontSize: 12 }}>{label} uploaded{isImage ? ' · Hover to enlarge' : ''}</span>
      {onRemove && <button type="button" onClick={onRemove} style={{ flexShrink: 0, border: 0, background: 'transparent', color: '#DC2626', fontSize: 11, cursor: 'pointer' }}><Trash2 size={12} /> Remove</button>}
    </div>;
  };
  const renderSavedDocumentCard = (url, label) => url
    ? renderDocumentPreview(url, label)
    : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 70, padding: 10, border: '1px solid #E7E5E4', borderRadius: 8, background: '#FAFAF9', color: '#A8A29E', fontSize: 12 }}>{label} not uploaded</div>;

  const handleSave = async (e) => {
    e.preventDefault();
    const missingUploads = [
      !panDoc && 'PAN front image',
      !panBackDoc && 'PAN back image',
      !aadhaarDoc && 'Aadhaar front image',
      !aadhaarBackDoc && 'Aadhaar back image',
      !qrCodeUrl && 'bank QR code'
    ].filter(Boolean);
    if (missingUploads.length) {
      alert(`Please upload the required ${missingUploads.join(', ')} before saving.`);
      return;
    }
    try {
      const payload = {
        name: [name, surname].map(part => part.trim()).filter(Boolean).join(' '),
        surname: surname.trim(),
        role: role.trim(),
        designation: designation.trim(),
        department: department.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        pincode: pincode.trim(),
        city: city.trim(),
        state: stateName.trim(),
        bank_account_name: bankAccountName.trim(),
        bank_name: bankName.trim(),
        ifsc_code: ifscCode.trim().toUpperCase(),
        qr_code_url: qrCodeUrl,
        upi_id: upiId.trim(),
        photo_url: photoUrl,
        aadhaar_number: aadhaarNumber.trim(),
        aadhaar_doc: aadhaarDoc,
        aadhaar_back_doc: aadhaarBackDoc,
        pan_number: panNumber.trim().toUpperCase(),
        pan_doc: panDoc,
        pan_back_doc: panBackDoc,
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

  const getPositionHierarchy = (departmentName, roleName, designationName) => teamHierarchy.find(item =>
    item.department_name.toLowerCase() === String(departmentName || '').trim().toLowerCase() &&
    item.role_name.toLowerCase() === String(roleName || '').trim().toLowerCase() &&
    item.designation_name.toLowerCase() === String(designationName || '').trim().toLowerCase()
  );
  const assignedPositionHierarchy = getPositionHierarchy(department, role, designation);

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
            {initialMasterView ? (masterOptionType === 'designation' ? 'Designation Master' : 'Role Hierarchy Master') : (branding?.team_heading || 'Studio Practitioners & Team')}
          </h1>
        </div>

      </div>

      {canManageTeamMaster && initialMasterView && <section className="card" style={{ padding: '18px 20px', border: '1px solid #EADBBE', borderRadius: 14, background: '#FFFDF9' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 16, color: '#292524' }}><Settings size={17} color="#9F7335" />{masterOptionType === 'designation' ? 'Designation Master' : 'Role Hierarchy Master'}</h2>
            <p style={{ margin: '5px 0 0', fontSize: 12.5, color: '#78716C' }}>{masterOptionType === 'designation' ? 'Define seniority and designation levels for team members.' : 'Define the roles available for your studio team.'}</p>
          </div>
          {!initialMasterView && <button type="button" onClick={() => { setShowTeamMaster(value => !value); setTeamMasterError(''); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 12px', border: '1px solid #DAC493', borderRadius: 8, color: '#8C6228', background: '#FAF6EE', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {showTeamMaster ? 'Close master' : 'Manage options'} <ChevronDown size={14} style={{ transform: showTeamMaster ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }} />
          </button>}
        </div>
        {showTeamMaster && <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F0E7D9' }}>
          {teamMasterError && <div role="alert" style={{ marginBottom: 12, padding: '9px 11px', color: '#991B1B', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12.5 }}>{teamMasterError}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
            {[
              { type: 'role', title: 'Roles', examples: 'Manager, Laser Therapist, Aesthetician', items: teamOptions.roles },
              { type: 'designation', title: 'Designations', examples: 'Senior, Junior, Lead', items: teamOptions.designations }
            ].filter(group => !masterOptionType || group.type === masterOptionType).map(group => <div key={group.type} style={{ minWidth: 0, padding: 14, background: '#FFFFFF', border: '1px solid #EADBBE', borderRadius: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <strong style={{ fontSize: 13.5, color: '#292524' }}>{group.title}</strong>
                <span style={{ fontSize: 11, color: '#A8A29E' }}>{group.items.length} options</span>
              </div>
              <div aria-label={`${group.title} master options`} style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 132, overflowY: 'auto', margin: '10px 0', paddingRight: 4 }}>
                {group.items.length ? group.items.map(option => <div key={option.option_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 9px', background: '#FAF8F5', borderRadius: 7, fontSize: 12.5, color: '#57534E' }}>
                  <span>{option.option_name}</span>
                  <button type="button" aria-label={`Remove ${option.option_name}`} title="Remove option from the list" onClick={() => handleRemoveTeamOption(option)} style={{ border: 0, padding: 3, display: 'inline-flex', color: '#A8A29E', background: 'transparent', cursor: 'pointer' }}><X size={14} /></button>
                </div>) : <div style={{ padding: '8px 2px', color: '#A8A29E', fontSize: 12 }}>No options yet.</div>}
              </div>
              <form onSubmit={event => { event.preventDefault(); handleAddTeamOption(group.type); }} style={{ display: 'flex', gap: 7 }}>
                <input aria-label={`New ${group.type}`} value={newTeamOption[group.type]} onChange={event => setNewTeamOption(current => ({ ...current, [group.type]: event.target.value }))} maxLength={60} placeholder={group.examples} style={{ ...fieldInput, minWidth: 0, padding: '9px 10px', fontSize: 12 }} />
                <button type="submit" disabled={!newTeamOption[group.type].trim() || !!savingTeamOption} style={{ flexShrink: 0, padding: '8px 11px', border: '1px solid #B88B4A', borderRadius: 7, color: '#FFFFFF', background: '#B88B4A', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: !newTeamOption[group.type].trim() || !!savingTeamOption ? 0.55 : 1 }}>{savingTeamOption === group.type ? 'Saving…' : 'Add'}</button>
              </form>
            </div>)}
          </div>
          {masterOptionType === 'role' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 16, marginTop: 16 }}>
            <div style={{ padding: 14, background: '#FFFFFF', border: '1px solid #EADBBE', borderRadius: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><strong style={{ fontSize: 13.5, color: '#292524' }}>Departments</strong><span style={{ fontSize: 11, color: '#A8A29E' }}>{teamDepartments.length} departments</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto', margin: '10px 0', paddingRight: 4 }}>
                {teamDepartments.length ? teamDepartments.map(item => <div key={item.department_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 9px', background: '#FAF8F5', borderRadius: 7, fontSize: 12.5, color: '#57534E' }}><span>{item.department_name}</span><button type="button" aria-label={`Remove ${item.department_name}`} onClick={() => removeDepartment(item)} style={{ border: 0, padding: 3, color: '#A8A29E', background: 'transparent', cursor: 'pointer' }}><X size={14} /></button></div>) : <div style={{ padding: '8px 2px', color: '#A8A29E', fontSize: 12 }}>No departments yet.</div>}
              </div>
              <form onSubmit={addDepartment} style={{ display: 'flex', gap: 7 }}><input aria-label="New department" value={newDepartmentName} onChange={event => setNewDepartmentName(event.target.value)} maxLength={60} placeholder="e.g. Clinic, Front Desk, Operations" style={{ ...fieldInput, minWidth: 0, padding: '9px 10px', fontSize: 12 }} /><button type="submit" disabled={!newDepartmentName.trim()} style={{ flexShrink: 0, padding: '8px 11px', border: '1px solid #B88B4A', borderRadius: 7, color: '#FFFFFF', background: '#B88B4A', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: !newDepartmentName.trim() ? 0.55 : 1 }}>Add</button></form>
              <div style={{ marginTop: 14 }}>
                <div style={{ marginBottom: 8, color: '#78716C', fontSize: 11.5, fontWeight: 600 }}>Suggested studio categories</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {SUGGESTED_STUDIO_DEPARTMENTS.map(name => {
                    const exists = teamDepartments.some(item => item.department_name.toLowerCase() === name.toLowerCase());
                    return <button key={name} type="button" disabled={exists} onClick={() => saveDepartment(name)} style={{ padding: '6px 9px', border: '1px solid #EADBBE', borderRadius: 20, color: exists ? '#78716C' : '#8C6228', background: exists ? '#F5F2ED' : '#FFFCF7', fontSize: 11, cursor: exists ? 'default' : 'pointer', opacity: exists ? 0.7 : 1 }}>{exists ? '✓ ' : '+ '}{name}</button>;
                  })}
                </div>
              </div>
            </div>
            <div style={{ padding: 14, background: '#FFFFFF', border: '1px solid #EADBBE', borderRadius: 11 }}>
              <div style={{ marginBottom: 10 }}><strong style={{ fontSize: 13.5, color: '#292524' }}>Team Reporting Hierarchy</strong><p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#8A8175' }}>Assign each role and designation to a team member in the same department.</p></div>
              <form onSubmit={addHierarchyPosition} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 8, alignItems: 'end' }}>
                <label style={fieldLabel}>Department<select required value={hierarchyDraft.department_id} onChange={event => setHierarchyDraft(current => ({ ...current, department_id: event.target.value, reports_to_staff_id: '' }))} style={{ ...fieldInput, padding: '9px 8px', fontSize: 12 }}><option value="">Select department</option>{teamDepartments.map(item => <option key={item.department_id} value={item.department_id}>{item.department_name}</option>)}</select></label>
                <label style={fieldLabel}>Role<select required value={hierarchyDraft.role_option_id} onChange={event => setHierarchyDraft(current => ({ ...current, role_option_id: event.target.value }))} style={{ ...fieldInput, padding: '9px 8px', fontSize: 12 }}><option value="">Select role</option>{teamOptions.roles.map(item => <option key={item.option_id} value={item.option_id}>{item.option_name}</option>)}</select></label>
                <label style={fieldLabel}>Designation<select required value={hierarchyDraft.designation_option_id} onChange={event => setHierarchyDraft(current => ({ ...current, designation_option_id: event.target.value }))} style={{ ...fieldInput, padding: '9px 8px', fontSize: 12 }}><option value="">Select designation</option>{teamOptions.designations.map(item => <option key={item.option_id} value={item.option_id}>{item.option_name}</option>)}</select></label>
                <label style={fieldLabel}>Reports to<select value={hierarchyDraft.reports_to_staff_id} onChange={event => setHierarchyDraft(current => ({ ...current, reports_to_staff_id: event.target.value }))} style={{ ...fieldInput, padding: '9px 8px', fontSize: 12 }}><option value="">Top level</option>{staff.filter(person => person.active === 1 && person.department?.toLowerCase() === teamDepartments.find(item => String(item.department_id) === String(hierarchyDraft.department_id))?.department_name?.toLowerCase()).map(person => <option key={person.staff_id} value={person.staff_id}>{person.name} · {person.designation || person.role}</option>)}</select>{hierarchyDraft.department_id && !staff.some(person => person.active === 1 && person.department?.toLowerCase() === teamDepartments.find(item => String(item.department_id) === String(hierarchyDraft.department_id))?.department_name?.toLowerCase()) && <span style={{ fontSize: 10.5, color: '#8A8175', fontWeight: 400 }}>Add a team member to this department first.</span>}</label>
                <button type="submit" disabled={!hierarchyDraft.department_id || !hierarchyDraft.role_option_id || !hierarchyDraft.designation_option_id} style={{ padding: '9px 12px', border: '1px solid #B88B4A', borderRadius: 7, color: '#FFFFFF', background: '#B88B4A', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save reporting line</button>
              </form>
              <div aria-label="Configured designation hierarchy" style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto', marginTop: 12 }}>
                {teamHierarchy.length ? teamHierarchy.map(item => <div key={item.hierarchy_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 9px', background: '#FAF8F5', borderRadius: 7, fontSize: 12, color: '#57534E' }}><span><strong>{item.department_name}</strong> · {item.designation_name} ({item.role_name}) → {item.reports_to_name ? `${item.reports_to_name} · ${item.reports_to_staff_designation || item.reports_to_staff_role}` : 'Top level'}</span><button type="button" aria-label={`Remove ${item.designation_name} hierarchy position`} onClick={() => removeHierarchyPosition(item)} style={{ border: 0, padding: 3, flexShrink: 0, color: '#A8A29E', background: 'transparent', cursor: 'pointer' }}><X size={14} /></button></div>) : <div style={{ color: '#A8A29E', fontSize: 12 }}>No reporting lines configured yet.</div>}
              </div>
            </div>
          </div>}
          <p style={{ margin: '12px 0 0', fontSize: 11.5, color: '#8A8175' }}>Removing an option hides it from new selections. Existing team member records keep their saved values.</p>
        </div>}
      </section>}

      {/* Staff Grid */}
      {!initialMasterView && (loading ? (
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
            <span style={{ maxWidth: 260, color: '#78716C', fontSize: '12.5px', lineHeight: 1.5 }}>Add a manager, practitioner, or support team member.</span>
          </button>
          {staff.map(s => {
            const addressText = [s.address, s.city, s.state, s.pincode].filter(Boolean).join(', ');
            return (
              <div
                key={s.staff_id}
                className="card"
                style={{
                  padding: '30px',
                  minHeight: '390px',
                  opacity: s.active === 1 ? 1 : 0.65,
                  border: '1px solid #D99A64',
                  background: '#FFFFFF',
                  borderRadius: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  gap: '22px',
                  boxShadow: '0 6px 18px rgba(87, 58, 32, 0.06)',
                  transition: 'box-shadow 0.2s ease'
                }}
              >
                <div>
                  {/* Card header: profile image, name and designation */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 0, paddingRight: '78px' }}>
                    <div style={{ display: 'flex', gap: '26px', alignItems: 'center', minWidth: 0, width: '100%' }}>
                      <div style={{
                        width: '104px',
                        height: '104px',
                        flexShrink: 0,
                        borderRadius: '50%',
                        background: '#FAF8F5',
                        color: '#8C6228',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '28px',
                        border: '2px solid #EADBBE',
                        overflow: 'hidden'
                      }}>
                        {s.photo_url ? <img src={s.photo_url} alt={`${s.name} profile`} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : s.name.charAt(0)}
                      </div>
                      <div style={{ minWidth: 0, paddingTop: '1px' }}>
                        <h2 style={{ fontSize: '21px', color: '#1C1917', fontWeight: '700', margin: 0, lineHeight: 1.3, overflowWrap: 'anywhere' }}>
                          {s.name}
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7, fontSize: 14, color: '#8C6228', fontWeight: 700, lineHeight: 1.35 }}><BriefcaseBusiness size={15} aria-hidden="true" style={{ flexShrink: 0 }} /><span>{s.designation || 'Designation not added'}</span></div>
                        <div style={{ marginTop: 5, color: '#78716C', fontSize: 12 }}>{s.role || 'Role not added'}{s.department ? ` · ${s.department}` : ''}</div>
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

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 34, rowGap: 14, marginTop: 32, paddingTop: 22, borderTop: '1px solid #F0E7D9' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 17, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, color: '#57534E', fontSize: 13, lineHeight: 1.45, overflowWrap: 'anywhere' }}><Phone size={15} color="#8C6228" style={{ flexShrink: 0, marginTop: 1 }} /><span>{s.phone ? formatPhone(s.phone) : 'No phone number added'}</span></div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, color: '#57534E', fontSize: 13, lineHeight: 1.45, overflowWrap: 'anywhere' }}><Mail size={15} color="#8C6228" style={{ flexShrink: 0, marginTop: 1 }} /><span>{s.email || 'No email added'}</span></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0, marginTop: 6, paddingLeft: 22, borderLeft: '1px solid #F0E7D9', color: '#57534E', fontSize: 13, lineHeight: 1.5, overflowWrap: 'anywhere' }}><MapPin size={15} color="#8C6228" style={{ flexShrink: 0, marginTop: 1 }} /><span>{addressText || 'No address added'}</span></div>
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
      ))}

      {previewDocumentUrl && createPortal(
        <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, boxSizing: 'border-box', background: 'rgba(28,25,23,0.58)', pointerEvents: 'none' }}>
          <img src={previewDocumentUrl} alt="" style={{ display: 'block', maxWidth: 'min(88vw, 1100px)', maxHeight: '86vh', objectFit: 'contain', borderRadius: 12, border: '2px solid #FFFDF9', boxShadow: '0 24px 70px rgba(0,0,0,0.35)' }} />
        </div>, document.body
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
        const kycComplete = !!(s.aadhaar_number || s.aadhaar_doc || s.aadhaar_back_doc || s.pan_number || s.pan_doc || s.pan_back_doc);
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
                  <div style={{ color: '#8C6228', marginTop: '4px', fontWeight: 600 }}>{s.role || 'Role not set'}{s.designation ? ` · ${s.designation}` : ''}</div>
                </div>
                <button type="button" aria-label="Close details" onClick={() => setDetailsStaff(null)} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#78716C', padding: 4 }}><X size={20} /></button>
              </div>
              {detailRow('Status', s.active === 1 ? 'Active' : 'Inactive')}
              {s.photo_url && <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 14px' }}><img src={s.photo_url} alt={`${s.name} profile`} style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '1px solid #EADBBE' }} /></div>}
              {detailRow('Phone', s.phone ? formatPhone(s.phone) : 'Not added')}
              {s.department && detailRow('Department', s.department)}
              {s.department && getPositionHierarchy(s.department, s.role, s.designation) && detailRow('Reports to', getPositionHierarchy(s.department, s.role, s.designation).reports_to_name || 'Top level')}
              {detailRow('Compensation', incentive ? `Base ${formatCurrency(salary)} + ${pct}% incentive` : `Fixed salary: ${formatCurrency(salary)}/mo`)}
              <h3 style={{ margin: '20px 0 4px', fontSize: '12px', color: '#78716C', letterSpacing: '0.05em' }}>KYC & IDENTIFICATION · {kycComplete ? 'VERIFIED' : 'PENDING'}</h3>
              {detailRow('PAN', s.pan_number || 'Not added')}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 10 }}>{renderSavedDocumentCard(s.pan_doc, 'PAN front')}{renderSavedDocumentCard(s.pan_back_doc, 'PAN back')}</div>
              {detailRow('Aadhaar', s.aadhaar_number || 'Not added')}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 10 }}>{renderSavedDocumentCard(s.aadhaar_doc, 'Aadhaar front')}{renderSavedDocumentCard(s.aadhaar_back_doc, 'Aadhaar back')}</div>
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
              {/* SECTION 1: Profile Image */}
              <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '18px', border: '1px solid #EADBBE' }}>
                <label style={{ ...fieldLabel, marginBottom: 8 }}>Profile Image</label>
                {photoUrl && <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}><img src={photoUrl} alt="Team member profile preview" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '1px solid #EADBBE' }} /><button type="button" onClick={() => setPhotoUrl('')} style={{ border: 0, background: 'transparent', color: '#DC2626', cursor: 'pointer' }}>Remove image</button></div>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <input type="file" accept="image/*" capture="user" disabled={photoUploading} onChange={handlePhotoSelection} style={{ display: 'none' }} id="staff-camera-input" />
                  <label htmlFor="staff-camera-input" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 12px', border: '1px solid #DAC493', borderRadius: 8, background: '#FAF6EE', color: '#8C6228', fontSize: 12, fontWeight: 700, cursor: photoUploading ? 'wait' : 'pointer' }}><Camera size={15} />Take photo</label>
                  <input type="file" accept="image/*" disabled={photoUploading} onChange={handlePhotoSelection} style={{ display: 'none' }} id="staff-gallery-input" />
                  <label htmlFor="staff-gallery-input" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 12px', border: '1px solid #E7E5E4', borderRadius: 8, background: '#fff', color: '#57534E', fontSize: 12, fontWeight: 700, cursor: photoUploading ? 'wait' : 'pointer' }}><Upload size={15} />Choose from device</label>
                  {photoUploading && <span style={{ alignSelf: 'center', fontSize: 12, color: '#78716C' }}>Uploading image…</span>}
                </div>
              </div>

              {/* SECTION 1: Personal & Contact Details */}
              <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '18px', border: '1px solid #EADBBE', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8C6228', display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} />Basic Profile</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                  <label style={fieldLabel}>First name *<input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ananya" style={fieldInput} /></label>
                  <label style={fieldLabel}>Surname *<input required value={surname} onChange={e => setSurname(e.target.value)} placeholder="e.g. Sharma" style={fieldInput} /></label>
                </div>
                <label style={fieldLabel}>Address *<input required value={address} onChange={e => setAddress(e.target.value)} placeholder="Street address, building, area" style={fieldInput} /></label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
                  <label style={fieldLabel}>Pincode *<input required value={pincode} onChange={e => setPincode(e.target.value)} placeholder="Pincode" style={fieldInput} /></label>
                  <label style={fieldLabel}>City *<input required value={city} onChange={e => setCity(e.target.value)} placeholder="City" style={fieldInput} /></label>
                  <label style={fieldLabel}>State *<input required value={stateName} onChange={e => setStateName(e.target.value)} placeholder="State" style={fieldInput} /></label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                  <label style={fieldLabel}>Phone number *<input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98201 11223" style={fieldInput} /></label>
                  <label style={fieldLabel}>Email *<input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" style={fieldInput} /></label>
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
                  PAN & Aadhaar Details
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
                      PAN Card Details *
                    </label>
                    {panDoc && panBackDoc && (
                      <span style={{ fontSize: '11px', color: '#166534', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <FileCheck size={12} />
                        Document Attached
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      required
                      value={panNumber}
                      onChange={handlePanChange}
                      placeholder="PAN Card No. (e.g. ABCDE1234F)"
                      maxLength={10}
                      style={{
                        gridColumn: '1 / -1',
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8, padding: 10, border: '1px solid #EADBBE', borderRadius: 9, background: '#FFFCF7' }}>
                      <strong style={{ fontSize: 11.5, color: '#78716C' }}>Front side</strong>
                      <input
                        type="file"
                        id="pan-front-file-input"
                        accept="image/*,.pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileUpload(e, 'pan_front')}
                      />
                      <label
                        htmlFor="pan-front-file-input"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%',
                          boxSizing: 'border-box',
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
                        {panUploading ? 'Uploading...' : (panDoc ? 'Replace front' : 'Upload front')}
                      </label>
                      {panDoc ? renderDocumentPreview(panDoc, 'PAN front', () => setPanDoc('')) : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 54, border: '1px dashed #E7E5E4', borderRadius: 6, color: '#A8A29E', fontSize: 11 }}>No front image uploaded</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8, padding: 10, border: '1px solid #EADBBE', borderRadius: 9, background: '#FFFCF7' }}>
                      <strong style={{ fontSize: 11.5, color: '#78716C' }}>Back side</strong>
                      <input type="file" id="pan-back-file-input" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => handleFileUpload(e, 'pan_back')} />
                      <label htmlFor="pan-back-file-input" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 8, border: '1px solid #DAC493', background: panBackDoc ? '#F0FDF4' : '#FAF6EE', color: panBackDoc ? '#166534' : '#8C6228', fontSize: 12, fontWeight: 700, cursor: panUploading ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}><Upload size={14} />{panUploading ? 'Uploading...' : panBackDoc ? 'Replace back' : 'Upload back'}</label>
                      {panBackDoc ? renderDocumentPreview(panBackDoc, 'PAN back', () => setPanBackDoc('')) : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 54, border: '1px dashed #E7E5E4', borderRadius: 6, color: '#A8A29E', fontSize: 11 }}>No back image uploaded</div>}
                    </div>
                  </div>
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
                      Aadhaar Card Details *
                    </label>
                    {aadhaarDoc && aadhaarBackDoc && (
                      <span style={{ fontSize: '11px', color: '#166534', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <FileCheck size={12} />
                        Document Attached
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      required
                      value={aadhaarNumber}
                      onChange={handleAadhaarChange}
                      placeholder="Aadhaar No. (e.g. 5412 8765 4321)"
                      maxLength={14}
                      style={{
                        gridColumn: '1 / -1',
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8, padding: 10, border: '1px solid #EADBBE', borderRadius: 9, background: '#FFFCF7' }}>
                      <strong style={{ fontSize: 11.5, color: '#78716C' }}>Front side</strong>
                      <input
                        type="file"
                        id="aadhaar-front-file-input"
                        accept="image/*,.pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileUpload(e, 'aadhaar_front')}
                      />
                      <label
                        htmlFor="aadhaar-front-file-input"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%',
                          boxSizing: 'border-box',
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
                        {aadhaarUploading ? 'Uploading...' : (aadhaarDoc ? 'Replace front' : 'Upload front')}
                      </label>
                      {aadhaarDoc ? renderDocumentPreview(aadhaarDoc, 'Aadhaar front', () => setAadhaarDoc('')) : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 54, border: '1px dashed #E7E5E4', borderRadius: 6, color: '#A8A29E', fontSize: 11 }}>No front image uploaded</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8, padding: 10, border: '1px solid #EADBBE', borderRadius: 9, background: '#FFFCF7' }}>
                      <strong style={{ fontSize: 11.5, color: '#78716C' }}>Back side</strong>
                      <input type="file" id="aadhaar-back-file-input" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => handleFileUpload(e, 'aadhaar_back')} />
                      <label htmlFor="aadhaar-back-file-input" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 8, border: '1px solid #DAC493', background: aadhaarBackDoc ? '#F0FDF4' : '#FAF6EE', color: aadhaarBackDoc ? '#166534' : '#8C6228', fontSize: 12, fontWeight: 700, cursor: aadhaarUploading ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}><Upload size={14} />{aadhaarUploading ? 'Uploading...' : aadhaarBackDoc ? 'Replace back' : 'Upload back'}</label>
                      {aadhaarBackDoc ? renderDocumentPreview(aadhaarBackDoc, 'Aadhaar back', () => setAadhaarBackDoc('')) : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 54, border: '1px dashed #E7E5E4', borderRadius: 6, color: '#A8A29E', fontSize: 11 }}>No back image uploaded</div>}
                    </div>
                  </div>
                </div>
              </div>

              {/* BANK DETAILS */}
              <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '18px', border: '1px solid #EADBBE', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8C6228', display: 'flex', alignItems: 'center', gap: '6px' }}><Landmark size={14} />Bank Details</div>
                <label style={fieldLabel}>Name as per bank *<input required value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} placeholder="Account holder name" style={fieldInput} /></label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                  <label style={fieldLabel}>Bank name *<input required value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Bank name" style={fieldInput} /></label>
                  <label style={fieldLabel}>IFSC code *<input required value={ifscCode} onChange={e => setIfscCode(e.target.value.toUpperCase())} placeholder="e.g. HDFC0001234" style={{ ...fieldInput, textTransform: 'uppercase' }} /></label>
                </div>
                <div>
                  <label style={{ ...fieldLabel, marginBottom: 7 }}>Upload QR code *</label>
                  {qrCodeUrl && <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}><img src={qrCodeUrl} alt="UPI QR code" style={{ width: 88, height: 88, objectFit: 'contain', border: '1px solid #E7E5E4', borderRadius: 8, padding: 4 }} /><button type="button" onClick={() => setQrCodeUrl('')} style={{ border: 0, background: 'transparent', color: '#DC2626', cursor: 'pointer' }}>Remove QR code</button></div>}
                  <input type="file" id="staff-qr-file-input" accept="image/*" disabled={qrUploading} onChange={e => handleFileUpload(e, 'qr')} style={{ display: 'none' }} />
                  <label htmlFor="staff-qr-file-input" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 14px', border: '1px solid #DAC493', borderRadius: 8, background: '#FAF6EE', color: '#8C6228', fontSize: 12, fontWeight: 700, cursor: qrUploading ? 'wait' : 'pointer' }}><Upload size={14} />{qrUploading ? 'Uploading…' : qrCodeUrl ? 'Replace QR code' : 'Choose QR code image'}</label>
                </div>
                <label style={fieldLabel}>UPI *<input required value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="name@bank" style={fieldInput} /></label>
              </div>

              {/* ROLE & DESIGNATION */}
              <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '18px', border: '1px solid #EADBBE', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8C6228', display: 'flex', alignItems: 'center', gap: '6px' }}><BriefcaseBusiness size={14} />Role &amp; Designation</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                  <label style={fieldLabel}>Role *
                    <select required value={role} onChange={e => setRole(e.target.value)} style={{ ...fieldInput, cursor: 'pointer' }}>
                      <option value="">Select a role</option>
                      {role && !teamOptions.roles.some(option => option.option_name === role) && <option value={role}>{role} (saved)</option>}
                      {teamOptions.roles.map(option => <option key={option.option_id} value={option.option_name}>{option.option_name}</option>)}
                    </select>
                    <span style={{ fontSize: 10.5, color: '#A8A29E', fontWeight: 400 }}>Scroll the list to browse roles.</span>
                  </label>
                  <label style={fieldLabel}>Designation *
                    <select required value={designation} onChange={e => setDesignation(e.target.value)} style={{ ...fieldInput, cursor: 'pointer' }}>
                      <option value="">Select a designation</option>
                      {designation && !teamOptions.designations.some(option => option.option_name === designation) && <option value={designation}>{designation} (saved)</option>}
                      {teamOptions.designations.map(option => <option key={option.option_id} value={option.option_name}>{option.option_name}</option>)}
                    </select>
                    <span style={{ fontSize: 10.5, color: '#A8A29E', fontWeight: 400 }}>Scroll the list to browse designations.</span>
                  </label>
                </div>
                <label style={fieldLabel}>Department *
                  <select required value={department} onChange={e => setDepartment(e.target.value)} style={{ ...fieldInput, cursor: 'pointer' }}>
                    <option value="">Select a department</option>
                    {department && !teamDepartments.some(item => item.department_name === department) && <option value={department}>{department} (saved)</option>}
                    {teamDepartments.map(item => <option key={item.department_id} value={item.department_name}>{item.department_name}</option>)}
                  </select>
                  <span style={{ fontSize: 10.5, color: '#A8A29E', fontWeight: 400 }}>Departments are managed in Master → Hierarchy.</span>
                </label>
                {department && role && designation && <div role="status" style={{ padding: '10px 12px', border: `1px solid ${assignedPositionHierarchy ? '#D8C49E' : '#E7E5E4'}`, borderRadius: 8, background: assignedPositionHierarchy ? '#FAF6EE' : '#FAFAF9', color: assignedPositionHierarchy ? '#72501F' : '#78716C', fontSize: 12 }}>
                  {assignedPositionHierarchy
                    ? assignedPositionHierarchy.reports_to_name
                      ? <>Reporting line: <strong>{designation} ({role})</strong> reports to <strong>{assignedPositionHierarchy.reports_to_name}</strong>.</>
                      : <><strong>{designation} ({role})</strong> is configured as a top-level position.</>
                    : <>No reporting line is set for this combination yet. Add it under Master → Hierarchy.</>}
                </div>}
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

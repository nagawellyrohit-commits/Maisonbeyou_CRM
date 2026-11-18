import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2, Handshake, X, ArrowLeft, ArrowRight, Plus, Trash2,
  Upload, FileText, CheckCircle2, AlertCircle, Eye, RefreshCw,
  Phone, Mail, Calendar, MapPin, ShieldCheck, User, ExternalLink,
  Key, Lock, EyeOff, Copy, Check, HelpCircle, Printer, Share2, Download
} from 'lucide-react';
import LuxuryDatePicker from './LuxuryDatePicker';
import LoginPreferenceSelector from './LoginPreferenceSelector';
import { IndianCityDropdown, IndianStateDropdown } from './IndianStateCityFields';
import { apiRequest } from '../utils/api';

const FIRM_TYPES = ['Proprietor', 'Partnership', 'Pvt. Ltd.', 'LLP'];
const cleanPhoneDigits = value => String(value || '').replace(/\D/g, '').slice(-10);
const isValidIndianMobile = value => /^[6-9]\d{9}$/.test(cleanPhoneDigits(value));

function PhoneOtpVerification({ value, verified, onVerified }) {
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const phone = String(value || '').replace(/\D/g, '').slice(-10);

  useEffect(() => {
    setOtp('');
    setSent(false);
    setError('');
    setDemoOtp('');
  }, [phone]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const sendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(phone) || busy || cooldown > 0) return;
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest('/kyc/phone-otp/send', { method: 'POST', body: JSON.stringify({ phone }) });
      setSent(true);
      setCooldown(60);
      setDemoOtp(result.demoOtp || '');
    } catch (requestError) {
      setError(requestError.message || 'Could not send OTP. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp) || busy) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest('/kyc/phone-otp/verify', { method: 'POST', body: JSON.stringify({ phone, otp }) });
      onVerified(phone);
      setSent(false);
      setDemoOtp('');
      setCooldown(0);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'OTP verification failed. Check the code and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!phone) return null;
  if (verified) return <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#12805C', fontSize: 11.5, fontWeight: 700, marginTop: 6 }}><CheckCircle2 size={14} /> Mobile verified</div>;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 7 }}>
      {!sent ? (
        <button type="button" onClick={sendOtp} disabled={busy || !/^[6-9]\d{9}$/.test(phone)} style={{ border: '1px solid #DAC493', borderRadius: 7, padding: '6px 10px', background: '#FAF6EE', color: '#8C6228', fontSize: 11.5, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: /^[6-9]\d{9}$/.test(phone) ? 1 : .55 }}>
          {busy ? 'Sending OTP…' : 'Verify by OTP'}
        </button>
      ) : (
        <>
          <input aria-label="SMS verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit OTP" style={{ width: 112, padding: '7px 9px', border: '1px solid #DAC493', borderRadius: 7, fontSize: 12, boxSizing: 'border-box' }} />
          <button type="button" onClick={verifyOtp} disabled={busy || otp.length !== 6} style={{ border: 0, borderRadius: 7, padding: '7px 10px', background: '#A0723E', color: '#FFFFFF', fontSize: 11.5, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: otp.length === 6 ? 1 : .55 }}>
            {busy ? 'Checking…' : 'Confirm OTP'}
          </button>
          <button type="button" onClick={sendOtp} disabled={busy || cooldown > 0} style={{ border: 0, padding: '5px 2px', background: 'transparent', color: '#8C6228', fontSize: 11, fontWeight: 600, cursor: cooldown > 0 ? 'default' : 'pointer' }}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
          </button>
        </>
      )}
      {/^[0-9]{10}$/.test(phone) && !/^[6-9]\d{9}$/.test(phone) && <span role="alert" style={{ color: '#B42318', fontSize: 11 }}>Enter a valid Indian mobile number starting with 6–9.</span>}
      {demoOtp && <span style={{ color: '#796B5D', fontSize: 11 }}>Demo OTP: {demoOtp}</span>}
      {error && <span role="alert" style={{ color: '#B42318', fontSize: 11.5 }}>{error}</span>}
    </div>
  );
}

function BranchEditOtpGate({ locationId, onVerified }) {
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [sentTo, setSentTo] = useState('');
  const initialSendStarted = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const sendOtp = useCallback(async () => {
    if (busy || cooldown > 0) return;
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest('/locations/edit-otp/send', { method: 'POST', body: JSON.stringify({ location_id: locationId }) });
      setSent(true);
      setCooldown(60);
      setDemoOtp(result.demoOtp || '');
      setSentTo(result.sentTo || 'your signed-in account mobile number');
    } catch (requestError) {
      setError(requestError.message || 'Could not send OTP. Try again.');
    } finally {
      setBusy(false);
    }
  }, [busy, cooldown, locationId]);

  useEffect(() => {
    if (initialSendStarted.current) return;
    initialSendStarted.current = true;
    sendOtp();
  }, [sendOtp]);

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp) || busy) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest('/locations/edit-otp/verify', { method: 'POST', body: JSON.stringify({ location_id: locationId, otp }) });
      onVerified();
    } catch (requestError) {
      setError(requestError.message || 'OTP verification failed. Check the code and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 3200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(28, 25, 23, .58)', backdropFilter: 'blur(4px)' }}>
      <section role="dialog" aria-modal="true" aria-labelledby="branch-edit-otp-title" style={{ width: '100%', maxWidth: 460, padding: 30, border: '1px solid #E7D8C4', borderRadius: 18, background: '#FFFFFF', boxShadow: '0 24px 70px rgba(0,0,0,.24)', textAlign: 'center' }}>
        <ShieldCheck size={34} color="#A0723E" />
        <h3 id="branch-edit-otp-title" style={{ margin: '12px 0 8px', color: '#302820' }}>Verify to save branch detail changes</h3>
        {sent
          ? <p style={{ margin: '0 0 20px', color: '#796B5D', fontSize: 14 }}>OTP sent to <strong style={{ color: '#51463D' }}>{sentTo}</strong></p>
          : <p style={{ margin: '0 0 20px', color: '#796B5D', fontSize: 14 }}>{busy ? 'Sending an OTP to the signed-in stakeholder or brand owner…' : 'We could not send the OTP yet. Please try again.'}</p>}
        {sent && <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <input aria-label="Verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit OTP" style={{ width: 132, padding: '10px 12px', border: '1px solid #DAC493', borderRadius: 8, fontSize: 14 }} />
          <button type="button" onClick={verifyOtp} disabled={busy || otp.length !== 6} className="btn-primary" style={{ padding: '10px 16px', opacity: busy || otp.length !== 6 ? .65 : 1 }}>{busy ? 'Checking…' : 'Verify & Save'}</button>
        </div>}
        {demoOtp && <div style={{ marginTop: 12, color: '#796B5D', fontSize: 12 }}>Demo OTP: {demoOtp}</div>}
        {error && <div role="alert" style={{ marginTop: 12, color: '#B42318', fontSize: 13 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 20 }}>
          {!sent && <button type="button" onClick={sendOtp} disabled={busy || cooldown > 0} style={{ border: 0, background: 'transparent', color: '#8C6228', cursor: busy || cooldown > 0 ? 'default' : 'pointer', fontWeight: 700 }}>{cooldown > 0 ? `Try again in ${cooldown}s` : 'Send OTP'}</button>}
          {sent && <button type="button" onClick={sendOtp} disabled={busy || cooldown > 0} style={{ border: 0, background: 'transparent', color: '#8C6228', cursor: busy || cooldown > 0 ? 'default' : 'pointer', fontWeight: 700 }}>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}</button>}
        </div>
      </section>
    </div>
  );
}

const headerUtilityButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  minHeight: 36,
  padding: '0 12px',
  border: '1px solid #E7D8C4',
  borderRadius: 999,
  background: '#FFFFFF',
  color: '#80633C',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};

export default function BranchFranchiseKYCModal({
  isOpen,
  embedded = false,
  onClose,
  onSuccess,
  defaultType = 'branch', // 'branch' | 'franchise'
  defaultFirmType = 'Proprietor', // 'Proprietor' | 'Partnership' | 'Pvt. Ltd.' | 'LLP'
  locationToEdit = null // if present, edit mode
}) {
  if (!isOpen) return null;

  const isEdit = Boolean(locationToEdit?.location_id);
  const existingPhoneDigits = new Set();
  const addExistingPhones = values => {
    let items = Array.isArray(values) ? values : [values];
    if (typeof values === 'string' && values.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(values);
        if (Array.isArray(parsed)) items = parsed;
      } catch {}
    }
    items.forEach(value => {
      const digits = cleanPhoneDigits(value);
      if (digits.length === 10) existingPhoneDigits.add(digits);
    });
  };
  addExistingPhones([locationToEdit?.phone, locationToEdit?.primary_login_phone, locationToEdit?.kyc?.primary_login_phone]);
  addExistingPhones(locationToEdit?.kyc?.mobile_numbers);
  (locationToEdit?.stakeholders || []).forEach(stakeholder => {
    addExistingPhones([stakeholder?.mobile, stakeholder?.primary_login_phone]);
    addExistingPhones(stakeholder?.mobile_numbers);
  });
  const [verifiedPhones, setVerifiedPhones] = useState({});
  const isPhoneVerified = phone => {
    const digits = cleanPhoneDigits(phone);
    return Boolean(verifiedPhones[digits] || (isEdit && existingPhoneDigits.has(digits)));
  };
  const markPhoneVerified = phone => {
    const digits = cleanPhoneDigits(phone);
    if (digits.length === 10) setVerifiedPhones(prev => ({ ...prev, [digits]: true }));
  };

  // RELATIONSHIP & FIRM TYPE (Determined directly by navigation)
  const [relationshipType, setRelationshipType] = useState(
    locationToEdit?.type || defaultType || 'branch'
  );
  const [firmType, setFirmType] = useState(
    locationToEdit?.kyc?.firm_type || locationToEdit?.firm_type || defaultFirmType || 'Proprietor'
  );

  // SECTION 2: COMMON BUSINESS DETAILS
  const [branchName, setBranchName] = useState(locationToEdit?.name || '');
  const [firmName, setFirmName] = useState(
    locationToEdit?.kyc?.firm_name || locationToEdit?.firm_name || ''
  );
  const [addressLine1, setAddressLine1] = useState(
    locationToEdit?.kyc?.address_line1 || locationToEdit?.address || ''
  );
  const [addressLine2, setAddressLine2] = useState(
    locationToEdit?.kyc?.address_line2 || ''
  );
  const [pincode, setPincode] = useState(locationToEdit?.pincode || '');
  const [city, setCity] = useState(locationToEdit?.city || '');
  const [state, setState] = useState(locationToEdit?.state || '');
  const [officePhone, setOfficePhone] = useState(() => {
    const storedPhone = String(locationToEdit?.phone || '').trim();
    const loginPhone = String(locationToEdit?.primary_login_phone || locationToEdit?.kyc?.primary_login_phone || '').replace(/\D/g, '');
    return storedPhone && storedPhone.replace(/\D/g, '') !== loginPhone ? storedPhone : '';
  });

  // Repeatable Business Mobiles
  const [mobileNumbers, setMobileNumbers] = useState(() => {
    if (locationToEdit?.kyc?.mobile_numbers?.length > 0) {
      return locationToEdit.kyc.mobile_numbers;
    }
    return [locationToEdit?.phone || ''];
  });

  // Repeatable Business Emails
  const [emailIds, setEmailIds] = useState(() => {
    if (locationToEdit?.kyc?.email_ids?.length > 0) {
      return locationToEdit.kyc.email_ids;
    }
    return [locationToEdit?.email || ''];
  });

  // Helper to ensure multi-item lists (arrays or JSON strings)
  const ensureList = (val, fallback = '') => {
    if (Array.isArray(val) && val.length > 0) return val;
    if (typeof val === 'string' && val.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    if (typeof val === 'string' && val.trim()) return [val.trim()];
    if (fallback) return [fallback];
    return [''];
  };

  // SECTION 3: STAKEHOLDERS (Proprietor, Partners, Directors)
  // Initial default stakeholder template
  const createEmptyStakeholder = (role = 'Partner') => ({
    role_type: role,
    name: '',
    mobile: '',
    mobile_numbers: [''],
    primary_login_phone: '',
    email: '',
    email_ids: [''],
    primary_login_email: '',
    gender: 'Female',
    dob: '',
    marital_status: 'Unmarried',
    anniversary_date: '',
    pan_number: '',
    pan_doc: '',
    aadhaar_number: '',
    aadhaar_doc: '',
    din_number: ''
  });

  // Stakeholders list (minimum 3 for Pvt. Ltd. & LLP, minimum 2 for Partnership, 1 for Proprietor)
  const [stakeholders, setStakeholders] = useState(() => {
    const currentFirm = locationToEdit?.kyc?.firm_type || locationToEdit?.firm_type || defaultFirmType || 'Proprietor';
    const roleForFirm = currentFirm === 'Proprietor' ? 'Proprietor' : (currentFirm === 'Partnership' ? 'Partner' : 'Director');
    const minRequired = (currentFirm === 'Pvt. Ltd.' || currentFirm === 'LLP') ? 3 : (currentFirm === 'Partnership' ? 2 : 1);

    if (locationToEdit?.stakeholders && locationToEdit.stakeholders.length > 0) {
      const mapped = locationToEdit.stakeholders.map(s => {
        const mList = ensureList(s.mobile_numbers, s.mobile);
        const eList = ensureList(s.email_ids, s.email);
        return {
          role_type: s.role_type || roleForFirm,
          name: s.name || '',
          mobile: mList[0] || s.mobile || '',
          mobile_numbers: mList,
          primary_login_phone: mList.length === 1 ? (mList[0] || '') : (s.primary_login_phone || mList[0] || s.mobile || ''),
          email: eList[0] || s.email || '',
          email_ids: eList,
          primary_login_email: eList.length === 1 ? (eList[0] || '') : (s.primary_login_email || eList[0] || s.email || ''),
          gender: s.gender || 'Female',
          dob: s.dob || '',
          marital_status: s.marital_status || 'Unmarried',
          anniversary_date: s.anniversary_date || '',
          pan_number: s.pan_number || '',
          pan_doc: s.pan_doc || '',
          aadhaar_number: s.aadhaar_number || '',
          aadhaar_doc: s.aadhaar_doc || '',
          din_number: s.din_number || ''
        };
      });
      while (mapped.length < minRequired) {
        mapped.push(createEmptyStakeholder(roleForFirm));
      }
      return mapped;
    }

    const items = [];
    for (let i = 0; i < minRequired; i++) {
      items.push(createEmptyStakeholder(roleForFirm));
    }
    return items;
  });

  // SECTION 4: FIRM DOCUMENTS
  const [firmPan, setFirmPan] = useState(locationToEdit?.kyc?.firm_pan || '');
  const [firmPanDoc, setFirmPanDoc] = useState(locationToEdit?.kyc?.firm_pan_doc || '');
  const [cinNumber, setCinNumber] = useState(locationToEdit?.kyc?.cin_number || '');
  const [incorporationDoc, setIncorporationDoc] = useState(locationToEdit?.kyc?.incorporation_doc || '');
  const [aoaDoc, setAoaDoc] = useState(locationToEdit?.kyc?.aoa_doc || locationToEdit?.kyc?.aoa_moa_doc || '');
  const [moaDoc, setMoaDoc] = useState(locationToEdit?.kyc?.moa_doc || '');
  const [gstNumber, setGstNumber] = useState(locationToEdit?.kyc?.gst_number || '');
  const [gstDoc, setGstDoc] = useState(locationToEdit?.kyc?.gst_doc || '');
  const [gumasthaNumber, setGumasthaNumber] = useState(locationToEdit?.kyc?.gumastha_number || '');
  const [gumasthaDoc, setGumasthaDoc] = useState(locationToEdit?.kyc?.gumastha_doc || '');

  // SECTION 4: FIRM BANK DETAILS
  const [bankFirmName, setBankFirmName] = useState(locationToEdit?.kyc?.bank_firm_name || '');
  const [bankName, setBankName] = useState(locationToEdit?.kyc?.bank_name || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(locationToEdit?.kyc?.bank_account_number || '');
  const [bankIfscCode, setBankIfscCode] = useState(locationToEdit?.kyc?.bank_ifsc_code || '');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditOtp, setShowEditOtp] = useState(false);
  const [uploadingDocKey, setUploadingDocKey] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [viewingDocUrl, setViewingDocUrl] = useState(null);
  const [viewingDocTop, setViewingDocTop] = useState(24);

  // Flow Step: 1 = KYC Form, 2 = Create Admin Logins, 3 = Confirmation / Summary
  const [currentStep, setCurrentStep] = useState(1);
  const [isReviewing, setIsReviewing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [savedLocation, setSavedLocation] = useState(null);
  const [adminAccounts, setAdminAccounts] = useState([]);
  const [adminErrors, setAdminErrors] = useState({});
  const [isSavingAdmins, setIsSavingAdmins] = useState(false);
  const [createdAdminResult, setCreatedAdminResult] = useState([]);
  const [copiedKey, setCopiedKey] = useState(null);

  // Hidden file input refs
  const fileInputRefs = useRef({});

  // Escape key closes modal or returns to previous step
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (currentStep === 1 && isReviewing) {
          setIsReviewing(false);
        } else if (currentStep === 2) {
          setCurrentStep(1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (currentStep === 3) {
          if (onSuccess && savedLocation) onSuccess(savedLocation);
          onClose();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, isReviewing, onSuccess, savedLocation, onClose]);

  useEffect(() => {
    if (!isOpen || isEdit) return;
    apiRequest('/locations')
      .then(result => setAvailableLocations(result.locations || []))
      .catch(() => setAvailableLocations([]));
  }, [isOpen, isEdit]);

  // Sync preselected registration relationship and firm type when modal opens
  useEffect(() => {
    if (isOpen) {
      // Verification is per form session; saved values must be verified again when editing.
      setVerifiedPhones({});
      setShowEditOtp(false);
      setCurrentStep(1);
      setIsReviewing(false);
      setShareFeedback('');
      setSavedLocation(null);
      setAdminAccounts([]);
      setAdminErrors({});
      setCreatedAdminResult([]);
      setCopiedKey(null);

      const initialType = locationToEdit?.type || defaultType || 'branch';
      const initialFirm = locationToEdit?.kyc?.firm_type || locationToEdit?.firm_type || defaultFirmType || 'Proprietor';
      setRelationshipType(initialType);
      setFirmType(initialFirm);

      if (!locationToEdit) {
        const targetRole = initialFirm === 'Proprietor' ? 'Proprietor' : (initialFirm === 'Partnership' ? 'Partner' : 'Director');
        const minRequired = (initialFirm === 'Pvt. Ltd.' || initialFirm === 'LLP') ? 3 : (initialFirm === 'Partnership' ? 2 : 1);
        const items = [];
        for (let i = 0; i < minRequired; i++) {
          items.push(createEmptyStakeholder(targetRole));
        }
        setStakeholders(items);
        setMobileNumbers(['']);
        setEmailIds(['']);
        setOfficePhone('');
        setValidationErrors({});
        setFirmPan('');
        setFirmPanDoc('');
        setCinNumber('');
        setIncorporationDoc('');
        setAoaDoc('');
        setMoaDoc('');
        setGstNumber('');
        setGstDoc('');
        setGumasthaNumber('');
        setGumasthaDoc('');
        setBankFirmName('');
        setBankName('');
        setBankAccountNumber('');
        setBankIfscCode('');
      } else {
        const initMobiles = locationToEdit.kyc?.mobile_numbers?.length > 0
          ? locationToEdit.kyc.mobile_numbers
          : ensureList(locationToEdit.phone, '');
        setMobileNumbers(initMobiles);

        const loginPhones = [
          locationToEdit.primary_login_phone,
          locationToEdit.kyc?.primary_login_phone,
          ...initMobiles
        ].map(phone => String(phone || '').replace(/\D/g, '')).filter(Boolean);
        const storedOfficePhone = String(locationToEdit.phone || '').trim();
        setOfficePhone(
          storedOfficePhone && !loginPhones.includes(storedOfficePhone.replace(/\D/g, ''))
            ? storedOfficePhone
            : ''
        );

        const initEmails = locationToEdit.kyc?.email_ids?.length > 0
          ? locationToEdit.kyc.email_ids
          : ensureList(locationToEdit.email, '');
        setEmailIds(initEmails);

        const targetRole = initialFirm === 'Proprietor' ? 'Proprietor' : (initialFirm === 'Partnership' ? 'Partner' : 'Director');
        const minRequired = (initialFirm === 'Pvt. Ltd.' || initialFirm === 'LLP') ? 3 : (initialFirm === 'Partnership' ? 2 : 1);
        if (locationToEdit.stakeholders && locationToEdit.stakeholders.length > 0) {
          const mapped = locationToEdit.stakeholders.map(s => {
            const mList = ensureList(s.mobile_numbers, s.mobile);
            const eList = ensureList(s.email_ids, s.email);
            return {
              role_type: s.role_type || targetRole,
              name: s.name || '',
              mobile: mList[0] || s.mobile || '',
              mobile_numbers: mList,
              primary_login_phone: mList.length === 1 ? (mList[0] || '') : (s.primary_login_phone || mList[0] || s.mobile || ''),
              email: eList[0] || s.email || '',
              email_ids: eList,
              primary_login_email: eList.length === 1 ? (eList[0] || '') : (s.primary_login_email || eList[0] || s.email || ''),
              gender: s.gender || 'Female',
              dob: s.dob || '',
              marital_status: s.marital_status || 'Unmarried',
              anniversary_date: s.anniversary_date || '',
              pan_number: s.pan_number || '',
              pan_doc: s.pan_doc || '',
              aadhaar_number: s.aadhaar_number || '',
              aadhaar_doc: s.aadhaar_doc || '',
              din_number: s.din_number || ''
            };
          });
          while (mapped.length < minRequired) {
            mapped.push(createEmptyStakeholder(targetRole));
          }
          setStakeholders(mapped);
        }
        setFirmPan(locationToEdit.kyc?.firm_pan || '');
        setFirmPanDoc(locationToEdit.kyc?.firm_pan_doc || '');
        setCinNumber(locationToEdit.kyc?.cin_number || '');
        setIncorporationDoc(locationToEdit.kyc?.incorporation_doc || '');
        setAoaDoc(locationToEdit.kyc?.aoa_doc || locationToEdit.kyc?.aoa_moa_doc || '');
        setMoaDoc(locationToEdit.kyc?.moa_doc || '');
        setGstNumber(locationToEdit.kyc?.gst_number || '');
        setGstDoc(locationToEdit.kyc?.gst_doc || '');
        setGumasthaNumber(locationToEdit.kyc?.gumastha_number || '');
        setGumasthaDoc(locationToEdit.kyc?.gumastha_doc || '');
        setBankFirmName(locationToEdit.kyc?.bank_firm_name || '');
        setBankName(locationToEdit.kyc?.bank_name || '');
        setBankAccountNumber(locationToEdit.kyc?.bank_account_number || '');
        setBankIfscCode(locationToEdit.kyc?.bank_ifsc_code || '');
      }
    }
  }, [isOpen, defaultType, defaultFirmType, locationToEdit]);

  // Multiple Mobiles Handlers
  const handleAddMobile = () => {
    setMobileNumbers(prev => [...prev, '']);
  };

  const handleMobileChange = (idx, val) => {
    const clean = val.replace(/\D/g, '').slice(0, 10);
    const oldVal = mobileNumbers[idx];
    setMobileNumbers(prev => {
      const copy = [...prev];
      copy[idx] = clean;
      return copy;
    });

  };

  const handleRemoveMobile = (idx) => {
    if (mobileNumbers.length <= 1) return;
    setMobileNumbers(prev => prev.filter((_, i) => i !== idx));
  };

  // Multiple Emails Handlers
  const handleAddEmail = () => {
    setEmailIds(prev => [...prev, '']);
  };

  const handleEmailChange = (idx, val) => {
    setEmailIds(prev => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const handleRemoveEmail = (idx) => {
    if (emailIds.length <= 1) return;
    setEmailIds(prev => prev.filter((_, i) => i !== idx));
  };

  // Stakeholder Multiple Mobiles Handlers
  const handleAddStakeholderMobile = (stkIdx) => {
    setStakeholders(prev => {
      const copy = [...prev];
      const cur = Array.isArray(copy[stkIdx]?.mobile_numbers) && copy[stkIdx].mobile_numbers.length > 0
        ? [...copy[stkIdx].mobile_numbers]
        : [copy[stkIdx]?.mobile || ''];
      cur.push('');
      copy[stkIdx] = {
        ...copy[stkIdx],
        mobile_numbers: cur,
        mobile: cur[0] || ''
      };
      return copy;
    });
  };

  const handleStakeholderMobileChange = (stkIdx, mobIdx, val) => {
    const clean = val.replace(/\D/g, '').slice(0, 10);
    setStakeholders(prev => {
      const copy = [...prev];
      const cur = Array.isArray(copy[stkIdx]?.mobile_numbers) && copy[stkIdx].mobile_numbers.length > 0
        ? [...copy[stkIdx].mobile_numbers]
        : [copy[stkIdx]?.mobile || ''];
      const oldVal = cur[mobIdx];
      cur[mobIdx] = clean;
      let newPrimary = copy[stkIdx]?.primary_login_phone || '';
      if (newPrimary && newPrimary === oldVal) {
        newPrimary = clean;
      } else if (!newPrimary && mobIdx === 0) {
        newPrimary = clean;
      }
      copy[stkIdx] = {
        ...copy[stkIdx],
        mobile_numbers: cur,
        mobile: cur[0] || '',
        primary_login_phone: newPrimary
      };
      return copy;
    });

    const prefix = `stakeholder_${stkIdx}_`;
    const errKey = mobIdx === 0 ? `${prefix}mobile` : `${prefix}mobile_${mobIdx}`;
    if (validationErrors[errKey]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[errKey];
        return updated;
      });
    }
  };

  const handleRemoveStakeholderMobile = (stkIdx, mobIdx) => {
    setStakeholders(prev => {
      const copy = [...prev];
      const curList = copy[stkIdx]?.mobile_numbers || [copy[stkIdx]?.mobile || ''];
      const removedVal = curList[mobIdx];
      let cur = curList.filter((_, i) => i !== mobIdx);
      if (cur.length === 0) cur = [''];
      let newPrimary = copy[stkIdx]?.primary_login_phone || '';
      if (newPrimary && newPrimary === removedVal) {
        newPrimary = cur.find(value => String(value || '').trim()) || '';
      }
      if (cur.length === 1) {
        newPrimary = cur[0] || '';
      }
      copy[stkIdx] = {
        ...copy[stkIdx],
        mobile_numbers: cur,
        mobile: cur[0] || '',
        primary_login_phone: newPrimary
      };
      return copy;
    });
  };

  const handleSelectStakeholderPrimaryPhone = (stkIdx, mob) => {
    const clean = (mob || '').replace(/\D/g, '').slice(0, 10);
    if (!clean || clean.length < 10) {
      alert('Please enter a valid 10-digit mobile number before setting it as login preference');
      return;
    }
    setStakeholders(prev => {
      const copy = [...prev];
      copy[stkIdx] = {
        ...copy[stkIdx],
        primary_login_phone: clean
      };
      return copy;
    });
    const prefix = `stakeholder_${stkIdx}_primary_phone`;
    if (validationErrors[prefix]) {
      setValidationErrors(prev => {
        const copy = { ...prev };
        delete copy[prefix];
        return copy;
      });
    }
  };

  const handleChangeStakeholderPrimaryPhone = (stkIdx) => {
    setStakeholders(prev => {
      const copy = [...prev];
      copy[stkIdx] = {
        ...copy[stkIdx],
        primary_login_phone: ''
      };
      return copy;
    });
  };

  // Stakeholder Multiple Emails Handlers
  const handleAddStakeholderEmail = (stkIdx) => {
    setStakeholders(prev => {
      const copy = [...prev];
      const cur = Array.isArray(copy[stkIdx]?.email_ids) && copy[stkIdx].email_ids.length > 0
        ? [...copy[stkIdx].email_ids]
        : [copy[stkIdx]?.email || ''];
      cur.push('');
      copy[stkIdx] = {
        ...copy[stkIdx],
        email_ids: cur,
        email: cur[0] || ''
      };
      return copy;
    });
  };

  const handleStakeholderEmailChange = (stkIdx, emailIdx, val) => {
    setStakeholders(prev => {
      const copy = [...prev];
      const cur = Array.isArray(copy[stkIdx]?.email_ids) && copy[stkIdx].email_ids.length > 0
        ? [...copy[stkIdx].email_ids]
        : [copy[stkIdx]?.email || ''];
      const oldVal = cur[emailIdx];
      cur[emailIdx] = val;
      let newPrimary = copy[stkIdx]?.primary_login_email || '';
      if (newPrimary && newPrimary.toLowerCase() === oldVal.trim().toLowerCase()) {
        newPrimary = val.trim().toLowerCase();
      } else if (!newPrimary && emailIdx === 0) {
        newPrimary = val.trim().toLowerCase();
      }
      copy[stkIdx] = {
        ...copy[stkIdx],
        email_ids: cur,
        email: cur[0] || '',
        primary_login_email: newPrimary
      };
      return copy;
    });

    const prefix = `stakeholder_${stkIdx}_`;
    const errKey = emailIdx === 0 ? `${prefix}email` : `${prefix}email_${emailIdx}`;
    if (validationErrors[errKey]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[errKey];
        return updated;
      });
    }
  };

  const handleRemoveStakeholderEmail = (stkIdx, emailIdx) => {
    setStakeholders(prev => {
      const copy = [...prev];
      const curList = copy[stkIdx]?.email_ids || [copy[stkIdx]?.email || ''];
      const removedVal = curList[emailIdx];
      let cur = curList.filter((_, i) => i !== emailIdx);
      if (cur.length === 0) cur = [''];
      let newPrimary = copy[stkIdx]?.primary_login_email || '';
      if (newPrimary && newPrimary.toLowerCase() === (removedVal || '').trim().toLowerCase()) {
        newPrimary = cur.find(value => String(value || '').trim())?.trim().toLowerCase() || '';
      }
      if (cur.length === 1) {
        newPrimary = (cur[0] || '').trim().toLowerCase();
      }
      copy[stkIdx] = {
        ...copy[stkIdx],
        email_ids: cur,
        email: cur[0] || '',
        primary_login_email: newPrimary
      };
      return copy;
    });
  };

  const handleSelectStakeholderPrimaryEmail = (stkIdx, em) => {
    const clean = (em || '').trim().toLowerCase();
    if (!clean || !/^\S+@\S+\.\S+$/.test(clean)) {
      alert('Please enter a valid email address before setting it as login preference');
      return;
    }
    setStakeholders(prev => {
      const copy = [...prev];
      copy[stkIdx] = {
        ...copy[stkIdx],
        primary_login_email: clean
      };
      return copy;
    });
    const prefix = `stakeholder_${stkIdx}_primary_email`;
    if (validationErrors[prefix]) {
      setValidationErrors(prev => {
        const copy = { ...prev };
        delete copy[prefix];
        return copy;
      });
    }
  };

  const handleChangeStakeholderPrimaryEmail = (stkIdx) => {
    setStakeholders(prev => {
      const copy = [...prev];
      copy[stkIdx] = {
        ...copy[stkIdx],
        primary_login_email: ''
      };
      return copy;
    });
  };

  // Stakeholder Handlers
  const handleAddStakeholder = () => {
    const role = firmType === 'Proprietor' ? 'Proprietor' : (firmType === 'Partnership' ? 'Partner' : 'Director');
    setStakeholders(prev => [...prev, createEmptyStakeholder(role)]);
  };

  const handleRemoveStakeholder = (idx) => {
    const minRequired = (firmType === 'Pvt. Ltd.' || firmType === 'LLP') ? 3 : (firmType === 'Partnership' ? 2 : 1);
    if (stakeholders.length <= minRequired) return;
    setStakeholders(prev => prev.filter((_, i) => i !== idx));
  };

  const updateStakeholderField = (idx, field, value) => {
    setStakeholders(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  // Admin Account Handlers for Step 2
  const handleAddAdminAccount = () => {
    setAdminAccounts(prev => [
      ...prev,
      {
        id: `extra_${Date.now()}_${Math.random()}`,
        name: '',
        email: '',
        phone: '',
        password: 'Admin@' + Math.floor(100000 + Math.random() * 900000),
        showPassword: false,
        role_type: 'Additional Admin',
        isStakeholder: false
      }
    ]);
  };

  const handleRemoveAdminAccount = (idx) => {
    setAdminAccounts(prev => prev.filter((_, i) => i !== idx));
  };

  const updateAdminField = (idx, field, value) => {
    setAdminAccounts(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
    if (adminErrors[`admin_${idx}_${field}`]) {
      setAdminErrors(prev => {
        const copy = { ...prev };
        delete copy[`admin_${idx}_${field}`];
        return copy;
      });
    }
  };

  const toggleAdminPasswordVisibility = (idx) => {
    setAdminAccounts(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], showPassword: !copy[idx].showPassword };
      return copy;
    });
  };

  const generateAdminPassword = (idx) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pass = 'M@ison';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += Math.floor(10 + Math.random() * 90);
    updateAdminField(idx, 'password', pass);
  };

  const handleCopyText = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveAdminLogins = async (e) => {
    e?.preventDefault();
    if (!savedLocation?.location_id) return;

    const errors = {};
    const emailsSeen = new Set();

    adminAccounts.forEach((adm, idx) => {
      const pfx = `admin_${idx}_`;
      if (!adm.name || !adm.name.trim()) {
        errors[`${pfx}name`] = `Full name is required for Admin #${idx + 1}`;
      }
      if (!adm.email || !adm.email.trim()) {
        errors[`${pfx}email`] = `Login email is required for Admin #${idx + 1}`;
      } else if (!/^\S+@\S+\.\S+$/.test(adm.email.trim())) {
        errors[`${pfx}email`] = `Valid email format required (e.g. admin@example.com)`;
      } else {
        const lowerEmail = adm.email.trim().toLowerCase();
        if (emailsSeen.has(lowerEmail)) {
          errors[`${pfx}email`] = `Duplicate email address. Each admin must have a unique login email`;
        }
        emailsSeen.add(lowerEmail);
      }

      if (!adm.password || adm.password.trim().length < 6) {
        errors[`${pfx}password`] = `Password must be at least 6 characters`;
      }
      const phone = String(adm.phone || '').trim();
      if (phone && !isValidIndianMobile(phone)) {
        errors[`${pfx}phone`] = 'Enter a valid 10-digit Indian mobile number';
      } else if (phone && !isPhoneVerified(phone)) {
        errors[`${pfx}phone`] = 'Verify this mobile number with OTP before completing setup';
      }
    });

    if (Object.keys(errors).length > 0) {
      setAdminErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setIsSavingAdmins(true);
      setAdminErrors({});

      const payload = {
        admins: adminAccounts.map(a => ({
          name: a.name.trim(),
          email: a.email.trim().toLowerCase(),
          phone: (a.phone || '').trim(),
          password: a.password.trim()
        }))
      };

      const res = await apiRequest(`/locations/${savedLocation.location_id}/admin-users`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res?.success) {
        setCreatedAdminResult(adminAccounts);
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Error saving admin logins:', err);
      alert(err.message || 'Failed to configure admin accounts');
    } finally {
      setIsSavingAdmins(false);
    }
  };

  // Document Upload Handler
  const triggerFileUpload = (key) => {
    if (fileInputRefs.current[key]) {
      fileInputRefs.current[key].click();
    }
  };

  const openDocumentPreview = (url, event) => {
    const clickTop = event?.currentTarget?.getBoundingClientRect?.().top ?? 24;
    setViewingDocTop(Math.max(24, Math.min(clickTop, window.innerHeight - 160)));
    setViewingDocUrl(url);
  };

  const handleDocumentFile = async (e, key, stakeholderIdx = null) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers change
    e.target.value = '';

    // Validate size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      alert('File size exceeds the 20MB limit. Please upload a smaller document.');
      return;
    }

    try {
      setUploadingDocKey(key);
      const formData = new FormData();
      formData.append('file', file);

      const data = await apiRequest('/kyc/upload', {
        method: 'POST',
        body: formData
      });

      // Assign uploaded URL
      if (stakeholderIdx !== null) {
        if (key.includes('aadhaar')) {
          updateStakeholderField(stakeholderIdx, 'aadhaar_doc', data.fileUrl);
          if (validationErrors[`stakeholder_${stakeholderIdx}_aadhaar_doc`]) {
            setValidationErrors(prev => {
              const updated = { ...prev };
              delete updated[`stakeholder_${stakeholderIdx}_aadhaar_doc`];
              return updated;
            });
          }
        } else {
          updateStakeholderField(stakeholderIdx, 'pan_doc', data.fileUrl);
          if (validationErrors[`stakeholder_${stakeholderIdx}_pan_doc`]) {
            setValidationErrors(prev => {
              const updated = { ...prev };
              delete updated[`stakeholder_${stakeholderIdx}_pan_doc`];
              return updated;
            });
          }
        }
      } else if (key === 'firm_pan') {
        setFirmPanDoc(data.fileUrl);
      } else if (key === 'gst') {
        setGstDoc(data.fileUrl);
        setValidationErrors(prev => {
          const updated = { ...prev };
          delete updated.gstDoc;
          return updated;
        });
      } else if (key === 'gumastha') {
        setGumasthaDoc(data.fileUrl);
        setValidationErrors(prev => {
          const updated = { ...prev };
          delete updated.gumasthaDoc;
          return updated;
        });
      } else if (key === 'incorporation') {
        setIncorporationDoc(data.fileUrl);
      } else if (key === 'aoa') {
        setAoaDoc(data.fileUrl);
      } else if (key === 'moa') {
        setMoaDoc(data.fileUrl);
      } else if (key === 'aoa_moa') {
        setAoaDoc(data.fileUrl);
      }
    } catch (err) {
      console.error('Document upload error:', err);
      alert(err.message || 'Error uploading document');
    } finally {
      setUploadingDocKey(null);
    }
  };

  // Validation logic
  const validateForm = () => {
    const errors = {};

    if (!branchName.trim()) {
      errors.branchName = 'Location / Branch Name is required';
    }
    if (!firmName.trim()) {
      errors.firmName = 'Name of Firm is required';
    }
    if (!addressLine1.trim()) {
      errors.addressLine1 = 'Address Line 1 is required';
    }
    if (!pincode.trim() || !/^\d{6}$/.test(pincode.trim())) {
      errors.pincode = 'Valid 6-digit Pincode is required';
    }
    if (!city.trim()) {
      errors.city = 'City is required';
    }
    if (!state.trim()) {
      errors.state = 'State is required';
    }

    // Validate mobiles
    const enteredMobiles = mobileNumbers.filter(m => m.trim());
    const validMobiles = enteredMobiles.filter(isValidIndianMobile);
    if (validMobiles.length === 0) {
      errors.mobileNumbers = 'At least one valid 10-digit Mobile Number is required';
    } else if (enteredMobiles.some(m => !isValidIndianMobile(m))) {
      errors.mobileNumbers = 'Every entered business mobile number must be a valid 10-digit Indian number';
    } else if (enteredMobiles.some(m => !isPhoneVerified(m))) {
      errors.mobileNumbers = 'Verify every entered business mobile number with OTP before continuing';
    }
    if (officePhone && !isValidIndianMobile(officePhone)) {
      errors.officePhone = 'Enter a valid 10-digit Indian office phone number';
    } else if (officePhone && !isPhoneVerified(officePhone)) {
      errors.officePhone = 'Verify the office phone number with OTP before continuing';
    }

    // Validate emails
    const validEmails = emailIds.filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()));
    if (validEmails.length === 0) {
      errors.emailIds = 'At least one valid Email Address is required';
    }

    // Validate stakeholders
    const minStakeholders = (firmType === 'Pvt. Ltd.' || firmType === 'LLP') ? 3 : (firmType === 'Partnership' ? 2 : 1);
    if (stakeholders.length < minStakeholders) {
      if (firmType === 'Partnership') {
        errors.stakeholdersCount = 'A Partnership firm requires a minimum of 2 registered partners';
      } else if (firmType === 'Pvt. Ltd.' || firmType === 'LLP') {
        errors.stakeholdersCount = `${firmType} entities require a minimum of 3 registered ${firmType === 'LLP' ? 'designated partners / directors' : 'directors'}`;
      }
    }

    stakeholders.forEach((s, idx) => {
      const prefix = `stakeholder_${idx}_`;
      if (!s.name.trim()) {
        errors[`${prefix}name`] = `Name is required for ${s.role_type} #${idx + 1}`;
      }
      const sMobiles = Array.isArray(s.mobile_numbers) && s.mobile_numbers.length > 0
        ? s.mobile_numbers
        : [s.mobile || ''];
      const sEmails = Array.isArray(s.email_ids) && s.email_ids.length > 0
        ? s.email_ids
        : [s.email || ''];

      // Primary mobile is compulsory
      const primaryMob = (sMobiles[0] || '').replace(/\D/g, '');
      if (!primaryMob || primaryMob.length !== 10 || !/^[6-9]\d{9}$/.test(primaryMob)) {
        errors[`${prefix}mobile`] = `Valid 10-digit mobile required for ${s.role_type} #${idx + 1}`;
      }
      // Additional mobiles: if entered, must be 10 digits
      sMobiles.slice(1).forEach((m, mIdx) => {
        const cleanM = (m || '').replace(/\D/g, '');
        if (m && m.trim() && (cleanM.length !== 10 || !/^[6-9]\d{9}$/.test(cleanM))) {
          errors[`${prefix}mobile_${mIdx + 1}`] = 'Valid 10-digit Indian mobile required';
        }
      });
      sMobiles.forEach((mobile, mobileIdx) => {
        if (String(mobile || '').trim() && isValidIndianMobile(mobile) && !isPhoneVerified(mobile)) {
          errors[`${prefix}${mobileIdx === 0 ? 'mobile' : `mobile_${mobileIdx}`}`] = `Verify this mobile number with OTP for ${s.role_type} #${idx + 1}`;
        }
      });

      // Stakeholder primary login phone preference validation
      if (!s.primary_login_phone) {
        errors[`${prefix}primary_phone`] = `Please select a Primary Login Number for ${s.role_type} #${idx + 1}`;
      }

      // Primary email is compulsory
      const primaryEmail = (sEmails[0] || '').trim();
      if (!primaryEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primaryEmail)) {
        errors[`${prefix}email`] = `Valid email required for ${s.role_type} #${idx + 1}`;
      }
      // Additional emails: if entered, must be valid email format
      sEmails.slice(1).forEach((e, eIdx) => {
        const cleanE = (e || '').trim();
        if (cleanE && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanE)) {
          errors[`${prefix}email_${eIdx + 1}`] = `Valid email format required`;
        }
      });

      // Stakeholder primary login email preference validation
      if (!s.primary_login_email) {
        errors[`${prefix}primary_email`] = `Please select a Primary Login Email for ${s.role_type} #${idx + 1}`;
      }

      const todayDirect = new Date().toISOString().split('T')[0];

      if (!s.dob) {
        errors[`${prefix}dob`] = `Date of Birth is required for ${s.role_type} #${idx + 1}`;
      } else if (s.dob > todayDirect) {
        errors[`${prefix}dob`] = `Date of Birth cannot be in the future`;
      }

      if (s.marital_status === 'Married') {
        if (!s.anniversary_date) {
          errors[`${prefix}anniversary`] = `Anniversary date is required when married`;
        } else if (s.anniversary_date > todayDirect) {
          errors[`${prefix}anniversary`] = `Anniversary date cannot be in the future`;
        } else if (s.dob && s.anniversary_date < s.dob) {
          errors[`${prefix}anniversary`] = `Anniversary date cannot be earlier than Date of Birth`;
        }
      }

      if (!s.pan_number.trim() || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(s.pan_number.trim().toUpperCase())) {
        errors[`${prefix}pan`] = `Valid 10-character PAN required (e.g. ABCDE1234F)`;
      }
      if (!s.pan_doc) {
        errors[`${prefix}pan_doc`] = `PAN Card document upload is required for ${s.role_type} #${idx + 1}`;
      }

      // Aadhaar number and its supporting document are both required.
      const cleanAadhaar = (s.aadhaar_number || '').replace(/\D/g, '');
      if (!cleanAadhaar || cleanAadhaar.length !== 12) {
        errors[`${prefix}aadhaar`] = `Valid 12-digit Aadhaar Number is required for ${s.role_type} #${idx + 1}`;
      }
      if (!s.aadhaar_doc) {
        errors[`${prefix}aadhaar_doc`] = `Aadhaar document upload is required for ${s.role_type} #${idx + 1}`;
      }

      // Optional DIN validation: If provided, must be 8 digits
      if (s.din_number && s.din_number.trim()) {
        if (!/^\d{8}$/.test(s.din_number.trim())) {
          errors[`${prefix}din`] = `DIN must be an 8-digit number (e.g. 01234567)`;
        }
      }
    });

    // Validate firm documents
    if (firmType !== 'Proprietor') {
      if (!firmPan.trim() || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(firmPan.trim().toUpperCase())) {
        errors.firmPan = 'Valid 10-character Firm PAN is required';
      }
      if (!firmPanDoc) {
        errors.firmPanDoc = 'Firm PAN card upload is required';
      }
    }

    if (!gstNumber.trim()) {
      errors.gstNumber = 'GST Number is required';
    } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstNumber.trim().toUpperCase())) {
      errors.gstNumber = 'Valid 15-character GST Number format required (e.g. 29ABCDE1234F1Z5)';
    }
    if (!gstDoc) errors.gstDoc = 'GST Certificate upload is required';
    if (!gumasthaNumber.trim()) errors.gumasthaNumber = 'Gumastha License Number is required';
    if (!gumasthaDoc) errors.gumasthaDoc = 'Gumastha Certificate upload is required';

    // Validate Firm Bank Details
    if (!bankFirmName.trim()) {
      errors.bankFirmName = 'Firm Name (as per bank) is required';
    }
    if (!bankName.trim()) {
      errors.bankName = 'Bank Name is required';
    }
    const cleanAccount = bankAccountNumber.trim().replace(/\s/g, '');
    if (!cleanAccount) {
      errors.bankAccountNumber = 'Account Number is required';
    } else if (!/^\d{9,20}$/.test(cleanAccount)) {
      errors.bankAccountNumber = 'Valid Bank Account Number (9–20 digits) is required';
    }
    const cleanIfsc = bankIfscCode.trim().toUpperCase();
    if (!cleanIfsc) {
      errors.bankIfscCode = 'IFSC Code is required';
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      errors.bankIfscCode = 'Valid 11-character IFSC Code required (e.g. HDFC0001234)';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e, otpVerified = false) => {
    e?.preventDefault();
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!isReviewing) {
      setIsReviewing(true);
      setShareFeedback('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (isEdit && !otpVerified) {
      setShowEditOtp(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    try {
      setIsSubmitting(true);

      const primaryStakeholder = stakeholders.find(item => item.name?.trim());
      const payload = {
        name: branchName.trim(),
        type: relationshipType,
        firm_type: firmType,
        firm_name: firmName.trim(),
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim(),
        pincode: pincode.trim(),
        city: city.trim(),
        state: state.trim(),
        office_phone: officePhone.trim(),
        mobile_numbers: mobileNumbers.filter(Boolean),
        email_ids: emailIds.filter(Boolean),
        primary_login_phone: primaryStakeholder?.primary_login_phone || primaryStakeholder?.mobile || '',
        primary_login_email: primaryStakeholder?.primary_login_email || primaryStakeholder?.email || '',
        firm_pan: firmPan.trim().toUpperCase(),
        firm_pan_doc: firmPanDoc,
        cin_number: (firmType === 'Proprietor' || firmType === 'Partnership') ? '' : cinNumber.trim().toUpperCase(),
        incorporation_doc: (firmType === 'Proprietor' || firmType === 'Partnership') ? '' : incorporationDoc,
        aoa_doc: (firmType === 'Proprietor' || firmType === 'Partnership') ? '' : aoaDoc,
        moa_doc: (firmType === 'Proprietor' || firmType === 'Partnership') ? '' : moaDoc,
        aoa_moa_doc: (firmType === 'Proprietor' || firmType === 'Partnership') ? '' : (aoaDoc || moaDoc),
        gst_number: gstNumber.trim().toUpperCase(),
        gst_doc: gstDoc,
        gumastha_number: gumasthaNumber.trim(),
        gumastha_doc: gumasthaDoc,
        bank_firm_name: bankFirmName.trim(),
        bank_name: bankName.trim(),
        bank_account_number: bankAccountNumber.trim(),
        bank_ifsc_code: bankIfscCode.trim().toUpperCase(),
        stakeholders: stakeholders.map(s => {
          const mList = (Array.isArray(s.mobile_numbers) ? s.mobile_numbers : [s.mobile || ''])
            .map(m => (m || '').replace(/\D/g, '').slice(0, 10))
            .filter(Boolean);
          const eList = (Array.isArray(s.email_ids) ? s.email_ids : [s.email || ''])
            .map(e => (e || '').trim())
            .filter(Boolean);
          const sPrimaryPhone = (s.primary_login_phone || mList[0] || (s.mobile || '')).trim();
          const sPrimaryEmail = (s.primary_login_email || eList[0] || (s.email || '')).trim();
          return {
            ...s,
            name: s.name.trim(),
            mobile: sPrimaryPhone,
            mobile_numbers: mList.length > 0 ? mList : [sPrimaryPhone],
            primary_login_phone: sPrimaryPhone,
            email: sPrimaryEmail,
            email_ids: eList.length > 0 ? eList : [sPrimaryEmail],
            primary_login_email: sPrimaryEmail,
            pan_number: s.pan_number.trim().toUpperCase(),
            aadhaar_number: (s.aadhaar_number || '').replace(/\D/g, ''),
            aadhaar_doc: (s.aadhaar_doc || '').trim(),
            din_number: (s.din_number || '').trim()
          };
        }),
        status: locationToEdit?.status || 'Active'
      };

      let res;
      if (isEdit) {
        res = await apiRequest(`/locations/${locationToEdit.location_id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiRequest('/locations', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      if (res?.location) {
        const savedLoc = res.location;
        setSavedLocation({ ...savedLoc, startup_data_copy: res.startup_data_copy || null });
        setCreatedAdminResult((res.admin_users || []).map(account => ({
          ...account,
          email: account.email || '',
          phone: account.phone || '',
          role_type: account.role_type || 'Branch Admin'
        })));
        setAdminErrors({});
        setIsReviewing(false);
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Error saving KYC registration:', err);
      alert(err.message || 'Failed to save KYC registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const registrationSummaryText = () => {
    const location = savedLocation || {};
    const lines = [
      isEdit ? 'MAISON BEYOU — BRANCH DETAILS' : 'MAISON BEYOU — REGISTRATION SUMMARY',
      `Location: ${location.name || branchName}`,
      `Code: ${location.code || locationToEdit?.code || (isEdit ? '—' : 'Pending')}`,
      `Type: ${relationshipType} · ${firmType}`,
      `Firm: ${firmName}`,
      `Address: ${[addressLine1, addressLine2, city, state, pincode].filter(Boolean).join(', ')}`,
      `Office phone: ${officePhone || '—'}`,
      `Business mobiles: ${mobileNumbers.filter(Boolean).join(', ') || '—'}`,
      `Business emails: ${emailIds.filter(Boolean).join(', ') || '—'}`,
      `Firm PAN: ${firmPan || '—'} · document: ${firmPanDoc ? 'Attached' : '—'}`,
      `CIN: ${cinNumber || '—'} · incorporation document: ${incorporationDoc ? 'Attached' : '—'}`,
      `GST: ${gstNumber || '—'} · certificate: ${gstDoc ? 'Attached' : '—'}`,
      `Gumastha: ${gumasthaNumber || '—'} · certificate: ${gumasthaDoc ? 'Attached' : '—'}`,
      `Bank: ${bankName || '—'} · account ending ${bankAccountNumber.replace(/\D/g, '').slice(-4) || '—'} · IFSC ${bankIfscCode || '—'}`,
      '',
      'STAKEHOLDERS',
      ...stakeholders.map((person, index) => `${index + 1}. ${person.name} (${person.role_type}) | Mobile: ${(person.mobile_numbers || [person.mobile]).filter(Boolean).join(', ') || '—'} | Email: ${(person.email_ids || [person.email]).filter(Boolean).join(', ') || '—'} | DOB: ${person.dob || '—'} | Marital status: ${person.marital_status || '—'} | PAN: ${person.pan_number || '—'} | Aadhaar: ${String(person.aadhaar_number || '').replace(/\D/g, '').slice(-4).padStart(String(person.aadhaar_number || '').replace(/\D/g, '').length, '•') || '—'} | PAN document: ${person.pan_doc ? 'Attached' : '—'} | Aadhaar document: ${person.aadhaar_doc ? 'Attached' : '—'} | DIN: ${person.din_number || '—'}`)
    ];
    return lines.join('\n');
  };

  const shareRegistrationSummary = async () => {
    const text = registrationSummaryText();
    try {
      if (navigator.share) await navigator.share({ title: 'Maison BeYou registration summary', text });
      else {
        await navigator.clipboard.writeText(text);
        setShareFeedback('Summary copied. You can paste it into WhatsApp, email, or another app.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') setShareFeedback('Unable to open sharing on this device. Use Print / Save as PDF instead.');
    }
  };

  const downloadRegistrationSummary = () => {
    const file = new Blob([registrationSummaryText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(savedLocation?.name || branchName || 'location').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-registration-summary.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in client-info-form-wrapper" style={{ width: '100%', margin: `${embedded ? '48px' : '0'} auto 40px auto`, boxSizing: 'border-box' }}>
      <div className="card" style={{ padding: 'clamp(28px, 4vw, 40px) clamp(24px, 4vw, 44px)', width: '100%', boxSizing: 'border-box', position: 'relative' }}>
        
        {/* Prominent Modal Header Bar Inside Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          paddingBottom: '14px',
          borderBottom: '1px solid #EFEAE2'
        }}>
          <button
            type="button"
            onClick={() => {
              if (currentStep === 1 && isReviewing) {
                setIsReviewing(false);
              } else if (currentStep === 2) {
                setCurrentStep(1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else if (currentStep === 3) {
                if (onSuccess && savedLocation) onSuccess(savedLocation);
                onClose();
              } else {
                onClose();
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: '700',
              color: '#8C6828',
              background: '#FAF6EE',
              border: '1.5px solid #DAC493',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#B88B4A';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FAF6EE';
              e.currentTarget.style.color = '#8C6828';
            }}
          >
            <ArrowLeft size={15} />
            <span>{currentStep === 1 && isReviewing ? 'Edit Details' : currentStep === 2 ? 'Back to Step 1' : 'Back to Dashboard'}</span>
          </button>

          {isEdit && currentStep === 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', marginRight: 14 }}>
              <button type="button" onClick={() => window.print()} aria-label="Print branch details" title="Print branch details" style={headerUtilityButtonStyle}>
                <Printer size={15} /><span>Print</span>
              </button>
              <button type="button" onClick={downloadRegistrationSummary} aria-label="Download branch details" title="Download branch details" style={headerUtilityButtonStyle}>
                <Download size={15} /><span>Download</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Close this form (Esc)"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#FAF6EE',
              border: '1.5px solid #DAC493',
              color: '#8C6828',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#DC2626';
              e.currentTarget.style.borderColor = '#DC2626';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FAF6EE';
              e.currentTarget.style.borderColor = '#DAC493';
              e.currentTarget.style.color = '#8C6828';
            }}
          >
            <X size={18} />
          </button>
        </div>
        {isEdit && showEditOtp && <BranchEditOtpGate locationId={locationToEdit.location_id} onVerified={() => {
          setShowEditOtp(false);
          handleSubmit(null, true);
        }} />}
        <style>{`@media print { body * { visibility: hidden !important; } .registration-print-area, .registration-print-area *, .branch-kyc-print-summary { visibility: visible !important; } .registration-print-area { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; max-width: none !important; box-shadow: none !important; border: 0 !important; } .registration-print-area button { display: none !important; } .branch-kyc-print-summary { display: block !important; position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; padding: 28px !important; box-sizing: border-box !important; background: #FFFFFF !important; color: #302820 !important; font: 12pt/1.6 Arial, sans-serif !important; white-space: pre-wrap !important; } }`}</style>
        {isEdit && currentStep === 1 && <pre className="branch-kyc-print-summary" style={{ display: 'none' }}>{registrationSummaryText()}</pre>}
        <h2 className="kyc-modal-title" style={{ fontFamily: 'var(--font-sans)', fontSize: '28px', fontWeight: '500', color: '#C28B42', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '8px' }}>
          {currentStep === 1
            ? isReviewing ? 'REVIEW BRANCH / FRANCHISE DETAILS' : (isEdit
                ? `EDIT ${firmType.toUpperCase()} ${relationshipType === 'branch' ? 'BRANCH' : 'FRANCHISE'} KYC`
                : `REGISTER ${firmType.toUpperCase()} ${relationshipType === 'branch' ? 'COMPANY-OWNED BRANCH' : 'FRANCHISE PARTNER'} KYC`)
            : currentStep === 2
              ? `CREATE ADMIN LOGINS — ${savedLocation?.name || branchName}`
              : isEdit ? 'BRANCH DETAILS SAVED' : 'STUDIO ONBOARDING & ADMIN SETUP COMPLETE'}
        </h2>
        <div style={{ width: '42px', height: '2px', background: '#C59A58', borderRadius: '2px', marginBottom: '32px' }} />

        {/* ======================================================== */}
        {/* STEP 1: KYC FORM                                         */}
        {/* ======================================================== */}
        {currentStep === 1 && !isReviewing && (
          <div>
            {/* Validation Alert Summary */}
            {Object.keys(validationErrors).length > 0 && (
              <div style={{
                background: '#FEF2F2',
                border: '1.5px solid #FCA5A5',
                color: '#991B1B',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                marginBottom: '32px',
                fontSize: '13px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '14px', marginBottom: '6px' }}>
                  <AlertCircle size={18} color="#DC2626" />
                  Please complete all required KYC fields before submitting:
                </div>
                <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                  {Object.values(validationErrors).slice(0, 5).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                  {Object.keys(validationErrors).length > 5 && (
                    <li>...and {Object.keys(validationErrors).length - 5} more fields</li>
                  )}
                </ul>
              </div>
            )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* ======================================================== */}
          {/* SECTION 1: COMMON BUSINESS INFORMATION                   */}
          {/* ======================================================== */}
          <div>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '18px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: '700',
              color: '#1C1917',
              marginBottom: '32px',
              paddingBottom: '10px',
              borderBottom: '1.5px solid var(--border-color)'
            }}>
              1. COMMON BUSINESS & LOCATION INFORMATION
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Branch Name & Name of Firm */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px' }}>
                <div style={{ minWidth: 0 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    Branch / Location Name <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="e.g. Maison BeYou — Indiranagar Franchise"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${validationErrors.branchName ? '#DC2626' : 'var(--border-color)'}`,
                      background: 'var(--bg-card-subtle)',
                      outline: 'none',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                  {validationErrors.branchName && (
                    <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                      {validationErrors.branchName}
                    </div>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    Name of Firm <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                    placeholder="e.g. Maison BeYou Wellness LLP"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${validationErrors.firmName ? '#DC2626' : 'var(--border-color)'}`,
                      background: 'var(--bg-card-subtle)',
                      outline: 'none',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                  {validationErrors.firmName && (
                    <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                      {validationErrors.firmName}
                    </div>
                  )}
                </div>
              </div>

              {/* Address Line 1 */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                  Address Line 1 <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="e.g. 100 Feet Road, 2nd Stage, Indiranagar"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${validationErrors.addressLine1 ? '#DC2626' : 'var(--border-color)'}`,
                    background: 'var(--bg-card-subtle)',
                    outline: 'none',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                {validationErrors.addressLine1 && (
                  <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                    {validationErrors.addressLine1}
                  </div>
                )}
              </div>

              {/* Address Line 2 */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="e.g. Near Metro Pillar 42, Above Starbucks"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--border-color)',
                    background: 'var(--bg-card-subtle)',
                    outline: 'none',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* State, City, Pincode */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '16px' }}>
                <div style={{ minWidth: 0, order: 3 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    Pin Code <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="560038"
                    style={{
                      width: '100%',
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${validationErrors.pincode ? '#DC2626' : 'var(--border-color)'}`,
                      background: 'var(--bg-card-subtle)',
                      outline: 'none',
                      fontSize: '14px'
                    }}
                  />
                  {validationErrors.pincode && (
                    <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                      {validationErrors.pincode}
                    </div>
                  )}
                </div>

                <div style={{ minWidth: 0, order: 2 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    City <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <IndianCityDropdown
                    state={state}
                    value={city}
                    onChange={setCity}
                    selectStyle={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${validationErrors.city ? '#DC2626' : 'var(--border-color)'}`, background: 'var(--bg-card-subtle)', outline: 'none', fontSize: '14px' }}
                    inputStyle={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${validationErrors.city ? '#DC2626' : 'var(--border-color)'}`, background: 'var(--bg-card-subtle)', outline: 'none', fontSize: '14px', marginTop: '8px' }}
                  />
                  {validationErrors.city && (
                    <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                      {validationErrors.city}
                    </div>
                  )}
                </div>

                <div style={{ minWidth: 0, order: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    State <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <IndianStateDropdown
                    value={state}
                    onChange={value => { setState(value); setCity(''); }}
                    style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${validationErrors.state ? '#DC2626' : 'var(--border-color)'}`, background: 'var(--bg-card-subtle)', outline: 'none', fontSize: '14px' }}
                  />
                  {validationErrors.state && (
                    <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                      {validationErrors.state}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                  Office Phone Number <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="tel"
                  value={officePhone}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(e) => setOfficePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Branch office contact number"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--border-color)',
                    background: 'var(--bg-card-subtle)',
                    outline: 'none',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                <PhoneOtpVerification value={officePhone} verified={isPhoneVerified(officePhone)} onVerified={markPhoneVerified} />
                {validationErrors.officePhone && <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>{validationErrors.officePhone}</div>}
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '5px' }}>
                  This number appears on the branch card. Personal director numbers remain login contacts.
                </div>
              </div>

              {/* Repeatable Mobile Numbers */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                    Mobile Number(s) <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMobile}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#B88B4A',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={14} /> Add Another Mobile
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {mobileNumbers.map((mob, mIdx) => (
                    <div key={mIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '11px 12px',
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: 'var(--text-muted)',
                        flexShrink: 0
                      }}>
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={mob}
                        onChange={(e) => handleMobileChange(mIdx, e.target.value)}
                        placeholder="10-digit mobile number"
                        style={{
                          flex: '1 1 180px',
                          minWidth: '150px',
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: '1.5px solid var(--border-color)',
                          background: 'var(--bg-card-subtle)',
                          outline: 'none',
                          fontSize: '14px',
                          boxSizing: 'border-box'
                        }}
                      />
                      {mobileNumbers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMobile(mIdx)}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid var(--border-color)',
                            color: '#DC2626',
                            padding: '10px',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                          title="Remove this mobile number"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                    <PhoneOtpVerification value={mob} verified={isPhoneVerified(mob)} onVerified={markPhoneVerified} />
                    </div>
                  ))}
                </div>
                {validationErrors.mobileNumbers && (
                  <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                    {validationErrors.mobileNumbers}
                  </div>
                )}
              </div>

              {/* Repeatable Email IDs */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                    Email Address(es) <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddEmail}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#B88B4A',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={14} /> Add Another Email
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {emailIds.map((em, eIdx) => (
                    <div key={eIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '170px' }}>
                        <input
                          type="email"
                          value={em}
                          onChange={(e) => handleEmailChange(eIdx, e.target.value)}
                          placeholder="e.g. contact@indiranagar.maisonbeyou.com"
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '11px 14px 11px 36px',
                            borderRadius: 'var(--radius-md)',
                            border: '1.5px solid var(--border-color)',
                            background: 'var(--bg-card-subtle)',
                            outline: 'none',
                            fontSize: '14px'
                          }}
                        />
                        <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                      </div>
                      {emailIds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEmail(eIdx)}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid var(--border-color)',
                            color: '#DC2626',
                            padding: '10px',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                          title="Remove this email"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {validationErrors.emailIds && (
                  <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                    {validationErrors.emailIds}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 2: DYNAMIC STAKEHOLDER DETAILS                   */}
          {/* ======================================================== */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '32px',
              paddingBottom: '10px',
              borderBottom: '1.5px solid var(--border-color)'
            }}>
              <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '18px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: '700',
                color: '#1C1917'
              }}>
                2. {firmType === 'Proprietor' ? 'PROPRIETOR DETAILS' :
                   firmType === 'Partnership' ? 'PARTNER DETAILS' :
                   firmType === 'Pvt. Ltd.' ? 'DIRECTOR DETAILS' :
                   'DESIGNATED PARTNER / DIRECTOR DETAILS'}
              </div>

              {(firmType === 'Partnership' || firmType === 'Pvt. Ltd.' || firmType === 'LLP') && (
                <span style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#9F7335',
                  background: '#FAF6EE',
                  border: '1px solid #DAC493',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  letterSpacing: '0.02em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <ShieldCheck size={14} color="#B88B4A" />
                  {firmType === 'Partnership'
                    ? 'Minimum 2 Partners Required'
                    : firmType === 'LLP'
                      ? 'Minimum 3 Designated Partners / Directors Required'
                      : 'Minimum 3 Directors Required'}
                </span>
              )}
            </div>

            {/* Repeater for Stakeholders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {stakeholders.map((sh, shIdx) => {
                const prefix = `stakeholder_${shIdx}_`;
                const isMarried = sh.marital_status === 'Married';

                return (
                  <div
                    key={shIdx}
                    style={{
                      background: 'var(--bg-card-subtle)',
                      border: '1.5px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '24px',
                      position: 'relative',
                      zIndex: 30 - shIdx
                    }}
                  >
                    {/* Stakeholder Header with Remove action */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '20px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid var(--border-color)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: '#B88B4A',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {shIdx + 1}
                        </span>
                        <span style={{ fontSize: '15px', fontWeight: '700', color: '#1C1917' }}>
                          {sh.role_type} #{shIdx + 1}
                        </span>
                      </div>

                      {stakeholders.length > ((firmType === 'Pvt. Ltd.' || firmType === 'LLP') ? 3 : (firmType === 'Partnership' ? 2 : 1)) && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStakeholder(shIdx)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#FFFFFF',
                            border: '1px solid #DC2626',
                            color: '#DC2626',
                            fontSize: '12px',
                            fontWeight: '600',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Stakeholder Fields */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Name */}
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                          Name of {sh.role_type} <span style={{ color: '#DC2626' }}>*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={sh.name}
                          onChange={(e) => updateStakeholderField(shIdx, 'name', e.target.value)}
                          placeholder={`Full legal name of ${sh.role_type.toLowerCase()}`}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: `1.5px solid ${validationErrors[`${prefix}name`] ? '#DC2626' : 'var(--border-color)'}`,
                            background: '#FFFFFF',
                            outline: 'none',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                          }}
                        />
                        {validationErrors[`${prefix}name`] && (
                          <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                            {validationErrors[`${prefix}name`]}
                          </div>
                        )}
                      </div>

                      {/* Gender & Marital Status Buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                            Gender
                          </label>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            {['Female', 'Male'].map(g => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => updateStakeholderField(shIdx, 'gender', g)}
                                style={{
                                  flex: '1 1 80px',
                                  padding: '11px 14px',
                                  borderRadius: 'var(--radius-md)',
                                  fontSize: '13.5px',
                                  fontWeight: '600',
                                  border: `1.5px solid ${sh.gender === g ? '#B88B4A' : 'var(--border-color)'}`,
                                  background: sh.gender === g ? 'var(--primary-subtle)' : '#FFFFFF',
                                  color: sh.gender === g ? '#B88B4A' : 'var(--text-main)',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                            Marital Status
                          </label>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            {['Unmarried', 'Married'].map(m => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => updateStakeholderField(shIdx, 'marital_status', m)}
                                style={{
                                  flex: '1 1 100px',
                                  padding: '11px 14px',
                                  borderRadius: 'var(--radius-md)',
                                  fontSize: '13.5px',
                                  fontWeight: '600',
                                  border: `1.5px solid ${sh.marital_status === m ? '#B88B4A' : 'var(--border-color)'}`,
                                  background: sh.marital_status === m ? 'var(--primary-subtle)' : '#FFFFFF',
                                  color: sh.marital_status === m ? '#B88B4A' : 'var(--text-main)',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Date of Birth & Date of Anniversary (ONLY IF MARRIED) */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMarried ? 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))' : '1fr',
                        gap: '16px',
                        position: 'relative',
                        zIndex: 40
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <LuxuryDatePicker
                            label="Date of Birth"
                            required={true}
                            value={sh.dob}
                            maxDate={new Date().toISOString().split('T')[0]}
                            onChange={(d) => updateStakeholderField(shIdx, 'dob', d)}
                            placeholder="DD/MM/YYYY"
                          />
                          {validationErrors[`${prefix}dob`] && (
                            <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                              {validationErrors[`${prefix}dob`]}
                            </div>
                          )}
                        </div>

                        {isMarried && (
                          <div className="animate-fade-in" style={{ minWidth: 0 }}>
                            <LuxuryDatePicker
                              label="Anniversary Date"
                              required={true}
                              value={sh.anniversary_date}
                              maxDate={new Date().toISOString().split('T')[0]}
                              minDate={sh.dob || undefined}
                              onChange={(d) => updateStakeholderField(shIdx, 'anniversary_date', d)}
                              placeholder="DD/MM/YYYY"
                            />
                            {validationErrors[`${prefix}anniversary`] && (
                              <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                                {validationErrors[`${prefix}anniversary`]}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Stakeholder Multiple Mobiles & Emails */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
                        gap: '16px',
                        alignItems: 'flex-start',
                        position: 'relative',
                        zIndex: 10
                      }}>
                        {/* Stakeholder Mobiles */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', minHeight: '20px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                              Mobile Number (10 digits) <span style={{ color: '#DC2626' }}>*</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleAddStakeholderMobile(shIdx)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px',
                                fontWeight: '700',
                                color: '#B88B4A',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <Plus size={14} /> Add Another Mobile
                            </button>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {(Array.isArray(sh.mobile_numbers) && sh.mobile_numbers.length > 0 ? sh.mobile_numbers : [sh.mobile || '']).map((mob, mIdx) => (
                              <div key={mIdx}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{
                                    padding: '11px 12px',
                                    background: 'var(--bg-surface)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: 'var(--text-muted)',
                                    flexShrink: 0
                                  }}>
                                    +91
                                  </span>
                                  <input
                                    type="tel"
                                    maxLength={10}
                                    required={mIdx === 0}
                                    value={mob}
                                    onChange={(e) => handleStakeholderMobileChange(shIdx, mIdx, e.target.value)}
                                    placeholder="10-digit mobile"
                                    style={{
                                      flex: '1 1 140px',
                                      minWidth: '130px',
                                      boxSizing: 'border-box',
                                      padding: '12px 14px',
                                      borderRadius: 'var(--radius-md)',
                                      border: `1.5px solid ${sh.primary_login_phone && mob === sh.primary_login_phone ? '#B88B4A' : ((validationErrors[`${prefix}mobile_${mIdx}`] || (mIdx === 0 && validationErrors[`${prefix}mobile`])) ? '#DC2626' : 'var(--border-color)')}`,
                                      background: '#FFFFFF',
                                      outline: 'none',
                                      fontSize: '14px'
                                    }}
                                  />
                                  {Array.isArray(sh.mobile_numbers) && sh.mobile_numbers.length > 1 && (
                                    <LoginPreferenceSelector
                                      type="phone"
                                      itemValue={mob}
                                      isSelected={Boolean(sh.primary_login_phone && mob && sh.primary_login_phone === mob)}
                                      isDisabled={Boolean(sh.primary_login_phone && mob !== sh.primary_login_phone)}
                                      onSelect={() => handleSelectStakeholderPrimaryPhone(shIdx, mob)}
                                      onChangePreference={() => handleChangeStakeholderPrimaryPhone(shIdx)}
                                    />
                                  )}
                                  {(Array.isArray(sh.mobile_numbers) ? sh.mobile_numbers.length : 1) > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveStakeholderMobile(shIdx, mIdx)}
                                      style={{
                                        background: '#FFFFFF',
                                        border: '1px solid var(--border-color)',
                                        color: '#DC2626',
                                        padding: '10px',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                      }}
                                      title="Remove this mobile number"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  )}
                                </div>
                                <PhoneOtpVerification value={mob} verified={isPhoneVerified(mob)} onVerified={markPhoneVerified} />
                                {(validationErrors[`${prefix}mobile_${mIdx}`] || (mIdx === 0 && validationErrors[`${prefix}mobile`])) && (
                                  <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                                    {validationErrors[`${prefix}mobile_${mIdx}`] || (mIdx === 0 && validationErrors[`${prefix}mobile`])}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {validationErrors[`${prefix}primary_phone`] && (
                            <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px', fontWeight: '600' }}>
                              {validationErrors[`${prefix}primary_phone`]}
                            </div>
                          )}
                        </div>

                        {/* Stakeholder Emails */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', minHeight: '20px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                              Email Address <span style={{ color: '#DC2626' }}>*</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleAddStakeholderEmail(shIdx)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px',
                                fontWeight: '700',
                                color: '#B88B4A',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <Plus size={14} /> Add Another Email
                            </button>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {(Array.isArray(sh.email_ids) && sh.email_ids.length > 0 ? sh.email_ids : [sh.email || '']).map((em, eIdx) => (
                              <div key={eIdx}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <div style={{ position: 'relative', flex: '1 1 160px', minWidth: '150px' }}>
                                    <input
                                      type="email"
                                      required={eIdx === 0}
                                      value={em}
                                      onChange={(e) => handleStakeholderEmailChange(shIdx, eIdx, e.target.value)}
                                      placeholder="e.g. director@example.com"
                                      style={{
                                        width: '100%',
                                        maxWidth: '100%',
                                        boxSizing: 'border-box',
                                        padding: '11px 14px 11px 36px',
                                        borderRadius: 'var(--radius-md)',
                                        border: `1.5px solid ${sh.primary_login_email && em.trim().toLowerCase() === sh.primary_login_email.toLowerCase() ? '#B88B4A' : ((validationErrors[`${prefix}email_${eIdx}`] || (eIdx === 0 && validationErrors[`${prefix}email`])) ? '#DC2626' : 'var(--border-color)')}`,
                                        background: '#FFFFFF',
                                        outline: 'none',
                                        fontSize: '14px'
                                      }}
                                    />
                                    <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                                  </div>
                                  {Array.isArray(sh.email_ids) && sh.email_ids.length > 1 && (
                                    <LoginPreferenceSelector
                                      type="email"
                                      itemValue={em}
                                      isSelected={Boolean(sh.primary_login_email && em && sh.primary_login_email.toLowerCase() === em.trim().toLowerCase())}
                                      isDisabled={Boolean(sh.primary_login_email && em.trim().toLowerCase() !== sh.primary_login_email.toLowerCase())}
                                      onSelect={() => handleSelectStakeholderPrimaryEmail(shIdx, em)}
                                      onChangePreference={() => handleChangeStakeholderPrimaryEmail(shIdx)}
                                    />
                                  )}
                                  {(Array.isArray(sh.email_ids) ? sh.email_ids.length : 1) > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveStakeholderEmail(shIdx, eIdx)}
                                      style={{
                                        background: '#FFFFFF',
                                        border: '1px solid var(--border-color)',
                                        color: '#DC2626',
                                        padding: '10px',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                      }}
                                      title="Remove this email address"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  )}
                                </div>
                                {(validationErrors[`${prefix}email_${eIdx}`] || (eIdx === 0 && validationErrors[`${prefix}email`])) && (
                                  <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                                    {validationErrors[`${prefix}email_${eIdx}`] || (eIdx === 0 && validationErrors[`${prefix}email`])}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {validationErrors[`${prefix}primary_email`] && (
                            <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px', fontWeight: '600' }}>
                              {validationErrors[`${prefix}primary_email`]}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stakeholder PAN Card No. & Upload */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
                        gap: '16px',
                        alignItems: 'flex-start',
                        position: 'relative',
                        zIndex: 5
                      }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                            {sh.role_type} PAN Card No. <span style={{ color: '#DC2626' }}>*</span>
                          </label>
                          <input
                            type="text"
                            maxLength={10}
                            required
                            value={sh.pan_number}
                            onChange={(e) => {
                              updateStakeholderField(shIdx, 'pan_number', e.target.value.toUpperCase());
                              if (validationErrors[`${prefix}pan`]) {
                                setValidationErrors(prev => {
                                  const updated = { ...prev };
                                  delete updated[`${prefix}pan`];
                                  return updated;
                                });
                              }
                            }}
                            placeholder="e.g. ABCDE1234F"
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              borderRadius: 'var(--radius-md)',
                              border: `1.5px solid ${validationErrors[`${prefix}pan`] ? '#DC2626' : 'var(--border-color)'}`,
                              background: '#FFFFFF',
                              outline: 'none',
                              fontSize: '14px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              boxSizing: 'border-box'
                            }}
                          />
                          {validationErrors[`${prefix}pan`] && (
                            <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                              {validationErrors[`${prefix}pan`]}
                            </div>
                          )}
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                            Upload {sh.role_type} PAN Card <span style={{ color: '#DC2626' }}>*</span>
                          </label>

                          {/* Hidden file input */}
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            ref={el => fileInputRefs.current[`stakeholder_${shIdx}`] = el}
                            style={{ display: 'none' }}
                            onChange={(e) => handleDocumentFile(e, `stakeholder_${shIdx}`, shIdx)}
                          />

                          {sh.pan_doc ? (
                            <div style={{
                              padding: '10px 14px',
                              background: '#FAF6EE',
                              border: '1.5px solid #DAC493',
                              borderRadius: 'var(--radius-md)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                <CheckCircle2 size={16} color="#16A34A" />
                                <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  PAN Uploaded
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={(event) => openDocumentPreview(sh.pan_doc, event)}
                                  style={{
                                    background: '#FFFFFF',
                                    border: '1px solid #DAC493',
                                    color: '#9F7335',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                >
                                  <Eye size={12} /> View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => triggerFileUpload(`stakeholder_${shIdx}`)}
                                  style={{
                                    background: '#FAF6EE',
                                    border: '1px solid #DAC493',
                                    color: '#9F7335',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Replace
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={uploadingDocKey === `stakeholder_${shIdx}`}
                              onClick={() => triggerFileUpload(`stakeholder_${shIdx}`)}
                              style={{
                                width: '100%',
                                padding: '11px 14px',
                                borderRadius: 'var(--radius-md)',
                                border: `1.5px dashed ${validationErrors[`${prefix}pan_doc`] ? '#DC2626' : '#DAC493'}`,
                                background: '#FAF6EE',
                                color: '#9F7335',
                                fontSize: '13px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                              }}
                            >
                              <Upload size={15} />
                              <span>{uploadingDocKey === `stakeholder_${shIdx}` ? 'Uploading...' : 'Upload PAN (PDF / Image)'}</span>
                            </button>
                          )}
                          {validationErrors[`${prefix}pan_doc`] && (
                            <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                              {validationErrors[`${prefix}pan_doc`]}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stakeholder Aadhaar Card No. & Upload (Compulsory) */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
                        gap: '16px',
                        alignItems: 'flex-start',
                        position: 'relative',
                        zIndex: 5
                      }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                            {sh.role_type} Aadhaar No. <span style={{ color: '#DC2626' }}>*</span>
                          </label>
                          <input
                            type="text"
                            maxLength={14}
                            required
                            value={sh.aadhaar_number ? sh.aadhaar_number.replace(/\D/g, '').slice(0, 12).replace(/(\d{4})(?=\d)/g, '$1 ') : ''}
                            onChange={(e) => {
                              const rawDigits = e.target.value.replace(/\D/g, '').slice(0, 12);
                              updateStakeholderField(shIdx, 'aadhaar_number', rawDigits);
                              if (validationErrors[`${prefix}aadhaar`]) {
                                setValidationErrors(prev => {
                                  const updated = { ...prev };
                                  delete updated[`${prefix}aadhaar`];
                                  return updated;
                                });
                              }
                            }}
                            placeholder="e.g. 1234 5678 9012"
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              borderRadius: 'var(--radius-md)',
                              border: `1.5px solid ${validationErrors[`${prefix}aadhaar`] ? '#DC2626' : 'var(--border-color)'}`,
                              background: '#FFFFFF',
                              outline: 'none',
                              fontSize: '14px',
                              letterSpacing: '0.05em',
                              boxSizing: 'border-box'
                            }}
                          />
                          {validationErrors[`${prefix}aadhaar`] && (
                            <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                              {validationErrors[`${prefix}aadhaar`]}
                            </div>
                          )}
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                            Upload {sh.role_type} Aadhaar Card <span style={{ color: '#DC2626' }}>*</span>
                          </label>

                          {/* Hidden file input for Aadhaar */}
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            ref={el => fileInputRefs.current[`stakeholder_aadhaar_${shIdx}`] = el}
                            style={{ display: 'none' }}
                            onChange={(e) => handleDocumentFile(e, `stakeholder_aadhaar_${shIdx}`, shIdx)}
                          />

                          {sh.aadhaar_doc ? (
                            <div style={{
                              padding: '10px 14px',
                              background: '#FAF6EE',
                              border: '1.5px solid #DAC493',
                              borderRadius: 'var(--radius-md)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                <CheckCircle2 size={16} color="#16A34A" />
                                <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  Aadhaar Uploaded
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={(event) => openDocumentPreview(sh.aadhaar_doc, event)}
                                  style={{
                                    background: '#FFFFFF',
                                    border: '1px solid #DAC493',
                                    color: '#9F7335',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                >
                                  <Eye size={12} /> View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateStakeholderField(shIdx, 'aadhaar_doc', '');
                                    const errorKey = `stakeholder_${shIdx}_aadhaar_doc`;
                                    if (validationErrors[errorKey]) {
                                      setValidationErrors(prev => {
                                        const updated = { ...prev };
                                        delete updated[errorKey];
                                        return updated;
                                      });
                                    }
                                  }}
                                  style={{
                                    background: '#FAF6EE',
                                    border: '1px solid #DAC493',
                                    color: '#B42318',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={uploadingDocKey === `stakeholder_aadhaar_${shIdx}`}
                              onClick={() => triggerFileUpload(`stakeholder_aadhaar_${shIdx}`)}
                              style={{
                                width: '100%',
                                padding: '11px 14px',
                                borderRadius: 'var(--radius-md)',
                                border: `1.5px dashed ${validationErrors[`${prefix}aadhaar_doc`] ? '#DC2626' : '#DAC493'}`,
                                background: '#FAF6EE',
                                color: '#9F7335',
                                fontSize: '13px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                              }}
                            >
                              <Upload size={15} />
                              <span>{uploadingDocKey === `stakeholder_aadhaar_${shIdx}` ? 'Uploading...' : 'Upload Aadhaar (PDF / Image)'}</span>
                            </button>
                          )}
                          {validationErrors[`${prefix}aadhaar_doc`] && (
                            <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                              {validationErrors[`${prefix}aadhaar_doc`]}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* DIN Number (Optional - For Pvt. Ltd. and LLP) */}
                      {(firmType === 'Pvt. Ltd.' || firmType === 'LLP' || sh.role_type === 'Director') && (
                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                            DIN NO (Director identification Number) <span style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>(Optional)</span>
                          </label>
                          <input
                            type="text"
                            maxLength={8}
                            value={sh.din_number || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                              updateStakeholderField(shIdx, 'din_number', val);
                              if (validationErrors[`${prefix}din`]) {
                                setValidationErrors(prev => {
                                  const updated = { ...prev };
                                  delete updated[`${prefix}din`];
                                  return updated;
                                });
                              }
                            }}
                            placeholder="e.g. 01234567 (8-digit DIN)"
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              borderRadius: 'var(--radius-md)',
                              border: `1.5px solid ${validationErrors[`${prefix}din`] ? '#DC2626' : 'var(--border-color)'}`,
                              background: '#FFFFFF',
                              outline: 'none',
                              fontSize: '14px',
                              boxSizing: 'border-box',
                              letterSpacing: '0.04em'
                            }}
                          />
                          {validationErrors[`${prefix}din`] && (
                            <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                              {validationErrors[`${prefix}din`]}
                            </div>
                          )}
                          <div style={{ fontSize: '11px', color: '#78716C', marginTop: '4px' }}>
                            Optional 8-digit Director Identification Number (DIN) issued by Ministry of Corporate Affairs (MCA).
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Button to Add More Partners / Directors */}
              {firmType !== 'Proprietor' && (
                <button
                  type="button"
                  onClick={handleAddStakeholder}
                  style={{
                    padding: '12px 18px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px dashed #DAC493',
                    background: 'linear-gradient(135deg, #FAF6EE 0%, #F5ECE0 100%)',
                    color: '#9F7335',
                    fontSize: '13.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.18s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#B88B4A';
                    e.currentTarget.style.background = '#EFE4D2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#DAC493';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #FAF6EE 0%, #F5ECE0 100%)';
                  }}
                >
                  <Plus size={16} />
                  <span>+ Add {firmType === 'Partnership' ? 'Partner' : (firmType === 'LLP' ? 'Designated Partner / Director' : 'Director')}</span>
                </button>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 3: FIRM DOCUMENTS & STATUTORY LICENSES           */}
          {/* ======================================================== */}
          <div>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '18px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: '700',
              color: '#1C1917',
              marginBottom: '32px',
              paddingBottom: '10px',
              borderBottom: '1.5px solid var(--border-color)'
            }}>
              3. FIRM DOCUMENTS & STATUTORY LICENSES
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Firm PAN Card (Separate for Partnership, Pvt. Ltd., LLP) */}
              {firmType !== 'Proprietor' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px', alignItems: 'flex-start' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                      Firm PAN Card No. <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      required
                      value={firmPan}
                      onChange={(e) => setFirmPan(e.target.value.toUpperCase())}
                      placeholder="e.g. ABCDF1234G"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${validationErrors.firmPan ? '#DC2626' : 'var(--border-color)'}`,
                        background: 'var(--bg-card-subtle)',
                        outline: 'none',
                        fontSize: '14px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        boxSizing: 'border-box'
                      }}
                    />
                    {validationErrors.firmPan && (
                      <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                        {validationErrors.firmPan}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                      Upload Firm PAN Card <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      ref={el => fileInputRefs.current['firm_pan'] = el}
                      style={{ display: 'none' }}
                      onChange={(e) => handleDocumentFile(e, 'firm_pan')}
                    />
                    {firmPanDoc ? (
                      <div style={{
                        padding: '10px 14px',
                        background: '#FAF6EE',
                        border: '1.5px solid #DAC493',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <CheckCircle2 size={16} color="#16A34A" />
                          <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917' }}>Firm PAN Uploaded</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={(event) => openDocumentPreview(firmPanDoc, event)}
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid #DAC493',
                              color: '#9F7335',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <Eye size={12} /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerFileUpload('firm_pan')}
                            style={{
                              background: '#FAF6EE',
                              border: '1px solid #DAC493',
                              color: '#9F7335',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Replace
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={uploadingDocKey === 'firm_pan'}
                        onClick={() => triggerFileUpload('firm_pan')}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: `1.5px dashed ${validationErrors.firmPanDoc ? '#DC2626' : '#DAC493'}`,
                          background: '#FAF6EE',
                          color: '#9F7335',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        <Upload size={15} />
                        <span>{uploadingDocKey === 'firm_pan' ? 'Uploading...' : 'Upload Firm PAN'}</span>
                      </button>
                    )}
                    {validationErrors.firmPanDoc && (
                      <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                        {validationErrors.firmPanDoc}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Firm CIN No & Incorporation Certificate Upload (Corporate/LLP entities only: Pvt. Ltd. & LLP) */}
              {firmType !== 'Proprietor' && firmType !== 'Partnership' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px', alignItems: 'flex-start' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    Firm CIN No <span style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={21}
                    value={cinNumber}
                    onChange={(e) => setCinNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. U12345KA2026PTC123456"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--border-color)',
                      background: 'var(--bg-card-subtle)',
                      outline: 'none',
                      fontSize: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#78716C', marginTop: '4px' }}>
                    Corporate / LLP Identification Number (CIN / LLPIN) if incorporated.
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    Incorporation Certificate <span style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>(Optional)</span>
                  </label>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    ref={el => fileInputRefs.current['incorporation'] = el}
                    style={{ display: 'none' }}
                    onChange={(e) => handleDocumentFile(e, 'incorporation')}
                  />
                  {incorporationDoc ? (
                    <div style={{
                      padding: '10px 14px',
                      background: '#FAF6EE',
                      border: '1.5px solid #DAC493',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <CheckCircle2 size={16} color="#16A34A" />
                        <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Incorporation Certificate Uploaded
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={(event) => openDocumentPreview(incorporationDoc, event)}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #DAC493',
                            color: '#9F7335',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerFileUpload('incorporation')}
                          style={{
                            background: '#FAF6EE',
                            border: '1px solid #DAC493',
                            color: '#9F7335',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={uploadingDocKey === 'incorporation'}
                      onClick={() => triggerFileUpload('incorporation')}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px dashed #DAC493',
                        background: '#FAF6EE',
                        color: '#9F7335',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <Upload size={15} />
                      <span>{uploadingDocKey === 'incorporation' ? 'Uploading...' : 'Upload Incorporation Certificate'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Upload AOA and Upload MOA (Separate Upload Columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px', alignItems: 'flex-start' }}>
                {/* 1. Upload AOA */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    Upload AOA <span style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>(Optional)</span>
                  </label>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    ref={el => fileInputRefs.current['aoa'] = el}
                    style={{ display: 'none' }}
                    onChange={(e) => handleDocumentFile(e, 'aoa')}
                  />
                  {aoaDoc ? (
                    <div style={{
                      padding: '10px 14px',
                      background: '#FAF6EE',
                      border: '1.5px solid #DAC493',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <CheckCircle2 size={16} color="#16A34A" />
                        <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          AOA Uploaded
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={(event) => openDocumentPreview(aoaDoc, event)}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #DAC493',
                            color: '#9F7335',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerFileUpload('aoa')}
                          style={{
                            background: '#FAF6EE',
                            border: '1px solid #DAC493',
                            color: '#9F7335',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={uploadingDocKey === 'aoa'}
                      onClick={() => triggerFileUpload('aoa')}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px dashed #DAC493',
                        background: '#FAF6EE',
                        color: '#9F7335',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <Upload size={15} />
                      <span>{uploadingDocKey === 'aoa' ? 'Uploading...' : 'Upload AOA (PDF / Image)'}</span>
                    </button>
                  )}
                </div>

                {/* 2. Upload MOA */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    Upload MOA <span style={{ fontSize: '12px', color: '#78716C', fontWeight: '500' }}>(Optional)</span>
                  </label>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    ref={el => fileInputRefs.current['moa'] = el}
                    style={{ display: 'none' }}
                    onChange={(e) => handleDocumentFile(e, 'moa')}
                  />
                  {moaDoc ? (
                    <div style={{
                      padding: '10px 14px',
                      background: '#FAF6EE',
                      border: '1.5px solid #DAC493',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <CheckCircle2 size={16} color="#16A34A" />
                        <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          MOA Uploaded
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={(event) => openDocumentPreview(moaDoc, event)}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #DAC493',
                            color: '#9F7335',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerFileUpload('moa')}
                          style={{
                            background: '#FAF6EE',
                            border: '1px solid #DAC493',
                            color: '#9F7335',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={uploadingDocKey === 'moa'}
                      onClick={() => triggerFileUpload('moa')}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px dashed #DAC493',
                        background: '#FAF6EE',
                        color: '#9F7335',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <Upload size={15} />
                      <span>{uploadingDocKey === 'moa' ? 'Uploading...' : 'Upload MOA (PDF / Image)'}</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

              {/* GST Number & Certificate Upload */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px', alignItems: 'flex-start' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    {firmType === 'Proprietor' ? 'Firm GST Number' : 'GST Number'} <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={gstNumber}
                    onChange={(e) => {
                      setGstNumber(e.target.value.toUpperCase());
                      if (validationErrors.gstNumber) setValidationErrors(prev => { const updated = { ...prev }; delete updated.gstNumber; return updated; });
                    }}
                    placeholder="e.g. 29ABCDE1234F1Z5"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${validationErrors.gstNumber ? '#DC2626' : 'var(--border-color)'}`,
                      background: 'var(--bg-card-subtle)',
                      outline: 'none',
                      fontSize: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      boxSizing: 'border-box'
                    }}
                  />
                  {validationErrors.gstNumber && (
                    <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                      {validationErrors.gstNumber}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    Upload GST Certificate <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    ref={el => fileInputRefs.current['gst'] = el}
                    style={{ display: 'none' }}
                    onChange={(e) => handleDocumentFile(e, 'gst')}
                  />
                  {gstDoc ? (
                    <div style={{
                      padding: '10px 14px',
                      background: '#FAF6EE',
                      border: '1.5px solid #DAC493',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <CheckCircle2 size={16} color="#16A34A" />
                        <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917' }}>GST Certificate Uploaded</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={(event) => openDocumentPreview(gstDoc, event)}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #DAC493',
                            color: '#9F7335',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerFileUpload('gst')}
                          style={{
                            background: '#FAF6EE',
                            border: '1px solid #DAC493',
                            color: '#9F7335',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={uploadingDocKey === 'gst'}
                      onClick={() => triggerFileUpload('gst')}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px dashed ${validationErrors.gstDoc ? '#DC2626' : '#DAC493'}`,
                        background: '#FAF6EE',
                        color: '#9F7335',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <Upload size={15} />
                      <span>{uploadingDocKey === 'gst' ? 'Uploading...' : 'Upload GST Certificate'}</span>
                    </button>
                  )}
                  {validationErrors.gstDoc && <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>{validationErrors.gstDoc}</div>}
                </div>
              </div>

              {/* Gumastha License No. & Certificate Upload */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px', alignItems: 'flex-start' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    Gumastha License No. <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={gumasthaNumber}
                    onChange={(e) => {
                      setGumasthaNumber(e.target.value);
                      if (validationErrors.gumasthaNumber) setValidationErrors(prev => { const updated = { ...prev }; delete updated.gumasthaNumber; return updated; });
                    }}
                    placeholder="e.g. GUM/2026/KA/7789"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${validationErrors.gumasthaNumber ? '#DC2626' : 'var(--border-color)'}`,
                      background: 'var(--bg-card-subtle)',
                      outline: 'none',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                  {validationErrors.gumasthaNumber && <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>{validationErrors.gumasthaNumber}</div>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    Upload Gumastha Certificate <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    ref={el => fileInputRefs.current['gumastha'] = el}
                    style={{ display: 'none' }}
                    onChange={(e) => handleDocumentFile(e, 'gumastha')}
                  />
                  {gumasthaDoc ? (
                    <div style={{
                      padding: '10px 14px',
                      background: '#FAF6EE',
                      border: '1.5px solid #DAC493',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <CheckCircle2 size={16} color="#16A34A" />
                        <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#1C1917' }}>Gumastha Certificate Uploaded</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={(event) => openDocumentPreview(gumasthaDoc, event)}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #DAC493',
                            color: '#9F7335',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerFileUpload('gumastha')}
                          style={{
                            background: '#FAF6EE',
                            border: '1px solid #DAC493',
                            color: '#9F7335',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={uploadingDocKey === 'gumastha'}
                      onClick={() => triggerFileUpload('gumastha')}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px dashed ${validationErrors.gumasthaDoc ? '#DC2626' : '#DAC493'}`,
                        background: '#FAF6EE',
                        color: '#9F7335',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <Upload size={15} />
                      <span>{uploadingDocKey === 'gumastha' ? 'Uploading...' : 'Upload Gumastha Certificate'}</span>
                    </button>
                  )}
                  {validationErrors.gumasthaDoc && <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>{validationErrors.gumasthaDoc}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 4: FIRM BANK DETAILS                             */}
          {/* ======================================================== */}
          <div>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '18px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: '700',
              color: '#1C1917',
              marginBottom: '32px',
              paddingBottom: '10px',
              borderBottom: '1.5px solid var(--border-color)'
            }}>
              4. FIRM BANK DETAILS
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Row 1: Firm Name (as per bank) & Bank Name */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    Firm Name (as per bank) <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bankFirmName}
                    onChange={(e) => {
                      setBankFirmName(e.target.value);
                      if (validationErrors.bankFirmName) {
                        setValidationErrors(prev => {
                          const updated = { ...prev };
                          delete updated.bankFirmName;
                          return updated;
                        });
                      }
                    }}
                    placeholder="Legal firm name registered with bank"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${validationErrors.bankFirmName ? '#DC2626' : 'var(--border-color)'}`,
                      background: 'var(--bg-card-subtle)',
                      outline: 'none',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                  {validationErrors.bankFirmName && (
                    <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                      {validationErrors.bankFirmName}
                    </div>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    Bank Name <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => {
                      setBankName(e.target.value);
                      if (validationErrors.bankName) {
                        setValidationErrors(prev => {
                          const updated = { ...prev };
                          delete updated.bankName;
                          return updated;
                        });
                      }
                    }}
                    placeholder="e.g. HDFC Bank, ICICI Bank, State Bank of India"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${validationErrors.bankName ? '#DC2626' : 'var(--border-color)'}`,
                      background: 'var(--bg-card-subtle)',
                      outline: 'none',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                  {validationErrors.bankName && (
                    <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                      {validationErrors.bankName}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Account Number & IFSC Code */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    Account Number <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={bankAccountNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 20);
                      setBankAccountNumber(val);
                      if (validationErrors.bankAccountNumber) {
                        setValidationErrors(prev => {
                          const updated = { ...prev };
                          delete updated.bankAccountNumber;
                          return updated;
                        });
                      }
                    }}
                    placeholder="e.g. 50200012345678"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${validationErrors.bankAccountNumber ? '#DC2626' : 'var(--border-color)'}`,
                      background: 'var(--bg-card-subtle)',
                      outline: 'none',
                      fontSize: '14px',
                      letterSpacing: '0.04em',
                      boxSizing: 'border-box'
                    }}
                  />
                  {validationErrors.bankAccountNumber && (
                    <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                      {validationErrors.bankAccountNumber}
                    </div>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                    IFSC Code <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={bankIfscCode}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
                      setBankIfscCode(val);
                      if (validationErrors.bankIfscCode) {
                        setValidationErrors(prev => {
                          const updated = { ...prev };
                          delete updated.bankIfscCode;
                          return updated;
                        });
                      }
                    }}
                    placeholder="e.g. HDFC0001234"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${validationErrors.bankIfscCode ? '#DC2626' : 'var(--border-color)'}`,
                      background: 'var(--bg-card-subtle)',
                      outline: 'none',
                      fontSize: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      boxSizing: 'border-box'
                    }}
                  />
                  {validationErrors.bankIfscCode && (
                    <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                      {validationErrors.bankIfscCode}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Submit Action (Matching New Visitor Form Submit) */}
          <div style={{
            marginTop: '32px',
            paddingTop: '32px',
            borderTop: '1.5px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '32px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: '0 0 auto',
                  padding: '14px 26px',
                  borderRadius: 'var(--radius-md)',
                  background: '#FFFFFF',
                  border: '1.5px solid #D6D3D1',
                  color: '#44403C',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F5F5F4';
                  e.currentTarget.style.borderColor = '#A8A29E';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#D6D3D1';
                }}
              >
                {isEdit ? 'Cancel' : 'Cancel & Go Back'}
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
                style={{
                  flex: '1 1 260px',
                  padding: '14px 28px',
                  fontSize: '15px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  background: 'linear-gradient(135deg, #B88B4A 0%, #9F7335 100%)',
                  boxShadow: '0 4px 16px rgba(184, 139, 74, 0.35)',
                  borderRadius: 'var(--radius-md)',
                  opacity: isSubmitting ? 0.6 : 1,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {isSubmitting ? (
                  <span>{isEdit ? 'Saving Changes...' : 'Saving KYC Record...'}</span>
                ) : (
                  <>
                  <span>{isEdit ? 'Review Changes' : 'Review & Continue'}</span>
                  {!isEdit && <ArrowRight size={18} />}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
          </div>
        )}

        {currentStep === 1 && isReviewing && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ padding: '16px 18px', border: '1px solid #DAC493', borderRadius: 10, background: '#FAF6EE', color: '#6F5A3B' }}>
              {isEdit
                ? 'Review the updated details before saving. Your changes will be saved after you verify the one-time code sent to your sign-in mobile number.'
                : `Review these details before creating the ${relationshipType}. Clicking Create saves the record and queues email and WhatsApp notifications for each stakeholder with valid contact details.`}
            </div>
            <section style={{ border: '1px solid #E7D9C5', borderRadius: 12, padding: 22, background: '#FFFFFF' }}>
              <h3 style={{ margin: '0 0 16px', color: '#8C6228' }}>Business & location</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                {[
                  ['Branch / location', branchName], ['Firm name', firmName], ['Type', `${relationshipType} · ${firmType}`],
                  ['Address', [addressLine1, addressLine2, city, state, pincode].filter(Boolean).join(', ')],
                  ['Office phone', officePhone || '—'], ['Business mobiles', mobileNumbers.filter(Boolean).join(', ') || '—'],
                  ['Business emails', emailIds.filter(Boolean).join(', ') || '—'], ['Firm PAN', firmPan || '—'],
                  ['GST number', gstNumber || '—'], ['Gumastha license', gumasthaNumber || '—'],
                  ['Bank', [bankName, bankAccountNumber, bankIfscCode].filter(Boolean).join(' · ') || '—']
                ].map(([label, value]) => <div key={label}><div style={{ fontSize: 11, color: '#80766A', marginBottom: 4 }}>{label}</div><div style={{ fontSize: 13, fontWeight: 650, color: '#302A23', overflowWrap: 'anywhere' }}>{value}</div></div>)}
              </div>
            </section>
            <section style={{ border: '1px solid #E7D9C5', borderRadius: 12, padding: 22, background: '#FFFFFF' }}>
              <h3 style={{ margin: '0 0 16px', color: '#8C6228' }}>Stakeholders</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {stakeholders.map((person, index) => <div key={`${person.name}-${index}`} style={{ padding: 14, border: '1px solid #EEE7DD', borderRadius: 8 }}>
                  <strong>{index + 1}. {person.name || 'Unnamed stakeholder'} · {person.role_type}</strong>
                  <div style={{ marginTop: 6, fontSize: 12.5, color: '#6F6253' }}>Mobile: {(person.mobile_numbers || [person.mobile]).filter(Boolean).join(', ') || '—'} · Email: {(person.email_ids || [person.email]).filter(Boolean).join(', ') || '—'}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: '#6F6253' }}>PAN document: {person.pan_doc ? 'Attached' : 'Missing'} · Aadhaar document: {person.aadhaar_doc ? 'Attached' : 'Missing'}</div>
                </div>)}
              </div>
            </section>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap', borderTop: '1px solid #E9E1D6', paddingTop: 20 }}>
              <button type="button" onClick={() => setIsReviewing(false)} style={{ padding: '12px 20px', border: '1px solid #DAC493', borderRadius: 8, background: '#FFFFFF', color: '#805A25', fontWeight: 700, cursor: 'pointer' }}>Edit Details</button>
              <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="btn-primary" style={{ padding: '12px 28px', borderRadius: 8, fontWeight: 750, cursor: isSubmitting ? 'wait' : 'pointer', opacity: isSubmitting ? .65 : 1 }}>{isSubmitting ? 'Creating…' : isEdit ? 'Submit Changes' : 'Submit & Create'}</button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: CREATE ADMIN LOGINS                              */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #FAF6EE 0%, #F5ECE0 100%)',
              border: '1.5px solid #DAC493',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px'
            }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#1C1917', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} color="#B88B4A" />
                  <span>Configure Admin Logins for {savedLocation?.name || branchName}</span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#78716C', lineHeight: '1.5' }}>
                  {firmType === 'Proprietor'
                    ? '1 Admin Login pre-configured for the registered Sole Proprietor.'
                    : firmType === 'Partnership'
                      ? `${adminAccounts.filter(a => a.isStakeholder).length} Admin Logins pre-configured for the registered Partners.`
                      : `${adminAccounts.filter(a => a.isStakeholder).length} Admin Logins pre-configured for the registered Directors.`}
                  {' '}Review credentials below or click "+ Add More Admin Login" to create additional logins.
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddAdminAccount}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#FFFFFF',
                  border: '1.5px solid #B88B4A',
                  color: '#9F7335',
                  padding: '9px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.18s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#FAF6EE';
                  e.currentTarget.style.borderColor = '#9F7335';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#B88B4A';
                }}
              >
                <Plus size={15} />
                <span>+ Add More Admin Login</span>
              </button>
            </div>

            {/* Validation errors summary for admin form */}
            {Object.keys(adminErrors).length > 0 && (
              <div style={{
                background: '#FEF2F2',
                border: '1.5px solid #FCA5A5',
                color: '#991B1B',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                fontSize: '13px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '14px', marginBottom: '6px' }}>
                  <AlertCircle size={18} color="#DC2626" />
                  Please resolve the following login issues:
                </div>
                <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                  {Object.values(adminErrors).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Admin Cards List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {adminAccounts.map((adm, aIdx) => {
                const pfx = `admin_${aIdx}_`;
                return (
                  <div
                    key={adm.id}
                    style={{
                      background: 'var(--bg-card-subtle)',
                      border: '1.5px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '24px',
                      position: 'relative',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {/* Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '20px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid var(--border-color)',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #B88B4A 0%, #9F7335 100%)',
                          color: '#FFFFFF',
                          fontSize: '13px',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {aIdx + 1}
                        </span>
                        <div>
                          <span style={{ fontSize: '15px', fontWeight: '700', color: '#1C1917', marginRight: '8px' }}>
                            {adm.role_type} Admin #{aIdx + 1}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#9F7335',
                            background: '#FAF6EE',
                            border: '1px solid #DAC493',
                            padding: '2px 8px',
                            borderRadius: '9999px'
                          }}>
                            Role: Studio Admin
                          </span>
                        </div>
                      </div>

                      {!adm.isStakeholder && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAdminAccount(aIdx)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#FFFFFF',
                            border: '1px solid #DC2626',
                            color: '#DC2626',
                            fontSize: '12px',
                            fontWeight: '600',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Inputs Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '18px' }}>
                      {/* Name */}
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                          Admin Full Name <span style={{ color: '#DC2626' }}>*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={adm.name}
                          onChange={(e) => updateAdminField(aIdx, 'name', e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: `1.5px solid ${adminErrors[`${pfx}name`] ? '#DC2626' : 'var(--border-color)'}`,
                            background: '#FFFFFF',
                            outline: 'none',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                          }}
                        />
                        {adminErrors[`${pfx}name`] && (
                          <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                            {adminErrors[`${pfx}name`]}
                          </div>
                        )}
                      </div>

                      {/* Email (Username) */}
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                          Login Email Address (Username) <span style={{ color: '#DC2626' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="email"
                            required
                            value={adm.email}
                            onChange={(e) => updateAdminField(aIdx, 'email', e.target.value)}
                            placeholder="e.g. admin@maisonbeyou.com"
                            style={{
                              width: '100%',
                              padding: '12px 14px 12px 36px',
                              borderRadius: 'var(--radius-md)',
                              border: `1.5px solid ${adminErrors[`${pfx}email`] ? '#DC2626' : 'var(--border-color)'}`,
                              background: '#FFFFFF',
                              outline: 'none',
                              fontSize: '14px',
                              boxSizing: 'border-box'
                            }}
                          />
                          <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                        </div>
                        {adminErrors[`${pfx}email`] && (
                          <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                            {adminErrors[`${pfx}email`]}
                          </div>
                        )}
                      </div>

                      {/* Phone */}
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' }}>
                          Phone / Mobile Number
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            padding: '11px 12px',
                            background: 'var(--bg-surface)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: 'var(--text-muted)'
                          }}>
                            +91
                          </span>
                          <input
                            type="tel"
                            maxLength={10}
                            value={adm.phone}
                            onChange={(e) => updateAdminField(aIdx, 'phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="10-digit mobile"
                            style={{
                              flex: 1,
                              width: '100%',
                              padding: '12px 14px',
                              borderRadius: 'var(--radius-md)',
                              border: '1.5px solid var(--border-color)',
                              background: '#FFFFFF',
                              outline: 'none',
                              fontSize: '14px',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                        <PhoneOtpVerification value={adm.phone} verified={isPhoneVerified(adm.phone)} onVerified={markPhoneVerified} />
                        {adminErrors[`${pfx}phone`] && <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>{adminErrors[`${pfx}phone`]}</div>}
                      </div>

                      {/* Password */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                            Admin Password <span style={{ color: '#DC2626' }}>*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => generateAdminPassword(aIdx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#B88B4A',
                              fontSize: '11.5px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <RefreshCw size={12} /> Auto-Generate
                          </button>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={adm.showPassword ? 'text' : 'password'}
                            required
                            value={adm.password}
                            onChange={(e) => updateAdminField(aIdx, 'password', e.target.value)}
                            placeholder="Min. 6 characters"
                            style={{
                              width: '100%',
                              padding: '12px 40px 12px 14px',
                              borderRadius: 'var(--radius-md)',
                              border: `1.5px solid ${adminErrors[`${pfx}password`] ? '#DC2626' : 'var(--border-color)'}`,
                              background: '#FFFFFF',
                              outline: 'none',
                              fontSize: '14px',
                              boxSizing: 'border-box',
                              fontFamily: adm.showPassword ? 'inherit' : 'monospace'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => toggleAdminPasswordVisibility(aIdx)}
                            style={{
                              position: 'absolute',
                              right: '12px',
                              top: '13px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-muted)'
                            }}
                            title={adm.showPassword ? 'Hide password' : 'Show password'}
                          >
                            {adm.showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {adminErrors[`${pfx}password`] && (
                          <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px' }}>
                            {adminErrors[`${pfx}password`]}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* + Add More Admin Login Button */}
            <button
              type="button"
              onClick={handleAddAdminAccount}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px dashed #DAC493',
                background: 'linear-gradient(135deg, #FAF6EE 0%, #F5ECE0 100%)',
                color: '#9F7335',
                fontSize: '14px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.18s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#B88B4A';
                e.currentTarget.style.background = '#EFE4D2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#DAC493';
                e.currentTarget.style.background = 'linear-gradient(135deg, #FAF6EE 0%, #F5ECE0 100%)';
              }}
            >
              <Plus size={16} />
              <span>+ Add More Admin Login</span>
            </button>

            {/* Bottom Actions */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              paddingTop: '24px',
              borderTop: '1.5px solid var(--border-color)',
              marginTop: '16px'
            }}>
              <button
                type="button"
                onClick={() => {
                  if (onSuccess && savedLocation) onSuccess(savedLocation);
                  onClose();
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  padding: '12px 20px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Skip for Now
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #DAC493',
                    color: '#9F7335',
                    padding: '12px 20px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  ← Back to KYC Details
                </button>

                <button
                  type="button"
                  disabled={isSavingAdmins}
                  onClick={handleSaveAdminLogins}
                  className="btn-primary"
                  style={{
                    padding: '12px 28px',
                    fontSize: '14.5px',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Key size={16} />
                  <span>{isSavingAdmins ? 'Configuring Accounts...' : 'Create Admin Logins & Complete Setup'}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: SETUP COMPLETE & CREDENTIALS SUMMARY             */}
        {/* ======================================================== */}
        {currentStep === 3 && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: '#ECFDF5',
              border: '2px solid #86EFAC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.2)'
            }}>
              <CheckCircle2 size={40} color="#15803D" />
            </div>

            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '26px', fontWeight: '700', color: '#1C1917', marginBottom: '8px' }}>
              {isEdit ? 'Changes Saved' : 'Branch & Admin Access Created'}
            </h3>
            <p style={{ fontSize: '15px', color: '#57534E', maxWidth: '640px', lineHeight: '1.6', margin: '0 0 28px 0' }}>
              {isEdit
                ? <>Your changes to <strong>{savedLocation?.name || branchName}</strong> have been saved.</>
                : <><strong>{savedLocation?.name || branchName}</strong> has been registered with complete KYC.</>}
              {!isEdit && ' Every registered proprietor, partner, or director can now sign in to this branch with OTP using their registered mobile number.'}
            </p>
            {!isEdit && <div style={{ width: '100%', maxWidth: 760, margin: '-12px 0 20px', color: '#16704F', fontSize: 13, fontWeight: 650 }}>Email and WhatsApp notifications have been queued for the registered stakeholders.</div>}
            <section className="registration-print-area" style={{ width: '100%', maxWidth: 760, textAlign: 'left', padding: 22, marginBottom: 22, border: '1px solid #E7D9C5', borderRadius: 12, background: '#FFFFFF' }}>
              <h3 style={{ margin: '0 0 14px', color: '#8C6228' }}>Registration details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, fontSize: 13 }}>
                {[
                  ['Location', savedLocation?.name || branchName], ['Registration code', savedLocation?.code || '—'],
                  ['Firm type', `${relationshipType} · ${firmType}`], ['Firm name', firmName],
                  ['Address', [addressLine1, addressLine2, city, state, pincode].filter(Boolean).join(', ')],
                  ['Office number', officePhone || '—'], ['Business numbers', mobileNumbers.filter(Boolean).join(', ') || '—'],
                  ['Business email', emailIds.filter(Boolean).join(', ') || '—'],
                  ['Firm PAN', `${firmPan || '—'} · ${firmPanDoc ? 'document attached' : 'document missing'}`],
                  ['GST', `${gstNumber || '—'} · ${gstDoc ? 'certificate attached' : 'certificate missing'}`],
                  ['Gumastha', `${gumasthaNumber || '—'} · ${gumasthaDoc ? 'certificate attached' : 'certificate missing'}`],
                  ['Bank', `${bankName || '—'} · account ending ${bankAccountNumber.replace(/\D/g, '').slice(-4) || '—'} · IFSC ${bankIfscCode || '—'}`]
                ].map(([label, value]) => <div key={label}><strong style={{ display: 'block', color: '#80766A', fontSize: 11, marginBottom: 3 }}>{label}</strong><span style={{ color: '#302A23', overflowWrap: 'anywhere' }}>{value}</span></div>)}
              </div>
              <h4 style={{ margin: '20px 0 10px', color: '#8C6228' }}>Stakeholders</h4>
              {stakeholders.map((person, index) => {
                const aadhaarDigits = String(person.aadhaar_number || '').replace(/\D/g, '');
                const maskedAadhaar = aadhaarDigits ? `${'•'.repeat(Math.max(0, aadhaarDigits.length - 4))}${aadhaarDigits.slice(-4)}` : '—';
                return <div key={`${person.name}-print-${index}`} style={{ padding: '9px 0', borderTop: '1px solid #EEE7DD', fontSize: 12.5 }}><strong>{index + 1}. {person.name} · {person.role_type}</strong><div>{(person.mobile_numbers || [person.mobile]).filter(Boolean).join(', ') || '—'} · {(person.email_ids || [person.email]).filter(Boolean).join(', ') || '—'}</div><div>DOB: {person.dob || '—'} · Marital status: {person.marital_status || '—'} · PAN: {person.pan_number || '—'} · Aadhaar: {maskedAadhaar} · DIN: {person.din_number || '—'}</div><div>PAN document: {person.pan_doc ? 'Attached' : '—'} · Aadhaar document: {person.aadhaar_doc ? 'Attached' : '—'}</div></div>;
              })}
            </section>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
              <button type="button" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', border: '1px solid #DAC493', borderRadius: 8, background: '#FFFFFF', color: '#805A25', fontWeight: 700, cursor: 'pointer' }}><Printer size={16} /> Print / Save as PDF</button>
              <button type="button" onClick={downloadRegistrationSummary} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', border: '1px solid #DAC493', borderRadius: 8, background: '#FFFFFF', color: '#805A25', fontWeight: 700, cursor: 'pointer' }}>Download summary</button>
              <button type="button" onClick={shareRegistrationSummary} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', border: '1px solid #DAC493', borderRadius: 8, background: '#FFFFFF', color: '#805A25', fontWeight: 700, cursor: 'pointer' }}><Share2 size={16} /> Share</button>
            </div>
            {shareFeedback && <div role="status" style={{ marginBottom: 18, color: '#6F5A3B', fontSize: 12.5 }}>{shareFeedback}</div>}
            {!isEdit && savedLocation?.startup_data_copy && (savedLocation.startup_data_copy.error || Object.entries(savedLocation.startup_data_copy).some(([key, value]) => key !== 'error' && Number(value) > 0)) && <div style={{ width: '100%', maxWidth: 720, margin: '-8px 0 24px', padding: '14px 16px', border: `1px solid ${savedLocation.startup_data_copy.error ? '#FECACA' : '#D9E9DA'}`, borderRadius: 10, background: savedLocation.startup_data_copy.error ? '#FEF2F2' : '#F3FAF4', color: savedLocation.startup_data_copy.error ? '#9B1C1C' : '#315D3B', textAlign: 'left', fontSize: 12.5 }}>
              {savedLocation.startup_data_copy.error ? `The location was created, but the selected data copy failed: ${savedLocation.startup_data_copy.error}` : <><strong>One-time data copy complete:</strong> {savedLocation.startup_data_copy.categories} categories, {savedLocation.startup_data_copy.services} services, {savedLocation.startup_data_copy.membership_plans} membership plans, {savedLocation.startup_data_copy.designations} designations, {savedLocation.startup_data_copy.team_roles || 0} team roles, and {savedLocation.startup_data_copy.client_profiles} client profiles.</>}
            </div>}

            {/* Credentials Card */}
            {!isEdit && (
            <div style={{
              width: '100%',
              maxWidth: '720px',
              background: '#FAF6EE',
              border: '1.5px solid #DAC493',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              marginBottom: '32px',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #EFE4D2' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#1C1917', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Branch Admin Accounts ({createdAdminResult.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const text = createdAdminResult.map((a, i) =>
                      `Admin #${i + 1} (${a.role_type}):\nName: ${a.name}\nEmail: ${a.email}\nRegistered mobile: ${a.phone || 'N/A'}\nSign in with OTP`
                    ).join('\n\n');
                    handleCopyText('all', `Maison BeYou — ${savedLocation?.name || branchName} Admin Accounts\n\n${text}`);
                  }}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #DAC493',
                    color: '#9F7335',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  {copiedKey === 'all' ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                  <span>{copiedKey === 'all' ? 'Copied All!' : 'Copy Login Details'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {createdAdminResult.map((adm, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E5D5BA',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#1C1917' }}>{adm.name}</span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#9F7335', background: '#FAF6EE', border: '1px solid #DAC493', padding: '1px 6px', borderRadius: '4px' }}>
                          {adm.role_type}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Mobile: <strong style={{ color: '#1C1917' }}>{adm.phone || '—'}</strong></div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Email: <strong style={{ color: '#1C1917' }}>{adm.email || '—'}</strong></div>
                      <div style={{ fontSize: '12px', color: '#9F7335', marginTop: '4px', fontWeight: '700' }}>Sign in using OTP sent to the registered mobile</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyText(`card_${idx}`, `Name: ${adm.name}\nMobile: ${adm.phone}\nEmail: ${adm.email}\nSign in using OTP`)}
                      style={{
                        background: '#FAF6EE',
                        border: '1px solid #DAC493',
                        color: '#9F7335',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {copiedKey === `card_${idx}` ? <Check size={13} color="#16A34A" /> : <Copy size={13} />}
                      <span>{copiedKey === `card_${idx}` ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (onSuccess && savedLocation) onSuccess(savedLocation);
                onClose();
              }}
              className="btn-primary"
              style={{
                padding: '14px 36px',
                fontSize: '15px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{isEdit ? 'Done' : 'Complete Setup & Return to Studios'}</span>
              {!isEdit && <ArrowRight size={18} />}
            </button>
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      {viewingDocUrl && createPortal((
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          zIndex: 2700,
          padding: '24px',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '820px',
            width: '100%',
            marginTop: `${Math.max(0, viewingDocTop - 24)}px`,
            maxHeight: `calc(100vh - ${viewingDocTop + 24}px)`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(0,0,0,0.4)'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #F0E8DD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#FAF6EE'
            }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#1C1917' }}>Document Preview</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <a
                  href={viewingDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: '#9F7335',
                    fontWeight: '700',
                    textDecoration: 'none'
                  }}
                >
                  <ExternalLink size={13} />
                  <span>Open in New Tab</span>
                </a>
                <button
                  type="button"
                  onClick={() => setViewingDocUrl(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    color: '#78716C'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '16px', textAlign: 'center', background: '#F8F8F8' }}>
              {viewingDocUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={viewingDocUrl}
                  style={{ width: '100%', height: '70vh', border: 'none' }}
                  title="Document Preview"
                />
              ) : (
                <img
                  src={viewingDocUrl}
                  alt="KYC Document Preview"
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }}
                />
              )}
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowDownToLine, BarChart3, Camera, CheckCircle2, Clipboard, Gift, LoaderCircle, Plus, Printer, RefreshCw, Search, X } from 'lucide-react';
import { apiRequest, formatCurrency, formatDate } from '../utils/api';

const cardStyle = { padding: 18, border: '1px solid #E7D8C4', borderRadius: 14, background: '#FFFFFF', boxShadow: '0 4px 14px rgba(87,58,32,.035)' };
const fieldStyle = { width: '100%', boxSizing: 'border-box', padding: '10px 11px', border: '1px solid #E7D8C4', borderRadius: 9, background: '#FFFFFF', color: '#302820', fontSize: 13 };
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 6, color: '#51463D', fontSize: 12, fontWeight: 700 };
const outlineButton = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 38, padding: '8px 12px', border: '1px solid #D8BC8F', borderRadius: 9, background: '#FFFEFC', color: '#8C6228', fontSize: 12, fontWeight: 750, cursor: 'pointer' };
const primaryButton = { ...outlineButton, border: 0, background: '#A97735', color: '#FFFFFF' };
const statusColors = { active: ['#EAF5EC', '#267341'], partially_redeemed: ['#FFF5E5', '#95651C'], fully_redeemed: ['#F0F0F0', '#57534E'], pending_payment: ['#FFF2E4', '#9A5B16'], expired: ['#F5EFEA', '#81766B'], cancelled: ['#FEF2F2', '#B42318'], refunded: ['#F1EBFA', '#6847A0'], draft: ['#F3F4F6', '#57534E'] };

const statusLabel = status => String(status || '').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const todayIso = () => new Date().toISOString().slice(0, 10);
const dateAfterDays = days => { const date = new Date(); date.setDate(date.getDate() + Number(days || 365)); return date.toISOString().slice(0, 10); };

function StatusPill({ status }) {
  const [background, color] = statusColors[status] || ['#F4EEE5', '#786D62'];
  return <span style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: 999, background, color, fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap' }}>{statusLabel(status)}</span>;
}

function VoucherScanner({ onCode, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let stream;
    let active = true;
    let timer;
    const scan = async () => {
      try {
        if (!('BarcodeDetector' in window)) throw new Error('QR scanning is not supported in this browser. Enter the voucher code or use a USB QR scanner.');
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is unavailable. Enter the voucher code manually.');
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (!active || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const tick = async () => {
          if (!active || !videoRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            const raw = results?.[0]?.rawValue;
            if (raw) {
              const parsedCode = raw.match(/MBV-[A-Z0-9]+/i)?.[0] || raw;
              onCode(parsedCode);
              onClose();
              return;
            }
          } catch {}
          timer = setTimeout(tick, 250);
        };
        tick();
      } catch (scanError) { setError(scanError.message || 'Could not open the camera.'); }
    };
    scan();
    return () => { active = false; clearTimeout(timer); stream?.getTracks().forEach(track => track.stop()); };
  }, [onCode, onClose]);
  return <div style={{ display: 'grid', gap: 12 }}>
    {error ? <div role="alert" style={{ color: '#9A3412', fontSize: 13 }}>{error}</div> : <video ref={videoRef} style={{ width: '100%', maxHeight: 360, borderRadius: 12, background: '#181512' }} playsInline muted />}
    <button type="button" style={outlineButton} onClick={onClose}>Close scanner</button>
  </div>;
}

export default function GiftVoucherManagement({ currentUser, activeLocation }) {
  const isMaster = currentUser?.role === 'master_admin' || currentUser?.original_role === 'master_admin';
  const isReceptionOnly = currentUser?.role === 'reception';
  const [view, setView] = useState(isReceptionOnly ? 'redeem' : 'dashboard');
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(String(activeLocation?.location_id || ''));
  const [filterBranch, setFilterBranch] = useState('all');
  const [catalog, setCatalog] = useState({ categories: [] });
  const [settings, setSettings] = useState({ default_validity_days: 365, max_validity_days: 1095, minimum_value: 1, require_recipient_contact: 0, allow_unrestricted: 1 });
  const [vouchers, setVouchers] = useState([]);
  const [report, setReport] = useState({ totals: {}, branches: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [voucherDetails, setVoucherDetails] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lookupCode, setLookupCode] = useState('');
  const [redemptionServices, setRedemptionServices] = useState([]);
  const [redemptionAmount, setRedemptionAmount] = useState('');
  const [redemptionRef, setRedemptionRef] = useState('');
  const [globalSettingsDraft, setGlobalSettingsDraft] = useState(settings);
  const [recipientClientQuery, setRecipientClientQuery] = useState('');
  const [recipientClientMatches, setRecipientClientMatches] = useState([]);
  const [selectedRecipientClient, setSelectedRecipientClient] = useState(null);

  const [form, setForm] = useState({
    voucher_type: 'amount', title: 'Maison Beyou Gift Voucher', original_value: '1000',
    eligibility_mode: 'selected', expiry_date: dateAfterDays(365), service_redemptions_allowed: '1',
    purchaser_name: '', purchaser_phone: '', purchaser_email: '', recipient_name: '', recipient_phone: '', recipient_email: '',
    gift_message: '', payment_status: 'pending', payment_method: '', payment_reference: '', notes: '',
    send_whatsapp: false, send_email: false, send_purchaser_copy: false
  });

  const loadBranches = useCallback(async () => {
    if (!isMaster) return;
    try {
      const results = await Promise.all([apiRequest('/locations?type=branch'), apiRequest('/locations?type=franchise')]);
      const all = [...new Map(results.flatMap(result => result.locations || []).map(location => [Number(location.location_id), location])).values()];
      setBranches(all);
      if (!selectedBranch && all[0]) setSelectedBranch(String(all[0].location_id));
    } catch (loadError) { setError(loadError.message || 'Could not load branches.'); }
  }, [isMaster, selectedBranch]);

  const loadPolicy = useCallback(async () => {
    try {
      const result = await apiRequest('/gift-vouchers/settings');
      setSettings(result.settings || settings);
      setGlobalSettingsDraft(result.settings || settings);
      setForm(current => ({ ...current, expiry_date: dateAfterDays(result.settings?.default_validity_days || 365) }));
    } catch (loadError) { setError(loadError.message || 'Could not load voucher settings.'); }
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      if (isReceptionOnly) {
        const listResult = await apiRequest('/gift-vouchers');
        setVouchers(listResult.vouchers || []);
        setReport({ totals: {}, branches: [] });
        return;
      }
      const locationQuery = isMaster && filterBranch !== 'all' ? `?location_id=${encodeURIComponent(filterBranch)}` : '';
      const [listResult, reportResult] = await Promise.all([apiRequest(`/gift-vouchers${locationQuery}`), apiRequest(`/gift-vouchers/reports${locationQuery}`)]);
      setVouchers(listResult.vouchers || []);
      setReport(reportResult || { totals: {}, branches: [] });
    } catch (loadError) { setError(loadError.message || 'Could not load gift vouchers.'); }
    finally { setLoading(false); }
  }, [isMaster, filterBranch, isReceptionOnly]);

  const loadCatalog = useCallback(async locationId => {
    if (!locationId) { setCatalog({ categories: [] }); return; }
    try { setCatalog(await apiRequest(`/gift-vouchers/catalog${isMaster ? `?location_id=${encodeURIComponent(locationId)}` : ''}`)); }
    catch (loadError) { setError(loadError.message || 'Could not load branch services.'); }
  }, [isMaster]);

  useEffect(() => { loadPolicy(); loadBranches(); }, [loadPolicy, loadBranches]);
  useEffect(() => { loadRows(); }, [loadRows]);
  useEffect(() => { loadCatalog(isMaster ? selectedBranch : activeLocation?.location_id); }, [loadCatalog, isMaster, selectedBranch, activeLocation?.location_id]);
  useEffect(() => {
    const query = recipientClientQuery.trim();
    if (query.length < 2) { setRecipientClientMatches([]); return undefined; }
    let cancelled = false;
    const timer = setTimeout(() => {
      apiRequest(`/clients/search?q=${encodeURIComponent(query)}`)
        .then(result => { if (!cancelled) setRecipientClientMatches(result.clients || []); })
        .catch(() => { if (!cancelled) setRecipientClientMatches([]); });
    }, 220);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [recipientClientQuery]);

  const activeCategories = useMemo(() => catalog.categories || [], [catalog.categories]);
  const selectedCategories = useMemo(() => activeCategories.filter(category => selectedCategoryIds.includes(Number(category.category_id))), [activeCategories, selectedCategoryIds]);
  const serviceOptions = useMemo(() => selectedCategories.flatMap(category => (category.services || []).map(service => ({ ...service, category_name: category.category_name }))), [selectedCategories]);
  const eligibleServicesPreview = useMemo(() => {
    if (form.eligibility_mode === 'unrestricted') return [];
    if (form.eligibility_mode === 'selected') return serviceOptions.filter(service => selectedServiceIds.includes(Number(service.service_id)));
    if (form.eligibility_mode === 'exclude') return serviceOptions.filter(service => !selectedServiceIds.includes(Number(service.service_id)));
    return serviceOptions;
  }, [form.eligibility_mode, serviceOptions, selectedServiceIds]);

  const updateForm = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const selectRecipientClient = client => {
    if (!client) return;
    const recipientPhone = client.primary_login_phone || client.phone || '';
    const recipientEmail = client.primary_login_email || client.email || client.email_ids?.[0] || '';
    setSelectedRecipientClient(client);
    setRecipientClientQuery(`${client.name || ''}${recipientPhone ? ` · ${recipientPhone}` : ''}`);
    setRecipientClientMatches([]);
    setForm(current => ({
      ...current,
      recipient_name: [client.name, client.surname].filter(Boolean).join(' '),
      recipient_phone: recipientPhone,
      recipient_email: recipientEmail
    }));
  };

  const assignVoucherToClient = async (voucher = voucherDetails?.voucher) => {
    if (!voucher || !selectedRecipientClient?.client_id) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await apiRequest(`/gift-vouchers/${voucher.voucher_id}/recipient`, {
        method: 'PUT', body: JSON.stringify({ client_id: selectedRecipientClient.client_id })
      });
      setVoucherDetails(current => current ? { ...current, voucher: result.voucher } : current);
      setNotice(`Voucher ${result.voucher.voucher_code} is now assigned to ${result.voucher.recipient_name}.`);
      setSelectedRecipientClient(null); setRecipientClientQuery('');
      await loadRows();
    } catch (requestError) { setError(requestError.message || 'Could not assign voucher to this client.'); }
    finally { setBusy(false); }
  };
  const toggleCategory = categoryId => {
    const id = Number(categoryId);
    setSelectedCategoryIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
    setSelectedServiceIds([]);
  };
  const toggleService = serviceId => {
    const id = Number(serviceId);
    setSelectedServiceIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  };

  const handleCreate = async event => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = {
        ...form,
        status: undefined,
        payment_status: 'paid',
        issuing_location_id: isMaster ? Number(selectedBranch) : undefined,
        category_ids: selectedCategoryIds,
        service_ids: selectedServiceIds,
        original_value: Number(form.original_value),
        service_redemptions_allowed: Number(form.service_redemptions_allowed) || 1
      };
      const result = await apiRequest('/gift-vouchers', { method: 'POST', body: JSON.stringify(payload) });
      setVoucherDetails({ voucher: result.voucher, delivery_history: result.delivery_history || [], redemptions: [], ledger: [] });
      setView('details');
      setNotice(`Voucher ${result.voucher.voucher_code} created and activated. It is ready to redeem.`);
      setForm(current => ({ ...current, title: 'Maison Beyou Gift Voucher', purchaser_name: '', purchaser_phone: '', purchaser_email: '', recipient_name: '', recipient_phone: '', recipient_email: '', gift_message: '', payment_status: 'paid', payment_method: '', payment_reference: '', notes: '', send_whatsapp: false, send_email: false, send_purchaser_copy: false }));
      setSelectedRecipientClient(null); setRecipientClientQuery(''); setRecipientClientMatches([]);
      setSelectedCategoryIds([]); setSelectedServiceIds([]);
      await loadRows();
    } catch (requestError) { setError(requestError.message || 'Could not create voucher.'); }
    finally { setBusy(false); }
  };

  const lookupVoucher = async codeValue => {
    const code = String(codeValue || lookupCode).trim().toUpperCase();
    if (!code) { setError('Enter or scan a voucher code.'); return; }
    setBusy(true); setError(''); setNotice(''); setVoucherDetails(null); setRedemptionServices([]); setRedemptionAmount('');
    try {
      const result = await apiRequest(`/gift-vouchers/lookup/${encodeURIComponent(code)}?refresh_card=1`);
      setVoucherDetails(result);
      setLookupCode(code);
      setRedemptionRef(`GVR-${crypto.randomUUID().replaceAll('-', '').slice(0, 22).toUpperCase()}`);
    } catch (requestError) { setError(requestError.message || 'Voucher not found.'); }
    finally { setBusy(false); }
  };

  const openDetails = async voucher => {
    setBusy(true); setError(''); setNotice('');
    try { setVoucherDetails(await apiRequest(`/gift-vouchers/lookup/${encodeURIComponent(voucher.voucher_code)}?refresh_card=1`)); setView('details'); }
    catch (requestError) { setError(requestError.message || 'Could not load voucher details.'); }
    finally { setBusy(false); }
  };

  const confirmPayment = async voucher => {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await apiRequest(`/gift-vouchers/${voucher.voucher_id}/payment`, { method: 'PATCH', body: JSON.stringify({ payment_method: voucher.payment_method || 'Cash', payment_reference: '' }) });
      setNotice(`Payment confirmed. ${result.voucher.voucher_code} is active and card delivery has been attempted.`);
      if (voucherDetails?.voucher?.voucher_id === voucher.voucher_id) await openDetails(result.voucher);
      await loadRows();
    } catch (requestError) { setError(requestError.message || 'Could not confirm voucher payment.'); }
    finally { setBusy(false); }
  };

  const mutateVoucher = async (voucher, action) => {
    if (!window.confirm(action === 'refund' ? `Refund unused voucher ${voucher.voucher_code}?` : `Cancel pending voucher ${voucher.voucher_code}?`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await apiRequest(`/gift-vouchers/${voucher.voucher_id}/${action}`, { method: 'POST', body: JSON.stringify({ reason: action === 'refund' ? 'Admin refund' : 'Pending voucher cancelled' }) });
      setNotice(`Voucher ${action === 'refund' ? 'refunded' : 'cancelled'}.`);
      await loadRows();
      if (voucherDetails?.voucher?.voucher_id === voucher.voucher_id) await openDetails(voucher);
    } catch (requestError) { setError(requestError.message || `Could not ${action} voucher.`); }
    finally { setBusy(false); }
  };

  const redeemVoucher = async event => {
    event.preventDefault();
    if (!voucherDetails?.voucher) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const selectedNames = redemptionServices.map(name => ({ service_name: name }));
      const result = await apiRequest('/gift-vouchers/redeem', { method: 'POST', body: JSON.stringify({ voucher_code: voucherDetails.voucher.voucher_code, amount: Number(redemptionAmount), services: selectedNames, transaction_ref: redemptionRef }) });
      setNotice(`Voucher redeemed for ${formatCurrency(result.redeemed_amount)}. Remaining balance: ${formatCurrency(result.voucher.remaining_balance)}.`);
      await lookupVoucher(voucherDetails.voucher.voucher_code);
      await loadRows();
    } catch (requestError) { setError(requestError.message || 'Could not redeem voucher.'); }
    finally { setBusy(false); }
  };

  const saveSettings = async event => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const result = await apiRequest('/gift-vouchers/settings', { method: 'PUT', body: JSON.stringify(globalSettingsDraft) });
      setSettings(result.settings); setGlobalSettingsDraft(result.settings); setNotice('Global gift voucher policy saved.');
    } catch (requestError) { setError(requestError.message || 'Could not save voucher policy.'); }
    finally { setBusy(false); }
  };

  const filteredVouchers = useMemo(() => vouchers.filter(voucher => {
    const matchesSearch = !search || [voucher.voucher_code, voucher.title, voucher.recipient_name, voucher.purchaser_name].some(value => String(value || '').toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || voucher.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [vouchers, search, statusFilter]);
  const tabs = isReceptionOnly ? [] : [
    ['dashboard', 'Overview', BarChart3], ['vouchers', 'Vouchers', Gift]
  ];

  const renderRecipientClientPicker = () => <div style={{ gridColumn: '1 / -1', display: 'grid', gap: 7 }}>
    <label style={labelStyle}>Assign voucher to a client (optional)
      <input style={fieldStyle} value={recipientClientQuery} onChange={event => { setRecipientClientQuery(event.target.value); setSelectedRecipientClient(null); }} placeholder="Search client name or phone" />
    </label>
    {recipientClientMatches.length > 0 && <div style={{ display: 'grid', gap: 5, maxHeight: 190, overflowY: 'auto', padding: 6, border: '1px solid #E7D8C4', borderRadius: 9, background: '#FFFFFF' }}>
      {recipientClientMatches.map(client => <button key={client.client_id} type="button" onClick={() => selectRecipientClient(client)} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 9px', border: '1px solid #F0E9E0', borderRadius: 7, background: '#FFFCF7', color: '#51463D', textAlign: 'left', cursor: 'pointer' }}>
        <strong>{[client.name, client.surname].filter(Boolean).join(' ')}</strong><span>{client.primary_login_phone || client.phone || 'No phone'}</span>
      </button>)}
    </div>}
    {selectedRecipientClient && <div style={{ color: '#267341', fontSize: 11.5 }}>Assigned to {[selectedRecipientClient.name, selectedRecipientClient.surname].filter(Boolean).join(' ')}. Their contact details will link this voucher to their profile and Visitor cart.</div>}
  </div>;

  const renderForm = () => <form onSubmit={handleCreate} style={{ display: 'grid', gap: 14 }}>
    {isMaster && <section style={cardStyle}><label style={labelStyle}>Issuing branch<select required value={selectedBranch} onChange={event => setSelectedBranch(event.target.value)} style={fieldStyle}><option value="">Select branch</option>{branches.map(branch => <option key={branch.location_id} value={branch.location_id}>{branch.name} · {branch.type}</option>)}</select></label></section>}
    <section style={cardStyle}>
      <h3 style={{ margin: '0 0 12px', color: '#302820', fontSize: 16 }}>1. Voucher details</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
        <label style={labelStyle}>Voucher type<select style={fieldStyle} value={form.voucher_type} onChange={event => { updateForm('voucher_type', event.target.value); updateForm('eligibility_mode', 'selected'); setSelectedCategoryIds([]); setSelectedServiceIds([]); }}><option value="amount">Amount-based</option><option value="service">Service-based</option></select></label>
        <label style={labelStyle}>Voucher title<input style={fieldStyle} required maxLength={100} value={form.title} onChange={event => updateForm('title', event.target.value)} placeholder="e.g. A Gift for You" /></label>
        <label style={labelStyle}>{form.voucher_type === 'amount' ? 'Voucher amount (₹)' : 'Service voucher value (₹)'}<input style={fieldStyle} required type="number" min={settings.minimum_value} step="0.01" value={form.original_value} onChange={event => updateForm('original_value', event.target.value)} /></label>
        {form.voucher_type === 'service' && <label style={labelStyle}>Allowed service redemptions<input style={fieldStyle} required type="number" min="1" max="100" value={form.service_redemptions_allowed} onChange={event => updateForm('service_redemptions_allowed', event.target.value)} /><span style={{ color: '#786D62', fontWeight: 400 }}>Defaults to one. Increase only for multi-session gifts.</span></label>}
      </div>
    </section>

    {form.voucher_type === 'service' && <><section style={cardStyle}>
      <h3 style={{ margin: '0 0 5px', color: '#302820', fontSize: 16 }}>2. Select categories</h3>
      <p style={{ margin: '0 0 12px', color: '#786D62', fontSize: 12 }}>Categories are saved as a snapshot with the voucher, so later catalogue edits do not change eligibility.</p>
      {activeCategories.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 8 }}>{activeCategories.map(category => <label key={category.category_id} style={{ display: 'flex', gap: 9, alignItems: 'center', padding: 10, border: '1px solid #F0E6D9', borderRadius: 9, color: '#51463D', fontSize: 13 }}><input type="checkbox" checked={selectedCategoryIds.includes(Number(category.category_id))} onChange={() => toggleCategory(category.category_id)} />{category.category_name}</label>)}</div> : <div style={{ color: '#A16207', fontSize: 13 }}>Select a branch to load its active categories.</div>}
    </section>

    <section style={cardStyle}>
      <h3 style={{ margin: '0 0 12px', color: '#302820', fontSize: 16 }}>3. Select eligible services</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        <label style={labelStyle}>Eligibility mode<select style={fieldStyle} value={form.eligibility_mode} onChange={event => updateForm('eligibility_mode', event.target.value)}>
          <option value="selected">Selected services only</option><option value="all">All services in selected categories</option><option value="exclude">All services except selected</option>{isMaster && Number(settings.allow_unrestricted) ? <option value="unrestricted">Unrestricted across all services</option> : null}
        </select></label>
      </div>
      {form.eligibility_mode === 'unrestricted' ? <p style={{ margin: '12px 0 0', color: '#8C6228', fontSize: 13 }}>Authorised Master Admin only. The voucher can be applied to any service at a participating branch.</p> : selectedCategoryIds.length === 0 ? <p style={{ margin: '12px 0 0', color: '#A16207', fontSize: 13 }}>Select categories above to load the services available for this voucher.</p> : <>
        {form.eligibility_mode !== 'all' && <div style={{ display: 'grid', gap: 7, marginTop: 12 }}>{serviceOptions.map(service => <label key={service.service_id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', border: '1px solid #F0E6D9', borderRadius: 8, color: '#51463D', fontSize: 12.5 }}><input type="checkbox" checked={selectedServiceIds.includes(Number(service.service_id))} onChange={() => toggleService(service.service_id)} /><span style={{ flex: 1 }}>{service.service_name}<span style={{ color: '#948575' }}> · {service.category_name}</span></span><span style={{ color: '#8C6228', whiteSpace: 'nowrap' }}>{formatCurrency(service.price)}</span></label>)}</div>}
        <div style={{ marginTop: 12, padding: 12, borderRadius: 9, background: '#FAF6EE', color: '#6B5B4A', fontSize: 12 }}><strong>Saved eligible service snapshot:</strong> {eligibleServicesPreview.map(service => service.service_name).join(', ') || (form.eligibility_mode === 'unrestricted' ? 'Any service' : 'Choose at least one eligible service.')}</div>
      </>}
    </section></>}

    <section style={cardStyle}>
      <h3 style={{ margin: '0 0 12px', color: '#302820', fontSize: 16 }}>4. Validity and gift details</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <label style={labelStyle}>Expiry date<input style={fieldStyle} required type="date" min={todayIso()} max={dateAfterDays(settings.max_validity_days || 1095)} value={form.expiry_date} onChange={event => updateForm('expiry_date', event.target.value)} /></label>
        <label style={labelStyle}>Purchaser name *<input style={fieldStyle} required value={form.purchaser_name} onChange={event => updateForm('purchaser_name', event.target.value)} /></label>
        <label style={labelStyle}>Purchaser mobile *<input style={fieldStyle} required type="tel" inputMode="numeric" pattern="[0-9]{10}" title="Enter a 10-digit mobile number" maxLength={10} value={form.purchaser_phone} onChange={event => updateForm('purchaser_phone', event.target.value.replace(/\D/g, '').slice(0, 10))} /></label>
        <label style={labelStyle}>Purchaser email *<input style={fieldStyle} required type="email" value={form.purchaser_email} onChange={event => updateForm('purchaser_email', event.target.value)} /></label>
        {renderRecipientClientPicker()}
        <label style={labelStyle}>Recipient name<input style={fieldStyle} value={form.recipient_name} onChange={event => { setSelectedRecipientClient(null); updateForm('recipient_name', event.target.value); }} /></label>
        <label style={labelStyle}>Recipient mobile<input style={fieldStyle} type="tel" value={form.recipient_phone} onChange={event => { setSelectedRecipientClient(null); updateForm('recipient_phone', event.target.value); }} /></label>
        <label style={labelStyle}>Recipient email<input style={fieldStyle} type="email" value={form.recipient_email} onChange={event => { setSelectedRecipientClient(null); updateForm('recipient_email', event.target.value); }} /></label>
        <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>Personal gift message<textarea style={{ ...fieldStyle, resize: 'vertical' }} rows={3} maxLength={350} value={form.gift_message} onChange={event => updateForm('gift_message', event.target.value)} /></label>
        <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>Internal notes<textarea style={{ ...fieldStyle, resize: 'vertical' }} rows={2} value={form.notes} onChange={event => updateForm('notes', event.target.value)} /></label>
      </div>
    </section>

    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button type="button" style={outlineButton} onClick={() => setView('vouchers')}>Cancel</button><button type="submit" disabled={busy || (isMaster && !selectedBranch)} style={{ ...primaryButton, opacity: busy ? .65 : 1 }}>{busy ? 'Creating…' : 'Create active voucher'}</button></div>
  </form>;

  const renderDetails = () => {
    const voucher = voucherDetails?.voucher;
    if (!voucher) return <div style={cardStyle}>Choose a voucher to view its details.</div>;
    const services = voucher.eligible_services || [];
    const serviceChoiceNames = voucher.eligibility_mode === 'unrestricted' ? (catalog.categories || []).flatMap(category => category.services || []).map(service => service.service_name) : services.map(service => service.service_name);
    const redeemedValue = (voucher.redemptions || []).reduce((sum, redemption) => sum + Number(redemption.amount || 0), 0);
    return <div style={{ display: 'grid', gap: 12 }}>
      <section style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div><div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><h2 style={{ margin: 0, fontSize: 20, color: '#302820' }}>{voucher.title}</h2><StatusPill status={voucher.status} /></div><div style={{ marginTop: 8, color: '#8C6228', fontWeight: 800, fontSize: 18, letterSpacing: 1 }}>{voucher.voucher_code}</div><div style={{ marginTop: 6, color: '#786D62', fontSize: 12 }}>Issued by {voucher.issuing_branch_name} · {formatDate(voucher.issue_date)} · Valid until {formatDate(voucher.expiry_date)}</div></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {voucher.card_image_path && <a href={`${voucher.card_image_path}?v=${Date.now()}`} download style={outlineButton}><ArrowDownToLine size={15} /> Card image</a>}
          {voucher.card_pdf_path && <a href={`${voucher.card_pdf_path}?v=${Date.now()}`} target="_blank" rel="noreferrer" style={outlineButton}><Printer size={15} /> PDF / print</a>}
          <button type="button" style={outlineButton} onClick={() => navigator.clipboard?.writeText(voucher.voucher_code).then(() => setNotice('Voucher code copied.'))}><Clipboard size={15} /> Copy code</button>
        </div>
      </section>
      {voucher.card_image_path && <section style={cardStyle}><img src={`${voucher.card_image_path}?v=${Date.now()}`} alt={`Gift voucher ${voucher.voucher_code}`} style={{ display: 'block', width: '100%', maxWidth: 900, margin: '0 auto', borderRadius: 12, border: '1px solid #EADBBE' }} /></section>}
      <section style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
        <Metric label="Original value" value={formatCurrency(voucher.original_value)} /><Metric label="Redeemed" value={formatCurrency(redeemedValue)} /><Metric label="Remaining" value={formatCurrency(voucher.remaining_balance)} />
        <div style={{ gridColumn: '1 / -1', paddingTop: 10, borderTop: '1px solid #F0E9E0', color: '#786D62', fontSize: 12 }}><strong>Eligible services:</strong> {voucher.eligibility_mode === 'unrestricted' ? 'All services' : services.map(service => `${service.service_name} (${service.category_name})`).join(', ') || 'None recorded'}</div>
        {voucher.recipient_name && <div style={{ color: '#786D62', fontSize: 12 }}><strong>Recipient:</strong> {voucher.recipient_name}</div>}
        {voucher.purchaser_name && <div style={{ color: '#786D62', fontSize: 12 }}><strong>Purchaser:</strong> {voucher.purchaser_name}</div>}
      </section>
      {!voucher.recipient_phone && !voucher.recipient_email && ['active', 'partially_redeemed'].includes(voucher.status) && (isMaster || currentUser?.role === 'admin') && <section style={{ ...cardStyle, display: 'grid', gap: 10 }}>
        <div><strong style={{ color: '#72501F' }}>This voucher is not assigned to a client</strong><div style={{ marginTop: 4, color: '#786D62', fontSize: 12 }}>It will not appear in a client profile or Visitor cart until you assign it.</div></div>
        {renderRecipientClientPicker()}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="button" style={primaryButton} disabled={busy || !selectedRecipientClient} onClick={() => assignVoucherToClient(voucher)}>Assign to selected client</button></div>
      </section>}
      {voucher.status === 'pending_payment' && (isMaster || voucher.issuing_location_id === activeLocation?.location_id) && <section style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><div><strong style={{ color: '#72501F' }}>Payment is pending</strong><div style={{ marginTop: 3, color: '#786D62', fontSize: 12 }}>Confirm received payment to activate the voucher and generate/deliver its card.</div></div><button type="button" style={primaryButton} disabled={busy} onClick={() => confirmPayment(voucher)}><CheckCircle2 size={15} /> Confirm payment & activate</button></section>}
      {voucher.status === 'pending_payment' && (isMaster || voucher.issuing_location_id === activeLocation?.location_id) && <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="button" style={{ ...outlineButton, color: '#B42318', borderColor: '#FECACA' }} disabled={busy} onClick={() => mutateVoucher(voucher, 'cancel')}>Cancel voucher</button></div>}
      {['active', 'partially_redeemed'].includes(voucher.status) && (isMaster || voucher.issuing_location_id === activeLocation?.location_id) && <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="button" style={{ ...outlineButton, color: '#B42318', borderColor: '#FECACA' }} disabled={busy} onClick={() => mutateVoucher(voucher, 'refund')}>Refund unused voucher</button></div>}
      {(voucher.redemptions?.length > 0) && <section style={cardStyle}><h3 style={{ margin: '0 0 10px', color: '#302820' }}>Redemption history</h3><div style={{ display: 'grid', gap: 8 }}>{voucher.redemptions.map(item => <div key={item.redemption_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: 9, background: '#FFFCF7', borderRadius: 8, fontSize: 12 }}><span>{item.redeeming_branch_name} · {formatDate(item.created_at)} · {item.services?.map(service => service.service_name).join(', ')}</span><strong>{formatCurrency(item.amount)} · {item.redeeming_user_name}</strong></div>)}</div></section>}
    </div>;
  };

  const renderRedeem = () => {
    const voucher = voucherDetails?.voucher;
    const serviceChoices = voucher ? (voucher.voucher_type === 'amount' || voucher.eligibility_mode === 'unrestricted' ? (catalog.categories || []).flatMap(category => category.services || []).map(service => service.service_name) : (voucher.eligible_services || []).map(service => service.service_name)) : [];
    return <div style={{ display: 'grid', gap: 12 }}>
      <section style={cardStyle}>
        <h2 style={{ margin: '0 0 10px', color: '#302820', fontSize: 19 }}>Redeem gift voucher</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><input style={{ ...fieldStyle, flex: '1 1 250px' }} placeholder="Enter voucher code" value={lookupCode} onChange={event => setLookupCode(event.target.value.toUpperCase())} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); lookupVoucher(); } }} /><button type="button" style={primaryButton} disabled={busy} onClick={() => lookupVoucher()}><Search size={15} /> Find voucher</button><button type="button" style={outlineButton} onClick={() => setScannerOpen(true)}><Camera size={15} /> Scan QR</button></div>
        {scannerOpen && <div style={{ marginTop: 14, maxWidth: 480, ...cardStyle }}><VoucherScanner onCode={value => { setLookupCode(value); lookupVoucher(value); }} onClose={() => setScannerOpen(false)} /></div>}
      </section>
      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }}><h3 style={{ margin: 0, color: '#302820', fontSize: 16 }}>Active vouchers</h3><button type="button" style={outlineButton} disabled={loading} onClick={loadRows}><RefreshCw size={14} /> Refresh</button></div>
        {vouchers.filter(item => ['active', 'partially_redeemed'].includes(item.status) && Number(item.remaining_balance) > 0).length ? <div style={{ display: 'grid', gap: 8 }}>{vouchers.filter(item => ['active', 'partially_redeemed'].includes(item.status) && Number(item.remaining_balance) > 0).map(item => <button key={item.voucher_id} type="button" onClick={() => lookupVoucher(item.voucher_code)} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px', border: '1px solid #E7D8C4', borderRadius: 10, background: '#FFFEFC', color: '#302820', textAlign: 'left', cursor: 'pointer' }}><span><strong style={{ display: 'block', fontSize: 13 }}>{item.title}</strong><span style={{ display: 'block', marginTop: 4, color: '#8C6228', fontSize: 12, fontWeight: 750 }}>{item.voucher_code}</span></span><span style={{ color: '#786D62', fontSize: 12 }}>{item.issuing_branch_name || ''}</span><span style={{ fontWeight: 750, whiteSpace: 'nowrap' }}>{formatCurrency(item.remaining_balance)}</span></button>)}</div> : <div style={{ padding: '14px 0', color: '#786D62', fontSize: 13 }}>No active vouchers available to redeem.</div>}
      </section>
      {voucher && <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}><div><h3 style={{ margin: 0, color: '#302820' }}>{voucher.title}</h3><div style={{ marginTop: 5, color: '#8C6228', fontWeight: 800 }}>{voucher.voucher_code}</div><div style={{ marginTop: 5, color: '#786D62', fontSize: 12 }}>Issued by {voucher.issuing_branch_name} · valid until {formatDate(voucher.expiry_date)}</div></div><StatusPill status={voucher.status} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginTop: 14 }}><Metric label="Original" value={formatCurrency(voucher.original_value)} /><Metric label="Remaining" value={formatCurrency(voucher.remaining_balance)} /><Metric label="Uses" value={`${voucher.service_redemptions_used || 0} / ${voucher.service_redemptions_allowed || 1}`} /></div>
        {['active', 'partially_redeemed'].includes(voucher.status) ? <form onSubmit={redeemVoucher} style={{ display: 'grid', gap: 12, marginTop: 16, paddingTop: 14, borderTop: '1px solid #F0E9E0' }}>
          <label style={labelStyle}>Service(s) being purchased<select multiple size={Math.min(7, Math.max(3, serviceChoices.length))} required value={redemptionServices} onChange={event => setRedemptionServices([...event.target.selectedOptions].map(option => option.value))} style={{ ...fieldStyle, height: 'auto' }}>{serviceChoices.map(service => <option key={service} value={service}>{service}</option>)}</select><span style={{ color: '#786D62', fontWeight: 400 }}>Hold Ctrl or Command to select multiple services.</span></label>
          {voucher.voucher_type === 'amount' && <label style={labelStyle}>Amount to redeem (₹)<input required style={fieldStyle} type="number" min="0.01" max={Number(voucher.remaining_balance)} step="0.01" value={redemptionAmount} onChange={event => setRedemptionAmount(event.target.value)} /></label>}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="submit" disabled={busy || redemptionServices.length === 0} style={primaryButton}>{busy ? 'Processing…' : 'Confirm redemption'}</button></div>
        </form> : <div style={{ marginTop: 14, padding: 10, borderRadius: 9, background: '#FAF6EE', color: '#6B5B4A', fontSize: 12 }}>This voucher cannot be redeemed in its current status.</div>}
        {!isReceptionOnly && <button type="button" style={{ ...outlineButton, marginTop: 12 }} onClick={() => openDetails(voucher)}>View full history</button>}
      </section>}
    </div>;
  };

  if (loading && !vouchers.length) return <div style={{ padding: 24, color: '#786D62' }}><LoaderCircle size={16} /> Loading vouchers…</div>;
  const summary = report.totals || {};
  return <div className="gift-voucher-management" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <div><h2 style={{ margin: 0, color: '#302820', fontSize: 24 }}>Gift vouchers</h2><p style={{ margin: '5px 0 0', color: '#786D62', fontSize: 13 }}>One voucher registry shared across participating Maison Beyou locations.</p></div>
      {isMaster && view !== 'create' && <label style={{ ...labelStyle, minWidth: 210 }}>Branch report filter<select value={filterBranch} onChange={event => setFilterBranch(event.target.value)} style={fieldStyle}><option value="all">All branches</option>{branches.map(branch => <option key={branch.location_id} value={branch.location_id}>{branch.name} · {branch.type}</option>)}</select></label>}
    </div>
    {(error || notice) && <div role={error ? 'alert' : 'status'} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 11, borderRadius: 9, background: error ? '#FEF2F2' : '#F0FDF4', color: error ? '#991B1B' : '#166534', fontSize: 13 }}><AlertCircle size={16} />{error || notice}<button type="button" onClick={() => { setError(''); setNotice(''); }} style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer' }}><X size={14} /></button></div>}
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><div role="tablist" aria-label="Gift voucher sections" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{tabs.map(([id, label, Icon]) => <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => { setView(id); setError(''); setNotice(''); }} style={{ ...outlineButton, background: view === id ? '#FAF6EE' : '#FFFFFF', borderColor: view === id ? '#B88B4A' : '#E7D8C4' }}><Icon size={15} />{label}</button>)}</div><button type="button" style={{ ...primaryButton, marginLeft: 'auto' }} onClick={() => { setView('create'); setError(''); setNotice(''); }}><Plus size={15} />Create voucher</button></div>

    {view === 'dashboard' && <div className="gift-voucher-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', minWidth: 0, gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>{[
        ['Active', summary.active || 0], ['Partially redeemed', summary.partially_redeemed || 0], ['Fully redeemed', summary.fully_redeemed || 0], ['Expired', summary.expired || 0], ['Redeemed value', formatCurrency(summary.redeemed_value || 0)]
      ].map(([label, value]) => <Metric key={label} label={label} value={value} />)}</div>
      <section style={cardStyle}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><h3 style={{ margin: 0, color: '#302820' }}>Recent vouchers</h3></div><VoucherTable vouchers={vouchers.slice(0, 8)} busy={busy} onOpen={openDetails} onConfirm={confirmPayment} onMutate={mutateVoucher} isMaster={isMaster} activeLocation={activeLocation} /></section>
    </div>}

    {view === 'vouchers' && <section style={cardStyle}><div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 12 }}><label style={{ ...labelStyle, flex: '1 1 220px' }}>Search<input style={fieldStyle} value={search} onChange={event => setSearch(event.target.value)} placeholder="Code, title, purchaser or recipient" /></label><label style={{ ...labelStyle, width: 190 }}>Status<select style={fieldStyle} value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{Object.keys(statusColors).map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label><button type="button" style={{ ...outlineButton, alignSelf: 'end' }} onClick={loadRows}><RefreshCw size={14} /> Refresh</button></div><VoucherTable vouchers={filteredVouchers} busy={busy} onOpen={openDetails} onConfirm={confirmPayment} onMutate={mutateVoucher} isMaster={isMaster} activeLocation={activeLocation} /></section>}
    {view === 'create' && renderForm()}
    {view === 'redeem' && renderRedeem()}
    {view === 'details' && <><button type="button" style={{ ...outlineButton, justifySelf: 'start' }} onClick={() => setView('vouchers')}>← Back to vouchers</button>{renderDetails()}</>}
    {view === 'settings' && isMaster && <form onSubmit={saveSettings} style={{ ...cardStyle, display: 'grid', gap: 14 }}><h3 style={{ margin: 0, color: '#302820' }}>Global voucher policy</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}><label style={labelStyle}>Default validity (days)<input style={fieldStyle} type="number" min="1" max="3650" value={globalSettingsDraft.default_validity_days} onChange={event => setGlobalSettingsDraft(value => ({ ...value, default_validity_days: event.target.value }))} /></label><label style={labelStyle}>Maximum validity (days)<input style={fieldStyle} type="number" min="1" max="3650" value={globalSettingsDraft.max_validity_days} onChange={event => setGlobalSettingsDraft(value => ({ ...value, max_validity_days: event.target.value }))} /></label><label style={labelStyle}>Minimum voucher value (₹)<input style={fieldStyle} type="number" min="1" step="0.01" value={globalSettingsDraft.minimum_value} onChange={event => setGlobalSettingsDraft(value => ({ ...value, minimum_value: event.target.value }))} /></label></div><label style={{ display: 'flex', gap: 9, alignItems: 'center', color: '#51463D', fontSize: 13 }}><input type="checkbox" checked={Boolean(Number(globalSettingsDraft.require_recipient_contact))} onChange={event => setGlobalSettingsDraft(value => ({ ...value, require_recipient_contact: event.target.checked }))} /> Require at least one recipient contact</label><label style={{ display: 'flex', gap: 9, alignItems: 'center', color: '#51463D', fontSize: 13 }}><input type="checkbox" checked={Boolean(Number(globalSettingsDraft.allow_unrestricted))} onChange={event => setGlobalSettingsDraft(value => ({ ...value, allow_unrestricted: event.target.checked }))} /> Allow unrestricted vouchers for Master Admin only</label><div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="submit" style={primaryButton} disabled={busy}>Save global policy</button></div></form>}
  </div>;
}

function Metric({ label, value }) {
  return <div style={{ padding: 14, border: '1px solid #E7D8C4', borderRadius: 12, background: '#FFFFFF' }}><div style={{ color: '#786D62', fontSize: 11, fontWeight: 700 }}>{label}</div><div style={{ marginTop: 6, color: '#302820', fontSize: 19, fontWeight: 800 }}>{value}</div></div>;
}

const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 12, color: '#51463D' };
function VoucherTable({ vouchers, busy, onOpen, onConfirm, onMutate, isMaster, activeLocation }) {
  if (!vouchers.length) return <div style={{ padding: 24, textAlign: 'center', color: '#786D62', fontSize: 13 }}>No gift vouchers match this view.</div>;
  return <div style={{ overflowX: 'auto', marginTop: 12 }}><table style={tableStyle}><thead><tr>{['Voucher', 'Purchaser / recipient', 'Issuing branch', 'Last redemption branch', 'Value', 'Redeemed', 'Remaining', 'Issued / expires', 'Status', 'Actions'].map(label => <th key={label} style={thStyle}>{label}</th>)}</tr></thead><tbody>{vouchers.map(voucher => {
    const redeemed = Number(voucher.original_value) - Number(voucher.remaining_balance);
    const canManage = isMaster || Number(voucher.issuing_location_id) === Number(activeLocation?.location_id);
    return <tr key={voucher.voucher_id}><td style={tdStyle}><button type="button" onClick={() => onOpen(voucher)} style={{ border: 0, background: 'transparent', color: '#8C6228', fontWeight: 800, cursor: 'pointer' }}>{voucher.voucher_code}</button><small style={{ display: 'block', marginTop: 3 }}>{voucher.title}</small></td><td style={tdStyle}>{voucher.purchaser_name || '—'}<small style={{ display: 'block', marginTop: 3 }}>To: {voucher.recipient_name || '—'}</small></td><td style={tdStyle}>{voucher.issuing_branch_name}</td><td style={tdStyle}>{voucher.last_redemption_branch || '—'}</td><td style={tdStyle}>{formatCurrency(voucher.original_value)}</td><td style={tdStyle}>{formatCurrency(redeemed)}</td><td style={tdStyle}>{formatCurrency(voucher.remaining_balance)}</td><td style={tdStyle}>{formatDate(voucher.issue_date)}<small style={{ display: 'block', marginTop: 3 }}>to {formatDate(voucher.expiry_date)}</small></td><td style={tdStyle}><StatusPill status={voucher.status} /></td><td style={tdStyle}><div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}><button type="button" style={smallAction} onClick={() => onOpen(voucher)}>Details</button>{voucher.status === 'pending_payment' && canManage && <button type="button" style={smallAction} disabled={busy} onClick={() => onConfirm(voucher)}>Activate</button>}{['active', 'partially_redeemed'].includes(voucher.status) && canManage && <button type="button" style={{ ...smallAction, color: '#B42318' }} disabled={busy} onClick={() => onMutate(voucher, 'refund')}>Refund</button>}</div></td></tr>;
  })}</tbody></table></div>;
}

const thStyle = { padding: '10px 9px', textAlign: 'left', color: '#786D62', borderBottom: '1px solid #EADFCC', whiteSpace: 'nowrap', fontSize: 11 };
const tdStyle = { padding: '11px 9px', borderBottom: '1px solid #F0E9E0', verticalAlign: 'top', whiteSpace: 'nowrap' };
const smallAction = { padding: '6px 8px', border: '1px solid #E7D8C4', borderRadius: 7, background: '#FFFFFF', color: '#8C6228', fontSize: 10, fontWeight: 750, cursor: 'pointer' };

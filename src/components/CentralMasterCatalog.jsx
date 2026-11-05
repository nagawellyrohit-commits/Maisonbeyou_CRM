import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Save, LoaderCircle, Store, UserRound, AlertCircle } from 'lucide-react';
import { apiRequest } from '../utils/api';
import brandLogoImg from '../assets/brand-logo-icon.png';

const emptyCatalog = { service_catalog: { categories: [] }, membership_plans: [], designations: [], roles: [] };
const inputStyle = { width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '10px 11px', border: '1px solid #E4DACE', borderRadius: 9, background: '#FFFEFC', color: '#302820', fontSize: 13 };
const panelStyle = { border: '1px solid #EEE5DA', borderRadius: 13, padding: 16, background: '#FFFFFF' };

function BrandOwnerHierarchy({ currentUser }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const locationResponse = await apiRequest('/locations?type=branch');
        const locations = locationResponse.locations || [];
        const branchRows = await Promise.all(locations.map(async location => {
          try {
            const result = await apiRequest(`/locations/${location.location_id}/admin-users`);
            return { ...location, admins: (result.admins || []).filter(admin => Number(admin.active) !== 0) };
          } catch {
            return { ...location, admins: [], admins_unavailable: true };
          }
        }));
        if (mounted) setBranches(branchRows);
      } catch (requestError) {
        if (mounted) setError(requestError.message || 'Could not load the branch reporting structure.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const panel = { border: '1px solid #E7D8C4', borderRadius: 14, background: '#FFFFFF', boxShadow: '0 4px 14px rgba(87,58,32,0.04)' };
  const chartWidth = Math.max(280, branches.length * 292 - 12);
  const branchCenters = branches.map((_, index) => index * 292 + 140);
  const connectors = branches.length
    ? `M ${chartWidth / 2} 0 V 12 H ${branchCenters[0]} ${branchCenters.slice(1).map(center => `M ${branchCenters[0]} 12 H ${center}`).join(' ')} ${branchCenters.map(center => `M ${center} 12 V 30`).join(' ')}`
    : '';
  return <section aria-label="Brand reporting hierarchy" style={{ display: 'grid', gap: 16 }}>
    <div style={{ color: '#786D62', fontSize: 13 }}>All branch admins and owners report directly to the brand owner.</div>
    {error && <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 11, border: '1px solid #FECACA', borderRadius: 9, background: '#FEF2F2', color: '#991B1B', fontSize: 13 }}><AlertCircle size={16} />{error}</div>}
    {loading ? <div style={{ padding: 20, color: '#786D62' }}>Loading branch reporting structure…</div> : <>
      <div style={{ overflowX: 'auto', paddingBottom: 6 }}>
        <div style={{ width: chartWidth, margin: '0 auto' }}>
          <div style={{ ...panel, width: 360, maxWidth: '100%', boxSizing: 'border-box', margin: '0 auto', padding: '18px 22px', textAlign: 'center', borderColor: '#C9A86C', background: '#FAF6EE' }}>
            <img src={brandLogoImg} alt="Brand logo" style={{ display: 'block', width: 48, height: 48, objectFit: 'contain', margin: '0 auto 9px' }} />
            <div style={{ color: '#8C6228', fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>Brand Owner</div>
            <div style={{ marginTop: 4, color: '#302820', fontSize: 17, fontWeight: 800 }}>{currentUser?.name || 'Maison BeYou Owner'}</div>
          </div>
          {branches.length > 0 && <svg aria-hidden="true" width={chartWidth} height="32" style={{ display: 'block', overflow: 'visible' }}>
            <path d={connectors} fill="none" stroke="#D6C19B" strokeWidth="2" />
          </svg>}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(branches.length, 1)}, 280px)`, gap: 12, alignItems: 'start' }}>
        {branches.map(branch => <article key={branch.location_id} style={{ ...panel, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingBottom: 12, borderBottom: '1px solid #F0E9E0' }}>
            <span style={{ width: 34, height: 34, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 10, background: '#F4EEE5', color: '#A97735' }}><Store size={17} /></span>
            <div style={{ minWidth: 0 }}><div style={{ color: '#302820', fontSize: 14, fontWeight: 800 }}>{branch.name || branch.city || 'Branch'}</div><div style={{ marginTop: 3, color: '#8C6228', fontSize: 10, fontWeight: 750, textTransform: 'uppercase' }}>Branch · Reports to Brand Owner</div></div>
          </div>
          <div style={{ display: 'grid', gap: 8, paddingTop: 12 }}>
            {branch.admins_unavailable ? <div style={{ color: '#9A6255', fontSize: 12 }}>Could not load branch admins.</div> : branch.admins.length ? branch.admins.map(admin => <div key={admin.user_id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 9, borderRadius: 9, background: '#FFFCF7' }}><UserRound size={15} color="#A97735" style={{ marginTop: 2, flexShrink: 0 }} /><div style={{ minWidth: 0 }}><div style={{ color: '#51463D', fontSize: 12, fontWeight: 750 }}>{admin.name} <span style={{ color: '#8A8175', fontWeight: 500 }}>· Branch Admin / Owner</span></div>{admin.email && <div style={{ marginTop: 3, color: '#786D62', fontSize: 11, overflowWrap: 'anywhere' }}>{admin.email}</div>}</div></div>) : <div style={{ color: '#8A8175', fontSize: 12 }}>No active branch admin/owner account assigned.</div>}
          </div>
        </article>)}
        {!branches.length && <div style={{ ...panel, padding: 24, color: '#8A8175', textAlign: 'center', fontSize: 13 }}>No branches found.</div>}
      </div>
        </div>
      </div>
    </>}
  </section>;
}

export default function CentralMasterCatalog({ activeTab = 'services', currentUser }) {
  const [catalog, setCatalog] = useState(emptyCatalog);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest('/admin/master-catalog');
      setCatalog({ ...emptyCatalog, ...(result.catalog || {}) });
    } catch (requestError) {
      setError(requestError.message || 'Could not load the central master catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (activeTab !== 'hierarchy') loadCatalog(); }, [activeTab, loadCatalog]);

  const saveCatalog = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await apiRequest('/admin/master-catalog', { method: 'PUT', body: JSON.stringify({ catalog }) });
      setNotice('Master catalog saved. It will be available as an optional one-time copy during branch or franchise setup.');
    } catch (requestError) {
      setError(requestError.message || 'Could not save the central master catalog.');
    } finally {
      setSaving(false);
    }
  };

  const updateCategory = (index, patch) => setCatalog(current => ({ ...current, service_catalog: { ...current.service_catalog, categories: current.service_catalog.categories.map((category, categoryIndex) => categoryIndex === index ? { ...category, ...patch } : category) } }));
  const updateService = (categoryIndex, serviceIndex, patch) => setCatalog(current => ({ ...current, service_catalog: { ...current.service_catalog, categories: current.service_catalog.categories.map((category, i) => i === categoryIndex ? { ...category, services: category.services.map((service, j) => j === serviceIndex ? { ...service, ...patch } : service) } : category) } }));
  const updateList = (field, index, patch) => setCatalog(current => ({ ...current, [field]: current[field].map((item, i) => i === index ? { ...item, ...patch } : item) }));
  const addListItem = field => setCatalog(current => ({ ...current, [field]: [...current[field], { name: '', price: 0, duration_mins: 30, benefits: '' }] }));
  const removeListItem = (field, index) => setCatalog(current => ({ ...current, [field]: current[field].filter((_, i) => i !== index) }));

  if (activeTab === 'hierarchy') return <BrandOwnerHierarchy currentUser={currentUser} />;
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 22, color: '#786D62' }}><LoaderCircle size={17} /> Loading master data…</div>;

  const renderServices = () => <div style={{ display: 'grid', gap: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><p style={{ margin: 0, color: '#786D62', fontSize: 13 }}>Build the shared category and service catalog used as the default when creating locations.</p><button type="button" onClick={() => setCatalog(current => ({ ...current, service_catalog: { ...current.service_catalog, categories: [...current.service_catalog.categories, { category_name: '', description: '', icon: 'Sparkles', display_order: current.service_catalog.categories.length + 1, active: 1, services: [] }] } }))} style={outlineButton}><Plus size={15} /> Add category</button></div>
    {catalog.service_catalog.categories.map((category, categoryIndex) => <section key={categoryIndex} style={panelStyle}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 10, alignItems: 'center' }}><input aria-label="Category name" style={inputStyle} value={category.category_name || ''} placeholder="Category name" onChange={event => updateCategory(categoryIndex, { category_name: event.target.value })} /><button type="button" onClick={() => setCatalog(current => ({ ...current, service_catalog: { ...current.service_catalog, categories: current.service_catalog.categories.filter((_, i) => i !== categoryIndex) } }))} style={iconButton} aria-label="Remove category"><Trash2 size={15} /></button></div>
      <textarea aria-label="Category description" style={{ ...inputStyle, marginTop: 8, resize: 'vertical' }} rows={2} value={category.description || ''} placeholder="Short description (optional)" onChange={event => updateCategory(categoryIndex, { description: event.target.value })} />
      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        {(category.services || []).map((service, serviceIndex) => <div key={serviceIndex} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 110px 110px 34px', gap: 8, alignItems: 'center' }}><input aria-label="Service name" style={inputStyle} value={service.service_name || ''} placeholder="Service name" onChange={event => updateService(categoryIndex, serviceIndex, { service_name: event.target.value })} /><input aria-label="Service price" type="number" min="0" style={inputStyle} value={service.price ?? ''} placeholder="Price ₹" onChange={event => updateService(categoryIndex, serviceIndex, { price: Number(event.target.value) || 0 })} /><input aria-label="Service duration in minutes" type="number" min="1" style={inputStyle} value={service.duration_mins ?? 30} title="Duration in minutes" onChange={event => updateService(categoryIndex, serviceIndex, { duration_mins: Number(event.target.value) || 30 })} /><button type="button" onClick={() => updateCategory(categoryIndex, { services: category.services.filter((_, i) => i !== serviceIndex) })} style={iconButton} aria-label="Remove service"><Trash2 size={14} /></button></div>)}
        <button type="button" onClick={() => updateCategory(categoryIndex, { services: [...(category.services || []), { service_name: '', price: 0, duration_mins: 30, active: 1 }] })} style={{ ...outlineButton, justifySelf: 'start', marginTop: 2 }}><Plus size={14} /> Add service</button>
      </div>
    </section>)}
    {catalog.service_catalog.categories.length === 0 && <div style={emptyStyle}>No categories yet. Add a category to start the shared catalog.</div>}
  </div>;

  const renderPlans = () => <div style={{ display: 'grid', gap: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><p style={{ margin: 0, color: '#786D62', fontSize: 13 }}>Shared membership plan defaults for new locations. Complimentary benefits can be configured after copying to a location.</p><button type="button" onClick={() => addListItem('membership_plans')} style={outlineButton}><Plus size={15} /> Add plan</button></div>
    {catalog.membership_plans.map((plan, index) => <div key={index} style={{ ...panelStyle, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 140px 34px', gap: 9, alignItems: 'center' }}><input aria-label="Membership plan name" style={inputStyle} value={plan.name || ''} placeholder="Plan name" onChange={event => updateList('membership_plans', index, { name: event.target.value, fullName: event.target.value, tier: event.target.value })} /><input aria-label="Membership plan price" style={inputStyle} type="number" min="0" value={plan.price ?? ''} placeholder="Price ₹" onChange={event => updateList('membership_plans', index, { price: Number(event.target.value) || 0 })} /><button type="button" onClick={() => removeListItem('membership_plans', index)} style={iconButton} aria-label="Remove plan"><Trash2 size={14} /></button><input aria-label="Plan benefits" style={{ ...inputStyle, gridColumn: '1 / -1' }} value={Array.isArray(plan.benefits) ? plan.benefits.join(', ') : (plan.benefits || '')} placeholder="Benefits (comma separated)" onChange={event => updateList('membership_plans', index, { benefits: event.target.value })} /></div>)}
    {catalog.membership_plans.length === 0 && <div style={emptyStyle}>No membership plans yet. Add a plan to start the shared catalog.</div>}
  </div>;

  const renderNames = field => <div style={{ display: 'grid', gap: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><p style={{ margin: 0, color: '#786D62', fontSize: 13 }}>Shared {field === 'roles' ? 'team role' : 'designation'} defaults offered when setting up a location.</p><button type="button" onClick={() => addListItem(field)} style={outlineButton}><Plus size={15} /> Add {field === 'roles' ? 'role' : 'designation'}</button></div>
    {catalog[field].map((item, index) => <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 36px', gap: 9, alignItems: 'center', ...panelStyle }}><input aria-label={field === 'roles' ? 'Team role name' : 'Designation name'} style={inputStyle} value={item.name || ''} placeholder={field === 'roles' ? 'Role name' : 'Designation name'} onChange={event => updateList(field, index, { name: event.target.value })} /><button type="button" onClick={() => removeListItem(field, index)} style={iconButton} aria-label={`Remove ${field === 'roles' ? 'role' : 'designation'}`}><Trash2 size={14} /></button></div>)}
    {catalog[field].length === 0 && <div style={emptyStyle}>No {field === 'roles' ? 'team roles' : 'designations'} yet. Add one to start the shared catalog.</div>}
  </div>;

  const views = { services: renderServices, membership: renderPlans, designation: () => renderNames('designations') };
  return <div style={{ display: 'grid', gap: 14 }}>
    {error && <div role="alert" style={{ padding: 11, borderRadius: 9, background: '#FFF1F0', color: '#9F2D24', fontSize: 13 }}>{error}</div>}
    {notice && <div role="status" style={{ padding: 11, borderRadius: 9, background: '#F1F8F1', color: '#27613A', fontSize: 13 }}>{notice}</div>}
    {(views[activeTab] || views.services)()}
    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid #F0E9E0' }}><button type="button" onClick={saveCatalog} disabled={saving} style={saveButton}>{saving ? <LoaderCircle size={15} /> : <Save size={15} />}{saving ? 'Saving…' : 'Save master catalog'}</button></div>
  </div>;
}

const outlineButton = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 11px', border: '1px solid #E2CFB2', borderRadius: 9, background: '#FFFEFC', color: '#8C6228', fontWeight: 700, fontSize: 12, cursor: 'pointer' };
const iconButton = { width: 34, height: 34, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #EFE5D8', borderRadius: 8, color: '#9A6255', background: '#FFFFFF', cursor: 'pointer' };
const emptyStyle = { ...panelStyle, padding: 20, color: '#8A7E72', fontSize: 13, textAlign: 'center' };
const saveButton = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 40, padding: '10px 17px', border: 0, borderRadius: 10, background: '#A9793C', color: '#FFFFFF', fontSize: 13, fontWeight: 750, cursor: 'pointer' };

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, RotateCcw, Upload, X } from 'lucide-react';
import { apiRequest } from '../utils/api';
import { DEFAULT_LOCATION_BRANDING, DEFAULT_MASTER_PORTAL_BRANDING, getLocationBranding } from '../utils/branding';

const colorFields = [
  ['background_color', 'Page background'],
  ['card_color', 'Card fill'],
  ['primary_color', 'Buttons and accents'],
  ['heading_color', 'Headings'],
  ['text_color', 'Main text'],
  ['subtext_color', 'Supporting text'],
  ['card_border_color', 'Card border']
];
const masterColorFields = [
  ['master_background_color', 'Page background'],
  ['master_card_color', 'Card fill'],
  ['master_primary_color', 'Buttons and accents'],
  ['master_heading_color', 'Headings'],
  ['master_text_color', 'Main text'],
  ['master_subtext_color', 'Supporting text'],
  ['master_border_color', 'Card border']
];
const fontFamilies = ['Inter, sans-serif', 'Arial, sans-serif', 'Georgia, serif', 'Trebuchet MS, sans-serif', 'Courier New, monospace'];

export default function BrandingCustomizer({ location, initialBranding, section = 'visits', scope = 'branch', showMasterLoginTab = false, onPreview, onSaved }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(section);
  const [draft, setDraft] = useState(() => getLocationBranding({ ...location, branding_config: initialBranding }));
  const [uploading, setUploading] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const typographyHint = key => {
    const isHeading = /_(heading|title)$/.test(key) || ['team_heading', 'clients_heading', 'reports_heading', 'user_access_managers_label', 'user_access_visitors_label'].includes(key);
    const prefix = isHeading ? 'heading' : 'supporting';
    const font = draft[`${prefix}_font_family`] || 'Inter, sans-serif';
    const baseSize = draft[`${prefix}_font_size`] || (isHeading ? 26 : 14);
    const secondaryHeading = ['master_branches_title', 'master_franchises_title', 'dashboard_summary_heading', 'membership_program_heading', 'user_access_heading'].includes(key);
    const tertiaryHeading = key.includes('card_title') || key === 'user_access_managers_label' || key === 'user_access_visitors_label';
    const size = isHeading ? Math.round(baseSize * (tertiaryHeading ? .68 : secondaryHeading ? .78 : 1)) : baseSize;
    const weight = Number(draft[`${prefix}_font_weight`] || (isHeading ? 700 : 400));
    const weightLabel = weight >= 700 ? 'Bold' : weight >= 600 ? 'Semi bold' : weight >= 500 ? 'Medium' : 'Regular';
    const style = `${draft[`${prefix}_font_style`] === 'italic' ? 'Italic' : 'Normal'} ${weightLabel}`;
    return `${isHeading ? 'Heading' : 'Supporting text'} · ${font.split(',')[0]} · ${size}px · ${style}`;
  };

  useEffect(() => {
    const next = getLocationBranding({ ...location, branding_config: initialBranding });
    setDraft(next);
    if (!open) onPreview?.(next);
  }, [location?.location_id, initialBranding]);

  useEffect(() => setView(section), [section]);

  useEffect(() => {
    const openCustomizer = () => {
      setDraft(getLocationBranding({ ...location, branding_config: initialBranding }));
      setView(section);
      setOpen(true);
    };
    const eventName = scope === 'master' ? 'open_master_portal_customizer' : 'open_branding_customizer';
    window.addEventListener(eventName, openCustomizer);
    return () => window.removeEventListener(eventName, openCustomizer);
  }, [location?.location_id, initialBranding, section, scope]);

  const update = (key, value) => {
    setDraft(current => {
      const next = { ...current, [key]: value };
      onPreview?.(next);
      return next;
    });
    setSavedMessage('');
  };

  const uploadImage = async (key, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image must be smaller than 8 MB.');
      return;
    }
    setUploading(key);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const uploadPath = scope === 'master' ? '/branding/master-portal/upload' : `/branding/${location.location_id}/upload`;
      const result = await apiRequest(uploadPath, { method: 'POST', body: form });
      update(key, result.url);
    } catch (err) {
      setError(err.message || 'Could not upload the image.');
    } finally {
      setUploading('');
    }
  };

  const save = async () => {
    if (scope !== 'master' && !location?.location_id) return;
    setSaving(true);
    setError('');
    try {
      const savePath = scope === 'master' ? '/branding/master-portal' : `/branding/${location.location_id}`;
      const result = await apiRequest(savePath, {
        method: 'PUT',
        body: JSON.stringify(draft)
      });
      const next = getLocationBranding({ ...location, branding_config: result.branding });
      setDraft(next);
      onSaved?.(next);
      onPreview?.(next);
      setSavedMessage(scope === 'master' ? 'Your master portal branding is saved.' : 'Your branch branding is saved.');
    } catch (err) {
      setError(err.message || 'Could not save your branding.');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    const next = scope === 'master'
      ? { ...DEFAULT_MASTER_PORTAL_BRANDING }
      : { ...DEFAULT_LOCATION_BRANDING, brand_name: location?.name || '' };
    setDraft(next);
    onPreview?.(next);
    setSavedMessage('');
  };

  const close = () => {
    const current = getLocationBranding({ ...location, branding_config: initialBranding });
    setDraft(current);
    onPreview?.(current);
    setError('');
    setSavedMessage('');
    setOpen(false);
  };

  const sectionLabels = {
    visits: 'Dashboard', clients: 'Clients', services: 'Services', staff: 'Team',
    membership: 'Membership', reports: 'Reports', users: 'User Access',
    branch_details: 'Branch Details', login: 'Login',
    studio_management: 'Studio Management', all_branches: 'All Branches', locations: 'All Branches', login: 'Login Screen'
  };

  const uploadControl = (key, label) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 8, color: '#57534E', fontSize: 12, fontWeight: 700 }}>
      {label}
      {draft[key] && <img src={draft[key]} alt={label} style={{ width: '100%', height: 86, objectFit: 'contain', background: '#F7F2E9', border: '1px solid #E7DED2', borderRadius: 9 }} />}
      <span style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 7, padding: '9px 11px', border: '1px solid #DED5C9', borderRadius: 8, background: '#FFFFFF', cursor: uploading === key ? 'wait' : 'pointer' }}>
        <Upload size={14} /> {uploading === key ? 'Uploading…' : draft[key] ? 'Replace image' : 'Upload image'}
      </span>
      <input type="file" accept="image/*" disabled={Boolean(uploading)} onChange={event => { uploadImage(key, event.target.files?.[0]); event.target.value = ''; }} style={{ display: 'none' }} />
      {draft[key] && <button type="button" onClick={() => update(key, '')} style={{ alignSelf: 'flex-start', border: 0, background: 'transparent', color: '#9F3A32', cursor: 'pointer', padding: 0, fontSize: 12 }}>Remove image</button>}
    </label>
  );

  return (
    <>
      {open && createPortal((
        <div style={{ position: 'fixed', inset: 0, zIndex: 4400, background: 'rgba(24,20,17,.36)', display: 'flex', justifyContent: 'flex-end' }} onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
          <aside aria-label={`Customize ${scope === 'master' ? (sectionLabels[view] || 'Master Portal') : (view === 'login' ? 'Login Page' : (sectionLabels[section] || 'Dashboard'))}`} style={{ width: 'min(420px, 100vw)', height: '100%', overflowY: 'auto', background: '#FFFEFC', boxShadow: '-16px 0 40px rgba(24,20,17,.18)', padding: '22px 22px 30px', boxSizing: 'border-box' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
              <div>
                <div style={{ color: '#9F7335', fontSize: 10, fontWeight: 800, letterSpacing: '.11em', textTransform: 'uppercase' }}>{scope === 'master' ? 'Master portal appearance' : 'Branch appearance'}</div>
                <h2 style={{ margin: '5px 0 0', color: '#29231E', fontSize: 20 }}>Customize {scope === 'master' ? (sectionLabels[view] || 'Master Portal') : (view === 'login' ? 'Login Page' : (sectionLabels[section] || 'Dashboard'))}</h2>
                <div style={{ marginTop: 4, color: '#78716C', fontSize: 12 }}>{scope === 'master' ? 'Studio Management & Branch Directory' : (location?.name || 'This branch')}</div>
              </div>
              <button type="button" aria-label="Close customization" onClick={close} style={{ width: 34, height: 34, border: '1px solid #E7DED2', borderRadius: 9, background: '#FFFFFF', color: '#57534E', cursor: 'pointer' }}><X size={17} /></button>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              {scope === 'master' && showMasterLoginTab && <div style={{ display: 'flex', gap: 8, padding: 4, background: '#F7F2E9', borderRadius: 10 }}>
                <button type="button" onClick={() => setView(section)} style={{ ...buttonStyle, flex: 1, background: view === section ? '#FFFFFF' : 'transparent', borderColor: view === section ? '#D99A64' : 'transparent' }}>{sectionLabels[section] || 'All Branches'}</button>
                <button type="button" onClick={() => setView('login')} style={{ ...buttonStyle, flex: 1, background: view === 'login' ? '#FFFFFF' : 'transparent', borderColor: view === 'login' ? '#D99A64' : 'transparent' }}>Login screen</button>
              </div>}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 700, color: '#57534E' }}>
                {scope === 'master' ? 'Portal brand name' : 'Brand name'}
                <input value={draft.brand_name || ''} maxLength={80} onChange={event => update('brand_name', event.target.value)} placeholder={location?.name || 'Your studio name'} style={inputStyle} />
              </label>

              {scope === 'branch' && ['staff', 'clients', 'reports'].includes(view) && <section style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: 13, border: '1px solid #E7DED2', borderRadius: 10, background: '#FFFFFF' }}>
                <div style={{ color: '#9F7335', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>{sectionLabels[view]} page text</div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, fontWeight: 700, color: '#57534E' }}>
                  Page heading
                  <small style={typographyHintStyle}>{typographyHint(view === 'staff' ? 'team_heading' : `${view}_heading`)}</small>
                  <input value={draft[view === 'staff' ? 'team_heading' : `${view}_heading`] ?? DEFAULT_LOCATION_BRANDING[view === 'staff' ? 'team_heading' : `${view}_heading`]} maxLength={100} onChange={event => update(view === 'staff' ? 'team_heading' : `${view}_heading`, event.target.value)} style={inputStyle} />
                </label>
              </section>}

              {scope === 'branch' && view === 'users' && <section style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: 13, border: '1px solid #E7DED2', borderRadius: 10, background: '#FFFFFF' }}>
                <div style={{ color: '#9F7335', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>User Access page text</div>
                {[
                  ['user_access_heading', 'Page heading', 100],
                  ['user_access_subtitle', 'Page description ({branch} inserts the branch name)', 150],
                  ['user_access_managers_label', 'Managers section', 40],
                  ['user_access_visitors_label', 'Visitors section', 40],
                  ['user_access_add_button', 'Add user button', 40],
                  ['user_access_manager_empty', 'Empty managers message', 80],
                  ['user_access_visitor_empty', 'Empty visitors message', 80]
                ].map(([key, label, maxLength]) => (
                  <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, fontWeight: 700, color: '#57534E' }}>
                    {label}
                    <small style={typographyHintStyle}>{typographyHint(key)}</small>
                    <input value={draft[key] ?? DEFAULT_LOCATION_BRANDING[key]} maxLength={maxLength} onChange={event => update(key, event.target.value)} style={inputStyle} />
                  </label>
                ))}
              </section>}

              <section style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 13, border: '1px solid #E7DED2', borderRadius: 10, background: '#FFFFFF' }}>
                <div style={{ color: '#9F7335', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>Typography</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#57534E' }}>Headings</div>
                <select aria-label="Heading font family" value={draft.heading_font_family} onChange={event => update('heading_font_family', event.target.value)} style={inputStyle}>{fontFamilies.map(font => <option key={font} value={font}>{font.split(',')[0]}</option>)}</select>
                <label style={rangeLabelStyle}>Font size <strong>{draft.heading_font_size}px</strong></label>
                <input type="range" min="14" max="48" step="1" value={draft.heading_font_size} onChange={event => update('heading_font_size', Number(event.target.value))} style={{ width: '100%', accentColor: scope === 'master' ? draft.master_primary_color : draft.primary_color }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <select aria-label="Heading font style" value={draft.heading_font_style} onChange={event => update('heading_font_style', event.target.value)} style={inputStyle}><option value="normal">Normal</option><option value="italic">Italic</option></select>
                  <select aria-label="Heading font weight" value={draft.heading_font_weight} onChange={event => update('heading_font_weight', Number(event.target.value))} style={inputStyle}><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semi bold</option><option value="700">Bold</option><option value="800">Extra bold</option></select>
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#57534E', marginTop: 4 }}>Supporting text</div>
                <select aria-label="Supporting text font family" value={draft.supporting_font_family} onChange={event => update('supporting_font_family', event.target.value)} style={inputStyle}>{fontFamilies.map(font => <option key={font} value={font}>{font.split(',')[0]}</option>)}</select>
                <label style={rangeLabelStyle}>Font size <strong>{draft.supporting_font_size}px</strong></label>
                <input type="range" min="10" max="32" step="1" value={draft.supporting_font_size} onChange={event => update('supporting_font_size', Number(event.target.value))} style={{ width: '100%', accentColor: scope === 'master' ? draft.master_primary_color : draft.primary_color }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <select aria-label="Supporting text font style" value={draft.supporting_font_style} onChange={event => update('supporting_font_style', event.target.value)} style={inputStyle}><option value="normal">Normal</option><option value="italic">Italic</option></select>
                  <select aria-label="Supporting text font weight" value={draft.supporting_font_weight} onChange={event => update('supporting_font_weight', Number(event.target.value))} style={inputStyle}><option value="300">Light</option><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semi bold</option><option value="700">Bold</option></select>
                </div>
              </section>

              {scope === 'master' && view !== 'login' && <>
                {uploadControl('master_logo_url', 'Master portal logo')}
                {uploadControl('master_background_image_url', 'Master portal background image')}
                <section style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 13, border: '1px solid #E7DED2', borderRadius: 10, background: '#FFFFFF' }}>
                  <div style={{ color: '#9F7335', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>{view === 'studio_management' ? 'Studio Management page text' : 'All Branches page text'}</div>
                  {(view === 'studio_management' ? [
                    ['master_studio_heading', 'Page heading', 80],
                    ['master_studio_subtitle', 'Page subtitle', 120],
                    ['master_branches_title', 'Branches card title', 50],
                    ['master_branches_subtitle', 'Branches card description', 120],
                    ['master_branches_button', 'Branches button', 40],
                    ['master_franchises_title', 'Franchises card title', 50],
                    ['master_franchises_subtitle', 'Franchises card description', 120],
                    ['master_franchises_button', 'Franchises button', 40],
                    ['master_logout_label', 'Sign out label', 40]
                  ] : [
                    ['master_locations_heading', 'Page heading (blank uses All Branches/Franchises)', 80],
                    ['master_back_label', 'Back button', 60],
                    ['master_reports_label', 'Reports button', 40],
                    ['master_logout_label', 'Sign out label', 40]
                  ]).map(([key, label, maxLength]) => (
                    <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, fontWeight: 700, color: '#57534E' }}>
                      {label}
                      <small style={typographyHintStyle}>{typographyHint(key)}</small>
                      <input value={draft[key] ?? DEFAULT_MASTER_PORTAL_BRANDING[key]} maxLength={maxLength} onChange={event => update(key, event.target.value)} style={inputStyle} />
                    </label>
                  ))}
                  {view === 'studio_management' && <label style={rangeLabelStyle}>Background image overlay <strong>{Number(draft.master_overlay_opacity) || 0}%</strong></label>}
                  {view === 'studio_management' && <input type="range" min="0" max="90" step="1" value={draft.master_overlay_opacity} onChange={event => update('master_overlay_opacity', Number(event.target.value))} style={{ width: '100%', accentColor: draft.master_primary_color }} />}
                </section>
              </>}

              {view === 'visits' && <section style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 13, border: '1px solid #E7DED2', borderRadius: 10, background: '#FFFFFF' }}>
                <div style={{ color: '#9F7335', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>Dashboard text</div>
                {[
                  ['dashboard_back_label', 'Back button'],
                  ['dashboard_summary_heading', 'Summary heading'],
                  ['dashboard_refresh_label', 'Refresh button']
                ].map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, fontWeight: 700, color: '#57534E' }}>
                    {label}
                    <small style={typographyHintStyle}>{typographyHint(key)}</small>
                    <input value={draft[key] ?? DEFAULT_LOCATION_BRANDING[key]} maxLength={key === 'dashboard_summary_heading' ? 80 : 40} onChange={event => update(key, event.target.value)} style={inputStyle} />
                  </label>
                ))}
              </section>}

              {view === 'visits' && <section style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 13, border: '1px solid #E7DED2', borderRadius: 10, background: '#FFFFFF' }}>
                <div style={{ color: '#9F7335', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>Dashboard buttons</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    ['dashboard_button_fill', 'Button fill'],
                    ['dashboard_button_text', 'Button text'],
                    ['dashboard_button_border', 'Button border']
                  ].map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: 8, border: '1px solid #E7DED2', borderRadius: 8, color: '#57534E', fontSize: 10.5, fontWeight: 700, background: '#FFFFFF' }}>
                      <input aria-label={label} type="color" value={draft[key] || DEFAULT_LOCATION_BRANDING[key]} onChange={event => update(key, event.target.value)} style={{ width: 25, height: 25, padding: 0, border: 0, background: 'none', cursor: 'pointer' }} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <label style={rangeLabelStyle}>Button border thickness <strong>{Number(draft.dashboard_button_border_width) || 0}px</strong></label>
                <input type="range" min="0" max="8" step="1" value={draft.dashboard_button_border_width} onChange={event => update('dashboard_button_border_width', Number(event.target.value))} style={{ width: '100%', accentColor: draft.primary_color }} />
                <label style={rangeLabelStyle}>Button corner roundness <strong>{Number(draft.dashboard_button_radius) || 0}px</strong></label>
                <input type="range" min="0" max="48" step="1" value={draft.dashboard_button_radius} onChange={event => update('dashboard_button_radius', Number(event.target.value))} style={{ width: '100%', accentColor: draft.primary_color }} />
              </section>}

              {view === 'services' && <section style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 13, border: '1px solid #E7DED2', borderRadius: 10, background: '#FFFFFF' }}>
                <div style={{ color: '#9F7335', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>Service & pricing section</div>
                {[
                  ['service_heading', 'Section heading', 80],
                  ['service_add_category_label', 'Add category button', 40],
                  ['service_add_first_category_label', 'Empty category button', 40],
                  ['service_expand_all_label', 'Expand all button', 40],
                  ['service_collapse_all_label', 'Collapse all button', 40]
                ].map(([key, label, maxLength]) => (
                  <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, fontWeight: 700, color: '#57534E' }}>
                    {label}
                    <small style={typographyHintStyle}>{typographyHint(key)}</small>
                    <input value={draft[key] ?? DEFAULT_LOCATION_BRANDING[key]} maxLength={maxLength} onChange={event => update(key, event.target.value)} style={inputStyle} />
                  </label>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    ['service_card_color', 'Category card'],
                    ['service_card_border_color', 'Category border']
                  ].map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: 8, border: '1px solid #E7DED2', borderRadius: 8, color: '#57534E', fontSize: 10.5, fontWeight: 700, background: '#FFFFFF' }}>
                      <input aria-label={label} type="color" value={draft[key] || DEFAULT_LOCATION_BRANDING[key]} onChange={event => update(key, event.target.value)} style={{ width: 25, height: 25, padding: 0, border: 0, background: 'none', cursor: 'pointer' }} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <label style={rangeLabelStyle}>Category border thickness <strong>{Number(draft.service_card_border_width) || 0}px</strong></label>
                <input type="range" min="0" max="8" step="1" value={draft.service_card_border_width} onChange={event => update('service_card_border_width', Number(event.target.value))} style={{ width: '100%', accentColor: draft.primary_color }} />
                <label style={rangeLabelStyle}>Category corner roundness <strong>{Number(draft.service_card_radius) || 0}px</strong></label>
                <input type="range" min="0" max="48" step="1" value={draft.service_card_radius} onChange={event => update('service_card_radius', Number(event.target.value))} style={{ width: '100%', accentColor: draft.primary_color }} />
              </section>}

              {view === 'membership' && <section style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 13, border: '1px solid #E7DED2', borderRadius: 10, background: '#FFFFFF' }}>
                <div style={{ color: '#9F7335', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>Membership section</div>
                {[
                  ['membership_heading', 'Section heading', 80],
                  ['membership_program_heading', 'Program heading', 80]
                ].map(([key, label, maxLength]) => (
                  <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, fontWeight: 700, color: '#57534E' }}>
                    {label}
                    <small style={typographyHintStyle}>{typographyHint(key)}</small>
                    <input value={draft[key] ?? DEFAULT_LOCATION_BRANDING[key]} maxLength={maxLength} placeholder={key === 'membership_program_heading' ? 'Uses the membership program title' : ''} onChange={event => update(key, event.target.value)} style={inputStyle} />
                  </label>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    ['membership_card_color', 'Membership card'],
                    ['membership_card_border_color', 'Card border']
                  ].map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: 8, border: '1px solid #E7DED2', borderRadius: 8, color: '#57534E', fontSize: 10.5, fontWeight: 700, background: '#FFFFFF' }}>
                      <input aria-label={label} type="color" value={draft[key] || DEFAULT_LOCATION_BRANDING[key]} onChange={event => update(key, event.target.value)} style={{ width: 25, height: 25, padding: 0, border: 0, background: 'none', cursor: 'pointer' }} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <label style={rangeLabelStyle}>Card border thickness <strong>{Number(draft.membership_card_border_width) || 0}px</strong></label>
                <input type="range" min="0" max="8" step="1" value={draft.membership_card_border_width} onChange={event => update('membership_card_border_width', Number(event.target.value))} style={{ width: '100%', accentColor: draft.primary_color }} />
                <label style={rangeLabelStyle}>Card corner roundness <strong>{Number(draft.membership_card_radius) || 0}px</strong></label>
                <input type="range" min="0" max="48" step="1" value={draft.membership_card_radius} onChange={event => update('membership_card_radius', Number(event.target.value))} style={{ width: '100%', accentColor: draft.primary_color }} />
              </section>}

              {view === 'login' && <section style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: 13, border: '1px solid #E7DED2', borderRadius: 10, background: '#FFFFFF' }}>
                <div style={{ color: '#9F7335', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>Login page appearance</div>
                {uploadControl('login_logo_url', 'Login page logo (optional override)')}
                {uploadControl('login_background_image_url', 'Login page background (optional override)')}
                {[
                  ['login_mobile_label', 'Mobile field label', 60],
                  ['login_mobile_placeholder', 'Mobile field placeholder', 60],
                  ['login_button_label', 'Continue button text', 60],
                  ['login_footer_text', 'Footer text', 100]
                ].map(([key, label, maxLength]) => (
                  <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, fontWeight: 700, color: '#57534E' }}>
                    {label}
                    <small style={typographyHintStyle}>{typographyHint(key)}</small>
                    <input value={draft[key] ?? DEFAULT_LOCATION_BRANDING[key]} maxLength={maxLength} onChange={event => update(key, event.target.value)} style={inputStyle} />
                  </label>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    ['login_background_color', 'Page background'],
                    ['login_primary_color', 'Button fill'],
                    ['login_button_text_color', 'Button text'],
                    ['login_heading_color', 'Heading text'],
                    ['login_text_color', 'Main text'],
                    ['login_subtext_color', 'Supporting text'],
                    ['login_input_border_color', 'Input border'],
                    ['login_card_color', 'Card fill'],
                    ['login_card_border_color', 'Card border']
                  ].map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: 8, border: '1px solid #E7DED2', borderRadius: 8, color: '#57534E', fontSize: 10.5, fontWeight: 700, background: '#FFFFFF' }}>
                      <input aria-label={label} type="color" value={draft[key] || DEFAULT_LOCATION_BRANDING[key]} onChange={event => update(key, event.target.value)} style={{ width: 25, height: 25, padding: 0, border: 0, background: 'none', cursor: 'pointer' }} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                {[
                  ['login_card_opacity', 'Card opacity', 40, 100, '%'],
                  ['login_card_width', 'Card width', 320, 760, 'px'],
                  ['login_card_padding', 'Card inner spacing', 16, 80, 'px'],
                  ['login_logo_height', 'Logo height', 24, 160, 'px'],
                  ['login_card_border_width', 'Card border thickness', 0, 8, 'px'],
                  ['login_card_radius', 'Card corner roundness', 0, 48, 'px'],
                  ['login_button_radius', 'Button corner roundness', 0, 48, 'px']
                ].map(([key, label, min, max, unit]) => (
                  <div key={key}>
                    <label style={rangeLabelStyle}>{label}<strong>{Number(draft[key]) || 0}{unit}</strong></label>
                    <input type="range" min={min} max={max} step="1" value={draft[key]} onChange={event => update(key, Number(event.target.value))} style={{ width: '100%', accentColor: draft.primary_color }} />
                  </div>
                ))}
              </section>}

              {view !== 'login' && <>
              {scope === 'branch' && view !== 'login' && <>
                {uploadControl('logo_url', 'Branch logo')}
                {uploadControl('background_image_url', 'Dashboard background image (optional)')}
              </>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {(scope === 'master' ? masterColorFields : colorFields).map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 9, border: '1px solid #E7DED2', borderRadius: 9, color: '#57534E', fontSize: 11, fontWeight: 700, background: '#FFFFFF' }}>
                    <input aria-label={label} type="color" value={draft[key] || (scope === 'master' ? DEFAULT_MASTER_PORTAL_BRANDING[key] : DEFAULT_LOCATION_BRANDING[key])} onChange={event => update(key, event.target.value)} style={{ width: 28, height: 28, padding: 0, border: 0, background: 'none', cursor: 'pointer' }} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <div style={{ padding: '12px 13px', border: '1px solid #E7DED2', borderRadius: 10, background: '#FFFFFF' }}>
                <label style={rangeLabelStyle}>Card border thickness <strong>{Number(draft[scope === 'master' ? 'master_border_width' : 'card_border_width']) || 0}px</strong></label>
                <input type="range" min="0" max="8" step="1" value={draft[scope === 'master' ? 'master_border_width' : 'card_border_width']} onChange={event => update(scope === 'master' ? 'master_border_width' : 'card_border_width', Number(event.target.value))} style={{ width: '100%', accentColor: scope === 'master' ? draft.master_primary_color : draft.primary_color }} />
                <label style={{ ...rangeLabelStyle, marginTop: 12 }}>Card corner roundness <strong>{Number(draft[scope === 'master' ? 'master_card_radius' : 'card_radius']) || 0}px</strong></label>
                <input type="range" min="0" max="48" step="1" value={draft[scope === 'master' ? 'master_card_radius' : 'card_radius']} onChange={event => update(scope === 'master' ? 'master_card_radius' : 'card_radius', Number(event.target.value))} style={{ width: '100%', accentColor: scope === 'master' ? draft.master_primary_color : draft.primary_color }} />
              </div>
              </>}

              {error && <div role="alert" style={{ padding: '10px 12px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: 12 }}>{error}</div>}
              {savedMessage && <div role="status" style={{ padding: '10px 12px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', fontSize: 12 }}>{savedMessage}</div>}

              <div style={{ display: 'flex', gap: 9, marginTop: 3 }}>
                <button type="button" onClick={reset} style={{ ...buttonStyle, flex: 1 }}><RotateCcw size={14} /> Reset</button>
                <button type="button" onClick={close} style={{ ...buttonStyle, flex: 1 }}>Cancel</button>
                <button type="button" onClick={save} disabled={saving || Boolean(uploading)} style={{ ...buttonStyle, flex: 1.25, color: '#FFFFFF', background: scope === 'master' ? draft.master_primary_color : draft.primary_color, borderColor: scope === 'master' ? draft.master_primary_color : draft.primary_color, opacity: saving ? .65 : 1 }}><Check size={14} /> {saving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </aside>
        </div>
      ), document.body)}
    </>
  );
}

const inputStyle = { border: '1px solid #DED5C9', borderRadius: 8, padding: '10px 11px', fontSize: 13, color: '#29231E', background: '#fff', outlineColor: '#B88B4A' };
const rangeLabelStyle = { display: 'flex', justifyContent: 'space-between', gap: 10, color: '#57534E', fontSize: 11.5, fontWeight: 700, marginBottom: 6 };
const typographyHintStyle = { color: '#8A7B6C', fontSize: 10, fontWeight: 500, lineHeight: 1.2 };
const buttonStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px 10px', border: '1px solid #DED5C9', borderRadius: 8, background: '#FFFFFF', color: '#57534E', fontSize: 12, fontWeight: 800, cursor: 'pointer' };

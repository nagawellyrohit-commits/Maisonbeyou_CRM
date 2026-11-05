import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Award, Plus, Save, Trash2 } from 'lucide-react';
import { apiRequest, formatCurrency } from '../utils/api';

const defaults = {
  enabled: true, earning_mode: 'flat', minimum_bill: 500, points_per_rupee: 1,
  max_points_per_bill: 2000, points_expiry_months: 12,
  minimum_redemption_points: 100, redemption_points: 100, redemption_value: 50,
  earn_on_discounted_bills: true,
  slabs: [{ minimum_spend: 500, points_per_rupee: 1 }, { minimum_spend: 1000, points_per_rupee: 1.5 }, { minimum_spend: 5000, points_per_rupee: 2 }],
};

const fieldStyle = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #E7D8C4', borderRadius: 8, fontSize: 13, background: '#FFFFFF' };
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 6, color: '#51463D', fontSize: 12, fontWeight: 700 };

export default function LoyaltyManagement({ scope = 'central', activeLocation }) {
  const branchMode = scope === 'branch';
  const [settings, setSettings] = useState(defaults);
  const [useCentral, setUseCentral] = useState(true);
  const [centralSettings, setCentralSettings] = useState(defaults);
  const branchDraftRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const settingsEndpoint = branchMode ? '/loyalty/settings' : '/admin/loyalty/settings';
    apiRequest(settingsEndpoint)
      .then(loyalty => {
        setSettings({ ...defaults, ...(loyalty.settings || {}) });
        if (branchMode) {
          const usesCentral = Boolean(loyalty.uses_central_settings);
          setUseCentral(usesCentral);
          setCentralSettings({ ...defaults, ...(loyalty.central_settings || loyalty.settings || {}) });
          branchDraftRef.current = usesCentral ? null : { ...defaults, ...(loyalty.settings || {}) };
        }
      })
      .catch(err => setError(err.message || 'Could not load loyalty settings.'))
      .finally(() => setLoading(false));
  }, [branchMode, activeLocation?.location_id]);

  const simulation = useMemo(() => {
    const spend = 1500;
    const rate = settings.earning_mode === 'slab'
      ? [...(settings.slabs || [])].sort((a, b) => Number(b.minimum_spend) - Number(a.minimum_spend)).find(slab => spend >= Number(slab.minimum_spend))?.points_per_rupee || 0
      : Number(settings.points_per_rupee) || 0;
    const points = spend < Number(settings.minimum_bill || 0) ? 0 : Math.floor(Math.min(spend * rate, Number(settings.max_points_per_bill || 0)));
    const rewardValue = Math.round((points / Math.max(1, Number(settings.redemption_points) || 100)) * Number(settings.redemption_value || 0) * 100) / 100;
    return { points, rewardValue };
  }, [settings]);

  const update = (key, value) => setSettings(current => ({ ...current, [key]: value }));
  const save = async event => {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      const settingsToSave = { ...settings };
      delete settingsToSave.eligible_service_ids;
      delete settingsToSave.eligible_service_names;
      delete settingsToSave.service_rules;
      const result = await apiRequest(branchMode ? '/loyalty/settings' : '/admin/loyalty/settings', {
        method: 'PUT', body: JSON.stringify(branchMode ? { settings: settingsToSave, use_central_settings: useCentral } : { settings: settingsToSave })
      });
      setSettings({ ...defaults, ...(result.settings || settings) });
      if (branchMode) {
        const usesCentral = Boolean(result.uses_central_settings);
        setUseCentral(usesCentral);
        if (usesCentral) branchDraftRef.current = null;
        else branchDraftRef.current = { ...defaults, ...(result.settings || settings) };
      }
      setMessage(branchMode
        ? (result.uses_central_settings ? 'This branch now uses the central loyalty settings.' : 'Branch loyalty settings saved. New eligible paid visits at this branch will use them.')
        : 'Central loyalty rules saved. New eligible paid visits will use these settings.');
    } catch (err) { setError(err.message || 'Could not save loyalty settings.'); }
    finally { setSaving(false); }
  };

  const addSlab = () => update('slabs', [...(settings.slabs || []), { minimum_spend: 0, points_per_rupee: 1 }]);
  if (loading) return <div style={{ padding: 24, color: '#786D62' }}>Loading loyalty rules…</div>;
  const readOnly = branchMode && useCentral;

  return (
    <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, color: '#302820', fontSize: 25 }}>{branchMode ? 'Branch loyalty settings' : 'Loyalty points'}</h2>
          <p style={{ margin: '6px 0 0', color: '#786D62', fontSize: 13 }}>{branchMode ? `Customize earning and redemption factors for ${activeLocation?.name || 'this branch'}.` : 'Set how clients earn and redeem points across Maison BeYou branches.'}</p>
        </div>
        <button type="submit" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: 0, borderRadius: 9, background: '#A97735', color: '#FFFFFF', fontWeight: 750, cursor: saving ? 'wait' : 'pointer' }}><Save size={15} />{saving ? 'Saving…' : branchMode ? 'Save branch settings' : 'Save loyalty rules'}</button>
      </div>
      {error && <div role="alert" style={{ padding: 12, borderRadius: 8, color: '#991B1B', background: '#FEF2F2', border: '1px solid #FECACA' }}>{error}</div>}
      {message && <div role="status" style={{ padding: 12, borderRadius: 8, color: '#166534', background: '#F0FDF4', border: '1px solid #BBF7D0' }}>{message}</div>}

      {branchMode && <section style={{ padding: 15, border: '1px solid #E7D8C4', borderRadius: 12, background: '#FAF6EE' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#51463D', fontWeight: 750, fontSize: 13 }}><input type="checkbox" checked={useCentral} onChange={event => {
          const checked = event.target.checked;
          if (checked) {
            branchDraftRef.current = { ...settings };
            setSettings({ ...centralSettings });
          } else if (branchDraftRef.current) {
            setSettings({ ...branchDraftRef.current });
          }
          setUseCentral(checked);
        }} /> Use central Master Admin loyalty settings</label>
        <div style={{ margin: '6px 0 0 25px', color: '#786D62', fontSize: 12 }}>Turn this off to customize all loyalty factors for this branch. Other branches will keep their own settings or the central defaults.</div>
      </section>}

      <section style={{ padding: 20, border: '1px solid #E7D8C4', borderRadius: 14, background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#302820', fontWeight: 750 }}><input type="checkbox" checked={Boolean(settings.enabled)} disabled={readOnly} onChange={event => update('enabled', event.target.checked)} /> Loyalty program is active</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
          <label style={labelStyle}>Earning method<select style={fieldStyle} value={settings.earning_mode} disabled={readOnly} onChange={event => update('earning_mode', event.target.value)}><option value="flat">Flat rule</option><option value="slab">Slab rule</option></select></label>
          <label style={labelStyle}>Minimum eligible bill (₹)<input style={fieldStyle} type="number" min="0" value={settings.minimum_bill} disabled={readOnly} onChange={event => update('minimum_bill', event.target.value)} /></label>
          <label style={labelStyle}>Points per ₹1<input style={fieldStyle} type="number" min="0" step="0.1" value={settings.points_per_rupee} onChange={event => update('points_per_rupee', event.target.value)} disabled={readOnly || settings.earning_mode === 'slab'} /></label>
          <label style={labelStyle}>Maximum points per bill<input style={fieldStyle} type="number" min="0" step="1" value={settings.max_points_per_bill} disabled={readOnly} onChange={event => update('max_points_per_bill', event.target.value)} /></label>
          <label style={labelStyle}>Points expire after (months; 0 = never)<input style={fieldStyle} type="number" min="0" step="1" value={settings.points_expiry_months} disabled={readOnly} onChange={event => update('points_expiry_months', event.target.value)} /></label>
          <label style={labelStyle}>Minimum redemption (points)<input style={fieldStyle} type="number" min="0" step="1" value={settings.minimum_redemption_points} disabled={readOnly} onChange={event => update('minimum_redemption_points', event.target.value)} /></label>
          <label style={labelStyle}>Redemption points<input style={fieldStyle} type="number" min="1" step="any" value={settings.redemption_points} disabled={readOnly} onChange={event => update('redemption_points', event.target.value)} /></label>
          <label style={labelStyle}>Redemption value (₹)<input style={fieldStyle} type="number" min="0" step="any" value={settings.redemption_value} disabled={readOnly} onChange={event => update('redemption_value', event.target.value)} /></label>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#51463D', fontSize: 13 }}><input type="checkbox" checked={Boolean(settings.earn_on_discounted_bills)} disabled={readOnly} onChange={event => update('earn_on_discounted_bills', event.target.checked)} /> Earn points on discounted bills (points use the discounted service amount)</label>
      </section>

      {settings.earning_mode === 'slab' && <section style={{ padding: 20, border: '1px solid #E7D8C4', borderRadius: 14, background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><strong style={{ color: '#51463D' }}>Spending slabs</strong><button type="button" onClick={addSlab} disabled={readOnly} style={{ border: '1px solid #D8BC8F', background: '#FAF6EE', color: '#8C6228', padding: '7px 10px', borderRadius: 8, cursor: readOnly ? 'not-allowed' : 'pointer' }}><Plus size={14} /> Add slab</button></div>
        {(settings.slabs || []).map((slab, index) => <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', alignItems: 'end', gap: 10 }}>
          <label style={labelStyle}>Spend from (₹)<input style={fieldStyle} type="number" min="0" value={slab.minimum_spend} disabled={readOnly} onChange={event => update('slabs', settings.slabs.map((item, i) => i === index ? { ...item, minimum_spend: event.target.value } : item))} /></label>
          <label style={labelStyle}>Points per ₹1<input style={fieldStyle} type="number" min="0" step="0.1" value={slab.points_per_rupee} disabled={readOnly} onChange={event => update('slabs', settings.slabs.map((item, i) => i === index ? { ...item, points_per_rupee: event.target.value } : item))} /></label>
          <button type="button" aria-label="Remove slab" disabled={readOnly} onClick={() => update('slabs', settings.slabs.filter((_, i) => i !== index))} style={{ padding: 10, border: '1px solid #FECACA', borderRadius: 8, background: '#FEF2F2', color: '#B42318', cursor: readOnly ? 'not-allowed' : 'pointer' }}><Trash2 size={15} /></button>
        </div>)}
      </section>}

      <section style={{ padding: 18, borderRadius: 12, background: '#FAF6EE', border: '1px solid #E7D8C4', display: 'flex', gap: 12, alignItems: 'center' }}><Award size={20} color="#A97735" /><div style={{ fontSize: 13, color: '#51463D' }}>Example: a ₹1,500 bill earns <strong>{simulation.points.toLocaleString('en-IN')} points</strong>. Redeeming them credits <strong>{formatCurrency(simulation.rewardValue)}</strong> directly to the client’s wallet.</div></section>
    </form>
  );
}

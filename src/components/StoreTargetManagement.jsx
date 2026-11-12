import React, { useEffect, useState } from 'react';
import { Target, RefreshCw, Save } from 'lucide-react';
import { apiRequest, formatCurrency } from '../utils/api';

const todayInBranch = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const periodKeyFor = (type, today = todayInBranch()) => type === 'daily' ? today : type === 'monthly' ? today.slice(0, 7) : today.slice(0, 4);

const card = { padding: 22, border: '1px solid #E7D8C4', borderRadius: 16, background: '#FFFFFF', boxShadow: '0 5px 20px rgba(87,58,32,.045)' };
const field = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid #E7D8C4', borderRadius: 9, background: '#FFFFFF', color: '#302820', fontSize: 13 };
const button = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 40, padding: '9px 14px', border: 0, borderRadius: 9, background: '#A97735', color: '#FFFFFF', fontSize: 12, fontWeight: 750, cursor: 'pointer' };

export default function StoreTargetManagement({ activeLocation }) {
  const locationId = activeLocation?.location_id;
  const [periodType, setPeriodType] = useState('monthly');
  const [periodKey, setPeriodKey] = useState(() => periodKeyFor('monthly'));
  const [targetInput, setTargetInput] = useState('');
  const [actualAmount, setActualAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadTarget = async () => {
    if (!locationId || !periodKey) return;
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest(`/store-targets?period_type=${encodeURIComponent(periodType)}&period_key=${encodeURIComponent(periodKey)}&location_id=${encodeURIComponent(locationId)}`);
      setTargetInput(result.target_amount ? String(result.target_amount) : '');
      setActualAmount(Number(result.actual_amount) || 0);
    } catch (loadError) {
      setError(loadError.message || 'Could not load this store target.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTarget(); }, [locationId, periodType, periodKey]);

  const changePeriodType = value => {
    setPeriodType(value);
    setPeriodKey(periodKeyFor(value));
    setNotice('');
  };

  const saveTarget = async event => {
    event.preventDefault();
    if (!locationId) return;
    const targetAmount = Number(targetInput);
    if (!Number.isFinite(targetAmount) || targetAmount < 0) {
      setError('Enter a valid target amount.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await apiRequest('/store-targets', { method: 'PUT', body: JSON.stringify({ location_id: Number(locationId), period_type: periodType, period_key: periodKey, target_amount: targetAmount }) });
      setNotice('Store target saved.');
      await loadTarget();
    } catch (saveError) {
      setError(saveError.message || 'Could not save this store target.');
    } finally {
      setSaving(false);
    }
  };

  const targetAmount = Number(targetInput) || 0;
  const progress = targetAmount > 0 ? Math.min(100, Math.round((actualAmount / targetAmount) * 100)) : 0;
  const remaining = Math.max(0, targetAmount - actualAmount);
  const dateInputType = periodType === 'daily' ? 'date' : periodType === 'monthly' ? 'month' : 'number';
  const dateInputProps = periodType === 'yearly' ? { min: '2000', max: '2100', step: '1', placeholder: 'YYYY' } : {};

  if (!locationId) return <section style={card}><h2 style={{ margin: '0 0 8px', color: '#302820' }}>Store target</h2><p style={{ margin: 0, color: '#786D62', fontSize: 13 }}>Select a branch or franchise to view its store target.</p></section>;

  return <div style={{ display: 'grid', gap: 16 }}>
    <section style={card}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 12, background: '#FAF3E8', color: '#A97735' }}><Target size={21} /></div>
          <div><h2 style={{ margin: 0, color: '#302820', fontSize: 21 }}>Store target</h2><div style={{ marginTop: 4, color: '#786D62', fontSize: 13 }}>{activeLocation?.name} · {activeLocation?.type === 'franchise' ? 'Franchise' : 'Branch'}</div></div>
        </div>
        <button type="button" style={{ ...button, border: '1px solid #E7D8C4', background: '#FFFFFF', color: '#8C6228' }} disabled={loading} onClick={loadTarget}><RefreshCw size={14} />Refresh</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14, alignItems: 'end' }}>
        <label style={{ display: 'grid', gap: 6, color: '#51463D', fontSize: 12, fontWeight: 700 }}>Target period<select style={field} value={periodType} onChange={event => changePeriodType(event.target.value)}><option value="daily">Daily</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>
        <label style={{ display: 'grid', gap: 6, color: '#51463D', fontSize: 12, fontWeight: 700 }}>{periodType === 'daily' ? 'Day' : periodType === 'monthly' ? 'Month' : 'Year'}<input style={field} type={dateInputType} value={periodKey} onChange={event => setPeriodKey(event.target.value)} {...dateInputProps} /></label>
        <form onSubmit={saveTarget} style={{ display: 'flex', alignItems: 'end', gap: 9 }}>
          <label style={{ display: 'grid', gap: 6, flex: 1, color: '#51463D', fontSize: 12, fontWeight: 700 }}>Sales target (₹)<input style={field} type="number" min="0" step="0.01" value={targetInput} onChange={event => setTargetInput(event.target.value)} placeholder="Enter target" /></label>
          <button type="submit" disabled={saving || loading || !periodKey} style={{ ...button, opacity: saving || loading ? .65 : 1 }}><Save size={15} />{saving ? 'Saving…' : 'Save'}</button>
        </form>
      </div>
    </section>

    {(error || notice) && <div role={error ? 'alert' : 'status'} style={{ padding: '11px 14px', borderRadius: 9, color: error ? '#991B1B' : '#166534', background: error ? '#FEF2F2' : '#F0FDF4', fontSize: 13 }}>{error || notice}</div>}

    <section style={{ ...card, display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        {[['Sales collected', formatCurrency(actualAmount)], ['Target', formatCurrency(targetAmount)], ['Remaining', formatCurrency(remaining)]].map(([label, value]) => <div key={label} style={{ padding: 16, border: '1px solid #F0E6D9', borderRadius: 12, background: '#FFFEFC' }}><div style={{ color: '#786D62', fontSize: 11, fontWeight: 750, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div><div style={{ marginTop: 8, color: '#302820', fontSize: 23, fontWeight: 800 }}>{loading ? '—' : value}</div></div>)}
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8, color: '#786D62', fontSize: 12 }}><span>{periodType === 'daily' ? 'Daily' : periodType === 'monthly' ? 'Monthly' : 'Yearly'} progress</span><strong style={{ color: '#8C6228' }}>{targetAmount > 0 ? `${progress}%` : 'Set a target to track progress'}</strong></div>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} style={{ height: 12, overflow: 'hidden', borderRadius: 999, background: '#F2EAE0' }}><div style={{ width: `${progress}%`, height: '100%', borderRadius: 999, background: progress >= 100 ? '#4F8A5B' : '#B88B4A', transition: 'width .25s ease' }} /></div>
        <div style={{ marginTop: 8, color: '#81766B', fontSize: 11 }}>Progress uses sales collected during the selected period.</div>
      </div>
    </section>
  </div>;
}

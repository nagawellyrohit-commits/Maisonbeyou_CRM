import React, { useEffect, useState } from 'react';
import { Save, Sparkles } from 'lucide-react';
import { apiRequest, formatCurrency } from '../utils/api';

const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #E7D8C4', borderRadius: 8, fontSize: 13 };

export default function BranchLoyaltyConversion({ activeLocation }) {
  const [settings, setSettings] = useState(null);
  const [useCentral, setUseCentral] = useState(true);
  const [points, setPoints] = useState('100');
  const [value, setValue] = useState('50');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiRequest('/loyalty/branch-conversion')
      .then(result => {
        if (cancelled) return;
        setSettings(result);
        setUseCentral(result.uses_central_conversion);
        setPoints(String(result.redemption_points));
        setValue(String(result.redemption_value));
      })
      .catch(err => { if (!cancelled) setError(err.message || 'Could not load this branch’s conversion.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeLocation?.location_id]);

  const save = async event => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const result = await apiRequest('/loyalty/branch-conversion', {
        method: 'PUT',
        body: JSON.stringify({ use_central_conversion: useCentral, redemption_points: Number(points), redemption_value: Number(value) })
      });
      setUseCentral(result.uses_central_conversion);
      setPoints(String(result.redemption_points)); setValue(String(result.redemption_value));
      setMessage(useCentral ? 'This branch now uses the central conversion rate.' : 'Branch conversion saved.');
    } catch (err) { setError(err.message || 'Could not save this branch’s conversion.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 20, color: '#786D62' }}>Loading branch loyalty conversion…</div>;

  return (
    <form onSubmit={save} style={{ padding: 22, border: '1px solid #E7D8C4', borderRadius: 14, background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, color: '#302820', fontSize: 23 }}>Branch loyalty conversion</h2>
          <p style={{ margin: '6px 0 0', color: '#786D62', fontSize: 13 }}>Choose how many rupees this branch assigns to loyalty points.</p>
        </div>
        <button type="submit" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 15px', border: 0, borderRadius: 8, background: '#A97735', color: '#FFF', fontWeight: 750, cursor: saving ? 'wait' : 'pointer' }}><Save size={15} />{saving ? 'Saving…' : 'Save conversion'}</button>
      </div>
      {error && <div role="alert" style={{ padding: 11, borderRadius: 8, background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', fontSize: 13 }}>{error}</div>}
      {message && <div role="status" style={{ padding: 11, borderRadius: 8, background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', fontSize: 13 }}>{message}</div>}
      <label style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#51463D', fontSize: 13, fontWeight: 700 }}><input type="checkbox" checked={useCentral} onChange={event => setUseCentral(event.target.checked)} /> Use central Master Admin conversion ({settings?.central_redemption_points} points = {formatCurrency(settings?.central_redemption_value)})</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, opacity: useCentral ? .55 : 1 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#51463D', fontSize: 12, fontWeight: 700 }}>Points<input style={inputStyle} type="number" min="0.01" step="any" value={points} onChange={event => setPoints(event.target.value)} disabled={useCentral} /></label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#51463D', fontSize: 12, fontWeight: 700 }}>Rupee value<input style={inputStyle} type="number" min="0.01" step="any" value={value} onChange={event => setValue(event.target.value)} disabled={useCentral} /></label>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 14, borderRadius: 10, background: '#FAF6EE', border: '1px solid #E7D8C4', color: '#51463D', fontSize: 13 }}><Sparkles size={18} color="#A97735" />{useCentral ? `This branch follows the central rate: ${settings?.central_redemption_points} points = ${formatCurrency(settings?.central_redemption_value)}.` : `This branch rate is ${points || 0} points = ${formatCurrency(value || 0)}. For ₹2 per point, enter 1 point = ₹2.`}</div>
      <div style={{ color: '#786D62', fontSize: 12 }}>This sets the branch’s conversion rate. Points can be viewed in client profiles; checkout redemption is not connected yet.</div>
    </form>
  );
}

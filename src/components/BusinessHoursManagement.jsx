import React, { useEffect, useState } from 'react';
import { Clock3, Save } from 'lucide-react';
import { apiRequest } from '../utils/api';

const DAYS = [
  ['monday', 'Monday'], ['tuesday', 'Tuesday'], ['wednesday', 'Wednesday'],
  ['thursday', 'Thursday'], ['friday', 'Friday'], ['saturday', 'Saturday'], ['sunday', 'Sunday']
];
const defaultDay = () => ({ open: true, start: '10:00', end: '20:00' });
const defaultHours = () => Object.fromEntries(DAYS.map(([key]) => [key, defaultDay()]));

export default function BusinessHoursManagement({ activeLocation }) {
  const [hours, setHours] = useState(defaultHours);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let current = true;
    setLoading(true);
    apiRequest('/branch/operating-hours')
      .then(result => { if (current) setHours({ ...defaultHours(), ...(result.hours || {}) }); })
      .catch(error => { if (current) setMessage(error.message || 'Could not load opening hours.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [activeLocation?.location_id]);

  const updateDay = (key, patch) => setHours(current => ({ ...current, [key]: { ...current[key], ...patch } }));
  const saveHours = async () => {
    setSaving(true);
    setMessage('');
    try {
      await apiRequest('/branch/operating-hours', { method: 'PUT', body: JSON.stringify({ hours }) });
      setMessage('Opening hours saved for this branch.');
    } catch (error) {
      setMessage(error.message || 'Could not save opening hours.');
    } finally {
      setSaving(false);
    }
  };

  return <section style={{ padding: 22, border: '1px solid #E7DFD5', borderRadius: 18, background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 16 }}>
    <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid #EEE7DD', paddingBottom: 14 }}>
      <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
        <span style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 10, background: '#FAF6EE', color: '#B88B4A' }}><Clock3 size={19} /></span>
        <div><h2 style={{ margin: 0, color: '#292524', fontSize: 19 }}>Branch Opening Hours</h2><p style={{ margin: '5px 0 0', color: '#78716C', fontSize: 13 }}>Set the hours used to generate appointment slots for {activeLocation?.name || 'this branch'}.</p></div>
      </div>
      <button type="button" onClick={saveHours} disabled={loading || saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 15px', border: 0, borderRadius: 8, background: '#B88B4A', color: '#FFFFFF', fontWeight: 800, cursor: saving ? 'wait' : 'pointer', opacity: loading || saving ? .65 : 1 }}><Save size={15} />{saving ? 'Saving…' : 'Save hours'}</button>
    </header>
    {message && <div role="status" style={{ padding: '10px 12px', borderRadius: 8, color: message.includes('saved') ? '#166534' : '#A33B32', background: message.includes('saved') ? '#F0FDF4' : '#FEF2F2', fontSize: 13 }}>{message}</div>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 12 }}>
      {DAYS.map(([key, label]) => {
        const day = hours[key] || defaultDay();
        return <div key={key} style={{ minWidth: 0, boxSizing: 'border-box', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gridTemplateRows: 'auto auto', alignItems: 'center', columnGap: 8, rowGap: 11, padding: '13px 14px', border: '1px solid #EEE7DD', borderRadius: 10, background: day.open ? '#FFFEFC' : '#FAF8F5' }}>
          <strong style={{ minWidth: 0, color: '#44403C', fontSize: 13 }}>{label}</strong>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#78716C', cursor: 'pointer' }}><input aria-label={`${label} open`} type="checkbox" checked={Boolean(day.open)} onChange={event => updateDay(key, { open: event.target.checked })} />Open</label>
          <div style={{ gridColumn: '1 / -1', minWidth: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', alignItems: 'center', gap: 7 }}>
            <input aria-label={`${label} opens at`} type="time" value={day.start || '10:00'} disabled={!day.open} onChange={event => updateDay(key, { start: event.target.value })} style={{ boxSizing: 'border-box', minWidth: 0, width: '100%', padding: '7px 5px', border: '1px solid #D6D3D1', borderRadius: 7, background: day.open ? '#FFFFFF' : '#F5F5F4', fontSize: 12 }} />
            <span style={{ color: '#A8A29E', fontSize: 11 }}>to</span>
            <input aria-label={`${label} closes at`} type="time" value={day.end || '20:00'} disabled={!day.open} onChange={event => updateDay(key, { end: event.target.value })} style={{ boxSizing: 'border-box', minWidth: 0, width: '100%', padding: '7px 5px', border: '1px solid #D6D3D1', borderRadius: 7, background: day.open ? '#FFFFFF' : '#F5F5F4', fontSize: 12 }} />
          </div>
        </div>;
      })}
    </div>
    <p style={{ margin: 0, color: '#78716C', fontSize: 12 }}>Appointments are offered every 30 minutes, starting at opening time and ending before closing time. Changes apply only to this branch.</p>
  </section>;
}

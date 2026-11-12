import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RefreshCw, Save, Wallet } from 'lucide-react';
import { apiRequest, formatCurrency } from '../utils/api';

const todayInIndia = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const card = { padding: 22, border: '1px solid #E7D8C4', borderRadius: 16, background: '#FFFFFF', boxShadow: '0 5px 20px rgba(87,58,32,.045)' };
const field = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid #E7D8C4', borderRadius: 9, background: '#FFFFFF', color: '#302820', fontSize: 13 };
const primary = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 40, padding: '9px 15px', border: 0, borderRadius: 9, background: '#A97735', color: '#FFFFFF', fontSize: 12, fontWeight: 750, cursor: 'pointer' };
const money = value => formatCurrency(Number(value) || 0);

export default function DayCashClosing({ activeLocation }) {
  const locationId = activeLocation?.location_id;
  const [businessDate, setBusinessDate] = useState(todayInIndia);
  const [status, setStatus] = useState(null);
  const [openingInput, setOpeningInput] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [handoverInput, setHandoverInput] = useState('');
  const [boxInput, setBoxInput] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    if (!locationId) return;
    setLoading(true); setError('');
    try {
      const result = await apiRequest(`/day-cash?location_id=${encodeURIComponent(locationId)}&date=${encodeURIComponent(businessDate)}`);
      setStatus(result);
      setOpeningInput(result.opening_counted_cash == null ? '' : String(result.opening_counted_cash));
      setOpeningNotes(result.opening_notes || '');
      setHandoverInput(result.handover_amount == null ? '' : String(result.handover_amount));
      setBoxInput(result.closing_cash == null ? '' : String(result.closing_cash));
      setClosingNotes(result.closing_notes || '');
    } catch (loadError) { setError(loadError.message || 'Could not load daily cash.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [locationId, businessDate]);

  const expectedClose = (Number(status?.opening_counted_cash) || 0) + (Number(status?.cash_received) || 0);
  const closeVariance = expectedClose - (Number(handoverInput) || 0) - (Number(boxInput) || 0);
  const today = todayInIndia();
  const dateLabel = useMemo(() => businessDate ? new Date(`${businessDate}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '', [businessDate]);

  const submit = async (path, payload, successMessage) => {
    setSaving(true); setError(''); setNotice('');
    try {
      await apiRequest(path, { method: 'POST', body: JSON.stringify({ location_id: Number(locationId), business_date: businessDate, ...payload }) });
      setNotice(successMessage); await load();
    } catch (saveError) { setError(saveError.message || 'Could not save daily cash.'); }
    finally { setSaving(false); }
  };

  if (!locationId) return <section style={card}><h2 style={{ marginTop: 0 }}>Day closing</h2><p>Select a branch or franchise to manage its cash handover.</p></section>;
  const previousCash = Number(status?.previous_closing_cash) || 0;
  const openingVariance = (Number(openingInput) || 0) - (Number(status?.opening_expected_cash) || 0);

  return <div style={{ display: 'grid', gap: 16 }}>
    <section style={card}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 12, background: '#FAF3E8', color: '#A97735' }}><Wallet size={21} /></div>
          <div><h2 style={{ margin: 0, color: '#302820', fontSize: 21 }}>Day closing</h2><div style={{ marginTop: 4, color: '#786D62', fontSize: 13 }}>{activeLocation.name} · {activeLocation.type === 'franchise' ? 'Franchise' : 'Branch'}</div></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'end', gap: 9, flexWrap: 'wrap' }}>
          <label style={{ display: 'grid', gap: 5, color: '#786D62', fontSize: 11, fontWeight: 700 }}>Business date<input style={{ ...field, width: 180 }} type="date" max={today} value={businessDate} onChange={event => setBusinessDate(event.target.value)} /></label>
          <button type="button" onClick={load} disabled={loading} style={{ ...primary, border: '1px solid #E7D8C4', background: '#FFFFFF', color: '#8C6228' }}><RefreshCw size={14} />Refresh</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <Metric label="Previous closing cash" value={money(previousCash)} note={status?.previous_close_date ? `From ${status.previous_close_date}` : 'No earlier closing recorded'} />
        <Metric label="Cash collected today" value={money(status?.cash_received)} note="Cash payments recorded against visits" />
        <Metric label="Day status" value={status?.status === 'closed' ? 'Closed' : status?.status === 'open' ? 'Open' : 'Opening required'} note={dateLabel} />
      </div>
    </section>

    {error && <div role="alert" style={{ ...card, borderColor: '#E7B8B2', color: '#A12D24', padding: 14 }}>{error}</div>}
    {notice && <div role="status" style={{ ...card, borderColor: '#CFE5D5', background: '#F4FAF5', color: '#28613B', padding: 14 }}>{notice}</div>}

    {status?.status === 'needs_opening' && <section style={card}>
      <h3 style={{ margin: '0 0 6px', color: '#302820' }}>Confirm cash in the box</h3>
      <p style={{ margin: '0 0 16px', color: '#786D62', fontSize: 13 }}>Count the cash left from the previous day before starting today. The expected amount is {money(status?.opening_expected_cash)}{status?.previous_close_date ? `, carried over from ${status.previous_close_date}` : ', since no prior close is recorded'}.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, alignItems: 'end' }}>
        <label style={labelStyle}>Cash counted in box (₹)<input style={field} type="number" min="0" step="0.01" value={openingInput} onChange={event => setOpeningInput(event.target.value)} placeholder="Enter counted amount" /></label>
        <label style={labelStyle}>Note {Math.abs(openingVariance) >= 0.01 ? '(required for a difference)' : '(optional)'}<input style={field} value={openingNotes} onChange={event => setOpeningNotes(event.target.value)} placeholder="Explain missing or extra cash" /></label>
        <button type="button" disabled={saving || loading || openingInput === ''} onClick={() => submit('/day-cash/open', { opening_counted_cash: Number(openingInput), opening_notes: openingNotes }, 'Opening cash confirmed.')} style={primary}><CheckCircle2 size={15} />{saving ? 'Saving…' : 'Confirm opening cash'}</button>
      </div>
      <button type="button" onClick={() => setOpeningInput(String(status?.opening_expected_cash || 0))} style={{ marginTop: 11, border: 0, background: 'transparent', color: '#8C6228', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Count matches expected amount</button>
    </section>}

    {status?.status === 'open' && <>
      <section style={card}>
        <h3 style={{ margin: '0 0 14px', color: '#302820' }}>Cash available to close</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
          <Metric label="Opening cash counted" value={money(status.opening_counted_cash)} />
          <Metric label="Cash collected today" value={money(status.cash_received)} />
          <Metric label="Expected total" value={money(expectedClose)} note="Opening cash + cash received" />
        </div>
        <p style={{ color: '#786D62', fontSize: 12, margin: '14px 0 0' }}>Refresh before closing to include the latest cash payments recorded for this branch.</p>
      </section>
      <section style={card}>
        <h3 style={{ margin: '0 0 6px', color: '#302820' }}>Hand over and leave cash in the box</h3>
        <p style={{ margin: '0 0 16px', color: '#786D62', fontSize: 13 }}>Enter the cash handed to the owner or next person, and the cash remaining in the box for tomorrow.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, alignItems: 'end' }}>
          <label style={labelStyle}>Cash handed over (₹)<input style={field} type="number" min="0" step="0.01" value={handoverInput} onChange={event => setHandoverInput(event.target.value)} placeholder="Amount handed over" /></label>
          <label style={labelStyle}>Cash left in box (₹)<input style={field} type="number" min="0" step="0.01" value={boxInput} onChange={event => setBoxInput(event.target.value)} placeholder="Carryover for tomorrow" /></label>
          <div style={{ color: Math.abs(closeVariance) < 0.01 ? '#28613B' : '#A12D24', fontSize: 13, fontWeight: 750 }}>Difference: {money(closeVariance)}</div>
          <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>Closing note {Math.abs(closeVariance) >= 0.01 ? '(required for a difference)' : '(optional)'}<input style={field} value={closingNotes} onChange={event => setClosingNotes(event.target.value)} placeholder="Explain any cash difference" /></label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 15 }}><button type="button" disabled={saving || handoverInput === '' || boxInput === ''} onClick={() => submit('/day-cash/close', { handover_amount: Number(handoverInput), closing_cash: Number(boxInput), closing_notes: closingNotes }, 'Day closing saved.')} style={primary}><Save size={15} />{saving ? 'Saving…' : 'Close day'}</button></div>
      </section>
    </>}

    {status?.status === 'closed' && <section style={{ ...card, borderColor: '#CFE5D5', background: '#FBFEFC' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px', color: '#28613B' }}><CheckCircle2 size={18} />Day closed</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(175px,1fr))', gap: 12 }}>
        <Metric label="Opening cash counted" value={money(status.opening_counted_cash)} />
        <Metric label="Cash collected" value={money(status.cash_received)} />
        <Metric label="Cash handed over" value={money(status.handover_amount)} />
        <Metric label="Left in the box for next day" value={money(status.closing_cash)} />
        <Metric label="Difference at close" value={money(status.closing_variance)} />
      </div>
      {status.closing_notes && <p style={{ color: '#786D62', fontSize: 13, margin: '14px 0 0' }}>Closing note: {status.closing_notes}</p>}
    </section>}
  </div>;
}

const labelStyle = { display: 'grid', gap: 6, color: '#51463D', fontSize: 12, fontWeight: 700 };
function Metric({ label, value, note }) {
  return <div style={{ padding: '14px 15px', border: '1px solid #EFE3D4', borderRadius: 12, background: '#FFFEFC' }}><div style={{ color: '#786D62', fontSize: 11, fontWeight: 750, textTransform: 'uppercase', letterSpacing: '.035em' }}>{label}</div><div style={{ marginTop: 7, color: '#4C4036', fontSize: 22, fontWeight: 800 }}>{value}</div>{note && <div style={{ marginTop: 4, color: '#8D8175', fontSize: 11 }}>{note}</div>}</div>;
}

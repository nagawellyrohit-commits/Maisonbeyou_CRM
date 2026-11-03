import React, { useEffect, useState } from 'react';
import { CalendarDays, Clock3, Pencil, UserRound, Phone, CheckCircle2, Plus, RefreshCw, ArrowLeft, X, Ban } from 'lucide-react';
import { apiRequest } from '../utils/api';
import { showConfirm } from '../utils/messageBox';

const branchDateTime = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
};

const appointmentStartMinutes = value => {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hour += 12;
  return hour * 60 + Number(match[2]);
};

const formatDate = value => {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const durationLabel = minutes => {
  const value = Number(minutes) || 30;
  return value < 60 ? `${value} min` : `${Math.floor(value / 60)} hr${value % 60 ? ` ${value % 60} min` : ''}`;
};

const buttonStyle = (primary = false) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  padding: '9px 13px', borderRadius: 9, border: `1px solid ${primary ? '#A9793C' : '#E4D6C3'}`,
  color: primary ? '#FFFFFF' : '#6B4C2A', background: primary ? '#A9793C' : '#FFFFFF',
  fontSize: 13, fontWeight: 700, cursor: 'pointer'
});

export default function AppointmentsView({ onBookAppointment, onBack, onOpenPayment, activeLocation }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editDuration, setEditDuration] = useState(30);
  const [editSlots, setEditSlots] = useState([]);
  const [editSlot, setEditSlot] = useState('');
  const [editServices, setEditServices] = useState([]);
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [servicePickerStep, setServicePickerStep] = useState('categories');
  const [serviceCategoryId, setServiceCategoryId] = useState(null);
  const [pendingServiceIds, setPendingServiceIds] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState(null);
  const [, setClockTick] = useState(0);

  const loadAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest('/appointments');
      setAppointments(result.appointments || []);
    } catch (loadError) {
      setError(loadError.message || 'Could not load appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAppointments(); }, [activeLocation?.location_id]);

  useEffect(() => {
    const timer = setInterval(() => setClockTick(tick => tick + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!editing || !editDate) return;
    let cancelled = false;
    setSlotsLoading(true);
    apiRequest(`/appointments/slots?date=${encodeURIComponent(editDate)}&duration=${editDuration}&exclude_visit_id=${editing.visit_id}`)
      .then(result => {
        if (cancelled) return;
        const ownServiceIds = new Set(editServices.map(service => Number(service.service_id)).filter(Boolean));
        const normalizeName = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
        const ownServiceNames = new Set(editServices.map(service => normalizeName(service.service_name)).filter(Boolean));
        const available = (result.slots || []).filter(item => !(item.booked || []).some(booking => {
          const bookingIds = new Set((booking.service_ids || []).map(Number).filter(Boolean));
          const bookingNames = new Set((booking.service_names || []).map(normalizeName).filter(Boolean));
          return [...ownServiceIds].some(id => bookingIds.has(id)) || [...ownServiceNames].some(name => bookingNames.has(name));
        })).map(item => item.slot);
        setEditSlots(available);
        setEditSlot(current => available.includes(current) ? current : '');
      })
      .catch(loadError => { if (!cancelled) { setEditSlots([]); setError(loadError.message || 'Could not load available times.'); } })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [editing?.visit_id, editDate, editDuration, editServices]);

  useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    apiRequest('/categories').then(result => {
      if (!cancelled) setCatalogCategories(result.categories || []);
    }).catch(loadError => { if (!cancelled) setError(loadError.message || 'Could not load services.'); });
    return () => { cancelled = true; };
  }, [editing?.visit_id]);

  const openEdit = appointment => {
    setError('');
    setEditing(appointment);
    setEditDate(String(appointment.visit_date).slice(0, 10));
    setEditDuration(Number(appointment.appointment_duration_mins) || 30);
    setEditSlot('');
    setEditServices(appointment.service_items || []);
    setServicePickerOpen(false);
    setServicePickerStep('categories');
    setServiceCategoryId(null);
    setPendingServiceIds([]);
  };

  const openServicePicker = () => {
    setPendingServiceIds([]);
    setServicePickerStep('categories');
    setServiceCategoryId(null);
    setServicePickerOpen(true);
  };

  const addPickedServices = () => {
    const picked = catalogCategories.flatMap(category => category.services || [])
      .filter(service => pendingServiceIds.includes(Number(service.service_id)));
    setEditServices(current => {
      const currentIds = new Set(current.map(service => Number(service.service_id)));
      return [...current, ...picked.filter(service => !currentIds.has(Number(service.service_id))).map(service => ({
        service_id: service.service_id,
        service_name: service.service_name,
        price: service.price,
        retail_price: service.price
      }))];
    });
    setServicePickerOpen(false);
  };

  const saveEdit = async event => {
    event.preventDefault();
    if (!editing || !editSlot) return;
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/appointments/${editing.visit_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ date: editDate, slot: editSlot, duration: editDuration, services: editServices })
      });
      setEditing(null);
      await loadAppointments();
    } catch (saveError) {
      setError(saveError.message || 'Could not update appointment.');
    } finally {
      setSaving(false);
    }
  };

  const convertToVisit = async appointment => {
    const clientName = `${appointment.client_name || ''} ${appointment.client_surname || ''}`.trim();
    if (!await showConfirm(`Mark ${clientName || 'this client'} as arrived and convert this appointment into a visit now?`, { title: 'Convert appointment to visit', confirmLabel: 'Convert to visit' })) return;
    setWorkingId(appointment.visit_id);
    setError('');
    try {
      await apiRequest(`/appointments/${appointment.visit_id}/convert-to-visit`, { method: 'POST' });
      await loadAppointments();
    } catch (convertError) {
      setError(convertError.message || 'Could not convert appointment.');
    } finally {
      setWorkingId(null);
    }
  };

  const cancelAppointment = async appointment => {
    const clientName = `${appointment.client_name || ''} ${appointment.client_surname || ''}`.trim();
    const credit = Number(appointment.membership_amount_used) || 0;
    const paid = Number(appointment.amount_paid) || 0;
    const details = [
      `Cancel ${clientName || 'this client'}’s appointment on ${formatDate(appointment.visit_date)} at ${appointment.service_time || 'the scheduled time'}?`,
      'The appointment slot will be released.',
      credit > 0 ? `₹${credit.toLocaleString('en-IN')} in reserved membership credits will be restored.` : '',
      paid > 0 ? 'Any cash, card, or other manual payment already collected will remain recorded; this action does not issue a refund.' : ''
    ].filter(Boolean).join('\n\n');
    if (!await showConfirm(details, { title: 'Cancel appointment', confirmLabel: 'Cancel appointment' })) return;
    setWorkingId(appointment.visit_id);
    setError('');
    try {
      await apiRequest(`/appointments/${appointment.visit_id}/cancel`, { method: 'POST' });
      await loadAppointments();
    } catch (cancelError) {
      setError(cancelError.message || 'Could not cancel appointment.');
    } finally {
      setWorkingId(null);
    }
  };

  const now = branchDateTime();
  const today = now.date;
  const isMissedAppointment = appointment => {
    const date = String(appointment.visit_date).slice(0, 10);
    if (date < now.date) return true;
    if (date > now.date) return false;
    const start = appointmentStartMinutes(appointment.service_time);
    return start !== null && now.minutes >= start + 30;
  };
  const upcoming = appointments.filter(item => !isMissedAppointment(item));
  const overdue = appointments.filter(isMissedAppointment);

  const renderAppointment = appointment => {
    const date = String(appointment.visit_date).slice(0, 10);
    const missed = isMissedAppointment(appointment);
    return <article key={appointment.visit_id} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.2fr) minmax(170px, 1.1fr) minmax(130px, 0.9fr) minmax(105px, 0.6fr) auto', alignItems: 'center', gap: 16, padding: '16px 18px', borderBottom: `1px solid ${missed ? '#E5E7EB' : '#F0E7DC'}`, background: missed ? '#F3F4F6' : '#FFFFFF', color: missed ? '#6B7280' : undefined }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#332A23', fontWeight: 700 }}><UserRound size={16} color="#A9793C" />{`${appointment.client_name || ''} ${appointment.client_surname || ''}`.trim() || 'Client'}</div>
        {appointment.client_phone && <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6, color: '#81766B', fontSize: 12 }}><Phone size={13} />{appointment.client_phone}</div>}
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#4B4037', fontSize: 13, fontWeight: 650 }}><CalendarDays size={15} color="#A9793C" />{formatDate(date)}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6, color: '#81766B', fontSize: 12 }}><Clock3 size={14} />{appointment.service_time || 'Time not set'} · {durationLabel(appointment.appointment_duration_mins)}</div>
        {missed && <div style={{ display: 'inline-flex', marginTop: 6, padding: '2px 7px', borderRadius: 999, color: '#6B7280', background: '#E5E7EB', fontSize: 10, fontWeight: 750 }}>MISSED · 30 MIN PAST START</div>}
      </div>
      <div style={{ color: '#6F6257', fontSize: 12, lineHeight: 1.5 }}>{appointment.services || 'Appointment'}</div>
      <div style={{ display: 'grid', justifyItems: 'start', gap: 4 }}>
        {appointment.payment_status === 'Paid' ? <span style={{ color: '#4B4037', fontSize: 14, fontWeight: 750 }}>₹{Number(appointment.total_amount || 0).toLocaleString('en-IN')}</span> : <button type="button" onClick={() => onOpenPayment?.({ ...appointment, client_name: `${appointment.client_name || ''} ${appointment.client_surname || ''}`.trim() })} style={{ padding: 0, border: 0, background: 'transparent', color: '#4B4037', fontSize: 14, fontWeight: 750, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>₹{Number(appointment.total_amount || 0).toLocaleString('en-IN')}</button>}
        {Number(appointment.balance) > 0 && <span style={{ color: '#81766B', fontSize: 11 }}>Balance: ₹{Number(appointment.balance).toLocaleString('en-IN')}</span>}
        <span style={{ color: appointment.payment_status === 'Paid' ? '#15803D' : appointment.payment_status === 'Partially Paid' ? '#A16207' : '#DC2626', fontSize: 12, fontWeight: 700 }}>{appointment.payment_status || 'Pending'}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" onClick={() => openEdit(appointment)} style={buttonStyle()}><Pencil size={14} />Edit / Reschedule</button>
        <button type="button" title="Cancel this booking and release the slot." disabled={workingId === appointment.visit_id} onClick={() => cancelAppointment(appointment)} style={{ ...buttonStyle(), borderColor: '#FECACA', color: '#B91C1C', opacity: workingId === appointment.visit_id ? 0.65 : 1 }}><Ban size={14} />Cancel</button>
        <button type="button" title="Mark the client as arrived now, whether early or late." disabled={workingId === appointment.visit_id} onClick={() => convertToVisit(appointment)} style={{ ...buttonStyle(true), opacity: workingId === appointment.visit_id ? 0.65 : 1 }}><CheckCircle2 size={14} />{workingId === appointment.visit_id ? 'Working…' : 'Convert to visit'}</button>
      </div>
    </article>;
  };

  return <div style={{ width: '100%', maxWidth: 1240, margin: '0 auto', padding: '24px 12px 48px', boxSizing: 'border-box' }}>
    <button type="button" onClick={onBack} style={{ ...buttonStyle(), marginBottom: 20, borderRadius: 999, padding: '8px 15px' }}><ArrowLeft size={15} />Back</button>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
      <div><h1 style={{ margin: 0, color: '#302721', fontSize: 26 }}>Appointments</h1><p style={{ margin: '7px 0 0', color: '#82766A', fontSize: 14 }}>{activeLocation?.name || 'Branch'} · Manage bookings, reschedule, or mark clients as arrived.</p></div>
      <div style={{ display: 'flex', gap: 9 }}>
        <button type="button" aria-label="Refresh appointments" onClick={loadAppointments} style={buttonStyle()}><RefreshCw size={15} />Refresh</button>
        <button type="button" onClick={onBookAppointment} style={buttonStyle(true)}><Plus size={16} />Book appointment</button>
      </div>
    </div>

    {error && <div role="alert" style={{ marginBottom: 16, padding: '11px 14px', borderRadius: 9, color: '#9B1C1C', background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 13 }}>{error}</div>}
    {loading ? <div style={{ padding: 32, textAlign: 'center', color: '#81766B' }}>Loading appointments…</div> : appointments.length === 0 ? <div style={{ padding: 42, textAlign: 'center', border: '1px solid #E9DCCB', borderRadius: 14, background: '#FFFEFC', color: '#81766B' }}>No appointments have been booked for this branch yet.</div> : <>
      {overdue.length > 0 && <section style={{ marginBottom: 24, border: '1px solid #E9DCCB', borderRadius: 14, background: '#FFFFFF', overflow: 'hidden' }}>
        <header style={{ padding: '14px 18px', background: '#F3F4F6', color: '#6B7280', fontSize: 14, fontWeight: 750 }}>Missed appointments · {overdue.length}</header>
        {overdue.map(renderAppointment)}
      </section>}
      <section style={{ border: '1px solid #E9DCCB', borderRadius: 14, background: '#FFFFFF', overflow: 'hidden' }}>
        <header style={{ padding: '14px 18px', background: '#FAF6F0', color: '#4B4037', fontSize: 14, fontWeight: 750 }}>Upcoming appointments · {upcoming.length}</header>
        {upcoming.length ? upcoming.map(renderAppointment) : <div style={{ padding: 25, color: '#81766B', textAlign: 'center' }}>No upcoming appointments.</div>}
      </section>
    </>}

    {editing && <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setEditing(null); }} style={{ position: 'fixed', inset: 0, zIndex: 1600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, background: 'rgba(35, 28, 22, 0.5)' }}>
      <form onSubmit={saveEdit} style={{ width: 'min(620px, 100%)', maxHeight: '90vh', overflowY: 'auto', padding: 24, borderRadius: 16, background: '#FFFFFF', boxShadow: '0 22px 65px rgba(0,0,0,.25)' }}>
        <h2 style={{ margin: '0 0 7px', color: '#302721', fontSize: 20 }}>Edit appointment</h2>
        <p style={{ margin: '0 0 20px', color: '#81766B', fontSize: 13 }}>Change services, move the appointment to another date or time, or adjust its duration. To create a separate booking, use Book appointment and select this client.</p>
        <div style={{ marginBottom: 18 }}>
          <div style={{ marginBottom: 8, color: '#5D5147', fontSize: 12, fontWeight: 700 }}>Services</div>
          <div style={{ display: 'grid', gap: 7 }}>
            {editServices.map((service, index) => <div key={service.visit_service_id || `new-${service.service_id}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '9px 11px', border: '1px solid #E9DCCB', borderRadius: 8, color: '#4B4037', fontSize: 13 }}>
              <span>{service.service_name}{service.price != null ? ` · ₹${Number(service.price).toLocaleString('en-IN')}` : ''}</span>
              <button type="button" aria-label={`Remove ${service.service_name}`} onClick={() => setEditServices(current => current.filter((_, itemIndex) => itemIndex !== index))} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 7px', color: '#9B1C1C', background: '#FFF', border: '1px solid #F1D6D2', borderRadius: 7, cursor: 'pointer' }}><X size={14} />Remove</button>
            </div>)}
            {!editServices.length && <div style={{ color: '#81766B', fontSize: 12 }}>No services selected. Add a service to this appointment.</div>}
          </div>
          <button type="button" onClick={openServicePicker} style={{ ...buttonStyle(), marginTop: 9 }}><Plus size={14} />Add services</button>
          <div style={{ marginTop: 8, color: '#81766B', fontSize: 12 }}>
            Services subtotal: ₹{editServices.reduce((sum, service) => sum + (Number(service.price) || 0), 0).toLocaleString('en-IN')}. Discounts and tax are recalculated when you save.
          </div>
        </div>
        <label style={{ display: 'grid', gap: 7, marginBottom: 14, color: '#5D5147', fontSize: 12, fontWeight: 700 }}>Appointment date
          <input required type="date" min={today} value={editDate} onChange={event => setEditDate(event.target.value)} style={{ padding: '10px 11px', border: '1px solid #D9CFC2', borderRadius: 8, color: '#332A23', background: '#FFFFFF' }} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <label style={{ display: 'grid', gap: 7, color: '#5D5147', fontSize: 12, fontWeight: 700 }}>Duration
            <select value={editDuration} onChange={event => setEditDuration(Number(event.target.value))} style={{ padding: '10px 11px', border: '1px solid #D9CFC2', borderRadius: 8, color: '#332A23', background: '#FFFFFF' }}>
              {Array.from({ length: 16 }, (_, index) => (index + 1) * 30).map(minutes => <option key={minutes} value={minutes}>{durationLabel(minutes)}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 7, color: '#5D5147', fontSize: 12, fontWeight: 700 }}>Available start time
            <select required value={editSlot} onChange={event => setEditSlot(event.target.value)} disabled={slotsLoading || !editSlots.length} style={{ padding: '10px 11px', border: '1px solid #D9CFC2', borderRadius: 8, color: '#332A23', background: '#FFFFFF' }}>
              <option value="">{slotsLoading ? 'Checking…' : editSlots.length ? 'Select time' : 'No open times'}</option>
              {editSlots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
            </select>
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 20 }}>
          <button type="button" disabled={saving} onClick={() => setEditing(null)} style={buttonStyle()}>Cancel</button>
          <button type="submit" disabled={saving || slotsLoading || !editSlot} style={{ ...buttonStyle(true), opacity: saving || slotsLoading || !editSlot ? .6 : 1 }}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </div>}

    {editing && servicePickerOpen && <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setServicePickerOpen(false); }} style={{ position: 'fixed', inset: 0, zIndex: 1700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, background: 'rgba(35, 28, 22, 0.58)' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="appointment-service-picker-title" style={{ width: 'min(700px, 100%)', maxHeight: '86vh', overflowY: 'auto', padding: 24, borderRadius: 16, background: '#FFFFFF', boxShadow: '0 22px 65px rgba(0,0,0,.28)' }}>
        <h2 id="appointment-service-picker-title" style={{ margin: '0 0 6px', color: '#302721', fontSize: 20 }}>{servicePickerStep === 'categories' ? 'Choose a category' : servicePickerStep === 'services' ? 'Choose sub-services' : 'Review services to add'}</h2>
        <p style={{ margin: '0 0 18px', color: '#81766B', fontSize: 13 }}>{servicePickerStep === 'categories' ? 'Select a category to browse its services.' : servicePickerStep === 'services' ? 'Select one or more services, then continue.' : 'These services will be added to the appointment when you continue.'}</p>
        {servicePickerStep === 'categories' ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
          {catalogCategories.map(category => <button key={category.category_id} type="button" onClick={() => { setServiceCategoryId(category.category_id); setServicePickerStep('services'); }} style={{ padding: '15px 14px', textAlign: 'left', border: '1px solid #E9DCCB', borderRadius: 10, color: '#4B4037', background: '#FFFEFC', fontWeight: 700, cursor: 'pointer' }}>{category.category_name}<div style={{ marginTop: 5, color: '#918477', fontSize: 12, fontWeight: 400 }}>{(category.services || []).filter(service => service.active !== 0).length} services</div></button>)}
          {!catalogCategories.length && <div style={{ color: '#81766B', fontSize: 13 }}>Loading categories…</div>}
        </div> : servicePickerStep === 'services' ? <>
          <button type="button" onClick={() => setServicePickerStep('categories')} style={{ ...buttonStyle(), marginBottom: 12, padding: '7px 10px' }}><ArrowLeft size={14} />Categories</button>
          <div style={{ display: 'grid', gap: 8 }}>
            {(catalogCategories.find(category => Number(category.category_id) === Number(serviceCategoryId))?.services || []).filter(service => service.active !== 0).map(service => {
              const id = Number(service.service_id);
              const alreadyAdded = editServices.some(item => Number(item.service_id) === id);
              const checked = pendingServiceIds.includes(id);
              return <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', border: `1px solid ${checked ? '#C99A5A' : '#E9DCCB'}`, borderRadius: 9, color: '#4B4037', background: checked ? '#FBF6EF' : '#FFFFFF', opacity: alreadyAdded ? .55 : 1 }}>
                <input type="checkbox" disabled={alreadyAdded} checked={checked} onChange={() => setPendingServiceIds(current => checked ? current.filter(item => item !== id) : [...current, id])} />
                <span style={{ flex: 1 }}>{service.service_name}</span><span style={{ color: '#81766B', fontSize: 13 }}>₹{Number(service.price || 0).toLocaleString('en-IN')}</span>
                {alreadyAdded && <span style={{ color: '#918477', fontSize: 11 }}>Already added</span>}
              </label>;
            })}
          </div>
        </> : <div style={{ display: 'grid', gap: 8 }}>
          {catalogCategories.flatMap(category => category.services || []).filter(service => pendingServiceIds.includes(Number(service.service_id))).map(service => <div key={service.service_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid #E9DCCB', borderRadius: 9, color: '#4B4037', fontSize: 13 }}><span>{service.service_name}</span><span>₹{Number(service.price || 0).toLocaleString('en-IN')}</span></div>)}
        </div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 20 }}>
          <button type="button" onClick={() => servicePickerStep === 'categories' ? setServicePickerOpen(false) : servicePickerStep === 'services' ? setServicePickerStep('categories') : setServicePickerStep('services')} style={buttonStyle()}>{servicePickerStep === 'categories' ? 'Cancel' : 'Back'}</button>
          {servicePickerStep === 'services' && <button type="button" disabled={!pendingServiceIds.length} onClick={() => setServicePickerStep('review')} style={{ ...buttonStyle(true), opacity: pendingServiceIds.length ? 1 : .55 }}>Next</button>}
          {servicePickerStep === 'review' && <button type="button" disabled={!pendingServiceIds.length} onClick={addPickedServices} style={buttonStyle(true)}><Plus size={14} />Add selected & return to appointment</button>}
        </div>
      </div>
    </div>}
  </div>;
}

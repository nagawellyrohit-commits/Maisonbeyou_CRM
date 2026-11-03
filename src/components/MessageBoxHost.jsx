import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { MESSAGE_BOX_EVENT } from '../utils/messageBox';

export default function MessageBoxHost() {
  const [active, setActive] = useState(null);
  const queue = useRef([]);

  useEffect(() => {
    const onMessage = event => {
      queue.current.push(event.detail);
      setActive(current => current || queue.current.shift());
    };
    window.addEventListener(MESSAGE_BOX_EVENT, onMessage);
    return () => window.removeEventListener(MESSAGE_BOX_EVENT, onMessage);
  }, []);

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = message => {
      window.dispatchEvent(new CustomEvent(MESSAGE_BOX_EVENT, {
        detail: { type: 'alert', title: 'Message', message: String(message ?? '') }
      }));
    };
    return () => { window.alert = originalAlert; };
  }, []);

  const close = result => {
    if (active?.type === 'confirm') active.resolve?.(Boolean(result));
    setActive(queue.current.shift() || null);
  };

  useEffect(() => {
    if (!active) return undefined;
    const onKeyDown = event => {
      if (event.key === 'Escape') close(false);
      if (event.key === 'Enter' && active.type === 'alert') close(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active]);

  if (!active) return null;
  const confirming = active.type === 'confirm';
  const Icon = confirming ? AlertCircle : Info;

  return <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !confirming) close(true); }} style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(30, 25, 21, .52)', backdropFilter: 'blur(2px)' }}>
    <section role={confirming ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby="global-message-title" aria-describedby="global-message-content" style={{ width: 'min(460px, 100%)', padding: 24, border: '1px solid #E9DCCB', borderRadius: 16, background: '#FFFEFC', boxShadow: '0 24px 70px rgba(28, 22, 17, .28)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
        <div style={{ width: 40, height: 40, flex: '0 0 40px', display: 'grid', placeItems: 'center', borderRadius: 12, color: confirming ? '#A9793C' : '#8A6638', background: '#F8F0E5' }}><Icon size={20} /></div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <h2 id="global-message-title" style={{ margin: '2px 0 0', color: '#302721', fontSize: 18, lineHeight: 1.35 }}>{active.title || (confirming ? 'Please confirm' : 'Message')}</h2>
            {!confirming && <button type="button" aria-label="Close message" onClick={() => close(true)} style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, border: 0, borderRadius: 8, color: '#81766B', background: 'transparent', cursor: 'pointer' }}><X size={18} /></button>}
          </div>
          <div id="global-message-content" style={{ marginTop: 10, color: '#62564B', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{active.message}</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 24 }}>
        {confirming && <button type="button" autoFocus onClick={() => close(false)} style={{ padding: '9px 15px', border: '1px solid #E4D6C3', borderRadius: 9, color: '#6B4C2A', background: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>{active.cancelLabel || 'Cancel'}</button>}
        <button type="button" autoFocus={!confirming} onClick={() => close(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', border: '1px solid #A9793C', borderRadius: 9, color: '#FFFFFF', background: '#A9793C', fontWeight: 700, cursor: 'pointer' }}><CheckCircle2 size={15} />{confirming ? active.confirmLabel || 'Confirm' : 'Okay'}</button>
      </div>
    </section>
  </div>;
}

const MESSAGE_BOX_EVENT = 'maison-beyou:message-box';

export function showConfirm(message, { title = 'Please confirm', confirmLabel = 'Confirm', cancelLabel = 'Cancel' } = {}) {
  return new Promise(resolve => {
    window.dispatchEvent(new CustomEvent(MESSAGE_BOX_EVENT, {
      detail: { type: 'confirm', title, message: String(message ?? ''), confirmLabel, cancelLabel, resolve }
    }));
  });
}

export function showMessage(message, { title = 'Message' } = {}) {
  window.dispatchEvent(new CustomEvent(MESSAGE_BOX_EVENT, {
    detail: { type: 'alert', title, message: String(message ?? '') }
  }));
}

export { MESSAGE_BOX_EVENT };

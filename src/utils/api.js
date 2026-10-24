// API and formatting utilities for Maison BeYou CRM

const API_BASE = '/api';

export function getStoredToken() {
  return localStorage.getItem('maison_token');
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem('maison_token', token);
  } else {
    localStorage.removeItem('maison_token');
  }
}

export function getStoredUser() {
  const u = localStorage.getItem('maison_user');
  try {
    return u ? JSON.parse(u) : null;
  } catch (e) {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) {
    localStorage.setItem('maison_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('maison_user');
  }
}

export function getStoredLocation() {
  const l = localStorage.getItem('maison_active_location');
  try {
    return l ? JSON.parse(l) : null;
  } catch (e) {
    return null;
  }
}

export function setStoredLocation(location) {
  if (location) {
    localStorage.setItem('maison_active_location', JSON.stringify(location));
  } else {
    localStorage.removeItem('maison_active_location');
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getStoredToken();
  const activeLoc = getStoredLocation();
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeLoc?.location_id ? { 'x-location-id': String(activeLoc.location_id) } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      // Clear token if expired or unauthorized
      setStoredToken(null);
      setStoredUser(null);
      setStoredLocation(null);
      window.dispatchEvent(new Event('auth_change'));
    }
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

// Currency formatter for Indian Rupee (e.g. ₹42,500)
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN', {
    maximumFractionDigits: 0
  });
}

// Date formatter (e.g. 28 Sept 2026)
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}

// Phone formatter: formats 10 digits as +91 XXXXX XXXXX
export function formatPhone(phone) {
  if (!phone) return '—';
  const clean = String(phone).replace(/\D/g, '');
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return phone;
}

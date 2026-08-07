const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const ORIGIN = BASE.replace(/\/api\/?$/, '');

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: isFormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

// Donor photo_url values come back as "/uploads/xyz.jpg" (relative to the
// API server, not the Vite dev server), so build the full URL here.
export function photoUrl(path) {
  return path ? `${ORIGIN}${path}` : null;
}

export const api = {
  bloodGroups: () => request('/lookups/blood-groups'),
  locations: () => request('/lookups/locations'),

  donors: () => request('/donors'),
  // formData is a FormData instance (see DonorsTab) so an optional photo
  // file can be sent alongside the regular fields.
  createDonor: (formData) => request('/donors', { method: 'POST', body: formData }),
  setDonorAvailability: (id, is_available) =>
    request(`/donors/${id}`, { method: 'PATCH', body: JSON.stringify({ is_available }) }),

  hospitals: () => request('/hospitals'),
  createHospital: (body) => request('/hospitals', { method: 'POST', body: JSON.stringify(body) }),

  bloodRequests: () => request('/blood-requests'),
  createBloodRequest: (body) => request('/blood-requests', { method: 'POST', body: JSON.stringify(body) }),
  eligibleDonors: (requestId) => request(`/blood-requests/${requestId}/eligible-donors`),

  matchesForRequest: (requestId) => request(`/matches?request_id=${requestId}`),
  createMatch: (body) => request('/matches', { method: 'POST', body: JSON.stringify(body) }),

  recordDonation: (body) => request('/donations', { method: 'POST', body: JSON.stringify(body) }),

  reports: {
    pendingEmergency: () => request('/reports/pending-emergency'),
    donationHistory: () => request('/reports/donation-history'),
    hospitalSummary: () => request('/reports/hospital-summary'),
    requestFulfillment: () => request('/reports/request-fulfillment'),
  },

  notifications: () => request('/notifications'),
  auditLogs: () => request('/audit-logs'),
};

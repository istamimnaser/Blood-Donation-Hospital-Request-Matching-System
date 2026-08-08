const BASE =
  import.meta.env.VITE_API_URL || '/api';

function getApiOrigin() {
  if (BASE.startsWith('http://') || BASE.startsWith('https://')) {
    return BASE.replace(/\/api\/?$/, '');
  }

  return '';
}

const API_ORIGIN = getApiOrigin();

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,

      headers: isFormData
        ? options.headers
        : {
            'Content-Type': 'application/json',
            ...options.headers,
          },
    });

    const contentType =
      res.headers.get('content-type') || '';

    const data = contentType.includes('application/json')
      ? await res.json()
      : await res.text();

    if (!res.ok) {
      const message =
        typeof data === 'object'
          ? data?.error || data?.details
          : data;

      throw new Error(
        message || `Request failed (${res.status})`
      );
    }

    return data;
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        'Cannot connect to the backend server. Make sure the backend is running on port 4000.'
      );
    }

    throw err;
  }
}

// Donor images are served by the Express backend.
// In development, Vite uploads to port 4000. Because the backend port is 4000
export function photoUrl(path) {
  if (!path) return null;

  return `${API_ORIGIN}${path}`;
}

export const api = {
  health: () => request('/health'),

  bloodGroups: () =>
    request('/lookups/blood-groups'),

  locations: () =>
    request('/lookups/locations'),

  donors: () =>
    request('/donors'),

  createDonor: (formData) =>
    request('/donors', {
      method: 'POST',
      body: formData,
    }),

  setDonorAvailability: (id, is_available) =>
    request(`/donors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_available }),
    }),

  hospitals: () =>
    request('/hospitals'),

  createHospital: (body) =>
    request('/hospitals', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  bloodRequests: () =>
    request('/blood-requests'),

  createBloodRequest: (body) =>
    request('/blood-requests', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  eligibleDonors: (requestId) =>
    request(
      `/blood-requests/${requestId}/eligible-donors`
    ),

  matchesForRequest: (requestId) =>
    request(
      `/matches?request_id=${requestId}`
    ),

  createMatch: (body) =>
    request('/matches', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  recordDonation: (body) =>
    request('/donations', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  reports: {
    pendingEmergency: () =>
      request('/reports/pending-emergency'),

    donationHistory: () =>
      request('/reports/donation-history'),

    hospitalSummary: () =>
      request('/reports/hospital-summary'),

    requestFulfillment: () =>
      request('/reports/request-fulfillment'),
  },

  notifications: () =>
    request('/notifications'),

  auditLogs: () =>
    request('/audit-logs'),
};

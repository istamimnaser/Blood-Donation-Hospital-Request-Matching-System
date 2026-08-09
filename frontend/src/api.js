const BASE =
  import.meta.env.VITE_API_URL || '/api';

const TOKEN_KEY = 'auth_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getToken();

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,

      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export const authApi = {
  login: (body) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  signupDonor: (body) =>
    request('/auth/signup/donor', { method: 'POST', body: JSON.stringify(body) }),

  signupHospital: (body) =>
    request('/auth/signup/hospital', { method: 'POST', body: JSON.stringify(body) }),
};

export const donorApi = {
  me: () => request('/donors/me'),

  updateMe: (body) =>
    request('/donors/me', { method: 'PATCH', body: JSON.stringify(body) }),
};

export const hospitalApi = {
  me: () => request('/hospitals/me'),

  myRequests: () => request('/blood-requests/mine'),

  createRequest: (body) =>
    request('/blood-requests', { method: 'POST', body: JSON.stringify(body) }),

  eligibleDonors: (requestId) =>
    request(`/blood-requests/${requestId}/eligible-donors`),
};

export const matchApi = {
  forRequest: (requestId) =>
    request(`/matches?request_id=${requestId}`),

  mine: () => request('/matches/mine'),

  create: (body) =>
    request('/matches', { method: 'POST', body: JSON.stringify(body) }),

  respond: (matchId, status) =>
    request(`/matches/${matchId}/respond`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

export const api = {
  health: () => request('/health'),

  bloodGroups: () =>
    request('/lookups/blood-groups'),

  locations: () =>
    request('/lookups/locations'),

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

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(data?.error || `Request failed: ${res.status}`);
    }
    return data;
}

export const api = {
    getBloodGroups: () => request('/blood-groups'),
    getLocations: () => request('/locations'),
    createLocation: (body) => request('/locations', { method: 'POST', body: JSON.stringify(body) }),

    getDonors: () => request('/donors'),
    createDonor: (body) => request('/donors', { method: 'POST', body: JSON.stringify(body) }),
    updateDonor: (id, body) => request(`/donors/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

    getHospitals: () => request('/hospitals'),
    createHospital: (body) => request('/hospitals', { method: 'POST', body: JSON.stringify(body) }),

    getRequests: () => request('/blood-requests'),
    getRequest: (id) => request(`/blood-requests/${id}`),
    createRequest: (body) => request('/blood-requests', { method: 'POST', body: JSON.stringify(body) }),
    getEligibleDonors: (id) => request(`/blood-requests/${id}/eligible-donors`),

    getMatches: (requestId) => request(`/matches?requestId=${requestId}`),
    createMatches: (requestId, donorIds) =>
        request('/matches', { method: 'POST', body: JSON.stringify({ requestId, donorIds }) }),
    updateMatch: (id, matchStatus) =>
        request(`/matches/${id}`, { method: 'PATCH', body: JSON.stringify({ matchStatus }) }),

    getDonations: (params) => request(`/donations?${new URLSearchParams(params)}`),
    recordDonation: (body) => request('/donations', { method: 'POST', body: JSON.stringify(body) }),
};

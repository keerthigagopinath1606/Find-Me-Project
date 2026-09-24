/* FIND-ME API bridge.  The existing visual application can use this shared,
   token-aware client without changing its design system or notification UI. */
(function () {
  const base = "/api";
  const tokenKey = "FINDME_AUTH_TOKEN";
  // Existing camera/CCTV controls make direct fetch calls.  Add the same JWT to
  // those API requests while retaining their original UI and animations.
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, options = {}) => {
    const url = typeof input === "string" ? input : input.url;
    if (url && (url.startsWith("/api/") || url.includes("127.0.0.1:5000/api/"))) {
      const headers = new Headers(options.headers || {});
      const token = localStorage.getItem(tokenKey);
      if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
      return nativeFetch(input, { ...options, headers });
    }
    return nativeFetch(input, options);
  };
  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = localStorage.getItem(tokenKey);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const response = await fetch(base + path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "The FIND-ME service could not complete this request.");
    return data;
  }
  window.FindMeAPI = {
    citizenLogin: async (credentials) => { const result = await request("/auth/login", { method: "POST", body: JSON.stringify(credentials) }); localStorage.setItem(tokenKey, result.token); return result; },
    adminLogin: async (credentials) => { const result = await request("/admin/login", { method: "POST", body: JSON.stringify(credentials) }); localStorage.setItem(tokenKey, result.token); return result; },
    register: (details) => request("/auth/register", { method: "POST", body: JSON.stringify(details) }),
    forgotPassword: (email) => request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
    resetPassword: (details) => request("/auth/reset-password", { method: "POST", body: JSON.stringify(details) }),
    submitComplaint: (form) => request("/complaints", { method: "POST", body: form }),
    myComplaints: () => request("/complaints/my"),
    case: (id) => request(`/complaints/${encodeURIComponent(id)}`),
    deleteComplaint: (id) => request(`/complaints/${encodeURIComponent(id)}`, { method: "DELETE" }),
    dashboard: () => request("/admin/dashboard"),
    cases: (query = "") => request(`/admin/complaints${query}`),
    updateCase: (id, body) => request(`/admin/complaints/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
    reportSighting: (form) => request("/sightings", { method: "POST", body: form }),
    notifications: () => request("/notifications"),
     notificationSummary: () => request("/notifications/summary"),
    markNotificationsRead: () => request("/notifications/read-all", { method: "POST" }),
    emergencyAlerts: (status = "ALL") => request(`/emergency-alerts?status=${encodeURIComponent(status)}`),
    updateEmergencyAlert: (id, status) => request(`/emergency-alerts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    imageSearch: (form) => request("/search/image", { method: "POST", body: form }),
    uploadVideo: (form) => request("/videos/upload", { method: "POST", body: form }),
    processVideo: (body) => request("/videos/process", { method: "POST", body: JSON.stringify(body) }),
    logout: () => localStorage.removeItem(tokenKey)
  };
}());

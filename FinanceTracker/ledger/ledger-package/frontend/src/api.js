// Lightweight API client. The JWT is stored in localStorage so a returning
// user stays logged in for the token's 30-day lifetime ("remember me").
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const TOKEN_KEY = "ledger_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch { /* no body */ }

  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // auth
  register: (payload) => request("POST", "/auth/register", payload),
  login: (payload) => request("POST", "/auth/login", payload),
  me: () => request("GET", "/auth/me"),

  // data
  bootstrap: () => request("GET", "/bootstrap"),

  addCategory: (payload) => request("POST", "/categories", payload),
  updateCategory: (id, payload) => request("PATCH", `/categories/${id}`, payload),
  deleteCategory: (id) => request("DELETE", `/categories/${id}`),

  addTransaction: (payload) => request("POST", "/transactions", payload),
  updateTransaction: (id, payload) => request("PATCH", `/transactions/${id}`, payload),
  deleteTransaction: (id) => request("DELETE", `/transactions/${id}`),

  addAccount: (payload) => request("POST", "/accounts", payload),
  updateAccount: (id, payload) => request("PATCH", `/accounts/${id}`, payload),
  deleteAccount: (id) => request("DELETE", `/accounts/${id}`),

  updateSettings: (payload) => request("PATCH", "/settings", payload),
};

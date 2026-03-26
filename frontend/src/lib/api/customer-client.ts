import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const customerApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ── Session token management (Better Auth session sent as Bearer) ────────────

export function setCustomerSessionToken(token: string) {
  customerApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export function clearCustomerSessionToken() {
  delete customerApi.defaults.headers.common['Authorization'];
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface CustomerAddress {
  id: string;
  customer_id: string;
  store_id: string;
  label: string;
  first_name: string;
  last_name: string;
  company?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  state?: string | null;
  postal_code: string;
  country: string;
  phone?: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ── Account (authenticated via Better Auth session) ──────────────────────────

export async function customerGetProfile(slug: string) {
  const res = await customerApi.get(`/api/public/stores/${slug}/account/me`);
  return res.data;
}

export async function customerUpdateProfile(slug: string, data: {
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar?: string;
}) {
  const res = await customerApi.put(`/api/public/stores/${slug}/account/profile`, data);
  return res.data;
}

export async function customerListAddresses(slug: string): Promise<CustomerAddress[]> {
  const res = await customerApi.get(`/api/public/stores/${slug}/account/addresses`);
  return res.data;
}

export async function customerCreateAddress(slug: string, data: Omit<CustomerAddress, 'id' | 'customer_id' | 'store_id' | 'created_at' | 'updated_at'>): Promise<CustomerAddress> {
  const res = await customerApi.post(`/api/public/stores/${slug}/account/addresses`, data);
  return res.data;
}

export async function customerUpdateAddress(slug: string, id: string, data: Omit<CustomerAddress, 'id' | 'customer_id' | 'store_id' | 'created_at' | 'updated_at'>): Promise<CustomerAddress> {
  const res = await customerApi.put(`/api/public/stores/${slug}/account/addresses/${id}`, data);
  return res.data;
}

export async function customerDeleteAddress(slug: string, id: string) {
  const res = await customerApi.delete(`/api/public/stores/${slug}/account/addresses/${id}`);
  return res.data;
}

export async function customerUpdatePrivacy(slug: string, data: { accepts_marketing: boolean }) {
  const res = await customerApi.put(`/api/public/stores/${slug}/account/privacy`, data);
  return res.data;
}

export async function customerDeleteAccount(slug: string) {
  const res = await customerApi.delete(`/api/public/stores/${slug}/account`);
  return res.data;
}

// ── Newsletter ───────────────────────────────────────────────────────────────

export async function newsletterSubscribe(slug: string, email: string, firstName?: string): Promise<{ message: string }> {
  const res = await customerApi.post(`/api/public/stores/${slug}/newsletter/subscribe`, { email, first_name: firstName || '' });
  return res.data;
}

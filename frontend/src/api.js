import axios from "axios";
export const BASE = import.meta.env.VITE_API_BASE_URL?.trim() || "";
export const api = axios.create({ baseURL: BASE, timeout: 15000 });
export const errorText = e => e?.response?.data?.message || e.message || "Request failed";

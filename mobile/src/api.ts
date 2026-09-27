import axios from "axios";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const URL_KEY = "spare.api";
type TokenGetter = () => Promise<string | null>;
let getToken: TokenGetter | null = null;
let override: string | null = null;

export function setAuthTokenGetter(fn: TokenGetter | null) {
  getToken = fn;
}

function storedUrl(): string | null {
  if (Platform.OS === "web") return globalThis.localStorage?.getItem(URL_KEY) ?? null;
  return null;
}

/** Remembered server address, then the build-time default. Android emulator localhost means this computer. */
export function apiBaseUrl(): string {
  const raw = override ?? storedUrl() ?? process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000/api";
  if (Platform.OS === "android" && override == null && storedUrl() == null) {
    return raw.replace("://localhost", "://10.0.2.2").replace("://127.0.0.1", "://10.0.2.2");
  }
  return raw.replace(/\/$/, "");
}

export async function loadSavedApiBase(): Promise<void> {
  if (Platform.OS === "web") {
    override = storedUrl();
    return;
  }
  override = await SecureStore.getItemAsync(URL_KEY);
}

export async function saveApiBase(url: string): Promise<void> {
  const next = url.trim().replace(/\/$/, "");
  override = next;
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(URL_KEY, next);
    return;
  }
  await SecureStore.setItemAsync(URL_KEY, next);
}

export const api = axios.create({
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  config.baseURL = apiBaseUrl();
  const token = getToken ? await getToken() : null;
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

export async function getJson<T>(url: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const cleaned = Object.fromEntries(Object.entries(params ?? {}).filter((entry) => entry[1] !== undefined && entry[1] !== ""));
  const response = await api.get<T>(url, { params: cleaned });
  return response.data;
}

export async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await api.post<T>(url, body);
  return response.data;
}

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string; error?: string }>(error)) {
    return error.response?.data?.message ?? error.response?.data?.error ?? error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

export function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403);
}

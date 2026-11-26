import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { router } from "expo-router";

function developmentApiUrl() {
  if (Platform.OS === "web") return "http://127.0.0.1:8000";

  // Expo provides the dev server host (the computer running Expo) to physical
  // devices. Reuse that LAN host for the API instead of pointing phones at
  // their own localhost. An explicit URL remains available for production,
  // tunnels, and unusual network setups.
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    try {
      const host = new URL(`http://${hostUri}`).hostname;
      if (host && host !== "localhost" && host !== "127.0.0.1") return `http://${host}:8000`;
    } catch {
      // Fall back to the platform's emulator default below.
    }
  }
  return Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://127.0.0.1:8000";
}

const API_BASE = (
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  developmentApiUrl()
).replace(/\/$/, "");
const TOKEN_KEY = "ekyan.mobile.access-token";

async function fetchApi(url: string, init: RequestInit = {}, timeoutMs = 15_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") {
      throw new Error(`EKYAN did not respond within ${Math.round(timeoutMs / 1000)} seconds. Check that the API is running at ${API_BASE}, then try again.`);
    }
    throw new Error(`Could not reach the EKYAN service at ${API_BASE}. Check your connection and EXPO_PUBLIC_API_URL, then try again.`);
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkApiHealth() {
  try {
    const response = await fetchApi(`${API_BASE}/health`, {}, 5_000);
    return response.ok;
  } catch {
    return false;
  }
}

export async function readAccessToken() {
  return Platform.OS === "web"
    ? AsyncStorage.getItem(TOKEN_KEY)
    : SecureStore.getItemAsync(TOKEN_KEY);
}

async function storeToken(token: string) {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

export async function signIn(email: string, password: string) {
  const response = await fetchApi(`${API_BASE}/api/v1/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-EKYAN-Client": "native" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(await responseError(response));
  const session = (await response.json()) as { accessToken?: unknown; actor?: { role?: unknown } };
  if (typeof session.accessToken !== "string") throw new Error("Sign in returned an invalid session.");
  await storeToken(session.accessToken);
  if (session.actor?.role !== "agripreneur") {
    await signOut();
    throw new Error("This phone app is for agripreneur accounts. Use the web workspace for partner and programme roles.");
  }
}

export async function signUp(displayName: string, email: string, password: string) {
  const response = await fetchApi(`${API_BASE}/api/v1/auth/register`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-EKYAN-Client": "native" },
    body: JSON.stringify({ displayName, email, password, role: "agripreneur", termsAccepted: true, termsVersion: "pilot-2026-11" }),
  });
  if (!response.ok) throw new Error(await responseError(response));
  const result = (await response.json()) as { accessToken?: unknown; status?: string; message?: string };
  if (typeof result.accessToken === "string") await storeToken(result.accessToken);
  return result;
}

export async function signOut() {
  const token = await readAccessToken();
  try {
    if (token) await fetchApi(`${API_BASE}/api/v1/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }, 5_000);
  } catch {
    // Local sign-out must finish even if the service cannot be reached.
  } finally {
    if (Platform.OS === "web") await AsyncStorage.removeItem(TOKEN_KEY);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

async function responseError(response: Response) {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "detail" in body && typeof body.detail === "string") {
      return body.detail;
    }
  } catch {
    return `API request failed with status ${response.status}.`;
  }
  return `API request failed with status ${response.status}.`;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await readAccessToken();
  if (!token) throw new Error("Please sign in to continue.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetchApi(`${API_BASE}${path}`, { ...init, headers });
  if (response.status === 401) {
    if (Platform.OS === "web") await AsyncStorage.removeItem(TOKEN_KEY);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
    router.replace("/auth");
  }
  if (!response.ok) throw new Error(await responseError(response));
  return (await response.json()) as T;
}

export function getApiBaseUrl() {
  return API_BASE;
}

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBeuGZ5D0JiZcMNeloYfwxYdMZHVujIj08",
  authDomain: "geminihackathon-498909.firebaseapp.com",
  projectId: "geminihackathon-498909",
};

function getFirebaseAuth() {
  const app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
  return getAuth(app);
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  loginProvider: "google" | "guest";
  loginTime: string;
  workspace_id: string;
  role?: string;
  is_admin?: boolean;
  login_count?: number;
  firestore_synced?: boolean;
}

const STORAGE_PROFILE_KEY = "spatial_os_user_profile";

export function getSavedUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function clearSavedUserProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_PROFILE_KEY);
  try {
    const auth = getFirebaseAuth();
    signOut(auth).catch(() => {});
  } catch (signOutErr) {
    void signOutErr;
  }
}

export async function verifyGoogleProfileWithBackend(payload: {
  email?: string;
  name?: string;
  avatarUrl?: string;
  idToken?: string;
  accessToken?: string;
}): Promise<UserProfile> {
  const res = await fetch(`${API_BASE_URL}/auth/google/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.profile) {
    throw new Error(data.detail || "Google OAuth verification failed.");
  }
  const profile = data.profile as UserProfile;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(profile));
  }
  return profile;
}

export async function triggerGoogleOAuthLogin(
  onSuccess: (profile: UserProfile) => void,
  onError?: (err: Error) => void
): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");
    provider.setCustomParameters({ prompt: "select_account" });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const user = result.user;

    if (!user.email) {
      throw new Error("Google account did not return an email address.");
    }

    const verified = await verifyGoogleProfileWithBackend({
      email: user.email,
      name: user.displayName || user.email.split("@")[0],
      avatarUrl: user.photoURL || undefined,
      idToken: credential?.idToken || undefined,
      accessToken: credential?.accessToken || undefined,
    });
    onSuccess(verified);
  } catch (err: any) {
    if (err?.code === "auth/popup-closed-by-user") {
      return;
    }
    onError?.(err instanceof Error ? err : new Error(err?.message || "Google Sign-In failed."));
  }
}

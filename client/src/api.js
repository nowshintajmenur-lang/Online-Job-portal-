import { auth } from "./firebase";

// Address of our API server
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Talk to our server as the logged-in user.
// Usage: const data = await apiFetch("/api/jobs/mine");
//        await apiFetch("/api/jobs", { method: "POST", body: { title: "..." } });
export async function apiFetch(path, { method = "GET", body } = {}) {
  await auth.authStateReady(); // wait until Firebase has restored the login
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;

  const res = await fetch(API_URL + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
}

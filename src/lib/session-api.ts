const API_BASE = "http://localhost:3000";

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export interface Session {
  id: string;
  pageId: string;
  ownerId: string;
  sessionKey: string;
  isActive: boolean;
  settings: Record<string, unknown>;
  expiresAt: string | null;
  createdAt: string;
}

export async function createSession(pageId: string, options?: {
  settings?: Record<string, unknown>;
  expiresInMinutes?: number;
}): Promise<Session> {
  return fetchWithAuth("/session/create", {
    method: "POST",
    body: JSON.stringify({
      pageId,
      ...options,
    }),
  });
}

export async function getSession(id: string): Promise<Session> {
  return fetchWithAuth(`/session/get?id=${id}`);
}

export async function getSessionByKey(sessionKey: string): Promise<Session> {
  return fetchWithAuth(`/session/key?sessionKey=${encodeURIComponent(sessionKey)}`);
}

export async function getSessionsByPage(pageId: string): Promise<Session[]> {
  return fetchWithAuth(`/session/page?pageId=${pageId}`);
}

export async function getActiveSessionByPage(pageId: string): Promise<Session | null> {
  try {
    return await fetchWithAuth(`/session/page/active?pageId=${pageId}`);
  } catch {
    return null;
  }
}

export async function updateSession(id: string, data: {
  isActive?: boolean;
  settings?: Record<string, unknown>;
  expiresAt?: string;
}): Promise<Session> {
  return fetchWithAuth(`/session/update?id=${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function endSession(id: string): Promise<Session> {
  return fetchWithAuth(`/session/end?id=${id}`, {
    method: "POST",
  });
}

export async function deleteSession(id: string): Promise<void> {
  await fetchWithAuth(`/session/delete?id=${id}`, {
    method: "DELETE",
  });
}

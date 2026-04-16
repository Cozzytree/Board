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

export interface Page {
  id: string;
  userId: string;
  title: string;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getPagesByUser(userId: string): Promise<Page[]> {
  return fetchWithAuth(`/page/user?userId=${userId}`);
}

export async function createPage(title: string): Promise<Page> {
  return fetchWithAuth("/page/create", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function updatePage(id: string, data: { title?: string }): Promise<Page> {
  return fetchWithAuth(`/page/update?id=${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deletePage(id: string): Promise<void> {
  await fetchWithAuth(`/page/delete?id=${id}`, {
    method: "DELETE",
  });
}

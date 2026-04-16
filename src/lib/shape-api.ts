import type { ShapeProps } from "@/lib";

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

export interface Shape {
  id: string;
  props: ShapeProps;
  page_id: string;
  isDeleted: boolean;
  sessionId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getShapesByPage(pageId: string): Promise<Shape[]> {
  return fetchWithAuth(`/shape/page?pageId=${pageId}`);
}

export async function getShapesBySession(sessionId: string): Promise<Shape[]> {
  return fetchWithAuth(`/shape/session?sessionId=${sessionId}`);
}

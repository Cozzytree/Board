import type { ShapeProps } from "@/board/types";

interface SyncChange {
  id: string;
  pageId: string;
  props?: ShapeProps;
  isDeleted?: boolean;
}

interface ShapeSyncOptions {
  pageId: string;
  debounceMs?: number;
  thresholdMs?: number;
  onSyncStart?: () => void;
  onSyncComplete?: (success: boolean) => void;
  onError?: (error: Error) => void;
}

const API_BASE = import.meta.env.API_URL || "http://localhost:3000";

export class ShapeSyncManager {
  private dirtyShapes: Map<string, SyncChange> = new Map();
  private debounceMs: number;
  private thresholdMs: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastChangeTime: number = 0;
  private pageId: string;
  private onSyncStart?: () => void;
  private onSyncComplete?: (success: boolean) => void;
  private onError?: (error: Error) => void;
  private isSyncing = false;
  private boundFlush = this.flush.bind(this);
  private boundVisibilityChange = this.handleVisibilityChange.bind(this);
  private boundBeforeUnload = this.handleBeforeUnload.bind(this);

  constructor(options: ShapeSyncOptions) {
    this.pageId = options.pageId;
    this.debounceMs = options.debounceMs ?? 500;
    this.thresholdMs = options.thresholdMs ?? 3000;
    this.onSyncStart = options.onSyncStart;
    this.onSyncComplete = options.onSyncComplete;
    this.onError = options.onError;

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.boundVisibilityChange);
      window.addEventListener("blur", this.boundBeforeUnload);
      window.addEventListener("beforeunload", this.boundBeforeUnload);
    }
  }

  markDirty(id: string, props: ShapeProps): void {
    const existing = this.dirtyShapes.get(id);

    if (existing?.isDeleted) {
      return;
    }

    this.dirtyShapes.set(id, {
      id,
      pageId: this.pageId,
      props,
    });

    this.scheduleFlush();
  }

  markCreated(id: string, props: ShapeProps): void {
    const existing = this.dirtyShapes.get(id);

    if (existing?.isDeleted) {
      this.dirtyShapes.delete(id);
      return;
    }

    this.dirtyShapes.set(id, {
      id,
      pageId: this.pageId,
      props,
    });

    this.scheduleFlush();
  }

  markDeleted(id: string): void {
    const existing = this.dirtyShapes.get(id);

    if (!existing) {
      this.dirtyShapes.set(id, {
        id,
        pageId: this.pageId,
        isDeleted: true,
      });
    } else if (existing.props) {
      this.dirtyShapes.set(id, {
        id,
        pageId: this.pageId,
        isDeleted: true,
      });
    } else {
      this.dirtyShapes.delete(id);
    }

    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    const now = Date.now();
    const timeSinceLastChange = now - this.lastChangeTime;
    this.lastChangeTime = now;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.dirtyShapes.size === 0) {
      return;
    }

    if (timeSinceLastChange >= this.thresholdMs) {
      void this.flush();
      return;
    }

    this.timer = setTimeout(this.boundFlush, this.debounceMs);
  }

  async flush(): Promise<void> {
    if (this.isSyncing || this.dirtyShapes.size === 0) {
      return;
    }

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const changes = Array.from(this.dirtyShapes.values());
    this.dirtyShapes.clear();

    this.isSyncing = true;
    this.onSyncStart?.();

    try {
      const response = await fetch(`${API_BASE}/shape/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ changes }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const result = await response.json();
      this.onSyncComplete?.(result.synced === result.total);

      if (result.synced < result.total) {
        console.warn("[ShapeSyncManager] Some shapes failed to sync:", result.results);
      }
    } catch (error) {
      console.error("[ShapeSyncManager] Sync error:", error);
      this.onError?.(error as Error);

      this.dirtyShapes = new Map(changes.map((c) => [c.id, c]));
      this.scheduleFlush();
    } finally {
      this.isSyncing = false;
    }
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === "hidden") {
      void this.flush();
    }
  }

  private handleBeforeUnload(): void {
    void this.flush();
  }

  async destroy(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.boundVisibilityChange);
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("blur", this.boundBeforeUnload);
      window.removeEventListener("beforeunload", this.boundBeforeUnload);
    }

    if (this.dirtyShapes.size > 0) {
      await this.flush();
    }
  }

  get pendingCount(): number {
    return this.dirtyShapes.size;
  }

  get hasPendingChanges(): boolean {
    return this.dirtyShapes.size > 0;
  }
}

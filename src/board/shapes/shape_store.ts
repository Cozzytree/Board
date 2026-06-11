import type { Identity, ShapeInterface } from "../types";
import type { ActiveSeletionProps } from "./active_selection";

class Node<T> {
  value: T;
  next: Node<T> | null = null;

  constructor(val: T) {
    this.value = val;
  }
}

class List<T> {
  private head: Node<T> | null = null;
  private tail: Node<T> | null = null;

  pushBack(val: any): void {
    const newNode = new Node(val);
    if (!this.head) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      if (this.tail) {
        this.tail.next = newNode;
      }
      this.tail = newNode;
    }
  }

  getFront(): Node<T> | null {
    return this.head;
  }

  getFirst(): Node<T> | null {
    return this.head;
  }

  getLast(): Node<T> | null {
    return this.tail;
  }

  removeHead(): void {
    if (!this.head) return;

    // Only one node
    if (this.head === this.tail) {
      this.head = null;
      this.tail = null;
    } else {
      this.head = this.head.next;
    }
  }

  removeTail(): Node<T> | null {
    if (!this.head) return null;

    // Only one node
    if (this.head === this.tail) {
      const temp = this.head;
      this.head = null;
      this.tail = null;
      return temp;
    }

    // More than one node: traverse to second-last
    let current = this.head;
    while (current.next && current.next !== this.tail) {
      current = current.next;
    }

    const removed = this.tail;
    this.tail = current;
    this.tail.next = null;

    return removed;
  }

  isEmpty(): boolean {
    return this.head === null;
  }
}

type UndoType = "default" | "delete" | "create";

export type HistoryType = {
  undoType: UndoType;
  objects: Record<string, any>[];
};

class ShapeStore<T extends ShapeInterface & ActiveSeletionProps> {
  declare store: Map<string, T>;
  declare private lastInserted: T | null;
  declare private copy: Identity<T>[];

  declare private _zCounter: number;

  declare private undoStore: List<HistoryType>;
  declare private redoStore: List<HistoryType>;

  constructor() {
    this.store = new Map();
    this.lastInserted = null;
    this.undoStore = new List();
    this.redoStore = new List();
    this._zCounter = 0;
  }

  /**
   *
   * @param callback if returns true then breaks the iteration
   * @returns returns T if returned true from callback or null
   */
  getOrderedShapes(): T[] {
    return Array.from(this.store.values()).sort((a, b) => a.Index() - b.Index());
  }

  forEach(callback: (o: T) => boolean): T | null {
    const sorted = this.getOrderedShapes();
    for (const ob of sorted) {
      if (callback(ob)) return ob;
    }
    return null;
  }

  bringForward(id: string): boolean {
    const sorted = this.getOrderedShapes();
    const idx = sorted.findIndex((s) => s.ID() === id);
    if (idx < 0 || idx === sorted.length - 1) return false;
    const current = sorted[idx];
    const next = sorted[idx + 1];
    const tempZ = current.Index();
    current.SetIndex(next.Index());
    next.SetIndex(tempZ);
    return true;
  }

  sendBackward(id: string): boolean {
    const sorted = this.getOrderedShapes();
    const idx = sorted.findIndex((s) => s.ID() === id);
    if (idx <= 0) return false;
    const current = sorted[idx];
    const prev = sorted[idx - 1];
    const tempZ = current.Index();
    current.SetIndex(prev.Index());
    prev.SetIndex(tempZ);
    return true;
  }

  bringToFront(id: string): boolean {
    const shape = this.get(id);
    if (!shape) return false;
    const maxZ = Math.max(...this.getOrderedShapes().map((s) => s.Index()), 0);
    shape.SetIndex(maxZ + 1);
    return true;
  }

  sendToBack(id: string): boolean {
    const shape = this.get(id);
    if (!shape) return false;
    const minZ = Math.min(...this.getOrderedShapes().map((s) => s.Index()), 0);
    shape.SetIndex(minZ - 1);
    return true;
  }

  setZOrder(id: string, zOrder: number): boolean {
    const shape = this.get(id);
    if (!shape) return false;
    shape.SetIndex(zOrder);
    return true;
  }

  insert(...objs: T[]) {
    for (const o of objs) {
      if (o.Index() == null || o.Index() === 0) {
        o.SetIndex(this._zCounter++);
      } else {
        this._zCounter = Math.max(this._zCounter, o.Index() + 1);
      }
      this.store.set(o.ID(), o);
      this.lastInserted = o;
    }
  }

  getLastInsertedShape(): T | null {
    return this.lastInserted;
  }

  removeById(id: string): boolean {
    return this.store.delete(id);
  }

  get(id: string) {
    return this.store.get(id);
  }

  set setLastInserted(v: T | null) {
    this.lastInserted = v;
  }

  set insertCopy(items: Identity<T>[]) {
    this.copy = items;
  }

  get getLastCopy(): Identity<T>[] {
    return this.copy;
  }

  pushUndo(data: HistoryType) {
    if (data.objects.length === 0) return;
    this.undoStore.pushBack(data);
  }

  getLastUndo() {
    const lastUndo = this.undoStore.removeTail();

    if (lastUndo == null) return;
    return (callback: (lastUndo: HistoryType) => Record<string, any>[]) => {
      this.redoStore.pushBack({
        undoType: lastUndo.value.undoType,
        objects: callback(lastUndo.value),
      });
    };
  }

  getLasRedo() {
    const lastRedo = this.redoStore.removeTail();
    if (lastRedo === null) return;

    return (callback: (lastRedo: HistoryType) => Record<string, any>[]) => {
      this.undoStore.pushBack({
        undoType: lastRedo.value.undoType,
        objects: callback(lastRedo.value),
      });
    };
  }
}

export default ShapeStore;

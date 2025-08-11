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

   declare private undoStore: List<HistoryType>;
   declare private redoStore: List<HistoryType>;

   constructor() {
      this.store = new Map();
      this.lastInserted = null;
      this.undoStore = new List();
      this.redoStore = new List();
   }

   /**
    *
    * @param callback if returns true then breaks the iteration
    * @returns returns T if returned true from callback or null
    */
   forEach(callback: (o: T) => boolean): T | null {
      for (const [, ob] of this.store) {
         if (callback(ob)) return ob;
      }
      return null;
   }

   insert(...objs: T[]) {
      for (const o of objs) {
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

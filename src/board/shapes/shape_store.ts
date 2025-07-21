import type { Identity, ShapeInterface } from "../types";
import type { ActiveSeletionProps } from "./active_selection";

class ShapeStore<T extends ShapeInterface & ActiveSeletionProps> {
   declare store: Map<string, T>;
   declare private lastInserted: T | null;
   declare private copy: Identity<T>[];

   constructor() {
      this.store = new Map();
      this.copy = [];
      this.lastInserted = null;
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

   set setLastInserted(v: T | null) {
      this.lastInserted = v;
   }

   set insertCopy(items: Identity<T>[]) {
      this.copy = items;
   }

   get getLastCopy(): Identity<T>[] {
      return this.copy;
   }
}

export default ShapeStore;

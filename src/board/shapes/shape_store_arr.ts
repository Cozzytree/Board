import type { ShapeInterface } from "../types";
import type { ActiveSeletionProps } from "./active_selection";

class ShapeStoreArr<T extends ShapeInterface & ActiveSeletionProps> {
   shapes: T[];
   declare private _zCounter: number;
   declare private lastInserted: T | null;

   constructor() {
      this.shapes = []
   }

   clear() {
      this.shapes = [];
      this.lastInserted = null;
   }

   forEach(callback: (o: T) => boolean): T | null {
      for (let i = 0; i < this.shapes.length; i++) {
         if (callback(this.shapes[i])) {
            return this.shapes[i]
         }
      }
      return null;
   }

   getLastInsertedShape(): T | null {
      return this.lastInserted;
   }

   insert(...objs: T[]) {
      for (const o of objs) {
         if (o.Index() == null || o.Index() === 0) {
            o.SetIndex(this._zCounter++);
         } else {
            this._zCounter = Math.max(this._zCounter, o.Index() + 1);
         }
         this.shapes.push(o);
         this.lastInserted = o;
      }
   }

   get(id: string) {
      const index = this.shapes.findIndex((s) => s.ID() === id);
      if (index == -1) return undefined;
      return this.shapes[index];
   }

   set setLastInserted(v: T | null) {
      this.lastInserted = v;
   }

   removeById(id: string): boolean {
      const index = this.shapes.findIndex((s) => s.ID() === id);
      if (index == -1) return false;
      this.shapes.splice(index, 1);
      return true;
   }

   bringForward(id: string): boolean {
      const index = this.shapes.findIndex((s) => s.ID() === id);
      if (index === -1 || index === this.shapes.length - 1) return false;
      const current = this.shapes[index];
      const next = this.shapes[index + 1];

      const tempZ = current.Index();
      current.SetIndex(next.Index());
      next.SetIndex(tempZ);

      // Physically swap array elements to maintain sorted rendering order
      this.shapes[index] = next;
      this.shapes[index + 1] = current;

      return true;
   }

   sendBackward(id: string): boolean {
      const index = this.shapes.findIndex((s) => s.ID() === id);
      if (index === -1 || index === 0) return false;
      const current = this.shapes[index];
      const prev = this.shapes[index - 1];

      const tempZ = current.Index();
      current.SetIndex(prev.Index());
      prev.SetIndex(tempZ);

      // Physically swap array elements
      this.shapes[index] = prev;
      this.shapes[index - 1] = current;

      return true;
   }

   bringToFront(id: string): boolean {
      const index = this.shapes.findIndex((s) => s.ID() === id);
      if (index === -1 || index === this.shapes.length - 1) return false;

      const shape = this.shapes[index];
      const maxZ = this.shapes[this.shapes.length - 1].Index();
      shape.SetIndex(maxZ + 1);

      // Remove from current position and push to the very end (top layer)
      this.shapes.splice(index, 1);
      this.shapes.push(shape);

      return true;
   }

   sendToBack(id: string): boolean {
      const index = this.shapes.findIndex((s) => s.ID() === id);
      if (index === -1 || index === 0) return false;

      const shape = this.shapes[index];
      const minZ = this.shapes[0].Index();
      shape.SetIndex(minZ - 1);

      // Remove from current position and unshift to the very beginning (bottom layer)
      this.shapes.splice(index, 1);
      this.shapes.unshift(shape);

      return true;
   }

   setZOrder(id: string, zOrder: number): boolean {
      const index = this.shapes.findIndex((s) => s.ID() === id);
      if (index === -1) return false;
      this.shapes[index].SetIndex(zOrder);
      return true;
   }
}

export default ShapeStoreArr;

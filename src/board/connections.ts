import type { connection, ConnectionInterface } from "./shapes/shape_types";

class Connections implements ConnectionInterface {
   shapes: connection[];
   constructor(c?: connection[]) {
      this.shapes = c || [];
   }

   size() {
      return this.shapes.length;
   }

   add(s: connection): boolean {
      for (let i = 0; i < this.shapes.length; i++) {
         if (s.s.ID() == this.shapes[i].s.ID() && s.connected == this.shapes[i].connected)
            return false;
      }

      this.shapes.push(s);
      return true;
   }

   // delete(i)

   forEach(callback: (c: connection) => boolean | void): connection | null {
      for (let i = 0; i < this.shapes.length; i++) {
         if (callback(this.shapes[i])) {
            return this.shapes[i];
         }
      }
      return null;
   }

   delete(id: string) {
      const i = this.shapes.findIndex((s) => id == s.s.ID());
      if (i == -1) return;
      if (this.shapes.length == 1) {
         this.shapes = [];
      } else {
         this.shapes.splice(i, 1);
      }
   }

   clear(ct: "s" | "e", id?: string) {
      const index = this.shapes.findIndex((conn) => conn?.connected === ct);
      if (index == -1) return;

      const val = this.shapes[index];
      console.log(val);
      if (id) val.s.connections.delete(id);
      this.shapes.splice(index, 1);
   }

   // clear(ct: "s" | "e", id?: string) {
   //    const findIndex = this.shapes.findIndex((s) => s.connected == ct);
   //    if (findIndex !== -1) {
   //       if (this.shapes.length == 1) {
   //          this.shapes = [];
   //       } else {
   //          if (id) this.shapes[findIndex].s.connections.delete(id);
   //          this.shapes.splice(findIndex, 1);
   //       }
   //    }
   // }
}

export default Connections;

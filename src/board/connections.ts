import type { connection, ConnectionInterface } from "./shapes/shape_types";

class Connections implements ConnectionInterface {
   shapes: connection[];
   constructor(c?: connection[]) {
      this.shapes = c || [];
   }

   add(s: connection): boolean {
      for (let i = 0; i < this.shapes.length; i++) {
         if (s.s.ID() == this.shapes[i].s.ID()) return false;
      }

      this.shapes.push(s);
      return true;
   }

   // delete(i)

   forEach(callback: (c: connection) => boolean): connection | null {
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
      this.shapes.splice(i, 1);
   }

   clear(ct: "s" | "e", id?: string) {
      this.shapes.forEach((s, i) => {
         if (s.connected === ct) {
            if (id) s.s.connections.delete(id);
            this.shapes.splice(i, 1);
         }
      });
   }
}

export default Connections;

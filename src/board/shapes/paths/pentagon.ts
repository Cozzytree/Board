import type {
   BoxInterface,
   Point,
   resizeDirection,
   ShapeProps,
} from "../../types";
import { Path, Pointer } from "../../index";
import type { PathProps } from "./path";

class Pentagon extends Path {
   constructor(props: ShapeProps & PathProps) {
      super(props);

      const inset = this.width * 0.15;
      this.points = [
         new Pointer({ x: 0, y: this.height * 0.45 }), // P0 - top-left
         new Pointer({
            x: this.width / 2,
            y: 0,
         }), // P1 - top-center
         new Pointer({
            x: this.width,
            y: this.height * 0.45,
         }), // P2 - top-right
         new Pointer({
            x: this.width - inset,
            y: this.height,
         }), // P3 - bottom-right (inward from P2)
         new Pointer({
            x: inset,
            y: this.height,
         }), // P4 - bottom-left (inward from P0)
      ];
   }

   Resize(current: Point, old: BoxInterface, d: resizeDirection): void {
      let newWidth: number;
      let newHeight: number;
      let scaleFactorX: number;
      let scaleFactorY: number;
      let scaleFactor: number;
      switch (d) {
         case "br":
            // Calculate the change in width and height
            newWidth = current.x - old.x1;
            newHeight = current.y - old.y1;

            // Calculate scale factors for width and height
            scaleFactorX = newWidth / (old.x2 - old.x1);
            scaleFactorY = newHeight / (old.y2 - old.y1);

            // We choose the smallest scale factor to maintain aspect ratio
            scaleFactor = Math.min(scaleFactorX, scaleFactorY);

            // Update the scale property
            this.scale *= scaleFactor * 0.5; // Multiply the scale by the calculated factor

            // Optionally, update the width and height if needed
            this.width = newWidth;
            this.height = newHeight;
            break;
      }
   }

   // Function to calculate center of the pentagon
   getCenter(): Pointer {
      const centerX = this.width / 2;
      const centerY = this.height / 2;
      return new Pointer({ x: centerX, y: centerY });
   }

   // Function to scale the pentagon based on the mouse position
   scaleBasedOnMouse(mouseX: number, mouseY: number): void {
      // Get the center of the pentagon
      const center = this.getCenter();

      // Calculate the distance between the mouse and the center
      const distance = Math.sqrt(
         Math.pow(mouseX - center.x, 2) + Math.pow(mouseY - center.y, 2),
      );

      // Set a scale factor. This is where you could tweak the scaling logic.
      const scaleFactor = Math.max(0.5, Math.min(2, distance / 200)); // Scale between 0.5x and 2x

      // Scale each point based on the mouse position and center
      this.points = this.points.map((point) => {
         // Calculate the difference between the point and the center
         const deltaX = point.x - center.x;
         const deltaY = point.y - center.y;

         // Apply scaling
         const scaledX = center.x + deltaX * scaleFactor;
         const scaledY = center.y + deltaY * scaleFactor;

         return new Pointer({ x: scaledX, y: scaledY });
      });
   }
}

export default Pentagon;

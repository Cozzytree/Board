import type { Board } from "@/board/index";
import { generateShapeByShapeType } from "@/board/utils/utilfunc";
import type { ShapeProps } from "@/board/types";

interface ShapeWithProps {
   id: string;
   props: ShapeProps;
}

export async function loadShapesFromProps(
   board: Board,
   shapes: ShapeWithProps[],
): Promise<void> {
   for (const shape of shapes) {
      if (board.shapeStore.get(shape.id)) continue;

      try {
         const obj = shape.props as Record<string, unknown>;
         const shapeInstance = generateShapeByShapeType(
            obj as Parameters<typeof generateShapeByShapeType>[0],
            board,
            board.ctx,
         );

         if (shapeInstance) {
            shapeInstance.id = shape.id;
            board.shapeStore.insert(shapeInstance);
         }
      } catch (e) {
         console.error("[shape] Failed to load shape:", shape.id, e);
      }
   }

   // Phase 2: Resolve pending connections
   board.shapeStore.forEach((shape) => {
      if (shape._pendingConnections && Array.isArray(shape._pendingConnections)) {
         shape._pendingConnections.forEach((conn: any) => {
            const targetShape = board.shapeStore.get(conn.shapeId);
            if (targetShape) {
               shape.connections.add({
                  s: targetShape,
                  connected: conn.connected,
                  anchor: conn.anchor,
                  coords: conn.coords,
               });
            }
         });
         delete shape._pendingConnections;
      }
      return false; // Continue iteration
   });

   board.shapeStore.forEach((shape) => {
      if (shape.type !== "line" && shape.connections.size() > 0) {
         const p = { x: shape.left, y: shape.top };
         shape.dragging(p, p);
      }
      return false;
   });

   board.render();
}

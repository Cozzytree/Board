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

  board.render();
}

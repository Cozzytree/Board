import Dexie, { type EntityTable } from "dexie";
import type { ShapeProps } from "./types";

class BoardDB extends Dexie {
  shapes!: EntityTable<ShapeProps, "id">

  constructor() {
    super("board_db");
    this.version(1).stores({
      shapes: "id, stroke, strokeSize, fill, fillStyle, roughness, top, left, width, height, shapes, radius, italic",
    })
  }
}

export const db = new BoardDB();

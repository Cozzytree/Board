import type { DbInstance } from "../db";
import { initPageRepo } from "./pages.repo";
import { initShapeRepo } from "./shapes.repo";

export function createRepos(db: DbInstance) {
  return {
    pages: initPageRepo(db),
    shapes: initShapeRepo(db),
  };
}

export type Repos = ReturnType<typeof createRepos>;

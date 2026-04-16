import type { DbInstance } from "../db";
import { initPageRepo } from "./pages.repo";
import { initShapeRepo } from "./shapes.repo";
import { initSessionRepo } from "./sessions.repo";

export function createRepos(db: DbInstance) {
  return {
    pages: initPageRepo(db),
    shapes: initShapeRepo(db),
    sessions: initSessionRepo(db),
  };
}

export type Repos = ReturnType<typeof createRepos>;

import type { QueryClient } from "@tanstack/react-query";

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof import("./router").getRouter extends () => infer R ? R : never;
  }

  interface RouteContext {
    queryClient: QueryClient;
  }
}

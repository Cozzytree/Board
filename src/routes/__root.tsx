import { ThemeProvider } from "@/components/theme-provider";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, useRouteContext } from "@tanstack/react-router";
import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
});

function RootComponent() {
  const context = useRouteContext({ from: Route.id });
  return (
    <QueryClientProvider client={context.queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="border">
        <div className="w-full">
          <Outlet />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

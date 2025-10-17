import { ThemeProvider } from "@/components/theme-provider";
import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider defaultTheme="dark" storageKey="border">
      <div className="w-full min-h-screen">
        <Outlet />
      </div>
    </ThemeProvider>
  ),
});

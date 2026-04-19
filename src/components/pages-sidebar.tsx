import React from "react";
import { useNavigate, useParams, Link } from "@tanstack/react-router";
import { useSession } from "@/lib/auth-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Paintbrush, Plus, MoreHorizontal, Trash2, Edit2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createSession } from "@/lib/session-api";
import { getPagesByUser, createPage as apiCreatePage, updatePage as apiUpdatePage, deletePage as apiDeletePage, type Page } from "@/lib/page-api";

export function PagesSidebar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pageId: currentPageId } = useParams({ strict: false });
  const { data: session } = useSession();
  const [newPageTitle, setNewPageTitle] = React.useState("");
  const [editingPage, setEditingPage] = React.useState<Page | null>(null);
  const [editTitle, setEditTitle] = React.useState("");

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["pages", session?.user?.id],
    queryFn: () => getPagesByUser(session!.user.id),
    enabled: !!session?.user?.id,
  });

  const createPageMutation = useMutation({
    mutationFn: (title: string) => apiCreatePage(title),
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      setNewPageTitle("");
      navigate({ to: "/pages/$pageId", params: { pageId: newPage.id } });
    },
  });

  const updatePageMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => apiUpdatePage(id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      setEditingPage(null);
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: (id: string) => apiDeletePage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      if (currentPageId) {
        const remainingPage = pages.find((p) => p.id !== currentPageId);
        if (remainingPage) {
          navigate({ to: "/pages/$pageId", params: { pageId: remainingPage.id } });
        } else {
          navigate({ to: "/pages" });
        }
      }
    },
  });

  const startSessionMutation = useMutation({
    mutationFn: (pageId: string) => createSession(pageId, { expiresInMinutes: 60 }),
    onSuccess: (newSession) => {
      navigate({ to: "/sessions/$sessionKey", params: { sessionKey: newSession.sessionKey } });
    },
  });

  const createPage = () => {
    if (!newPageTitle.trim()) return;
    createPageMutation.mutate(newPageTitle.trim());
  };

  const deletePage = (pageId: string) => {
    deletePageMutation.mutate(pageId);
  };

  const updatePage = () => {
    if (!editingPage || !editTitle.trim()) return;
    updatePageMutation.mutate({ id: editingPage.id, title: editTitle.trim() });
  };

  const startSession = (pageId: string) => {
    startSessionMutation.mutate(pageId);
  };

  return (
    <div className="w-64 h-full bg-background border-r border-muted flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-muted">
        <h2 className="text-sm font-semibold mb-3">My Pages</h2>

        {/* Create Page Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 bg-[#313244]/50 border-[#45475a] hover:bg-[#45475a] hover:border-[#7c3aed]/50 text-[#cdd6f4]">
              <Plus size={16} />
              New Page
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1e1e2e] border-[#313244]">
            <DialogHeader>
              <DialogTitle className="text-[#cdd6f4]">Create New Page</DialogTitle>
              <DialogDescription className="text-[#6c7086]">
                Give your page a name to get started.
              </DialogDescription>
            </DialogHeader>
            <Input
              value={newPageTitle}
              onChange={(e) => setNewPageTitle(e.target.value)}
              placeholder="Untitled Page"
              onKeyDown={(e) => e.key === "Enter" && createPage()}
              className="bg-[#11111b] border-[#313244] text-[#cdd6f4] placeholder-[#45475a]"
            />
            <DialogFooter>
              <Button
                onClick={createPage}
                disabled={!newPageTitle.trim() || createPageMutation.isPending}
                className="bg-[#7c3aed] hover:bg-[#9333ea] text-white">
                {createPageMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pages List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-[#313244]/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : pages.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Paintbrush size={32} className="mx-auto text-[#45475a] mb-2" />
              <p className="text-sm text-[#6c7086]">No pages yet</p>
              <p className="text-xs text-[#45475a]">Create your first page to get started</p>
            </div>
          ) : (
            <div className="space-y-1">
              {pages.map((page) => (
                <Link
                  preload={false}
                  key={page.id}
                  to="/pages/$pageId"
                  params={{ pageId: page.id }}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors no-underline ${currentPageId === page.id
                      ? "bg-[#7c3aed]/20 border border-[#7c3aed]/50"
                      : "hover:bg-[#313244]/50 border border-transparent"
                    }`}>
                  <Paintbrush
                    size={16}
                    className={currentPageId === page.id ? "text-[#b4befe]" : "text-[#6c7086]"}
                  />
                  <span
                    className={`flex-1 text-sm truncate ${currentPageId === page.id ? "text-[#cdd6f4]" : "text-[#a6adc8]"
                      }`}>
                    {page.title}
                  </span>

                  {page.isLocked ? (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                    </div>
                  ) : null}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal size={14} className="text-[#6c7086]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-[#1e1e2e] border-[#313244]">
                      <DropdownMenuItem
                        className="text-[#cdd6f4] hover:bg-[#313244] cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPage(page);
                          setEditTitle(page.title);
                        }}>
                        <Edit2 size={14} className="mr-2" />
                        Rename
                      </DropdownMenuItem>
                      {!page.isLocked && (
                        <>
                          <DropdownMenuSeparator className="bg-[#313244]" />
                          <DropdownMenuItem
                            className="text-[#a6e3a1] hover:bg-[#313244] cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              startSession(page.id);
                            }}>
                            <Users size={14} className="mr-2" />
                            Start Session
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator className="bg-[#313244]" />
                      <DropdownMenuItem
                        className="text-[#f38ba8] hover:bg-[#313244] cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePage(page.id);
                        }}>
                        <Trash2 size={14} className="mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Link>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Edit Page Dialog */}
      <Dialog open={!!editingPage} onOpenChange={(open) => !open && setEditingPage(null)}>
        <DialogContent className="bg-[#1e1e2e] border-[#313244]">
          <DialogHeader>
            <DialogTitle className="text-[#cdd6f4]">Rename Page</DialogTitle>
          </DialogHeader>
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && updatePage()}
            className="bg-[#11111b] border-[#313244] text-[#cdd6f4]"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingPage(null)}
              className="border-[#313244] text-[#cdd6f4]">
              Cancel
            </Button>
            <Button
              onClick={updatePage}
              disabled={!editTitle.trim()}
              className="bg-[#7c3aed] hover:bg-[#9333ea] text-white">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

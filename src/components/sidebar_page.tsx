// import { Card, CardContent } from '@/components/ui/card'
import {
   Sidebar,
   SidebarContent,
   SidebarGroup,
   SidebarGroupContent,
   SidebarGroupLabel,
   SidebarInset,
   SidebarMenu,
   SidebarMenuBadge,
   SidebarMenuButton,
   SidebarMenuItem,
   SidebarProvider,
   SidebarTrigger
} from '@/components/ui/sidebar'
import { ChartNoAxesCombinedIcon, MoreHorizontal, Paintbrush, Trash2, Users, Edit2, PlusIcon } from 'lucide-react'
import type { PropsWithChildren } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from "@/lib/auth-client";
import { getPagesByUser, type Page, deletePage as apiDeletePage, createPage as apiCreatePage } from '@/lib/page-api'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'
import { Button } from './ui/button'
import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';

const SidebarPage = ({ children }: PropsWithChildren) => {
   const navigate = useNavigate();
   const queryClient = useQueryClient();
   const { data: session } = useSession();
   const { data: pages = [], isLoading } = useQuery({
      queryKey: ["pages", session?.user?.id],
      queryFn: () => getPagesByUser(session!.user.id),
      enabled: !!session?.user?.id,
   });

   const [isCreatePage, setCreatePage] = React.useState(false);
   const { pageId: currentPageId } = useParams({ strict: false });
   const [newPageTitle, setNewPageTitle] = React.useState("");
   const [editingPage, setEditingPage] = React.useState<Page | null>(null);
   const [editTitle, setEditTitle] = React.useState("");

   const createPageMutation = useMutation({
      mutationFn: (title: string) => apiCreatePage(title),
      onSuccess: (newPage) => {
         queryClient.invalidateQueries({ queryKey: ["pages"] });
         setNewPageTitle("");
         setCreatePage(false);
         navigate({ to: "/pages/$pageId", params: { pageId: newPage.id } });
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

   const createPage = () => {
      if (!newPageTitle.trim()) return;
      createPageMutation.mutate(newPageTitle.trim());
   };

   const deletePage = (pageId: string) => {
      deletePageMutation.mutate(pageId);
   };

   return (
      <>
         {/* Create Page Dialog */}
         <Dialog open={isCreatePage} onOpenChange={setCreatePage}>
            <DialogContent className="">
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

         <SidebarContent className="h-full bg-transparent overflow-y-auto overflow-x-hidden">
                  <SidebarGroup>
                     <SidebarGroupContent>
                        <SidebarMenu>
                           <SidebarMenuItem>
                              <SidebarMenuButton asChild>
                                 <a href='#'>
                                    <ChartNoAxesCombinedIcon />
                                    <span>Dashboard</span>
                                 </a>
                              </SidebarMenuButton>
                              <SidebarMenuBadge className='bg-primary/10 top-1/2! right-2 -translate-y-1/2! rounded-full'>
                                 5
                              </SidebarMenuBadge>
                           </SidebarMenuItem>
                        </SidebarMenu>
                     </SidebarGroupContent>
                  </SidebarGroup>
                  <SidebarGroup>
                     <SidebarGroupLabel className='w-full flex items-center justify-between'>
                        <span>
                           Pages
                        </span>
                        <Button
                           onClick={() => {
                              setCreatePage(true);
                           }}
                           size={"xs"} variant={"ghost"}>
                           <PlusIcon width={12} />
                        </Button>
                     </SidebarGroupLabel>
                     <SidebarGroupContent className='group'>
                        <SidebarMenu>
                           {isLoading ? (
                              <div className="space-y-2">
                                 {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-10 bg-[#313244]/50 rounded-lg animate-pulse" />
                                 ))}
                              </div>
                           ) : pages.length === 0 ? (
                              <div className="text-center py-8 px-4">
                                 <Paintbrush size={32} className="mx-auto text-[#45475a] mb-2" />
                                 <p className="text-sm text-muted-foreground">No pages yet</p>
                                 <p className="text-xs text-muted-foreground">Create your first page to get started</p>
                              </div>
                           ) : (
                              pages.map((page) => (
                                 <SidebarMenuItem key={page.id}>
                                    <SidebarMenuButton asChild
                                       className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors no-underline ${currentPageId === page.id
                                          ? "text-foreground"
                                          : "hover:bg-muted text-muted-foreground"
                                          }`}>
                                       <Link
                                          preload={false}
                                          to="/pages/$pageId"
                                          params={{ pageId: page.id }}
                                       >
                                          <Paintbrush
                                             size={16}
                                             className={currentPageId === page.id ? "text-foreground" : "text-muted-foreground"}
                                          />
                                          <span
                                             className={`flex-1 text-sm truncate ${currentPageId === page.id ? "text-foreground" : "text-muted-foreground"
                                                }`}>
                                             {page.title}
                                          </span>

                                          {page.isLocked ? (
                                             <div className="flex items-center gap-1">
                                                <div className="w-2 h-2 rounded-full" />
                                             </div>
                                          ) : null}

                                          <DropdownMenu>
                                             <DropdownMenuTrigger asChild>
                                                <Button
                                                   variant="ghost"
                                                   size="icon"
                                                   className="opacity-0 data-[state=open]:opacity-100 group-hover:opacity-100 transition-opacity"
                                                   onClick={(e) => e.stopPropagation()}>
                                                   <MoreHorizontal size={14} className="text-[#6c7086]" />
                                                </Button>
                                             </DropdownMenuTrigger>
                                             <DropdownMenuContent>
                                                <DropdownMenuItem
                                                   className="text-xs"
                                                   onClick={(e) => {
                                                      e.stopPropagation();
                                                      setEditingPage(page);
                                                      setEditTitle(page.title);
                                                   }}>
                                                   <Edit2 size={12} />
                                                   Rename
                                                </DropdownMenuItem>
                                                {!page.isLocked && (
                                                   <>
                                                      <DropdownMenuSeparator />
                                                      <DropdownMenuItem
                                                         className="text-[#a6e3a1] hover:bg-[#313244] text-xs cursor-pointer"
                                                         onClick={(e) => {
                                                            e.stopPropagation();
                                                            // startSession(page.id);
                                                         }}>
                                                         <Users width={1} />
                                                         <span>
                                                            Start Session
                                                         </span>
                                                      </DropdownMenuItem>
                                                   </>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                   className="cursor-pointer text-xs"
                                                   onClick={(e) => {
                                                      e.stopPropagation();
                                                      deletePage(page.id);
                                                   }}>
                                                   <Trash2 size={14} />
                                                   Delete
                                                </DropdownMenuItem>
                                             </DropdownMenuContent>
                                          </DropdownMenu>
                                       </Link>
                                    </SidebarMenuButton>
                                 </SidebarMenuItem>
                              ))
                           )}
                        </SidebarMenu>
                     </SidebarGroupContent>
                  </SidebarGroup>
                  <SidebarGroup>
                     <SidebarGroupLabel>Supporting Features</SidebarGroupLabel>
                     <SidebarGroupContent>

                     </SidebarGroupContent>
                  </SidebarGroup>
               </SidebarContent>
      </>
   )
}

export default SidebarPage

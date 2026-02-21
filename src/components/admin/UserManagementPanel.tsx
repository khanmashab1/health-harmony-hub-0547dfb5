import { useState } from "react";
import { format } from "date-fns";
import {
  Users, Search, MoreHorizontal, Trash2, Eye, X,
  Phone, MapPin, Calendar, Droplets, User, ChevronLeft, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function UserManagementPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const perPage = 15;
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<any>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users-detailed", search, roleFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,patient_id.ilike.%${search}%`);
      }
      if (roleFilter !== "all") {
        query = query.eq("role", roleFilter as any);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return data;
    },
  });

  const updateUserStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-detailed"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "User status updated" });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId },
      });
      if (error) throw error;
      if (data?.error && !data.error.includes("User not found")) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-detailed"] });
      queryClient.invalidateQueries({ queryKey: ["admin-doctors"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setDeleteConfirmUser(null);
      toast({ title: "User permanently deleted" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to delete user", description: error.message });
    },
  });

  const paginatedUsers = users?.slice((page - 1) * perPage, page * perPage) || [];
  const totalPages = Math.ceil((users?.length || 0) / perPage);

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const hasFilters = search || roleFilter !== "all" || statusFilter !== "all";

  return (
    <Card variant="glass" className="border-border/50 dark:border-border/30 dark:bg-card/50">
      <CardHeader className="border-b border-border/30 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              User Management
              {users && <Badge variant="secondary" className="ml-2">{users.length}</Badge>}
            </CardTitle>
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search name, phone, patient ID..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9 border-border/50" />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-36 border-border/50"><SelectValue placeholder="All Roles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="patient">Patient</SelectItem>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="pa">PA</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="pharmacy">Pharmacy</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-36 border-border/50"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : paginatedUsers.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden sm:table-cell">Phone</TableHead>
                    <TableHead className="hidden md:table-cell">City</TableHead>
                    <TableHead className="hidden lg:table-cell">Gender</TableHead>
                    <TableHead className="hidden lg:table-cell">Joined</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-semibold">{u.name || "—"}</p>
                          {u.patient_id && <p className="text-xs text-muted-foreground">{u.patient_id}</p>}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="capitalize text-xs">{u.role}</Badge></TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{u.phone || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{u.city || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm capitalize">{u.gender || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                        {u.created_at ? format(new Date(u.created_at), "dd MMM yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={u.status === "Active" ? "status-completed" : "status-pending"}>{u.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedUser(u); setDetailOpen(true); }}>
                              <Eye className="w-4 h-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateUserStatus.mutate({ userId: u.id, status: u.status === "Active" ? "Inactive" : "Active" })}>
                              {u.status === "Active" ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirmUser(u)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Permanently Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/30">
                <p className="text-xs text-muted-foreground">
                  Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, users?.length || 0)} of {users?.length}
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-center py-8 text-muted-foreground">No users found</p>
        )}
      </CardContent>

      {/* User Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <DetailItem icon={User} label="Name" value={selectedUser.name} />
                <DetailItem icon={User} label="Role" value={selectedUser.role} className="capitalize" />
                <DetailItem icon={Phone} label="Phone" value={selectedUser.phone} />
                <DetailItem icon={User} label="Gender" value={selectedUser.gender} className="capitalize" />
                <DetailItem icon={Calendar} label="Date of Birth" value={selectedUser.date_of_birth ? format(new Date(selectedUser.date_of_birth), "dd MMM yyyy") : null} />
                <DetailItem icon={User} label="Age" value={selectedUser.age?.toString()} />
                <DetailItem icon={Droplets} label="Blood Type" value={selectedUser.blood_type} />
                <DetailItem icon={User} label="Patient ID" value={selectedUser.patient_id} />
                <DetailItem icon={MapPin} label="City" value={selectedUser.city} />
                <DetailItem icon={MapPin} label="Province" value={selectedUser.province} />
              </div>
              <div className="pt-2 border-t border-border/30">
                <DetailItem icon={Calendar} label="Joined" value={selectedUser.created_at ? format(new Date(selectedUser.created_at), "dd MMM yyyy, hh:mm a") : null} />
              </div>
              <div className="flex items-center justify-between pt-2">
                <Badge className={selectedUser.status === "Active" ? "status-completed" : "status-pending"}>{selectedUser.status}</Badge>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { setDetailOpen(false); setDeleteConfirmUser(selectedUser); }}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmUser} onOpenChange={(open) => !open && setDeleteConfirmUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Permanently Delete User</DialogTitle>
            <DialogDescription>
              This will permanently remove <strong>{deleteConfirmUser?.name || "this user"}</strong> ({deleteConfirmUser?.role}) and all their related data including appointments, prescriptions, and records. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmUser(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteUser.mutate(deleteConfirmUser.id)}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? "Deleting..." : "Yes, Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function DetailItem({ icon: Icon, label, value, className }: { icon: any; label: string; value: string | null | undefined; className?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </p>
      <p className={`text-sm font-medium ${className || ""}`}>{value || "—"}</p>
    </div>
  );
}

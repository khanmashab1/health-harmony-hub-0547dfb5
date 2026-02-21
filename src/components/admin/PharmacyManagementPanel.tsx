import { useState } from "react";
import { format } from "date-fns";
import { Plus, Search, Pencil, Trash2, Package, Check, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface PharmacyFormData {
  name: string;
  address: string;
  phone: string;
  email: string;
  license_number: string;
  owner_email: string;
  owner_name: string;
}

const initialForm: PharmacyFormData = {
  name: "", address: "", phone: "", email: "", license_number: "",
  owner_email: "", owner_name: "",
};

export function PharmacyManagementPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<PharmacyFormData>(initialForm);

  const { data: pharmacies, isLoading } = useQuery({
    queryKey: ["admin-pharmacies", search],
    queryFn: async () => {
      const { data, error } = await supabase.from("pharmacies").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      if (search) {
        const term = search.toLowerCase();
        return data.filter(p => p.name.toLowerCase().includes(term) || p.email?.toLowerCase().includes(term));
      }
      return data;
    },
  });

  // Fetch owner profiles for display
  const { data: ownerProfiles } = useQuery({
    queryKey: ["pharmacy-owners", pharmacies?.map(p => p.owner_user_id)],
    queryFn: async () => {
      if (!pharmacies || pharmacies.length === 0) return [];
      const ownerIds = pharmacies.map(p => p.owner_user_id);
      const { data, error } = await supabase.from("profiles").select("id, name").in("id", ownerIds);
      if (error) throw error;
      return data;
    },
    enabled: !!pharmacies && pharmacies.length > 0,
  });

  const createPharmacy = useMutation({
    mutationFn: async (data: PharmacyFormData) => {
      // 1. Use edge function to create pharmacy owner with invite (no password needed)
      const { data: result, error: fnError } = await supabase.functions.invoke("create-pharmacy-owner", {
        body: {
          ownerEmail: data.owner_email,
          ownerName: data.owner_name,
          pharmacyName: data.name,
          pharmacyAddress: data.address || null,
          pharmacyPhone: data.phone || null,
          pharmacyEmail: data.email || null,
          licenseNumber: data.license_number || null,
        },
      });
      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pharmacies"] });
      toast({ title: "Pharmacy created successfully", description: "The pharmacy owner will receive an email to set their password." });
      setIsDialogOpen(false);
      setFormData(initialForm);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Failed to create pharmacy", description: err.message });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("pharmacies").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pharmacies"] });
      toast({ title: "Status updated" });
    },
  });

  const deletePharmacy = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pharmacies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pharmacies"] });
      toast({ title: "Pharmacy deleted" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  return (
    <Card variant="glass" className="border-border/50 dark:border-border/30 dark:bg-card/50">
      <CardHeader className="border-b border-border/30 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-teal-600" />Pharmacy Management</CardTitle>
            <CardDescription>Create and manage pharmacy accounts</CardDescription>
          </div>
          <Button onClick={() => { setFormData(initialForm); setIsDialogOpen(true); }} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-2" />Add Pharmacy
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search pharmacies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
        ) : pharmacies && pharmacies.length > 0 ? (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Owner</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead className="hidden lg:table-cell">License</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pharmacies.map(pharmacy => {
                  const owner = ownerProfiles?.find(p => p.id === pharmacy.owner_user_id);
                  return (
                    <TableRow key={pharmacy.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div>
                          <p className="font-medium">{pharmacy.name}</p>
                          {pharmacy.address && <p className="text-xs text-muted-foreground">{pharmacy.address}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{owner?.name || "-"}</TableCell>
                      <TableCell className="hidden md:table-cell">{pharmacy.phone || "-"}</TableCell>
                      <TableCell className="hidden lg:table-cell">{pharmacy.license_number || "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => toggleActive.mutate({ id: pharmacy.id, is_active: !pharmacy.is_active })}
                          className={pharmacy.is_active ? "text-green-600" : "text-muted-foreground"}>
                          {pharmacy.is_active ? <><Check className="w-4 h-4 mr-1" />Active</> : <><X className="w-4 h-4 mr-1" />Inactive</>}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deletePharmacy.mutate(pharmacy.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No pharmacies yet</p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />Add First Pharmacy
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Pharmacy</DialogTitle>
            <DialogDescription>Set up a new pharmacy with an owner account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pharmacy Name *</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="City Pharmacy" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>License Number</Label>
                <Input value={formData.license_number} onChange={e => setFormData({...formData, license_number: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Owner Account</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Owner Name *</Label>
                  <Input value={formData.owner_name} onChange={e => setFormData({...formData, owner_name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Owner Email *</Label>
                  <Input type="email" value={formData.owner_email} onChange={e => setFormData({...formData, owner_email: e.target.value})} />
                </div>
                <p className="text-xs text-muted-foreground">The owner will receive an email to set their own password.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createPharmacy.mutate(formData)}
              disabled={createPharmacy.isPending || !formData.name || !formData.owner_email || !formData.owner_name}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {createPharmacy.isPending ? "Creating..." : "Create Pharmacy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

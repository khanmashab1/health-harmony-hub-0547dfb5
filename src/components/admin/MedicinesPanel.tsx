import { useState } from "react";
import { format } from "date-fns";
import { Plus, Search, Pencil, Trash2, Pill, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const MEDICINE_CATEGORIES = [
  "Antibiotic",
  "Analgesic",
  "Antipyretic",
  "Antacid",
  "Antihistamine",
  "Antihypertensive",
  "Antidiabetic",
  "Cardiovascular",
  "Respiratory",
  "Gastrointestinal",
  "Dermatological",
  "Neurological",
  "Vitamin/Supplement",
  "Other"
];

const MEDICINE_FORMS = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Injection",
  "Cream",
  "Ointment",
  "Drops",
  "Inhaler",
  "Powder",
  "Suspension"
];

interface MedicineFormData {
  name: string;
  generic_name: string;
  category: string;
  strength: string;
  form: string;
  manufacturer: string;
  is_active: boolean;
}

const initialFormData: MedicineFormData = {
  name: "",
  generic_name: "",
  category: "",
  strength: "",
  form: "",
  manufacturer: "",
  is_active: true,
};

export function MedicinesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<any>(null);
  const [formData, setFormData] = useState<MedicineFormData>(initialFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch medicines
  const { data: medicines, isLoading } = useQuery({
    queryKey: ["admin-medicines", searchTerm, categoryFilter],
    queryFn: async () => {
      let query = supabase.from("medicines").select("*").order("name", { ascending: true });
      
      if (categoryFilter && categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Client-side search filtering
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return data.filter(m => 
          m.name.toLowerCase().includes(term) ||
          m.generic_name?.toLowerCase().includes(term) ||
          m.manufacturer?.toLowerCase().includes(term)
        );
      }
      
      return data;
    },
  });

  // Create medicine mutation
  const createMedicine = useMutation({
    mutationFn: async (data: MedicineFormData) => {
      const { error } = await supabase.from("medicines").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-medicines"] });
      toast({ title: "Medicine added successfully" });
      closeDialog();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to add medicine", description: error.message });
    },
  });

  // Update medicine mutation
  const updateMedicine = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MedicineFormData }) => {
      const { error } = await supabase.from("medicines").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-medicines"] });
      toast({ title: "Medicine updated successfully" });
      closeDialog();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to update medicine", description: error.message });
    },
  });

  // Delete medicine mutation
  const deleteMedicine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("medicines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-medicines"] });
      toast({ title: "Medicine deleted successfully" });
      setDeleteConfirmId(null);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to delete medicine", description: error.message });
    },
  });

  // Toggle active status
  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("medicines").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-medicines"] });
      toast({ title: "Status updated" });
    },
  });

  const openAddDialog = () => {
    setEditingMedicine(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const openEditDialog = (medicine: any) => {
    setEditingMedicine(medicine);
    setFormData({
      name: medicine.name || "",
      generic_name: medicine.generic_name || "",
      category: medicine.category || "",
      strength: medicine.strength || "",
      form: medicine.form || "",
      manufacturer: medicine.manufacturer || "",
      is_active: medicine.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingMedicine(null);
    setFormData(initialFormData);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ variant: "destructive", title: "Medicine name is required" });
      return;
    }

    if (editingMedicine) {
      updateMedicine.mutate({ id: editingMedicine.id, data: formData });
    } else {
      createMedicine.mutate(formData);
    }
  };

  return (
    <Card variant="glass" className="border-border/50 dark:border-border/30 dark:bg-card/50">
      <CardHeader className="border-b border-border/30 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-emerald-600" />
              Medicine Inventory
            </CardTitle>
            <CardDescription>Manage the medicine catalog for prescriptions</CardDescription>
          </div>
          <Button onClick={openAddDialog} variant="hero" className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Medicine
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search medicines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {MEDICINE_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : medicines && medicines.length > 0 ? (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Generic Name</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="hidden lg:table-cell">Form</TableHead>
                  <TableHead className="hidden lg:table-cell">Strength</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medicines.map((medicine) => (
                  <TableRow key={medicine.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{medicine.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {medicine.generic_name || "-"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {medicine.category && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          {medicine.category}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{medicine.form || "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{medicine.strength || "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive.mutate({ id: medicine.id, is_active: !medicine.is_active })}
                        className={medicine.is_active ? "text-green-600 hover:text-green-700" : "text-muted-foreground"}
                      >
                        {medicine.is_active ? (
                          <><Check className="w-4 h-4 mr-1" /> Active</>
                        ) : (
                          <><X className="w-4 h-4 mr-1" /> Inactive</>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(medicine)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {deleteConfirmId === medicine.id ? (
                          <div className="flex gap-1">
                            <Button 
                              variant="destructive" 
                              size="icon"
                              onClick={() => deleteMedicine.mutate(medicine.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteConfirmId(medicine.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4">
              <Pill className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">No medicines found</p>
            <Button onClick={openAddDialog} variant="hero" className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Medicine
            </Button>
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMedicine ? "Edit Medicine" : "Add New Medicine"}</DialogTitle>
            <DialogDescription>
              {editingMedicine ? "Update the medicine details" : "Add a new medicine to the catalog"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Medicine Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Paracetamol"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Generic Name</Label>
              <Input
                value={formData.generic_name}
                onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                placeholder="e.g., Acetaminophen"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDICINE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Form</Label>
                <Select value={formData.form} onValueChange={(value) => setFormData({ ...formData, form: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDICINE_FORMS.map((form) => (
                      <SelectItem key={form} value={form}>{form}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Strength</Label>
                <Input
                  value={formData.strength}
                  onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                  placeholder="e.g., 500mg"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Manufacturer</Label>
                <Input
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="e.g., GSK"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMedicine.isPending || updateMedicine.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {createMedicine.isPending || updateMedicine.isPending ? "Saving..." : editingMedicine ? "Update" : "Add Medicine"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

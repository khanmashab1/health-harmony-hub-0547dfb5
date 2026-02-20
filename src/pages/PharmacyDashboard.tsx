import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import {
  Package, Search, Plus, Pill, ShoppingCart, TrendingUp, AlertTriangle,
  BarChart3, DollarSign, QrCode, Truck, LogOut, Check, X, Pencil, Trash2,
  Eye, FileText, ArrowUpDown, ChevronDown, Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Layout } from "@/components/layout/Layout";
import { useRequireAuth, useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { parseMedicines } from "@/components/shared/MedicinesList";
import { QrScannerDialog } from "@/components/pharmacy/QrScannerDialog";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell, LineChart, Line
} from "recharts";

export default function PharmacyDashboard() {
  const { user, profile, loading } = useRequireAuth(["pharmacy"] as any);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pharmacy
  const { data: pharmacy } = useQuery({
    queryKey: ["my-pharmacy", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacies")
        .select("*")
        .eq("owner_user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (loading) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-emerald-50/20 dark:from-background dark:via-background dark:to-background">
          <div className="container mx-auto px-4 py-8">
            <Skeleton className="h-12 w-64 mb-8" />
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!pharmacy) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold mb-2">No Pharmacy Found</h2>
              <p className="text-muted-foreground">Your pharmacy account has not been set up yet. Please contact the administrator.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-emerald-50/20 dark:from-background dark:via-background dark:to-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{pharmacy.name}</h1>
                <p className="text-muted-foreground font-medium">Pharmacy Dashboard</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate("/"); }}>
              <LogOut className="w-4 h-4 mr-2" />Sign Out
            </Button>
          </motion.div>

          {/* Stats */}
          <PharmacyStats pharmacyId={pharmacy.id} />

          {/* Tabs */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Tabs defaultValue="inventory" className="space-y-6">
              <TabsList className="bg-muted/80 dark:bg-muted/50 backdrop-blur-sm border border-border/50 p-1.5 rounded-xl shadow-sm flex flex-wrap h-auto gap-1 justify-start">
                <TabsTrigger value="inventory" className="rounded-lg text-xs sm:text-sm px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <Package className="w-4 h-4 mr-1" />Inventory
                </TabsTrigger>
                <TabsTrigger value="scan" className="rounded-lg text-xs sm:text-sm px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <QrCode className="w-4 h-4 mr-1" />Scan Rx
                </TabsTrigger>
                <TabsTrigger value="sales" className="rounded-lg text-xs sm:text-sm px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <ShoppingCart className="w-4 h-4 mr-1" />Sales
                </TabsTrigger>
                <TabsTrigger value="orders" className="rounded-lg text-xs sm:text-sm px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <Truck className="w-4 h-4 mr-1" />Orders
                </TabsTrigger>
                <TabsTrigger value="analytics" className="rounded-lg text-xs sm:text-sm px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                  <BarChart3 className="w-4 h-4 mr-1" />Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="inventory">
                <InventoryPanel pharmacyId={pharmacy.id} />
              </TabsContent>
              <TabsContent value="scan">
                <ScanPrescriptionPanel pharmacyId={pharmacy.id} />
              </TabsContent>
              <TabsContent value="sales">
                <SalesPanel pharmacyId={pharmacy.id} />
              </TabsContent>
              <TabsContent value="orders">
                <SupplierOrdersPanel pharmacyId={pharmacy.id} />
              </TabsContent>
              <TabsContent value="analytics">
                <AnalyticsPanel pharmacyId={pharmacy.id} />
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}

// ─── Stats Component ────────────────────────────────────────
function PharmacyStats({ pharmacyId }: { pharmacyId: string }) {
  const { data: stats } = useQuery({
    queryKey: ["pharmacy-stats", pharmacyId],
    queryFn: async () => {
      const [inventoryRes, lowStockRes, salesTodayRes, totalSalesRes] = await Promise.all([
        supabase.from("pharmacy_inventory").select("id", { count: "exact", head: true }).eq("pharmacy_id", pharmacyId).eq("is_active", true),
        supabase.from("pharmacy_inventory").select("id", { count: "exact", head: true }).eq("pharmacy_id", pharmacyId).eq("is_active", true).lte("quantity_in_stock", 10),
        supabase.from("pharmacy_sales").select("net_amount").eq("pharmacy_id", pharmacyId).gte("created_at", format(new Date(), "yyyy-MM-dd")),
        supabase.from("pharmacy_sales").select("id", { count: "exact", head: true }).eq("pharmacy_id", pharmacyId),
      ]);
      const todayRevenue = salesTodayRes.data?.reduce((sum, s) => sum + Number(s.net_amount || 0), 0) || 0;
      return {
        totalItems: inventoryRes.count || 0,
        lowStock: lowStockRes.count || 0,
        todayRevenue,
        totalSales: totalSalesRes.count || 0,
      };
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[
        { label: "Medicines", value: stats?.totalItems || 0, icon: Pill, color: "from-emerald-500 to-emerald-600" },
        { label: "Low Stock", value: stats?.lowStock || 0, icon: AlertTriangle, color: "from-red-500 to-red-600" },
        { label: "Today Revenue", value: `₨${(stats?.todayRevenue || 0).toLocaleString()}`, icon: DollarSign, color: "from-blue-500 to-blue-600" },
        { label: "Total Sales", value: stats?.totalSales || 0, icon: ShoppingCart, color: "from-purple-500 to-purple-600" },
      ].map((stat, index) => (
        <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + index * 0.05 }}>
          <Card variant="glass" className="border-border/50 dark:border-border/30 hover:shadow-lg transition-all dark:bg-card/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── Inventory Panel ────────────────────────────────────────
function InventoryPanel({ pharmacyId }: { pharmacyId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({
    medicine_name: "", generic_name: "", category: "", form: "", strength: "",
    manufacturer: "", batch_number: "", expiry_date: "", quantity_in_stock: 0,
    reorder_level: 10, unit_cost: 0, selling_price: 0,
  });

  const { data: inventory, isLoading } = useQuery({
    queryKey: ["pharmacy-inventory", pharmacyId, search],
    queryFn: async () => {
      let query = supabase.from("pharmacy_inventory").select("*").eq("pharmacy_id", pharmacyId).order("medicine_name");
      const { data, error } = await query;
      if (error) throw error;
      if (search) {
        const term = search.toLowerCase();
        return data.filter(i => i.medicine_name.toLowerCase().includes(term) || i.generic_name?.toLowerCase().includes(term));
      }
      return data;
    },
  });

  const saveMedicine = useMutation({
    mutationFn: async (data: any) => {
      if (editing) {
        const { error } = await supabase.from("pharmacy_inventory").update(data).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pharmacy_inventory").insert({ ...data, pharmacy_id: pharmacyId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-stats"] });
      toast({ title: editing ? "Medicine updated" : "Medicine added" });
      setIsDialogOpen(false);
      setEditing(null);
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const deleteMedicine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pharmacy_inventory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-stats"] });
      toast({ title: "Medicine removed" });
    },
  });

  const openAdd = () => {
    setEditing(null);
    setFormData({ medicine_name: "", generic_name: "", category: "", form: "", strength: "", manufacturer: "", batch_number: "", expiry_date: "", quantity_in_stock: 0, reorder_level: 10, unit_cost: 0, selling_price: 0 });
    setIsDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setFormData({
      medicine_name: item.medicine_name, generic_name: item.generic_name || "", category: item.category || "",
      form: item.form || "", strength: item.strength || "", manufacturer: item.manufacturer || "",
      batch_number: item.batch_number || "", expiry_date: item.expiry_date || "",
      quantity_in_stock: item.quantity_in_stock, reorder_level: item.reorder_level || 10,
      unit_cost: item.unit_cost || 0, selling_price: item.selling_price || 0,
    });
    setIsDialogOpen(true);
  };

  return (
    <Card variant="glass" className="border-border/50 dark:border-border/30 dark:bg-card/50">
      <CardHeader className="border-b border-border/30 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-emerald-600" />Medicine Inventory</CardTitle>
            <CardDescription>Manage your stock</CardDescription>
          </div>
          <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />Add Medicine
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search medicines..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {!search.trim() ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Type to search medicines in your inventory</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12" />)}</div>
        ) : inventory && inventory.length > 0 ? (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="hidden md:table-cell">Cost</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="hidden lg:table-cell">Expiry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map(item => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.medicine_name}</p>
                        {item.generic_name && <p className="text-xs text-muted-foreground">{item.generic_name}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {item.category && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">{item.category}</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge className={item.quantity_in_stock <= (item.reorder_level || 10) ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400" : "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400"}>
                        {item.quantity_in_stock}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">₨{Number(item.unit_cost).toLocaleString()}</TableCell>
                    <TableCell>₨{Number(item.selling_price).toLocaleString()}</TableCell>
                    <TableCell className="hidden lg:table-cell">{item.expiry_date ? format(new Date(item.expiry_date), "MMM yyyy") : "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMedicine.mutate(item.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No medicines found for "{search}"</p>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Medicine" : "Add Medicine"}</DialogTitle>
            <DialogDescription>Fill in the medicine details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Medicine Name *</Label>
                <Input value={formData.medicine_name} onChange={e => setFormData({...formData, medicine_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Generic Name</Label>
                <Input value={formData.generic_name} onChange={e => setFormData({...formData, generic_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Form</Label>
                <Input value={formData.form} onChange={e => setFormData({...formData, form: e.target.value})} placeholder="Tablet, Syrup..." />
              </div>
              <div className="space-y-2">
                <Label>Strength</Label>
                <Input value={formData.strength} onChange={e => setFormData({...formData, strength: e.target.value})} placeholder="500mg" />
              </div>
              <div className="space-y-2">
                <Label>Manufacturer</Label>
                <Input value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Batch Number</Label>
                <Input value={formData.batch_number} onChange={e => setFormData({...formData, batch_number: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input type="date" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" value={formData.quantity_in_stock} onChange={e => setFormData({...formData, quantity_in_stock: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Reorder Level</Label>
                <Input type="number" value={formData.reorder_level} onChange={e => setFormData({...formData, reorder_level: parseInt(e.target.value) || 10})} />
              </div>
              <div className="space-y-2">
                <Label>Cost Price (₨)</Label>
                <Input type="number" value={formData.unit_cost} onChange={e => setFormData({...formData, unit_cost: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Selling Price (₨) *</Label>
                <Input type="number" value={formData.selling_price} onChange={e => setFormData({...formData, selling_price: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMedicine.mutate(formData)} disabled={saveMedicine.isPending || !formData.medicine_name} className="bg-emerald-600 hover:bg-emerald-700">
              {saveMedicine.isPending ? "Saving..." : editing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Scan Prescription Panel ────────────────────────────────
function ScanPrescriptionPanel({ pharmacyId }: { pharmacyId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [appointmentId, setAppointmentId] = useState("");
  const [prescription, setPrescription] = useState<any>(null);
  const [loadingRx, setLoadingRx] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const lookupById = async (id: string) => {
    if (!id.trim()) return;
    setLoadingRx(true);
    try {
      const { data, error } = await supabase.rpc("get_prescription_verification", {
        p_appointment_id: id.trim(),
      });
      if (error) throw error;
      setPrescription(data);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Prescription not found", description: err.message });
      setPrescription(null);
    } finally {
      setLoadingRx(false);
    }
  };

  const lookupPrescription = () => lookupById(appointmentId);

  const handleScanResult = useCallback((scannedId: string) => {
    setAppointmentId(scannedId);
    lookupById(scannedId);
  }, []);

  const createSaleFromPrescription = useMutation({
    mutationFn: async () => {
      if (!prescription) return;
      const medicines = parseMedicines(prescription.medicines);
      const totalAmount = medicines.length * 100; // placeholder - you'd calculate from inventory prices

      const { data: sale, error: saleError } = await supabase.from("pharmacy_sales").insert({
        pharmacy_id: pharmacyId,
        prescription_id: prescription.id,
        patient_name: prescription.patient_full_name,
        patient_phone: prescription.patient_phone,
        total_amount: totalAmount,
        net_amount: totalAmount,
        payment_method: "Cash",
        payment_status: "Paid",
        sold_by: (await supabase.auth.getUser()).data.user?.id,
      }).select().single();
      if (saleError) throw saleError;

      // Add sale items
      if (medicines.length > 0) {
        const items = medicines.map(m => ({
          sale_id: sale.id,
          medicine_name: m.name,
          quantity: 1,
          unit_price: 100,
          total_price: 100,
        }));
        const { error: itemsError } = await supabase.from("pharmacy_sale_items").insert(items);
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-sales"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-stats"] });
      toast({ title: "Sale created from prescription" });
      setPrescription(null);
      setAppointmentId("");
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Error creating sale", description: err.message }),
  });

  return (
    <Card variant="glass" className="border-border/50 dark:border-border/30 dark:bg-card/50">
      <CardHeader className="border-b border-border/30 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10">
        <CardTitle className="flex items-center gap-2"><QrCode className="w-5 h-5 text-blue-600" />Scan Prescription</CardTitle>
        <CardDescription>Scan QR code or enter appointment ID to look up prescriptions</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex gap-3 mb-6">
          <Input
            placeholder="Enter Appointment ID from QR code..."
            value={appointmentId}
            onChange={(e) => setAppointmentId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookupPrescription()}
            className="flex-1"
          />
          <Button variant="outline" onClick={() => setScannerOpen(true)} className="gap-2 border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30">
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Scan</span>
          </Button>
          <Button onClick={lookupPrescription} disabled={loadingRx} className="bg-blue-600 hover:bg-blue-700">
            {loadingRx ? "Looking up..." : "Look Up"}
          </Button>
        </div>

        <QrScannerDialog
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={handleScanResult}
        />

        {prescription && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Patient</p>
                    <p className="font-medium">{prescription.patient_full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Doctor</p>
                    <p className="font-medium">{prescription.doctor_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium">{prescription.appointment_date}</p>
                  </div>
                  {prescription.diagnosis && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Diagnosis</p>
                      <p className="font-medium">{prescription.diagnosis}</p>
                    </div>
                  )}
                </div>

                <h4 className="font-semibold mb-2 flex items-center gap-2"><Pill className="w-4 h-4" />Prescribed Medicines</h4>
                {(() => {
                  const meds = parseMedicines(prescription.medicines);
                  if (meds.length === 0) return <p className="text-muted-foreground text-sm">{prescription.medicines || "No medicines prescribed"}</p>;
                  return (
                    <div className="space-y-2">
                      {meds.map((med, i) => (
                        <div key={i} className="p-3 rounded-lg bg-background border border-border/50">
                          <p className="font-medium">{med.name}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                            {med.dosage && <span>Dosage: {med.dosage}</span>}
                            {med.frequency && <span>Freq: {med.frequency}</span>}
                            {med.duration && <span>Duration: {med.duration}</span>}
                          </div>
                          {med.instructions && <p className="text-xs text-muted-foreground mt-1 italic">{med.instructions}</p>}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <div className="mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-800">
                  <Button onClick={() => createSaleFromPrescription.mutate()} disabled={createSaleFromPrescription.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {createSaleFromPrescription.isPending ? "Processing..." : "Fulfill & Create Sale"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sales Panel ────────────────────────────────────────────
function SalesPanel({ pharmacyId }: { pharmacyId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saleForm, setSaleForm] = useState({ patient_name: "", patient_phone: "", payment_method: "Cash", notes: "", discount: 0 });
  const [saleItems, setSaleItems] = useState<{ medicine_name: string; quantity: number; unit_price: number }[]>([{ medicine_name: "", quantity: 1, unit_price: 0 }]);

  const { data: sales, isLoading } = useQuery({
    queryKey: ["pharmacy-sales", pharmacyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("pharmacy_sales").select("*").eq("pharmacy_id", pharmacyId).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const createSale = useMutation({
    mutationFn: async () => {
      const validItems = saleItems.filter(i => i.medicine_name.trim());
      const totalAmount = validItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
      const netAmount = totalAmount - (saleForm.discount || 0);

      const { data: sale, error: saleError } = await supabase.from("pharmacy_sales").insert({
        pharmacy_id: pharmacyId,
        patient_name: saleForm.patient_name || null,
        patient_phone: saleForm.patient_phone || null,
        total_amount: totalAmount,
        discount: saleForm.discount || 0,
        net_amount: netAmount,
        payment_method: saleForm.payment_method,
        payment_status: "Paid",
        notes: saleForm.notes || null,
        sold_by: (await supabase.auth.getUser()).data.user?.id,
      }).select().single();
      if (saleError) throw saleError;

      if (validItems.length > 0) {
        const items = validItems.map(i => ({
          sale_id: sale.id,
          medicine_name: i.medicine_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_price: i.quantity * i.unit_price,
        }));
        const { error: itemsError } = await supabase.from("pharmacy_sale_items").insert(items);
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-sales"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-stats"] });
      toast({ title: "Sale recorded" });
      setIsDialogOpen(false);
      setSaleForm({ patient_name: "", patient_phone: "", payment_method: "Cash", notes: "", discount: 0 });
      setSaleItems([{ medicine_name: "", quantity: 1, unit_price: 0 }]);
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const addItem = () => setSaleItems([...saleItems, { medicine_name: "", quantity: 1, unit_price: 0 }]);
  const removeItem = (index: number) => setSaleItems(saleItems.filter((_, i) => i !== index));
  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...saleItems];
    (updated[index] as any)[field] = value;
    setSaleItems(updated);
  };

  return (
    <Card variant="glass" className="border-border/50 dark:border-border/30 dark:bg-card/50">
      <CardHeader className="border-b border-border/30 bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-900/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-purple-600" />Sales</CardTitle>
            <CardDescription>Record and track medicine sales</CardDescription>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />New Sale
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
        ) : sales && sales.length > 0 ? (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map(sale => (
                  <TableRow key={sale.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm">{format(new Date(sale.created_at), "dd MMM yyyy, HH:mm")}</TableCell>
                    <TableCell>{sale.patient_name || "Walk-in"}</TableCell>
                    <TableCell>₨{Number(sale.total_amount).toLocaleString()}</TableCell>
                    <TableCell>₨{Number(sale.discount || 0).toLocaleString()}</TableCell>
                    <TableCell className="font-medium">₨{Number(sale.net_amount).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{sale.payment_method}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-16">
            <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No sales recorded yet</p>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Sale</DialogTitle>
            <DialogDescription>Record a medicine sale</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Patient Name</Label>
                <Input value={saleForm.patient_name} onChange={e => setSaleForm({...saleForm, patient_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={saleForm.patient_phone} onChange={e => setSaleForm({...saleForm, patient_phone: e.target.value})} />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Items</Label>
              <div className="space-y-2">
                {saleItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <Input placeholder="Medicine name" value={item.medicine_name} onChange={e => updateItem(index, "medicine_name", e.target.value)} className="flex-1" />
                    <Input type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(index, "quantity", parseInt(e.target.value) || 1)} className="w-16" />
                    <Input type="number" placeholder="Price" value={item.unit_price} onChange={e => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)} className="w-24" />
                    {saleItems.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeItem(index)}><X className="w-4 h-4" /></Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addItem}><Plus className="w-3 h-3 mr-1" />Add Item</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount (₨)</Label>
                <Input type="number" value={saleForm.discount} onChange={e => setSaleForm({...saleForm, discount: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={saleForm.payment_method} onValueChange={v => setSaleForm({...saleForm, payment_method: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="JazzCash">JazzCash</SelectItem>
                    <SelectItem value="Easypaisa">Easypaisa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Total: ₨{saleItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0).toLocaleString()}</p>
              <p className="text-lg font-bold text-emerald-600">Net: ₨{(saleItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0) - (saleForm.discount || 0)).toLocaleString()}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createSale.mutate()} disabled={createSale.isPending} className="bg-purple-600 hover:bg-purple-700">
              {createSale.isPending ? "Saving..." : "Record Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Supplier Orders Panel ──────────────────────────────────
function SupplierOrdersPanel({ pharmacyId }: { pharmacyId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({ supplier_name: "", supplier_contact: "", expected_delivery: "", notes: "" });
  const [orderItems, setOrderItems] = useState<{ medicine_name: string; quantity: number; unit_cost: number }[]>([{ medicine_name: "", quantity: 1, unit_cost: 0 }]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["pharmacy-orders", pharmacyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("pharmacy_supplier_orders").select("*").eq("pharmacy_id", pharmacyId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createOrder = useMutation({
    mutationFn: async () => {
      const validItems = orderItems.filter(i => i.medicine_name.trim());
      const totalAmount = validItems.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0);

      const { data: order, error: orderError } = await supabase.from("pharmacy_supplier_orders").insert({
        pharmacy_id: pharmacyId,
        supplier_name: orderForm.supplier_name,
        supplier_contact: orderForm.supplier_contact || null,
        expected_delivery: orderForm.expected_delivery || null,
        total_amount: totalAmount,
        notes: orderForm.notes || null,
      }).select().single();
      if (orderError) throw orderError;

      if (validItems.length > 0) {
        const items = validItems.map(i => ({
          order_id: order.id,
          medicine_name: i.medicine_name,
          quantity: i.quantity,
          unit_cost: i.unit_cost,
          total_cost: i.quantity * i.unit_cost,
        }));
        const { error: itemsError } = await supabase.from("pharmacy_order_items").insert(items);
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-orders"] });
      toast({ title: "Order placed" });
      setIsDialogOpen(false);
      setOrderForm({ supplier_name: "", supplier_contact: "", expected_delivery: "", notes: "" });
      setOrderItems([{ medicine_name: "", quantity: 1, unit_cost: 0 }]);
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("pharmacy_supplier_orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-orders"] });
      toast({ title: "Order status updated" });
    },
  });

  const addItem = () => setOrderItems([...orderItems, { medicine_name: "", quantity: 1, unit_cost: 0 }]);

  return (
    <Card variant="glass" className="border-border/50 dark:border-border/30 dark:bg-card/50">
      <CardHeader className="border-b border-border/30 bg-gradient-to-r from-orange-50/50 to-transparent dark:from-orange-900/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5 text-orange-600" />Supplier Orders</CardTitle>
            <CardDescription>Order medicines from suppliers</CardDescription>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" />New Order
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
        ) : orders && orders.length > 0 ? (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(order => (
                  <TableRow key={order.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm">{format(new Date(order.created_at), "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-medium">{order.supplier_name}</TableCell>
                    <TableCell>₨{Number(order.total_amount || 0).toLocaleString()}</TableCell>
                    <TableCell>{order.expected_delivery ? format(new Date(order.expected_delivery), "dd MMM yyyy") : "-"}</TableCell>
                    <TableCell>
                      <Badge className={
                        order.status === "Delivered" ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" :
                        order.status === "Shipped" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" :
                        "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400"
                      }>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select value={order.status || "Pending"} onValueChange={v => updateOrderStatus.mutate({ id: order.id, status: v })}>
                        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Shipped">Shipped</SelectItem>
                          <SelectItem value="Delivered">Delivered</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-16">
            <Truck className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No supplier orders yet</p>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Supplier Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier Name *</Label>
                <Input value={orderForm.supplier_name} onChange={e => setOrderForm({...orderForm, supplier_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Contact</Label>
                <Input value={orderForm.supplier_contact} onChange={e => setOrderForm({...orderForm, supplier_contact: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Expected Delivery</Label>
              <Input type="date" value={orderForm.expected_delivery} onChange={e => setOrderForm({...orderForm, expected_delivery: e.target.value})} />
            </div>
            <div>
              <Label className="mb-2 block">Order Items</Label>
              <div className="space-y-2">
                {orderItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <Input placeholder="Medicine name" value={item.medicine_name} onChange={e => { const u = [...orderItems]; u[index].medicine_name = e.target.value; setOrderItems(u); }} className="flex-1" />
                    <Input type="number" placeholder="Qty" value={item.quantity} onChange={e => { const u = [...orderItems]; u[index].quantity = parseInt(e.target.value) || 1; setOrderItems(u); }} className="w-16" />
                    <Input type="number" placeholder="Cost" value={item.unit_cost} onChange={e => { const u = [...orderItems]; u[index].unit_cost = parseFloat(e.target.value) || 0; setOrderItems(u); }} className="w-24" />
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addItem}><Plus className="w-3 h-3 mr-1" />Add Item</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={orderForm.notes} onChange={e => setOrderForm({...orderForm, notes: e.target.value})} rows={2} />
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-lg font-bold">Total: ₨{orderItems.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0).toLocaleString()}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createOrder.mutate()} disabled={createOrder.isPending || !orderForm.supplier_name} className="bg-orange-600 hover:bg-orange-700">
              {createOrder.isPending ? "Placing..." : "Place Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Analytics Panel ────────────────────────────────────────
function AnalyticsPanel({ pharmacyId }: { pharmacyId: string }) {
  const { data: salesData } = useQuery({
    queryKey: ["pharmacy-analytics", pharmacyId],
    queryFn: async () => {
      const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("pharmacy_sales")
        .select("created_at, net_amount, payment_method")
        .eq("pharmacy_id", pharmacyId)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const dailyRevenue = useMemo(() => {
    if (!salesData) return [];
    const grouped: Record<string, number> = {};
    salesData.forEach(s => {
      const day = format(new Date(s.created_at), "dd MMM");
      grouped[day] = (grouped[day] || 0) + Number(s.net_amount || 0);
    });
    return Object.entries(grouped).map(([day, revenue]) => ({ day, revenue }));
  }, [salesData]);

  const paymentBreakdown = useMemo(() => {
    if (!salesData) return [];
    const grouped: Record<string, number> = {};
    salesData.forEach(s => {
      const method = s.payment_method || "Cash";
      grouped[method] = (grouped[method] || 0) + Number(s.net_amount || 0);
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [salesData]);

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

  const totalRevenue = salesData?.reduce((sum, s) => sum + Number(s.net_amount || 0), 0) || 0;
  const avgSale = salesData && salesData.length > 0 ? totalRevenue / salesData.length : 0;

  return (
    <Card variant="glass" className="border-border/50 dark:border-border/30 dark:bg-card/50">
      <CardHeader className="border-b border-border/30 bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-900/10">
        <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-600" />Sales Analytics</CardTitle>
        <CardDescription>Last 30 days performance</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-emerald-600">₨{totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <p className="text-2xl font-bold">{salesData?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Avg Sale</p>
              <p className="text-2xl font-bold">₨{Math.round(avgSale).toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {dailyRevenue.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Daily Revenue</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip />
                <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Revenue (₨)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {paymentBreakdown.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Payment Methods</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={paymentBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {paymentBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {(!salesData || salesData.length === 0) && (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No sales data yet. Start recording sales to see analytics.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

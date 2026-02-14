import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Zap, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface AIPlan {
  id: string;
  name: string;
  description: string | null;
  credits: number;
  price: number;
  is_active: boolean;
  is_popular: boolean;
  sort_order: number | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
}

export function AIPlansPanel() {
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<AIPlan | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    credits: 10,
    price: 0,
    is_active: true,
    is_popular: false,
    sort_order: 0,
    stripe_price_id: "",
    stripe_product_id: "",
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin-ai-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_ai_plans")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as AIPlan[];
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", credits: 10, price: 0, is_active: true, is_popular: false, sort_order: 0, stripe_price_id: "", stripe_product_id: "" });
    setEditingPlan(null);
  };

  const openEdit = (plan: AIPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      credits: plan.credits,
      price: plan.price,
      is_active: plan.is_active,
      is_popular: plan.is_popular,
      sort_order: plan.sort_order || 0,
      stripe_price_id: plan.stripe_price_id || "",
      stripe_product_id: plan.stripe_product_id || "",
    });
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        credits: formData.credits,
        price: formData.price,
        is_active: formData.is_active,
        is_popular: formData.is_popular,
        sort_order: formData.sort_order,
        stripe_price_id: formData.stripe_price_id || null,
        stripe_product_id: formData.stripe_product_id || null,
      };

      if (editingPlan) {
        const { error } = await supabase
          .from("patient_ai_plans")
          .update(payload)
          .eq("id", editingPlan.id);
        if (error) throw error;
        toast.success("Plan updated");
      } else {
        const { error } = await supabase
          .from("patient_ai_plans")
          .insert(payload);
        if (error) throw error;
        toast.success("Plan created");
      }

      queryClient.invalidateQueries({ queryKey: ["admin-ai-plans"] });
      resetForm();
      setIsCreateOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    const { error } = await supabase.from("patient_ai_plans").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Plan deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-ai-plans"] });
    }
  };

  const PlanForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Plan Name</Label>
          <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Starter Pack" />
        </div>
        <div>
          <Label>Credits</Label>
          <Input type="number" value={formData.credits} onChange={e => setFormData(p => ({ ...p, credits: parseInt(e.target.value) || 0 }))} />
        </div>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Brief plan description" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Price (in PKR)</Label>
          <Input type="number" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} />
        </div>
        <div>
          <Label>Sort Order</Label>
          <Input type="number" value={formData.sort_order} onChange={e => setFormData(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Stripe Price ID</Label>
          <Input value={formData.stripe_price_id} onChange={e => setFormData(p => ({ ...p, stripe_price_id: e.target.value }))} placeholder="price_..." />
        </div>
        <div>
          <Label>Stripe Product ID</Label>
          <Input value={formData.stripe_product_id} onChange={e => setFormData(p => ({ ...p, stripe_product_id: e.target.value }))} placeholder="prod_..." />
        </div>
      </div>
      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <Switch checked={formData.is_active} onCheckedChange={v => setFormData(p => ({ ...p, is_active: v }))} />
          <Label>Active</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={formData.is_popular} onCheckedChange={v => setFormData(p => ({ ...p, is_popular: v }))} />
          <Label>Popular</Label>
        </div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Patient AI Credit Plans
          </CardTitle>
          <CardDescription>Manage AI credit packages patients can purchase</CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Plan</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create AI Credit Plan</DialogTitle>
              <DialogDescription>Add a new AI credit package for patients</DialogDescription>
            </DialogHeader>
            <PlanForm />
            <DialogFooter>
              <Button onClick={handleSave}>Create Plan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading plans...</p>
        ) : plans?.length === 0 ? (
          <p className="text-muted-foreground">No plans yet. Create one to get started.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans?.map(plan => (
              <Card key={plan.id} className={`relative ${!plan.is_active ? "opacity-60" : ""} ${plan.is_popular ? "border-primary ring-1 ring-primary/20" : ""}`}>
                {plan.is_popular && (
                  <Badge className="absolute -top-2 right-3 bg-primary"><Sparkles className="w-3 h-3 mr-1" /> Popular</Badge>
                )}
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { openEdit(plan); setIsCreateOpen(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(plan.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-bold">Rs. {plan.price}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary"><Zap className="w-3 h-3 mr-1" />{plan.credits} credits</Badge>
                    {!plan.is_active && <Badge variant="outline">Inactive</Badge>}
                  </div>
                  {plan.stripe_price_id && (
                    <p className="text-xs text-muted-foreground mt-2 truncate">Stripe: {plan.stripe_price_id}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

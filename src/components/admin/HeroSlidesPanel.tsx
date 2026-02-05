import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, GripVertical, Image, Edit2, Eye, EyeOff, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  image_path: string;
  cta_text: string | null;
  cta_link: string | null;
  sort_order: number;
  is_active: boolean;
}

export function HeroSlidesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSlide, setSelectedSlide] = useState<HeroSlide | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    image_path: "",
    cta_text: "Book Now",
    cta_link: "/booking",
    is_active: true,
  });

  const { data: slides, isLoading } = useQuery({
    queryKey: ["admin-hero-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_slides")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as HeroSlide[];
    },
  });

  const createSlide = useMutation({
    mutationFn: async (data: typeof formData) => {
      const maxOrder = slides?.length ? Math.max(...slides.map(s => s.sort_order)) : 0;
      const { error } = await supabase.from("hero_slides").insert({
        ...data,
        sort_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["hero-slides"] });
      toast({ title: "Slide created successfully" });
      setEditDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to create slide", description: error.message });
    },
  });

  const updateSlide = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const { error } = await supabase.from("hero_slides").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["hero-slides"] });
      toast({ title: "Slide updated successfully" });
      setEditDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to update slide", description: error.message });
    },
  });

  const deleteSlide = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hero_slides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["hero-slides"] });
      toast({ title: "Slide deleted successfully" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to delete slide", description: error.message });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("hero_slides").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["hero-slides"] });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      subtitle: "",
      image_path: "",
      cta_text: "Book Now",
      cta_link: "/booking",
      is_active: true,
    });
    setSelectedSlide(null);
  };

  const openEditDialog = (slide?: HeroSlide) => {
    if (slide) {
      setSelectedSlide(slide);
      setFormData({
        title: slide.title,
        subtitle: slide.subtitle || "",
        image_path: slide.image_path,
        cta_text: slide.cta_text || "Book Now",
        cta_link: slide.cta_link || "/booking",
        is_active: slide.is_active,
      });
    } else {
      resetForm();
    }
    setEditDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from("hero-slides")
        .upload(fileName, file);
      
      if (error) throw error;
      
      setFormData(prev => ({ ...prev, image_path: fileName }));
      toast({ title: "Image uploaded successfully" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload failed", description: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.image_path) {
      toast({ variant: "destructive", title: "Title and image are required" });
      return;
    }

    if (selectedSlide) {
      updateSlide.mutate({ id: selectedSlide.id, data: formData });
    } else {
      createSlide.mutate(formData);
    }
  };

  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith("http") || imagePath.startsWith("/")) {
      return imagePath;
    }
    const { data } = supabase.storage.from("hero-slides").getPublicUrl(imagePath);
    return data.publicUrl;
  };

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="border-white/50">
      <CardHeader className="border-b border-border/30 bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-900/20">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5 text-purple-600" />
            Hero Slides Management
          </CardTitle>
          <Button onClick={() => openEditDialog()} variant="hero" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Slide
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {slides && slides.length > 0 ? (
          <div className="space-y-4">
            {slides.map((slide, index) => (
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all"
              >
                <div className="cursor-move text-muted-foreground">
                  <GripVertical className="w-5 h-5" />
                </div>
                
                <div className="w-24 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={getImageUrl(slide.image_path)}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{slide.title}</h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {slide.subtitle || "No subtitle"}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={slide.is_active}
                    onCheckedChange={(checked) => 
                      toggleActive.mutate({ id: slide.id, is_active: checked })
                    }
                  />
                  <span className="text-xs text-muted-foreground w-12">
                    {slide.is_active ? "Active" : "Hidden"}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => openEditDialog(slide)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteSlide.mutate(slide.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No main page pictures yet</p>
            <p className="text-sm">Add your first picture to customize the homepage. Recommended size: 1920×800px</p>
          </div>
        )}
      </CardContent>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedSlide ? "Edit Picture" : "Add New Picture"}</DialogTitle>
            <DialogDescription>
              {selectedSlide ? "Update the picture details below" : "Add a new main page picture. Recommended size: 1920×800px"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Your Health, Our Priority"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Subtitle</Label>
              <Textarea
                value={formData.subtitle}
                onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                placeholder="Book appointments with top doctors..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div>
              <Label>Image *</Label>
              <div className="mt-1 space-y-2">
                {formData.image_path && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={getImageUrl(formData.image_path)}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => setFormData(prev => ({ ...prev, image_path: "" }))}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="flex-1"
                  />
                </div>
                {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CTA Button Text</Label>
                <Input
                  value={formData.cta_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, cta_text: e.target.value }))}
                  placeholder="Book Now"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>CTA Link</Label>
                <Input
                  value={formData.cta_link}
                  onChange={(e) => setFormData(prev => ({ ...prev, cta_link: e.target.value }))}
                  placeholder="/booking"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Active (visible on homepage)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createSlide.isPending || updateSlide.isPending}
              variant="hero"
            >
              {selectedSlide ? "Update Picture" : "Add Picture"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

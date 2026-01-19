import { useState, useEffect } from "react";
import { Palette, Upload, Trash2, Image, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export function BrandingPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [siteName, setSiteName] = useState("");
  const [uploading, setUploading] = useState(false);

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*");
      if (error) throw error;
      return data?.reduce((acc, item) => {
        acc[item.setting_key] = item.setting_value;
        return acc;
      }, {} as Record<string, string | null>) || {};
    },
  });

  useEffect(() => {
    if (settings?.site_name) {
      setSiteName(settings.site_name);
    }
  }, [settings]);

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string | null }) => {
      const { error } = await supabase
        .from("site_settings")
        .update({ setting_value: value })
        .eq("setting_key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    },
  });

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setUploading(true);
    try {
      // Upload to hero-slides bucket (public)
      const fileName = `logo-${Date.now()}.${logoFile.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("hero-slides")
        .upload(fileName, logoFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("hero-slides")
        .getPublicUrl(fileName);

      await updateSetting.mutateAsync({ key: "logo_url", value: publicUrl });
      toast({ title: "Logo updated successfully" });
      setLogoFile(null);
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleFaviconUpload = async () => {
    if (!faviconFile) return;
    setUploading(true);
    try {
      const fileName = `favicon-${Date.now()}.${faviconFile.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("hero-slides")
        .upload(fileName, faviconFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("hero-slides")
        .getPublicUrl(fileName);

      await updateSetting.mutateAsync({ key: "favicon_url", value: publicUrl });
      
      // Update favicon in DOM
      const faviconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (faviconLink) {
        faviconLink.href = publicUrl;
      }
      
      toast({ title: "Favicon updated successfully" });
      setFaviconFile(null);
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSiteNameUpdate = async () => {
    await updateSetting.mutateAsync({ key: "site_name", value: siteName });
    toast({ title: "Site name updated" });
  };

  const resetToDefault = async (key: string) => {
    await updateSetting.mutateAsync({ key, value: null });
    toast({ title: "Reset to default" });
  };

  if (isLoading) {
    return (
      <Card variant="glass" className="border-border/50 dark:border-border/30 dark:bg-card/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="border-border/50 dark:border-border/30 dark:bg-card/50">
      <CardHeader className="border-b border-border/30 bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-900/10 dark:to-transparent">
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Branding Settings
        </CardTitle>
        <CardDescription>Customize your site logo, favicon, and name</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-8">
        {/* Site Name */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Site Name</Label>
          <div className="flex gap-3">
            <Input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="MediCare+"
              className="max-w-xs"
            />
            <Button onClick={handleSiteNameUpdate} disabled={updateSetting.isPending}>
              Save
            </Button>
          </div>
        </div>

        {/* Logo */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Site Logo</Label>
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Image className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-3">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                className="max-w-xs"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleLogoUpload} 
                  disabled={!logoFile || uploading}
                  size="sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload Logo"}
                </Button>
                {settings?.logo_url && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => resetToDefault("logo_url")}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Recommended: PNG or SVG, 200x200px minimum</p>
            </div>
          </div>
        </div>

        {/* Favicon */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Favicon</Label>
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden">
              {settings?.favicon_url ? (
                <img src={settings.favicon_url} alt="Favicon" className="w-full h-full object-contain" />
              ) : (
                <Image className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-3">
              <Input
                type="file"
                accept="image/*,.ico"
                onChange={(e) => setFaviconFile(e.target.files?.[0] || null)}
                className="max-w-xs"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleFaviconUpload} 
                  disabled={!faviconFile || uploading}
                  size="sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload Favicon"}
                </Button>
                {settings?.favicon_url && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => resetToDefault("favicon_url")}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Recommended: ICO, PNG or SVG, 32x32px or 64x64px</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

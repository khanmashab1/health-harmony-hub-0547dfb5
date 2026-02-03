import { useState, useEffect } from "react";
import { Palette, Upload, Image, RefreshCw, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function BrandingPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoDarkFile, setLogoDarkFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
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
    if (settings?.site_url) {
      setSiteUrl(settings.site_url);
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

  const handleLogoUpload = async (isDark: boolean = false) => {
    const file = isDark ? logoDarkFile : logoFile;
    if (!file) return;
    setUploading(true);
    try {
      // Upload to hero-slides bucket (public)
      const fileName = `logo${isDark ? '-dark' : ''}-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("hero-slides")
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("hero-slides")
        .getPublicUrl(fileName);

      const settingKey = isDark ? "logo_url_dark" : "logo_url";
      await updateSetting.mutateAsync({ key: settingKey, value: publicUrl });
      toast({ title: `${isDark ? "Dark theme" : "Light theme"} logo updated successfully` });
      if (isDark) {
        setLogoDarkFile(null);
      } else {
        setLogoFile(null);
      }
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

  const handleSiteUrlUpdate = async () => {
    // Ensure URL doesn't have trailing slash
    const cleanUrl = siteUrl.replace(/\/$/, '');
    await updateSetting.mutateAsync({ key: "site_url", value: cleanUrl || null });
    toast({ title: "Site URL updated" });
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

        {/* Site URL */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Site URL (Custom Domain)</Label>
          <p className="text-sm text-muted-foreground">
            Enter your custom domain URL. This will be used for email links (prescriptions, verification, etc.)
          </p>
          <div className="flex gap-3">
            <Input
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://yourdomain.com"
              className="max-w-sm"
            />
            <Button onClick={handleSiteUrlUpdate} disabled={updateSetting.isPending}>
              Save
            </Button>
          </div>
          {settings?.site_url && (
            <p className="text-xs text-green-600 dark:text-green-400">
              ✓ Custom domain configured: {settings.site_url}
            </p>
          )}
        </div>

        {/* Light Theme Logo */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Label className="text-base font-semibold">Site Logo</Label>
            <Badge variant="secondary" className="gap-1">
              <Sun className="w-3 h-3" />
              Light Theme
            </Badge>
          </div>
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-white overflow-hidden">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Light Logo" className="w-full h-full object-contain" />
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
                  onClick={() => handleLogoUpload(false)} 
                  disabled={!logoFile || uploading}
                  size="sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload"}
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
              <p className="text-xs text-muted-foreground">Logo displayed on light backgrounds</p>
            </div>
          </div>
        </div>

        {/* Dark Theme Logo */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Label className="text-base font-semibold">Site Logo</Label>
            <Badge variant="secondary" className="gap-1 bg-zinc-800 text-zinc-100">
              <Moon className="w-3 h-3" />
              Dark Theme
            </Badge>
          </div>
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-zinc-600 flex items-center justify-center bg-zinc-900 overflow-hidden">
              {settings?.logo_url_dark ? (
                <img src={settings.logo_url_dark} alt="Dark Logo" className="w-full h-full object-contain" />
              ) : settings?.logo_url ? (
                <img src={settings.logo_url} alt="Fallback Logo" className="w-full h-full object-contain opacity-50" />
              ) : (
                <Image className="w-10 h-10 text-zinc-500" />
              )}
            </div>
            <div className="flex-1 space-y-3">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoDarkFile(e.target.files?.[0] || null)}
                className="max-w-xs"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleLogoUpload(true)} 
                  disabled={!logoDarkFile || uploading}
                  size="sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
                {settings?.logo_url_dark && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => resetToDefault("logo_url_dark")}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Logo displayed on dark backgrounds (falls back to light logo if not set)</p>
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

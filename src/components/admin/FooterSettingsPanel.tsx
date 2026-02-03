import { useState, useEffect } from "react";
import { MapPin, Phone, Mail, Facebook, Twitter, Instagram, Linkedin, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface FooterSettings {
  footer_address: string;
  footer_phone: string;
  footer_email: string;
  footer_facebook: string;
  footer_twitter: string;
  footer_instagram: string;
  footer_linkedin: string;
  footer_copyright: string;
}

const defaultSettings: FooterSettings = {
  footer_address: "123 Medical Center, Blue Area, Islamabad, Pakistan",
  footer_phone: "+92 51 1234567",
  footer_email: "info@medicare.pk",
  footer_facebook: "",
  footer_twitter: "",
  footer_instagram: "",
  footer_linkedin: "",
  footer_copyright: "© {year} MediCare+. All rights reserved.",
};

export function FooterSettingsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FooterSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);

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
    if (settings) {
      setFormData({
        footer_address: settings.footer_address || defaultSettings.footer_address,
        footer_phone: settings.footer_phone || defaultSettings.footer_phone,
        footer_email: settings.footer_email || defaultSettings.footer_email,
        footer_facebook: settings.footer_facebook || "",
        footer_twitter: settings.footer_twitter || "",
        footer_instagram: settings.footer_instagram || "",
        footer_linkedin: settings.footer_linkedin || "",
        footer_copyright: settings.footer_copyright || defaultSettings.footer_copyright,
      });
    }
  }, [settings]);

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string | null }) => {
      // First check if the setting exists
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("setting_key", key)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("site_settings")
          .update({ setting_value: value })
          .eq("setting_key", key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_settings")
          .insert({ setting_key: key, setting_value: value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(formData).map(([key, value]) => 
        updateSetting.mutateAsync({ key, value })
      );
      await Promise.all(updates);
      toast({ title: "Footer settings saved successfully" });
    } catch (error: any) {
      toast({ 
        title: "Failed to save settings", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(defaultSettings);
  };

  if (isLoading) {
    return (
      <Card variant="glass" className="border-border/50 dark:border-border/30 dark:bg-card/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="border-border/50 dark:border-border/30 dark:bg-card/50">
      <CardHeader className="border-b border-border/30 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Footer Settings
        </CardTitle>
        <CardDescription>Customize your website footer content</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Contact Information</h3>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Address
            </Label>
            <Textarea
              value={formData.footer_address}
              onChange={(e) => setFormData(prev => ({ ...prev, footer_address: e.target.value }))}
              placeholder="Enter clinic address"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                Phone
              </Label>
              <Input
                value={formData.footer_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, footer_phone: e.target.value }))}
                placeholder="+92 51 1234567"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Email
              </Label>
              <Input
                type="email"
                value={formData.footer_email}
                onChange={(e) => setFormData(prev => ({ ...prev, footer_email: e.target.value }))}
                placeholder="info@example.com"
              />
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Social Media Links</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Facebook className="w-4 h-4 text-blue-600" />
                Facebook URL
              </Label>
              <Input
                value={formData.footer_facebook}
                onChange={(e) => setFormData(prev => ({ ...prev, footer_facebook: e.target.value }))}
                placeholder="https://facebook.com/yourpage"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Twitter className="w-4 h-4 text-sky-500" />
                Twitter URL
              </Label>
              <Input
                value={formData.footer_twitter}
                onChange={(e) => setFormData(prev => ({ ...prev, footer_twitter: e.target.value }))}
                placeholder="https://twitter.com/yourpage"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-pink-500" />
                Instagram URL
              </Label>
              <Input
                value={formData.footer_instagram}
                onChange={(e) => setFormData(prev => ({ ...prev, footer_instagram: e.target.value }))}
                placeholder="https://instagram.com/yourpage"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Linkedin className="w-4 h-4 text-blue-700" />
                LinkedIn URL
              </Label>
              <Input
                value={formData.footer_linkedin}
                onChange={(e) => setFormData(prev => ({ ...prev, footer_linkedin: e.target.value }))}
                placeholder="https://linkedin.com/company/yourpage"
              />
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="space-y-2">
          <Label>Copyright Text</Label>
          <Input
            value={formData.footer_copyright}
            onChange={(e) => setFormData(prev => ({ ...prev, footer_copyright: e.target.value }))}
            placeholder="© {year} MediCare+. All rights reserved."
          />
          <p className="text-xs text-muted-foreground">Use {"{year}"} to automatically insert the current year</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border/30">
          <Button onClick={handleSave} disabled={isSaving} variant="hero">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          <Button onClick={handleReset} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

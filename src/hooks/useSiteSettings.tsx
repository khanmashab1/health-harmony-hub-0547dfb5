import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface SiteSettings {
  logo_url: string | null;
  favicon_url: string | null;
  site_name: string | null;
}

export function useSiteSettings() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*");
      if (error) throw error;
      return data?.reduce((acc, item) => {
        acc[item.setting_key as keyof SiteSettings] = item.setting_value;
        return acc;
      }, {} as SiteSettings) || { logo_url: null, favicon_url: null, site_name: null };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update favicon when settings change
  useEffect(() => {
    if (settings?.favicon_url) {
      const faviconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (faviconLink) {
        faviconLink.href = settings.favicon_url;
      }
    }
  }, [settings?.favicon_url]);

  return {
    logoUrl: settings?.logo_url || null,
    faviconUrl: settings?.favicon_url || null,
    siteName: settings?.site_name || "MediCare+",
    isLoading,
  };
}

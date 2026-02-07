import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useTheme } from "next-themes";

interface SiteSettings {
  logo_url: string | null;
  logo_url_dark: string | null;
  favicon_url: string | null;
  site_name: string | null;
  site_url: string | null;
}

export function useSiteSettings() {
  const { resolvedTheme } = useTheme();
  
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
      }, {} as SiteSettings) || { logo_url: null, logo_url_dark: null, favicon_url: null, site_name: null, site_url: null };
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

  // Get appropriate logo based on theme
  const getLogoUrl = () => {
    if (resolvedTheme === "dark" && settings?.logo_url_dark) {
      return settings.logo_url_dark;
    }
    return settings?.logo_url || null;
  };

  return {
    logoUrl: getLogoUrl(),
    logoUrlLight: settings?.logo_url || null,
    logoUrlDark: settings?.logo_url_dark || null,
    faviconUrl: settings?.favicon_url || null,
    siteName: settings?.site_name || "MediCare+",
    siteUrl: settings?.site_url || null,
    isLoading,
  };
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FooterSettings {
  address: string;
  phone: string;
  phone2: string;
  phone3: string;
  email: string;
  facebook: string;
  twitter: string;
  instagram: string;
  linkedin: string;
  copyright: string;
}

const defaultSettings: FooterSettings = {
  address: "123 Medical Center, Blue Area, Islamabad, Pakistan",
  phone: "+92 51 1234567",
  phone2: "",
  phone3: "",
  email: "info@medicare.pk",
  facebook: "",
  twitter: "",
  instagram: "",
  linkedin: "",
  copyright: "© {year} MediCare+. All rights reserved.",
};

export function useFooterSettings() {
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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const footerSettings: FooterSettings = {
    address: settings?.footer_address || defaultSettings.address,
    phone: settings?.footer_phone || defaultSettings.phone,
    phone2: settings?.footer_phone2 || "",
    phone3: settings?.footer_phone3 || "",
    email: settings?.footer_email || defaultSettings.email,
    facebook: settings?.footer_facebook || "",
    twitter: settings?.footer_twitter || "",
    instagram: settings?.footer_instagram || "",
    linkedin: settings?.footer_linkedin || "",
    copyright: (settings?.footer_copyright || defaultSettings.copyright).replace("{year}", new Date().getFullYear().toString()),
  };

  const phoneNumbers = [footerSettings.phone, footerSettings.phone2, footerSettings.phone3].filter(Boolean);

  const socialLinks = [
    { url: footerSettings.facebook, name: "Facebook" },
    { url: footerSettings.twitter, name: "Twitter" },
    { url: footerSettings.instagram, name: "Instagram" },
    { url: footerSettings.linkedin, name: "LinkedIn" },
  ].filter(link => link.url);

  return {
    ...footerSettings,
    phoneNumbers,
    socialLinks,
    isLoading,
  };
}

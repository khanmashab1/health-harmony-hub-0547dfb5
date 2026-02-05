import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Plan tier definitions with feature limits
const PLAN_LIMITS = {
  basic: {
    tier: "basic",
    maxPatientsPerDay: 10,
    analyticsAccess: false,
    advancedAnalytics: false,
    teamManagement: false,
    customBranding: false,
    apiAccess: false,
    prioritySupport: false,
    phoneSupport: false,
  },
  professional: {
    tier: "professional",
    maxPatientsPerDay: 30,
    analyticsAccess: true,
    advancedAnalytics: true,
    teamManagement: true,
    customBranding: true,
    apiAccess: false,
    prioritySupport: true,
    phoneSupport: false,
  },
  enterprise: {
    tier: "enterprise",
    maxPatientsPerDay: Infinity,
    analyticsAccess: true,
    advancedAnalytics: true,
    teamManagement: true,
    customBranding: true,
    apiAccess: true,
    prioritySupport: true,
    phoneSupport: true,
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;
export type PlanFeatures = typeof PLAN_LIMITS[PlanTier];

interface PlanInfo {
  id: string;
  name: string;
  price: number;
  billing_period: string;
  features: string[];
}

interface UsePlanFeaturesResult {
  planInfo: PlanInfo | null;
  planTier: PlanTier;
  features: PlanFeatures;
  isFreePlan: boolean;
  isProfessional: boolean;
  isEnterprise: boolean;
  isLoading: boolean;
  canAccessFeature: (feature: keyof PlanFeatures) => boolean;
  getUpgradeMessage: (feature: keyof PlanFeatures) => string;
}

export function usePlanFeatures(userId: string | undefined): UsePlanFeaturesResult {
  const { data: doctorInfo, isLoading } = useQuery({
    queryKey: ["doctor-plan-info", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("selected_plan_id, max_patients_per_day, selected_plan:doctor_payment_plans(id, name, price, billing_period, features)")
        .eq("user_id", userId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 60000, // Cache for 1 minute
  });

  const planInfo = useMemo(() => {
    if (!doctorInfo?.selected_plan) return null;
    const plan = doctorInfo.selected_plan as any;
    return {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      billing_period: plan.billing_period,
      features: plan.features || [],
    };
  }, [doctorInfo]);

  const planTier = useMemo((): PlanTier => {
    if (!planInfo) return "basic";
    const name = planInfo.name.toLowerCase();
    if (name.includes("enterprise")) return "enterprise";
    if (name.includes("professional")) return "professional";
    return "basic";
  }, [planInfo]);

  const features = PLAN_LIMITS[planTier];

  const isFreePlan = planInfo?.price === 0 || !planInfo;
  const isProfessional = planTier === "professional";
  const isEnterprise = planTier === "enterprise";

  const canAccessFeature = (feature: keyof PlanFeatures): boolean => {
    const value = features[feature];
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value > 0;
    return true;
  };

  const getUpgradeMessage = (feature: keyof PlanFeatures): string => {
    const messages: Record<keyof PlanFeatures, string> = {
      tier: "",
      maxPatientsPerDay: "Upgrade to Professional for up to 30 patients/day, or Enterprise for unlimited patients.",
      analyticsAccess: "Upgrade to Professional to access analytics dashboard.",
      advancedAnalytics: "Upgrade to Professional for advanced analytics and insights.",
      teamManagement: "Upgrade to Professional to manage your team and PAs.",
      customBranding: "Upgrade to Professional for custom branding options.",
      apiAccess: "Upgrade to Enterprise for API access.",
      prioritySupport: "Upgrade to Professional for priority support.",
      phoneSupport: "Upgrade to Enterprise for 24/7 phone support.",
    };
    return messages[feature];
  };

  return {
    planInfo,
    planTier,
    features,
    isFreePlan,
    isProfessional,
    isEnterprise,
    isLoading,
    canAccessFeature,
    getUpgradeMessage,
  };
}

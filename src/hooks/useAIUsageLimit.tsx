import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type FeatureType = "symptom_checker" | "risk_evaluator";

interface AIUsageLimitResult {
  canUse: boolean;
  currentCount: number;
  dailyLimit: number;
  remaining: number;
  isLoading: boolean;
  checkAndIncrement: () => Promise<boolean>;
  userTier: "free" | "professional" | "enterprise";
}

const LIMITS = {
  free: 3,
  professional: 20,
  enterprise: Infinity,
};

// Generate a persistent anonymous ID for non-logged-in users
function getAnonymousId(): string {
  const key = "ai_usage_anon_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function useAIUsageLimit(featureType: FeatureType): AIUsageLimitResult {
  const { user, profile } = useAuth();
  const [currentCount, setCurrentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userTier, setUserTier] = useState<"free" | "professional" | "enterprise">("free");

  // Determine user tier
  useEffect(() => {
    async function fetchTier() {
      if (!user) {
        setUserTier("free");
        return;
      }

      // Check if user is a doctor with a plan
      if (profile?.role === "doctor") {
        try {
          const { data } = await supabase
            .from("doctors")
            .select("selected_plan_id, selected_plan:doctor_payment_plans(name, price)")
            .eq("user_id", user.id)
            .single();

          if (data?.selected_plan) {
            const plan = data.selected_plan as any;
            const name = plan.name?.toLowerCase() || "";
            if (name.includes("enterprise") || name.includes("unlimited") || plan.price >= 7000) {
              setUserTier("enterprise");
            } else if (name.includes("professional") || name.includes("pro") || plan.price >= 2000) {
              setUserTier("professional");
            } else {
              setUserTier("free");
            }
            return;
          }
        } catch {
          // Fall through to free
        }
      }

      setUserTier("free");
    }

    fetchTier();
  }, [user, profile]);

  const dailyLimit = LIMITS[userTier];

  // Fetch current usage count
  useEffect(() => {
    async function fetchUsage() {
      setIsLoading(true);
      try {
        if (user) {
          const today = new Date().toISOString().split("T")[0];
          const { data } = await supabase
            .from("ai_usage_tracking")
            .select("usage_count")
            .eq("user_id", user.id)
            .eq("feature_type", featureType)
            .eq("usage_date", today)
            .maybeSingle();

          setCurrentCount(data?.usage_count || 0);
        } else {
          // For anonymous users, use localStorage
          const key = `ai_usage_${featureType}_${new Date().toISOString().split("T")[0]}`;
          const count = parseInt(localStorage.getItem(key) || "0");
          setCurrentCount(count);
        }
      } catch {
        setCurrentCount(0);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUsage();
  }, [user, featureType]);

  const checkAndIncrement = useCallback(async (): Promise<boolean> => {
    if (dailyLimit === Infinity) return true;

    if (user) {
      // Use the database function
      const { data, error } = await supabase.rpc("check_ai_usage", {
        p_user_id: user.id,
        p_feature_type: featureType,
        p_daily_limit: dailyLimit,
      });

      if (error) {
        console.error("Usage check error:", error);
        return true; // Allow on error to not block users
      }

      const result = data as any;
      setCurrentCount(result.current_count);

      return result.allowed;
    } else {
      // Anonymous: use localStorage
      const today = new Date().toISOString().split("T")[0];
      const key = `ai_usage_${featureType}_${today}`;
      const count = parseInt(localStorage.getItem(key) || "0");

      if (count >= dailyLimit) {
        setCurrentCount(count);
        return false;
      }

      const newCount = count + 1;
      localStorage.setItem(key, String(newCount));
      setCurrentCount(newCount);
      return true;
    }
  }, [user, featureType, dailyLimit]);

  const remaining = dailyLimit === Infinity ? Infinity : Math.max(0, dailyLimit - currentCount);
  const canUse = dailyLimit === Infinity || currentCount < dailyLimit;

  return {
    canUse,
    currentCount,
    dailyLimit,
    remaining,
    isLoading,
    checkAndIncrement,
    userTier,
  };
}

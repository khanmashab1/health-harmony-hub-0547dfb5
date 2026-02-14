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
  userTier: "free" | "professional" | "enterprise" | "credits";
  creditsRemaining: number;
  hasCredits: boolean;
}

const LIMITS = {
  free: 3,
  professional: 20,
  enterprise: Infinity,
  credits: Infinity, // credits-based, no daily limit
};

export function useAIUsageLimit(featureType: FeatureType): AIUsageLimitResult {
  const { user, profile } = useAuth();
  const [currentCount, setCurrentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userTier, setUserTier] = useState<"free" | "professional" | "enterprise" | "credits">("free");
  const [creditsRemaining, setCreditsRemaining] = useState(0);
  const [hasCredits, setHasCredits] = useState(false);

  // Determine user tier and credits
  useEffect(() => {
    async function fetchTierAndCredits() {
      if (!user) {
        setUserTier("free");
        setHasCredits(false);
        setCreditsRemaining(0);
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
              return;
            } else if (name.includes("professional") || name.includes("pro") || plan.price >= 2000) {
              setUserTier("professional");
              return;
            }
          }
        } catch {
          // Fall through
        }
        setUserTier("free");
        return;
      }

      // For patients: check if they have purchased credits
      if (profile?.role === "patient") {
        try {
          const { data: credits } = await supabase
            .from("patient_ai_credits")
            .select("total_credits, used_credits")
            .eq("user_id", user.id)
            .maybeSingle();

          if (credits) {
            const remaining = credits.total_credits - credits.used_credits;
            setCreditsRemaining(remaining);
            setHasCredits(remaining > 0);
            if (remaining > 0) {
              setUserTier("credits");
              return;
            }
          }
        } catch {
          // Fall through to free
        }
      }

      setUserTier("free");
    }

    fetchTierAndCredits();
  }, [user, profile]);

  const dailyLimit = LIMITS[userTier];

  // Fetch current daily usage count
  useEffect(() => {
    async function fetchUsage() {
      setIsLoading(true);
      try {
        if (userTier === "credits" || userTier === "enterprise") {
          // No daily limit tracking needed
          setCurrentCount(0);
          setIsLoading(false);
          return;
        }

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
  }, [user, featureType, userTier]);

  const checkAndIncrement = useCallback(async (): Promise<boolean> => {
    // Enterprise: always allowed
    if (userTier === "enterprise") return true;

    // Credits-based: consume a credit
    if (userTier === "credits" && user) {
      const { data, error } = await supabase.rpc("consume_ai_credit", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Credit consumption error:", error);
        return true; // Allow on error
      }

      if (data === true) {
        setCreditsRemaining(prev => Math.max(0, prev - 1));
        if (creditsRemaining - 1 <= 0) {
          setHasCredits(false);
          setUserTier("free");
        }
        return true;
      }
      return false;
    }

    // Daily limit based (free/professional)
    if (user) {
      const { data, error } = await supabase.rpc("check_ai_usage", {
        p_user_id: user.id,
        p_feature_type: featureType,
        p_daily_limit: dailyLimit,
      });

      if (error) {
        console.error("Usage check error:", error);
        return true;
      }

      const result = data as any;
      setCurrentCount(result.current_count);
      return result.allowed;
    } else {
      // Anonymous: localStorage
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
  }, [user, featureType, dailyLimit, userTier, creditsRemaining]);

  const remaining = dailyLimit === Infinity ? Infinity : Math.max(0, dailyLimit - currentCount);
  const canUse = userTier === "enterprise" || userTier === "credits" || currentCount < dailyLimit;

  return {
    canUse,
    currentCount,
    dailyLimit,
    remaining,
    isLoading,
    checkAndIncrement,
    userTier,
    creditsRemaining,
    hasCredits,
  };
}

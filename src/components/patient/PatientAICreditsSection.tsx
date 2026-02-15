import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Sparkles, Crown, Check } from "lucide-react";
import { toast } from "sonner";

interface AIPlan {
  id: string;
  name: string;
  description: string | null;
  credits: number;
  price: number;
  is_popular: boolean;
  stripe_price_id: string | null;
}

export function PatientAICreditsSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle purchase success redirect
  useEffect(() => {
    if (searchParams.get("purchase") === "success") {
      toast.success("AI credits purchased successfully!");
      // Refresh credits data
      queryClient.invalidateQueries({ queryKey: ["patient-ai-credits"] });
      queryClient.invalidateQueries({ queryKey: ["patient-ai-purchases"] });
      // Clean up URL
      searchParams.delete("purchase");
      searchParams.delete("plan");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient]);

  const { data: credits } = useQuery({
    queryKey: ["patient-ai-credits", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_ai_credits")
        .select("total_credits, used_credits")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: plans } = useQuery({
    queryKey: ["patient-ai-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_ai_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as AIPlan[];
    },
  });

  const { data: purchases } = useQuery({
    queryKey: ["patient-ai-purchases", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_ai_purchases")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handlePurchase = async (plan: AIPlan) => {
    if (!user) {
      toast.error("Please log in to purchase credits");
      return;
    }

    if (plan.stripe_price_id) {
      try {
        const { data, error } = await supabase.functions.invoke("create-ai-credits-checkout", {
          body: { planId: plan.id, priceId: plan.stripe_price_id },
        });
        if (error) throw error;
        if (data?.url) {
          window.open(data.url, "_blank");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to start checkout");
      }
    } else {
      // Direct credit addition for free/test plans
      try {
        const { error } = await supabase.rpc("add_ai_credits", {
          p_user_id: user.id,
          p_credits: plan.credits,
        });
        if (error) throw error;

        // Record purchase
        await supabase.from("patient_ai_purchases").insert({
          user_id: user.id,
          plan_id: plan.id,
          credits_purchased: plan.credits,
          amount_paid: plan.price,
          status: "completed",
        });

        toast.success(`${plan.credits} AI credits added!`);
        // Refresh
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  };

  const totalCredits = credits?.total_credits || 0;
  const usedCredits = credits?.used_credits || 0;
  const purchasedRemaining = totalCredits - usedCredits;
  const hasPurchasedCredits = totalCredits > 0 && purchasedRemaining > 0;

  // Free tier: 15 daily credits (5 per use = 3 uses/day)
  const FREE_DAILY_CREDITS = 15;
  const displayCredits = hasPurchasedCredits ? purchasedRemaining : FREE_DAILY_CREDITS;
  const displayLabel = hasPurchasedCredits ? "purchased credits remaining" : "free daily credits";
  const displaySubtext = hasPurchasedCredits
    ? `${usedCredits} used of ${totalCredits} total purchased`
    : "5 credits per use • Resets daily";

  return (
    <div className="space-y-6">
      {/* Credits Balance */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Your AI Credits</p>
              <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                <span className="text-3xl sm:text-4xl font-bold text-primary">{displayCredits}</span>
                <span className="text-xs sm:text-sm text-muted-foreground">{displayLabel}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {displaySubtext}
              </p>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-primary/10 flex-shrink-0">
              <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
          </div>
          {hasPurchasedCredits ? null : (
            <p className="text-xs sm:text-sm text-muted-foreground mt-3">
              You get 15 free AI credits daily (5 credits per use = 3 analyses/day). Purchase credits for more.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <h3 className="text-lg font-semibold mb-4">AI Credit Plans</h3>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {plans?.map(plan => (
            <Card key={plan.id} className={`relative transition-all hover:shadow-lg ${plan.is_popular ? "border-primary ring-2 ring-primary/20 shadow-md" : ""}`}>
              {plan.is_popular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary shadow-sm">
                  <Sparkles className="w-3 h-3 mr-1" /> Most Popular
                </Badge>
              )}
              <CardContent className="p-6 text-center">
                <h4 className="font-semibold text-lg mb-1">{plan.name}</h4>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="mb-4">
                  <span className="text-3xl font-bold">Rs. {plan.price}</span>
                </div>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Badge variant="secondary" className="text-base px-3 py-1">
                    <Zap className="w-4 h-4 mr-1" /> {plan.credits} Credits
                  </Badge>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 mb-5 text-left">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> AI Symptom Analysis</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Health Risk Evaluation</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> No daily limits</li>
                </ul>
                <Button className="w-full" variant={plan.is_popular ? "default" : "outline"} onClick={() => handlePurchase(plan)}>
                  <Crown className="w-4 h-4 mr-2" /> Purchase
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Purchase History */}
      {purchases && purchases.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Recent Purchases</h3>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {purchases.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{p.credits_purchased} credits</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Rs. {p.amount_paid}</p>
                      <Badge variant={p.status === "completed" ? "default" : "secondary"} className="text-xs">
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

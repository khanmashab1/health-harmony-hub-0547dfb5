import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Sparkles, Crown, Check, Loader2, Download } from "lucide-react";
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

  // Handle purchase success redirect - verify and fulfill credits
  useEffect(() => {
    const purchaseStatus = searchParams.get("purchase");
    const planId = searchParams.get("plan");

    if (purchaseStatus === "success" && planId && user) {
      const verifyPurchase = async () => {
        try {
          toast.loading("Verifying your purchase...", { id: "verify-purchase" });
          const { data, error } = await supabase.functions.invoke("verify-ai-purchase", {
            body: { planId },
          });
          if (error) throw error;
          if (data?.success) {
            if (data.already_fulfilled) {
              toast.success("Credits already added to your account!", { id: "verify-purchase" });
            } else {
              toast.success(`${data.credits_added} AI credits added to your account!`, { id: "verify-purchase" });
            }
          } else {
            toast.error(data?.error || "Could not verify purchase", { id: "verify-purchase" });
          }
        } catch (err: any) {
          console.error("Verify purchase error:", err);
          toast.error("Failed to verify purchase. Credits will be added shortly.", { id: "verify-purchase" });
        } finally {
          queryClient.invalidateQueries({ queryKey: ["patient-ai-credits"] });
          queryClient.invalidateQueries({ queryKey: ["patient-ai-purchases"] });
          searchParams.delete("purchase");
          searchParams.delete("plan");
          setSearchParams(searchParams, { replace: true });
        }
      };
      verifyPurchase();
    }
  }, [searchParams, setSearchParams, queryClient, user]);

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

  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const handlePurchase = async (plan: AIPlan) => {
    if (!user) {
      toast.error("Please log in to purchase credits");
      return;
    }

    setLoadingPlanId(plan.id);

    if (plan.stripe_price_id) {
      try {
        const { data, error } = await supabase.functions.invoke("create-ai-credits-checkout", {
          body: { planId: plan.id, priceId: plan.stripe_price_id },
        });
        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to start checkout");
      } finally {
        setLoadingPlanId(null);
      }
    } else {
      try {
        const { error } = await supabase.rpc("add_ai_credits", {
          p_user_id: user.id,
          p_credits: plan.credits,
        });
        if (error) throw error;

        await supabase.from("patient_ai_purchases").insert({
          user_id: user.id,
          plan_id: plan.id,
          credits_purchased: plan.credits,
          amount_paid: plan.price,
          status: "completed",
        });

        toast.success(`${plan.credits} AI credits added!`);
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoadingPlanId(null);
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
            <Card key={plan.id} className={`relative transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-primary/40 group ${plan.is_popular ? "border-primary ring-2 ring-primary/20 shadow-md" : ""}`}>
              {plan.is_popular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary shadow-sm">
                  <Sparkles className="w-3 h-3 mr-1" /> Most Popular
                </Badge>
              )}
              <CardContent className="p-6 text-center">
                <h4 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">{plan.name}</h4>
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
                <Button
                  className="w-full"
                  variant={plan.is_popular ? "default" : "outline"}
                  onClick={() => handlePurchase(plan)}
                  disabled={loadingPlanId !== null}
                >
                  {loadingPlanId === plan.id ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                  ) : (
                    <><Crown className="w-4 h-4 mr-2" /> Purchase</>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Purchase History */}
      {purchases && purchases.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Recent Purchases</h3>
            {purchases.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const headers = ["Date & Time", "Credits", "Amount (Rs.)", "Status"];
                  const rows = purchases.map(p => {
                    const d = new Date(p.created_at);
                    const dateTime = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
                    return [
                      dateTime,
                      p.credits_purchased,
                      p.amount_paid,
                      p.status,
                    ];
                  });
                  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `ai-credits-history-${new Date().toISOString().slice(0,10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="w-4 h-4 mr-1" /> Download Full Report
              </Button>
            )}
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {purchases.slice(0, 2).map(p => (
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
          {purchases.length > 2 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Showing 2 of {purchases.length} purchases • Download report for full history
            </p>
          )}
        </div>
      )}
    </div>
  );
}

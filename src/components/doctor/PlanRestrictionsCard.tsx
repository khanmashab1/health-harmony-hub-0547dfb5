import { useState, useEffect } from "react";
import { Crown, Users, BarChart3, Palette, Headphones, Lock, Check, ArrowUpRight, ExternalLink, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { usePlanFeatures, PlanFeatures } from "@/hooks/usePlanFeatures";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PlanRestrictionsCardProps {
  userId: string | undefined;
  currentPatientCount: number;
  onUpgradeClick?: () => void;
  onTabChange?: (tab: string) => void;
}

interface FeatureItem {
  key: keyof PlanFeatures;
  label: string;
  icon: React.ElementType;
  description: string;
  tabTarget?: string;
  action?: "tab" | "external" | "dialog";
}

const FEATURE_LIST: FeatureItem[] = [
  { key: "analyticsAccess", label: "Analytics Dashboard", icon: BarChart3, description: "View performance insights", tabTarget: "analytics", action: "tab" },
  { key: "teamManagement", label: "Team Management", icon: Users, description: "Manage PAs & staff", tabTarget: "team", action: "tab" },
  { key: "customBranding", label: "Custom Branding", icon: Palette, description: "Personalize your profile", tabTarget: "settings", action: "tab" },
  { key: "multiDoctorSupport", label: "Multi-Doctor Org", icon: Building2, description: "Manage multiple doctors", tabTarget: "organization", action: "tab" },
  { key: "prioritySupport", label: "Priority Support", icon: Headphones, description: "Faster response times", action: "dialog" },
];

export function PlanRestrictionsCard({ userId, currentPatientCount, onUpgradeClick, onTabChange }: PlanRestrictionsCardProps) {
  const { planInfo, planTier, features, isFreePlan, canAccessFeature, getUpgradeMessage } = usePlanFeatures(userId);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<FeatureItem | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [selectedPlanTier, setSelectedPlanTier] = useState<"professional" | "enterprise" | null>(null);
  const [plans, setPlans] = useState<Array<{ id: string; name: string; stripe_price_id: string | null }>>([]);

  // Fetch available plans
  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from("doctor_payment_plans")
        .select("id, name, stripe_price_id, price")
        .eq("is_active", true)
        .order("sort_order");
      if (data) {
        setPlans(data);
      }
    };
    fetchPlans();
  }, []);

  const maxPatients = features.maxPatientsPerDay === Infinity ? "Unlimited" : features.maxPatientsPerDay;
  const patientPercentage = features.maxPatientsPerDay === Infinity 
    ? 0 
    : Math.min((currentPatientCount / features.maxPatientsPerDay) * 100, 100);
  const isNearLimit = features.maxPatientsPerDay !== Infinity && 
    currentPatientCount >= features.maxPatientsPerDay * 0.8;

  const getPlanColor = () => {
    switch (planTier) {
      case "enterprise": return "from-amber-500 to-orange-500";
      case "professional": return "from-purple-500 to-indigo-500";
      default: return "from-gray-400 to-gray-500";
    }
  };

  const handleFeatureClick = (feature: FeatureItem) => {
    const hasAccess = canAccessFeature(feature.key);
    
    if (!hasAccess) {
      // Show upgrade dialog
      setSelectedFeature(feature);
      setSelectedPlanTier(null);
      setUpgradeDialogOpen(true);
      return;
    }

    // Feature is accessible - perform action
    if (feature.action === "tab" && feature.tabTarget) {
      if (onTabChange) {
        onTabChange(feature.tabTarget);
      }
      toast({
        title: `${feature.label} opened`,
        description: feature.description,
      });
    } else if (feature.action === "dialog") {
      setSupportDialogOpen(true);
    }
  };

  const handleUpgradeNow = async () => {
    if (!selectedPlanTier) {
      toast({ title: "Please select a plan", variant: "destructive" });
      return;
    }

    setLoadingPortal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Please log in to manage subscription", variant: "destructive" });
        return;
      }

      // Find the selected plan
      const selectedPlan = plans.find(p => 
        p.name.toLowerCase().includes(selectedPlanTier)
      );

      if (!selectedPlan) {
        throw new Error("Selected plan not found");
      }

      if (!selectedPlan.stripe_price_id) {
        throw new Error("This plan is not available for online payment");
      }

      // Create checkout session for the selected plan
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke("create-plan-checkout", {
        body: { planId: selectedPlan.id },
      });
      
      if (checkoutError || !checkoutData?.url) {
        throw new Error(checkoutData?.error || "Failed to create checkout session");
      }
      window.open(checkoutData.url, "_blank");
      setUpgradeDialogOpen(false);
    } catch (err: any) {
      toast({ 
        title: "Error", 
        description: err.message || "Could not open subscription management. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setLoadingPortal(false);
    }
  };

  return (
    <>
      <Card variant="glass" className="border-border/50">
        <CardHeader className="border-b border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getPlanColor()} flex items-center justify-center`}>
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">{planInfo?.name || "Basic"} Plan</CardTitle>
                <CardDescription>
                  {isFreePlan ? "Free tier" : `PKR ${planInfo?.price?.toLocaleString()} / ${planInfo?.billing_period}`}
                </CardDescription>
              </div>
            </div>
            <Badge 
              variant={planTier === "enterprise" ? "default" : planTier === "professional" ? "default" : "secondary"}
              className="capitalize"
            >
              {planTier}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          {/* Patient Limit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Daily Patient Limit</span>
              <span className={`font-semibold ${isNearLimit ? "text-amber-600" : ""}`}>
                {currentPatientCount} / {maxPatients}
              </span>
            </div>
            {features.maxPatientsPerDay !== Infinity && (
              <Progress 
                value={patientPercentage} 
                className={`h-2 ${isNearLimit ? "[&>div]:bg-amber-500" : ""}`}
              />
            )}
            {features.maxPatientsPerDay === Infinity && (
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                <Check className="w-3 h-3" />
                Unlimited patients per day
              </div>
            )}
          </div>

          {/* Feature Grid - Now Clickable */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURE_LIST.map((feature) => {
              const hasAccess = canAccessFeature(feature.key);
              return (
                <button
                  key={feature.key}
                  onClick={() => handleFeatureClick(feature)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all duration-200 ${
                    hasAccess 
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 hover:border-green-300 dark:hover:border-green-700 cursor-pointer" 
                      : "bg-muted/50 border-border/50 opacity-70 hover:opacity-100 hover:border-primary/50 cursor-pointer"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    hasAccess ? "bg-green-100 dark:bg-green-900/40" : "bg-muted"
                  }`}>
                    {hasAccess ? (
                      <feature.icon className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${!hasAccess && "text-muted-foreground"}`}>
                      {feature.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {hasAccess ? "Click to open" : "Upgrade to unlock"}
                    </p>
                  </div>
                  {hasAccess && (
                    <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Upgrade CTA */}
          {isFreePlan && (
            <Button 
              variant="outline" 
              className="w-full group"
              onClick={() => {
                setSelectedFeature(null);
                setUpgradeDialogOpen(true);
              }}
            >
              Upgrade for More Features
              <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Upgrade Your Plan
            </DialogTitle>
            <DialogDescription>
              {selectedFeature 
                ? getUpgradeMessage(selectedFeature.key)
                : "Unlock more features by upgrading to a higher plan."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-3">Select a plan to upgrade:</p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setSelectedPlanTier("professional")}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 text-left ${
                  selectedPlanTier === "professional"
                    ? "bg-primary/10 border-primary ring-2 ring-primary/20"
                    : "bg-muted/50 border-border/50 hover:border-primary/50"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Professional Plan</p>
                  <p className="text-xs text-muted-foreground">30 patients/day, analytics, team management</p>
                </div>
                {selectedPlanTier === "professional" && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setSelectedPlanTier("enterprise")}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 text-left ${
                  selectedPlanTier === "enterprise"
                    ? "bg-primary/10 border-primary ring-2 ring-primary/20"
                    : "bg-muted/50 border-border/50 hover:border-primary/50"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Enterprise Plan</p>
                  <p className="text-xs text-muted-foreground">Unlimited patients, API access, 24/7 support</p>
                </div>
                {selectedPlanTier === "enterprise" && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </button>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)}>
              Maybe Later
            </Button>
            <Button onClick={handleUpgradeNow} disabled={loadingPortal || !selectedPlanTier}>
              {loadingPortal ? "Loading..." : "Upgrade Now"}
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Priority Support Dialog */}
      <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-primary" />
              Priority Support
            </DialogTitle>
            <DialogDescription>
              As a {planInfo?.name || "Premium"} subscriber, you have access to priority support.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium mb-2">Contact Options:</p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Email: support@medicare.com
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Response time: Within 4 hours
                </li>
                {planTier === "enterprise" && (
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    24/7 Phone Support Available
                  </li>
                )}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setSupportDialogOpen(false)}>Got It</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
import { Crown, Users, BarChart3, Palette, Headphones, Lock, Check, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { usePlanFeatures, PlanFeatures } from "@/hooks/usePlanFeatures";

interface PlanRestrictionsCardProps {
  userId: string | undefined;
  currentPatientCount: number;
  onUpgradeClick?: () => void;
}

interface FeatureItem {
  key: keyof PlanFeatures;
  label: string;
  icon: React.ElementType;
  description: string;
}

const FEATURE_LIST: FeatureItem[] = [
  { key: "analyticsAccess", label: "Analytics Dashboard", icon: BarChart3, description: "View performance insights" },
  { key: "teamManagement", label: "Team Management", icon: Users, description: "Manage PAs & staff" },
  { key: "customBranding", label: "Custom Branding", icon: Palette, description: "Personalize your profile" },
  { key: "prioritySupport", label: "Priority Support", icon: Headphones, description: "Faster response times" },
];

export function PlanRestrictionsCard({ userId, currentPatientCount, onUpgradeClick }: PlanRestrictionsCardProps) {
  const { planInfo, planTier, features, isFreePlan, canAccessFeature } = usePlanFeatures(userId);

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

  return (
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

        {/* Feature Grid */}
        <div className="grid grid-cols-2 gap-3">
          {FEATURE_LIST.map((feature) => {
            const hasAccess = canAccessFeature(feature.key);
            return (
              <div 
                key={feature.key}
                className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                  hasAccess 
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
                    : "bg-muted/50 border-border/50 opacity-60"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
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
                </div>
              </div>
            );
          })}
        </div>

        {/* Upgrade CTA */}
        {isFreePlan && onUpgradeClick && (
          <Button 
            variant="outline" 
            className="w-full group"
            onClick={onUpgradeClick}
          >
            Upgrade for More Features
            <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
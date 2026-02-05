import { Lock, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { PlanFeatures } from "@/hooks/usePlanFeatures";
import { motion } from "framer-motion";

interface FeatureGateProps {
  feature: keyof PlanFeatures;
  canAccess: boolean;
  upgradeMessage: string;
  children: React.ReactNode;
  variant?: "overlay" | "replace" | "banner";
  showPreview?: boolean;
}

export function FeatureGate({ 
  canAccess, 
  upgradeMessage, 
  children, 
  variant = "replace",
  showPreview = false 
}: FeatureGateProps) {
  if (canAccess) {
    return <>{children}</>;
  }

  if (variant === "banner") {
    return (
      <>
        <Alert className="mb-6 border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
          <Crown className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between flex-wrap gap-3">
            <span className="font-medium">{upgradeMessage}</span>
            <Button size="sm" variant="default" asChild>
              <Link to="/doctor?tab=settings">
                Upgrade Now <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
        {children}
      </>
    );
  }

  if (variant === "overlay" && showPreview) {
    return (
      <div className="relative">
        <div className="opacity-30 pointer-events-none blur-[2px]">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-xl">
          <UpgradeCard message={upgradeMessage} />
        </div>
      </div>
    );
  }

  return <UpgradeCard message={upgradeMessage} />;
}

interface UpgradeCardProps {
  message: string;
  compact?: boolean;
}

export function UpgradeCard({ message, compact = false }: UpgradeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <CardContent className={compact ? "p-4" : "p-8 text-center"}>
          <div className={`${compact ? "flex items-center gap-4" : "flex flex-col items-center gap-4"}`}>
            <div className={`${compact ? "w-12 h-12" : "w-16 h-16"} rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center`}>
              <Lock className={`${compact ? "w-6 h-6" : "w-8 h-8"} text-primary`} />
            </div>
            <div className={compact ? "" : "space-y-2"}>
              <h3 className={`${compact ? "text-base" : "text-lg"} font-semibold`}>
                Premium Feature
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {message}
              </p>
            </div>
            <Button asChild className={compact ? "ml-auto" : "mt-2"}>
              <Link to="/doctor?tab=settings">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade Plan
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface PatientLimitWarningProps {
  currentCount: number;
  maxAllowed: number;
  isAtLimit: boolean;
}

export function PatientLimitWarning({ currentCount, maxAllowed, isAtLimit }: PatientLimitWarningProps) {
  if (!isAtLimit && currentCount < maxAllowed * 0.8) {
    return null;
  }

  const percentage = Math.round((currentCount / maxAllowed) * 100);
  const isWarning = percentage >= 80 && percentage < 100;

  return (
    <Alert className={`${isAtLimit ? "border-destructive/50 bg-destructive/5" : "border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10"}`}>
      {isAtLimit ? <Lock className="h-4 w-4 text-destructive" /> : <Crown className="h-4 w-4 text-yellow-600" />}
      <AlertDescription className="flex items-center justify-between flex-wrap gap-3">
        <span className={isAtLimit ? "text-destructive" : "text-yellow-700 dark:text-yellow-400"}>
          {isAtLimit 
            ? `You've reached your daily limit of ${maxAllowed} patients. `
            : `${currentCount} of ${maxAllowed} patient slots used today (${percentage}%). `
          }
          {isAtLimit ? "Upgrade to accept more patients." : "Consider upgrading for more capacity."}
        </span>
        <Button size="sm" variant={isAtLimit ? "destructive" : "outline"} asChild>
          <Link to="/doctor?tab=settings">
            Upgrade <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

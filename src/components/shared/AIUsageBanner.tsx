import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Lock, Crown, ArrowRight, Sparkles } from "lucide-react";

interface AIUsageBannerProps {
  canUse: boolean;
  currentCount: number;
  dailyLimit: number;
  remaining: number;
  userTier: "free" | "professional" | "enterprise";
  isLoading: boolean;
}

export function AIUsageBanner({ canUse, currentCount, dailyLimit, remaining, userTier, isLoading }: AIUsageBannerProps) {
  if (isLoading || userTier === "enterprise") return null;

  if (!canUse) {
    return (
      <Alert className="border-destructive/50 bg-destructive/5 mb-6">
        <Lock className="h-4 w-4 text-destructive" />
        <AlertDescription className="flex items-center justify-between flex-wrap gap-3">
          <span className="text-destructive font-medium">
            You've reached your daily limit of {dailyLimit} free uses. Subscribe to get more daily analyses.
          </span>
          <Button size="sm" variant="destructive" asChild>
            <Link to="/become-doctor">
              <Crown className="w-4 h-4 mr-1" /> Subscribe <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (remaining <= 1 && dailyLimit !== Infinity) {
    return (
      <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10 mb-6">
        <Sparkles className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="flex items-center justify-between flex-wrap gap-3">
          <span className="text-yellow-700 dark:text-yellow-400">
            {remaining} of {dailyLimit} free {remaining === 1 ? "use" : "uses"} remaining today.
            {userTier === "free" && " Subscribe for more daily analyses."}
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  if (userTier === "free" && dailyLimit !== Infinity) {
    return (
      <div className="text-xs text-muted-foreground text-center mb-4">
        {currentCount}/{dailyLimit} free uses today • {remaining} remaining
      </div>
    );
  }

  return null;
}

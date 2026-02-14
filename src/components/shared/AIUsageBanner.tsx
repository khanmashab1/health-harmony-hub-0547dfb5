import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Lock, Crown, ArrowRight, Sparkles, Zap } from "lucide-react";

interface AIUsageBannerProps {
  canUse: boolean;
  currentCount: number;
  dailyLimit: number;
  remaining: number;
  userTier: "free" | "professional" | "enterprise" | "credits";
  isLoading: boolean;
  creditsRemaining: number;
  hasCredits: boolean;
}

export function AIUsageBanner({ canUse, currentCount, dailyLimit, remaining, userTier, isLoading, creditsRemaining, hasCredits }: AIUsageBannerProps) {
  if (isLoading || userTier === "enterprise") return null;

  // Credits-based user
  if (userTier === "credits") {
    return (
      <div className="text-xs text-muted-foreground text-center mb-4 flex items-center justify-center gap-1">
        <Zap className="w-3 h-3 text-primary" />
        {creditsRemaining} AI credits remaining
      </div>
    );
  }

  if (!canUse) {
    return (
      <Alert className="border-destructive/50 bg-destructive/5 mb-6">
        <Lock className="h-4 w-4 text-destructive" />
        <AlertDescription className="flex items-center justify-between flex-wrap gap-3">
          <span className="text-destructive font-medium">
            You've reached your daily limit of {dailyLimit} free uses. Purchase AI credits for more analyses.
          </span>
          <Button size="sm" variant="destructive" asChild>
            <Link to="/profile?tab=ai-credits">
              <Crown className="w-4 h-4 mr-1" /> Get Credits <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (remaining <= 1 && dailyLimit !== Infinity) {
    return (
      <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-900/10 mb-6">
        <Sparkles className="h-4 w-4 text-amber-600" />
        <AlertDescription className="flex items-center justify-between flex-wrap gap-3">
          <span className="text-amber-700 dark:text-amber-400">
            {remaining} of {dailyLimit} free {remaining === 1 ? "use" : "uses"} remaining today.
          </span>
          <Button size="sm" variant="outline" asChild>
            <Link to="/profile?tab=ai-credits">
              Get More Credits
            </Link>
          </Button>
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

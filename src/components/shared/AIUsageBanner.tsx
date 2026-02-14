import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Lock, Crown, ArrowRight, Sparkles, Zap, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AIUsageBannerProps {
  canUse: boolean;
  currentCount: number;
  dailyLimit: number;
  remaining: number;
  userTier: "free" | "professional" | "enterprise" | "credits";
  isLoading: boolean;
  creditsRemaining: number;
  hasCredits: boolean;
  creditsPerUse?: number;
  dailyCredits?: number;
}

export function AIUsageBanner({ canUse, currentCount, dailyLimit, remaining, userTier, isLoading, creditsRemaining, hasCredits, creditsPerUse = 5, dailyCredits = 15 }: AIUsageBannerProps) {
  const { user } = useAuth();

  if (isLoading || userTier === "enterprise") return null;

  // Credits-based user (purchased credits)
  if (userTier === "credits") {
    return (
      <div className="text-xs text-muted-foreground text-center mb-4 flex items-center justify-center gap-1">
        <Zap className="w-3 h-3 text-primary" />
        {creditsRemaining} AI credits remaining ({creditsPerUse} credits per use)
      </div>
    );
  }

  if (!canUse) {
    // Not logged in — prompt to sign up
    if (!user) {
      return (
        <Alert className="border-primary/50 bg-primary/5 mb-6">
          <UserPlus className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between flex-wrap gap-3">
            <span className="text-foreground font-medium">
              You've used your {dailyLimit} free daily uses. Sign up to get more credits and unlock AI Pro plans!
            </span>
            <Button size="sm" asChild>
              <Link to="/auth?mode=signup">
                <UserPlus className="w-4 h-4 mr-1" /> Sign Up Free <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    // Logged in — prompt to purchase credits
    return (
      <Alert className="border-destructive/50 bg-destructive/5 mb-6">
        <Lock className="h-4 w-4 text-destructive" />
        <AlertDescription className="flex items-center justify-between flex-wrap gap-3">
          <span className="text-destructive font-medium">
            You've used all {dailyCredits} daily credits ({dailyLimit} uses × {creditsPerUse} credits each). Purchase more credits for additional analyses.
          </span>
          <Button size="sm" variant="destructive" asChild>
            <Link to="/profile?tab=ai-credits">
              <Crown className="w-4 h-4 mr-1" /> Get AI Pro Credits <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (remaining <= 1 && dailyLimit !== Infinity) {
    const remainingCreditsDisplay = remaining * creditsPerUse;
    return (
      <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-900/10 mb-6">
        <Sparkles className="h-4 w-4 text-amber-600" />
        <AlertDescription className="flex items-center justify-between flex-wrap gap-3">
          <span className="text-amber-700 dark:text-amber-400">
            {remainingCreditsDisplay} credits left today ({remaining} {remaining === 1 ? "use" : "uses"} remaining)
          </span>
          {!user ? (
            <Button size="sm" variant="outline" asChild>
              <Link to="/auth?mode=signup">
                Sign Up for More
              </Link>
            </Button>
          ) : (
            <Button size="sm" variant="outline" asChild>
              <Link to="/profile?tab=ai-credits">
                Get More Credits
              </Link>
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (userTier === "free" && dailyLimit !== Infinity) {
    const usedCredits = currentCount * creditsPerUse;
    return (
      <div className="text-xs text-muted-foreground text-center mb-4">
        {usedCredits}/{dailyCredits} daily credits used • {remaining} {remaining === 1 ? "use" : "uses"} remaining ({creditsPerUse} credits per use)
        {!user && (
          <span> • <Link to="/auth?mode=signup" className="text-primary underline">Sign up</Link> for AI Pro</span>
        )}
      </div>
    );
  }

  return null;
}

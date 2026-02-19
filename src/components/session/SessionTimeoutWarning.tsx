import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { useAuth } from "@/hooks/useAuth";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SessionTimeoutWarning() {
  const { user } = useAuth();
  const { secondsLeft, stayLoggedIn } = useIdleTimeout();

  if (!user || secondsLeft === null) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-[100] max-w-sm"
      >
        <div className="bg-card border border-border shadow-2xl rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-accent">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Session expiring soon</p>
              <p className="text-xs text-muted-foreground">
                Auto-logout in{" "}
                <span className="font-mono font-bold text-primary">
                  {minutes}:{seconds.toString().padStart(2, "0")}
                </span>
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Your data has been auto-saved. Click below to stay logged in.
          </p>
          <Button
            onClick={stayLoggedIn}
            size="sm"
            className="w-full"
            variant="default"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Stay Logged In
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldX } from "lucide-react";

const BLOCKED_COUNTRIES = ["IL"];

export function GeoBlock({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-geo");
        if (!error && data?.country && BLOCKED_COUNTRIES.includes(data.country)) {
          setBlocked(true);
        }
      } catch {
        // On failure, allow access
      } finally {
        setChecking(false);
      }
    };
    check();
  }, []);

  if (checking) return null;

  if (blocked) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-6">
          <ShieldX className="mx-auto h-20 w-20 text-destructive mb-6" />
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Service Unavailable
          </h1>
          <p className="text-muted-foreground text-lg">
            This service is not available in your region.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

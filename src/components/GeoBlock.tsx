import { useEffect, useState } from "react";
import { ShieldX } from "lucide-react";

const BLOCKED_COUNTRIES = ["IL"];

export function GeoBlock({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        // Primary: ipapi.co
        const res = await fetch("https://ipapi.co/json/", {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.country_code && BLOCKED_COUNTRIES.includes(data.country_code)) {
            setBlocked(true);
            setChecking(false);
            return;
          }
        }
      } catch {
        // try fallback
        try {
          const res2 = await fetch("https://ip2c.org/self", {
            signal: AbortSignal.timeout(5000),
          });
          if (res2.ok) {
            const text = await res2.text();
            const parts = text.split(";");
            if (parts[0] === "1" && BLOCKED_COUNTRIES.includes(parts[1])) {
              setBlocked(true);
              setChecking(false);
              return;
            }
          }
        } catch {
          // On all failures, allow access
        }
      }
      setChecking(false);
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


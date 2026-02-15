import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on home page or diet planner (has its own back button)
  if (location.pathname === "/" || location.pathname === "/diet-planner") return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigate(-1)}
      className="fixed top-[80px] left-3 z-40 h-9 w-9 sm:h-10 sm:w-auto sm:px-3 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm hover:shadow-md transition-all"
      aria-label="Go back"
    >
      <ArrowLeft className="w-4 h-4" />
      <span className="hidden sm:inline text-sm ml-1">Back</span>
    </Button>
  );
}

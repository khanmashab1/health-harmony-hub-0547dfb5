import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on home page
  if (location.pathname === "/") return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate(-1)}
      className="fixed top-[80px] left-4 z-40 gap-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm hover:shadow-md transition-all"
    >
      <ArrowLeft className="w-4 h-4" />
      <span className="hidden sm:inline text-sm">Back</span>
    </Button>
  );
}

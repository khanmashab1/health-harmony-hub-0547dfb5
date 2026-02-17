import { motion } from "framer-motion";
import { FlaskConical, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  doctorUserId?: string;
  onNavigate: () => void;
}

export function PendingTestReportsBanner({ doctorUserId, onNavigate }: Props) {
  const { data: count } = useQuery({
    queryKey: ["pending-test-reports-count", doctorUserId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("test_reports")
        .select("*, appointments!inner(doctor_user_id)", { count: "exact", head: true })
        .eq("appointments.doctor_user_id", doctorUserId!)
        .is("reviewed_at", null);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!doctorUserId,
  });

  if (!count || count === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.13 }}
      className="mb-4"
    >
      <Card
        variant="glass"
        className="border-white/50 cursor-pointer hover:shadow-lg transition-all"
        onClick={() => {
          onNavigate();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      >
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm sm:text-base">Pending Test Reports</p>
                <Badge variant="destructive" className="text-xs">{count}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Reports awaiting your review</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </CardContent>
      </Card>
    </motion.div>
  );
}

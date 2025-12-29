import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Star,
  Shield,
  Check,
  X,
  Search,
  Filter,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layout } from "@/components/layout/Layout";
import { useRequireAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminReviews() {
  const { loading } = useRequireAuth(["admin"]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch all reviews
  const { data: reviews, isLoading, error } = useQuery({
    queryKey: ["admin-all-reviews", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["admin-review-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("status");
      if (error) throw error;

      const pending = data?.filter((r) => r.status === "Pending").length || 0;
      const approved = data?.filter((r) => r.status === "Approved").length || 0;
      const rejected = data?.filter((r) => r.status === "Rejected").length || 0;
      
      return { pending, approved, rejected, total: data?.length || 0 };
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("reviews")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin-review-stats"] });
      queryClient.invalidateQueries({ queryKey: ["approved-reviews"] });
      toast({
        title: `Review ${status.toLowerCase()}`,
        description: `The review has been ${status.toLowerCase()}.`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update review",
        description: error.message,
      });
    },
  });

  const filteredReviews = reviews?.filter((review) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      review.display_name?.toLowerCase().includes(searchLower) ||
      review.comment?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-brand-50/20">
          <div className="container mx-auto px-4 py-8">
            <Skeleton className="h-12 w-64 mb-8" />
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-brand-50/20">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
          >
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Star className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Review Moderation</h1>
                <p className="text-muted-foreground font-medium">
                  Approve or reject patient reviews
                </p>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            {[
              { label: "Total Reviews", value: stats?.total || 0, color: "from-blue-500 to-blue-600" },
              { label: "Pending", value: stats?.pending || 0, color: "from-amber-500 to-orange-500" },
              { label: "Approved", value: stats?.approved || 0, color: "from-green-500 to-green-600" },
              { label: "Rejected", value: stats?.rejected || 0, color: "from-red-500 to-red-600" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Card variant="glass" className="border-white/50">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}
                      >
                        <Star className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold">{stat.value}</p>
                        <p className="text-sm text-muted-foreground font-medium">
                          {stat.label}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col md:flex-row gap-4 mb-6"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or comment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reviews</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          {/* Reviews List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card variant="glass" className="border-white/50">
              <CardHeader className="border-b border-border/30 bg-gradient-to-r from-amber-50/50 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-600" />
                  Reviews
                  {filteredReviews && (
                    <Badge variant="secondary" className="ml-2">
                      {filteredReviews.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Failed to load reviews. Please try again.</AlertDescription>
                  </Alert>
                ) : isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-32" />
                    ))}
                  </div>
                ) : filteredReviews && filteredReviews.length > 0 ? (
                  <div className="space-y-4">
                    {filteredReviews.map((review, index) => (
                      <motion.div
                        key={review.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="p-4 rounded-xl border border-border/50 bg-white/50 hover:bg-white transition-all"
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-semibold">{review.display_name}</p>
                              <Badge
                                className={
                                  review.status === "Approved"
                                    ? "status-completed"
                                    : review.status === "Pending"
                                    ? "status-pending"
                                    : "status-cancelled"
                                }
                              >
                                {review.status}
                              </Badge>
                            </div>
                            <div className="flex gap-0.5 mb-2">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating
                                      ? "text-amber-500 fill-amber-500"
                                      : "text-gray-200"
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="text-muted-foreground text-sm mb-2">
                              {review.comment || "No comment provided."}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(review.created_at), "MMM d, yyyy 'at' h:mm a")}
                              {review.source && ` • Source: ${review.source}`}
                            </p>
                          </div>
                          {review.status === "Pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:bg-green-50 hover:border-green-300"
                                onClick={() =>
                                  updateStatus.mutate({ id: review.id, status: "Approved" })
                                }
                                disabled={updateStatus.isPending}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:bg-red-50 hover:border-red-300"
                                onClick={() =>
                                  updateStatus.mutate({ id: review.id, status: "Rejected" })
                                }
                                disabled={updateStatus.isPending}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                      <Star className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No reviews found.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
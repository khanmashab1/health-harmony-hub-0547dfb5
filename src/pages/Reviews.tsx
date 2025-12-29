import { motion } from "framer-motion";
import { Star, ArrowLeft, Quote, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

export default function Reviews() {
  const navigate = useNavigate();

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["reviews-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("rating")
        .eq("status", "Approved");
      if (error) throw error;
      
      const totalReviews = data?.length || 0;
      const avgRating = totalReviews 
        ? (data!.reduce((a, b) => a + b.rating, 0) / totalReviews).toFixed(1)
        : "0";
      
      return { totalReviews, avgRating };
    },
  });

  // Fetch all approved reviews
  const { data: reviews, isLoading, error } = useQuery({
    queryKey: ["all-approved-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("status", "Approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-amber-50/30 via-background to-orange-50/20">
        <div className="container mx-auto px-4 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Patient <span className="gradient-text">Reviews</span>
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
                Read what our patients have to say about their healthcare experience
              </p>
              {stats && stats.totalReviews > 0 && (
                <div className="flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-6 h-6 ${
                            star <= Math.round(parseFloat(stats.avgRating))
                              ? "text-amber-500 fill-amber-500"
                              : "text-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-2xl font-bold">{stats.avgRating}</span>
                  </div>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-muted-foreground">
                    {stats.totalReviews} {stats.totalReviews === 1 ? "review" : "reviews"}
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Reviews Grid */}
          {error ? (
            <Alert variant="destructive" className="max-w-md mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Failed to load reviews. Please try again later.</AlertDescription>
            </Alert>
          ) : isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="w-8 h-8 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-24" />
                </Card>
              ))}
            </div>
          ) : reviews && reviews.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {reviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className="p-6 h-full hover:shadow-lg transition-all">
                    <Quote className="w-8 h-8 text-primary/20 mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {review.comment || "Great experience with the doctor and staff!"}
                    </p>
                    <div className="mt-auto">
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
                      <p className="font-semibold">{review.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(review.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-20">
              <div className="w-24 h-24 mx-auto rounded-full bg-muted flex items-center justify-center mb-6">
                <Star className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Reviews Yet</h3>
              <p className="text-muted-foreground mb-6">
                Be the first to share your healthcare experience!
              </p>
              <Button variant="hero" onClick={() => navigate("/auth?mode=signup")}>
                Create Account to Review
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, ArrowLeft, Quote, AlertCircle, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

export default function Reviews() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const doctorFilter = searchParams.get("doctor");
  const [starFilter, setStarFilter] = useState<number | null>(null);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Fetch doctor name if filtering by doctor
  const { data: doctorProfile } = useQuery({
    queryKey: ["doctor-profile-name", doctorFilter],
    queryFn: async () => {
      if (!doctorFilter) return null;
      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", doctorFilter)
        .single();
      return data;
    },
    enabled: !!doctorFilter,
  });

  // Fetch all approved reviews (optionally filtered by doctor)
  const { data: reviews, isLoading, error } = useQuery({
    queryKey: ["all-approved-reviews", doctorFilter],
    queryFn: async () => {
      let query = supabase
        .from("reviews")
        .select("*")
        .eq("status", "Approved")
        .order("created_at", { ascending: false });
      
      if (doctorFilter) {
        query = query.eq("doctor_user_id", doctorFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate rating distribution
  const ratingDistribution = useMemo(() => {
    if (!reviews || reviews.length === 0) return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      dist[r.rating] = (dist[r.rating] || 0) + 1;
    });
    return dist;
  }, [reviews]);

  const totalReviews = reviews?.length || 0;
  const avgRating = totalReviews
    ? (reviews!.reduce((a, b) => a + b.rating, 0) / totalReviews).toFixed(1)
    : "0";

  // Apply star filter
  const filteredReviews = useMemo(() => {
    if (!reviews) return [];
    if (starFilter === null) return reviews;
    return reviews.filter((r) => r.rating === starFilter);
  }, [reviews, starFilter]);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-amber-50/30 via-background to-orange-50/20">
        <div className="container mx-auto px-4 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {doctorFilter && doctorProfile
                  ? <>Dr. {doctorProfile.name}'s <span className="gradient-text">Reviews</span></>
                  : <>Patient <span className="gradient-text">Reviews</span></>
                }
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
                {doctorFilter
                  ? "See what patients have to say about this doctor"
                  : "Read what our patients have to say about their healthcare experience"
                }
              </p>
            </div>
          </motion.div>

          {/* Stats & Distribution */}
          {totalReviews > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="max-w-3xl mx-auto mb-10"
            >
              <Card className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  {/* Average Rating */}
                  <div className="text-center flex-shrink-0">
                    <p className="text-5xl font-bold mb-1">{avgRating}</p>
                    <div className="flex gap-0.5 justify-center mb-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= Math.round(parseFloat(avgRating))
                              ? "text-amber-500 fill-amber-500"
                              : "text-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
                    </p>
                  </div>

                  {/* Rating Distribution */}
                  <div className="flex-1 w-full space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = ratingDistribution[star] || 0;
                      const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                      const isActive = starFilter === star;

                      return (
                        <button
                          key={star}
                          onClick={() => setStarFilter(isActive ? null : star)}
                          className={`flex items-center gap-3 w-full group rounded-lg px-2 py-1 transition-colors ${
                            isActive
                              ? "bg-primary/10"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <span className="flex items-center gap-1 w-14 text-sm font-medium">
                            {star} <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          </span>
                          <div className="flex-1">
                            <Progress 
                              value={percentage} 
                              className="h-2.5" 
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active filter indicator */}
                {starFilter !== null && (
                  <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Filter className="w-4 h-4" />
                      Showing {starFilter}-star reviews ({filteredReviews.length})
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStarFilter(null)}
                    >
                      Clear filter
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          )}

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
          ) : filteredReviews && filteredReviews.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredReviews.map((review, index) => (
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
              <h3 className="text-xl font-semibold mb-2">
                {starFilter !== null ? "No Reviews with This Rating" : "No Reviews Yet"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {starFilter !== null 
                  ? "Try selecting a different star rating"
                  : "Be the first to share your healthcare experience!"
                }
              </p>
              {starFilter !== null ? (
                <Button variant="outline" onClick={() => setStarFilter(null)}>
                  Clear Filter
                </Button>
              ) : (
                <Button variant="hero" onClick={() => navigate("/auth?mode=signup")}>
                  Create Account to Review
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

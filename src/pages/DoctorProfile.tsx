import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  User, 
  Star, 
  MapPin, 
  Clock, 
  Stethoscope, 
  GraduationCap, 
  Award,
  ArrowLeft,
  Calendar,
  MessageSquare,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  display_name: string;
  created_at: string;
}

export default function DoctorProfile() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();

  // Fetch doctor details
  const { data: doctor, isLoading: loadingDoctor } = useQuery({
    queryKey: ["doctor-profile", doctorId],
    queryFn: async () => {
      if (!doctorId) throw new Error("Doctor ID required");
      
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .eq("user_id", doctorId)
        .single();
      
      if (error) throw error;

      // Get profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", doctorId)
        .single();

      return { ...data, profile };
    },
    enabled: !!doctorId,
  });

  // Fetch all approved reviews for this doctor
  const { data: reviews, isLoading: loadingReviews } = useQuery({
    queryKey: ["doctor-reviews", doctorId],
    queryFn: async () => {
      if (!doctorId) return [];
      
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("doctor_user_id", doctorId)
        .eq("status", "Approved")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Review[];
    },
    enabled: !!doctorId,
  });

  if (loadingDoctor) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!doctor) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold mb-4">Doctor not found</h1>
          <Button onClick={() => navigate("/booking")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Booking
          </Button>
        </div>
      </Layout>
    );
  }

  const averageRating = reviews && reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : doctor.rating || 4.0;

  return (
    <Layout>
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            className="mb-6"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {/* Doctor Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card variant="elevated" className="overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
                    <AvatarImage src={doctor.image_path || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/30 text-4xl font-bold text-primary">
                      {doctor.profile?.name?.charAt(0)?.toUpperCase() || "D"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-2">
                      Dr. {doctor.profile?.name || "Doctor"}
                    </h1>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="secondary" className="text-sm">
                        <Stethoscope className="w-3 h-3 mr-1" />
                        {doctor.specialty}
                      </Badge>
                      {doctor.degree && (
                        <Badge variant="outline" className="text-sm">
                          <GraduationCap className="w-3 h-3 mr-1" />
                          {doctor.degree}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        {averageRating} ({reviews?.length || 0} reviews)
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {doctor.experience_years || 0} years experience
                      </span>
                      {doctor.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {doctor.city}, {doctor.province}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right space-y-2">
                    <p className="text-3xl font-bold text-primary">Rs. {doctor.fee}</p>
                    <p className="text-sm text-muted-foreground">per consultation</p>
                    <Button 
                      variant="hero" 
                      onClick={() => navigate(`/booking?doctorId=${doctorId}`)}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Book Appointment
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Left Column - Details */}
            <div className="md:col-span-2 space-y-6">
              {/* About */}
              {doctor.bio && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        About
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {doctor.bio}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Qualifications */}
              {doctor.qualifications && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-primary" />
                        Qualifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{doctor.qualifications}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Reviews Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      Patient Reviews ({reviews?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingReviews ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : reviews && reviews.length > 0 ? (
                      <div className="space-y-4">
                        {reviews.map((review, index) => (
                          <div key={review.id}>
                            <div className="flex items-start gap-4">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                  {review.display_name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium">{review.display_name}</h4>
                                  <div className="flex items-center gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-3 h-3 ${
                                          i < review.rating
                                            ? "text-yellow-500 fill-yellow-500"
                                            : "text-muted-foreground/30"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">
                                  {review.comment || "Great experience!"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(review.created_at), "MMM d, yyyy")}
                                </p>
                              </div>
                            </div>
                            {index < reviews.length - 1 && <Separator className="my-4" />}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No reviews yet. Be the first to review after your appointment!
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Right Column - Quick Info */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Specialty</span>
                      <span className="font-medium">{doctor.specialty}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Experience</span>
                      <span className="font-medium">{doctor.experience_years || 0} years</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fee</span>
                      <span className="font-medium text-primary">Rs. {doctor.fee}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Daily Limit</span>
                      <span className="font-medium">{doctor.max_patients_per_day} patients</span>
                    </div>
                    {doctor.city && (
                      <>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Location</span>
                          <span className="font-medium">{doctor.city}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="p-6 text-center">
                    <Calendar className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Ready to Book?</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Schedule your appointment with Dr. {doctor.profile?.name?.split(" ")[0] || "Doctor"} today
                    </p>
                    <Button 
                      variant="hero" 
                      className="w-full"
                      onClick={() => navigate(`/booking?doctorId=${doctorId}`)}
                    >
                      Book Now
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
import React from "react";
import { SEOHead, seoSchemas } from "@/components/seo/SEOHead";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Star, 
  Clock, 
  MapPin, 
  GraduationCap, 
  Stethoscope, 
  Calendar,
  User,
  Award,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  display_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export default function DoctorProfile() {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  // Scroll to top when page loads
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [doctorId]);

  // Fetch doctor details using doctors_public view to avoid exposing sensitive payment info
  const { data: doctor, isLoading: loadingDoctor } = useQuery({
    queryKey: ["doctor-profile", doctorId],
    queryFn: async () => {
      if (!doctorId) throw new Error("Doctor ID required");
      
      const { data, error } = await supabase
        .from("doctors_public")
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
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!doctor) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">Doctor not found</p>
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

  const imageUrl = doctor.image_path
    ? doctor.image_path.startsWith("http")
      ? doctor.image_path
      : supabase.storage.from("avatars").getPublicUrl(doctor.image_path).data.publicUrl
    : null;

  return (
    <Layout>
      <SEOHead
        title={`Dr. ${doctor.profile?.name || "Doctor"} - ${doctor.specialty || "Specialist"}`}
        description={doctor.bio || `Book an appointment with Dr. ${doctor.profile?.name || "our specialist"}, ${doctor.specialty} at MediCare+. ${doctor.experience_years || 0}+ years experience. Fee: Rs ${doctor.fee}.`}
        keywords={`Dr ${doctor.profile?.name}, ${doctor.specialty}, ${doctor.city || ""} doctor, book appointment ${doctor.specialty}, best ${doctor.specialty} Pakistan`}
        canonicalUrl={`/doctor/${doctorId}`}
        ogImage={imageUrl || undefined}
        jsonLd={seoSchemas.physician({
          name: doctor.profile?.name || "Doctor",
          specialty: doctor.specialty || "General",
          rating: doctor.rating,
          reviewCount: reviews?.length || 0,
          fee: doctor.fee,
          city: doctor.city,
          bio: doctor.bio,
          imageUrl,
          profileUrl: `/doctor/${doctorId}`,
        })}
      />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Doctor Header Card */}
        <Card className="mb-8 overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="w-32 h-32 md:w-40 md:h-40 mx-auto md:mx-0">
                <AvatarImage src={imageUrl || undefined} alt={doctor.profile?.name || "Doctor"} />
                <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                  {doctor.profile?.name?.charAt(0)?.toUpperCase() || "D"}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  Dr. {doctor.profile?.name || "Doctor"}
                </h1>
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Stethoscope className="w-3 h-3" />
                    {doctor.specialty}
                  </Badge>
                  {doctor.degree && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      {doctor.degree}
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-muted-foreground">
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

              <div className="text-center md:text-right">
                <p className="text-3xl font-bold text-primary">Rs. {doctor.fee}</p>
                <p className="text-sm text-muted-foreground mb-4">per consultation</p>
                <Button onClick={() => navigate(`/booking?doctorId=${doctorId}`)} size="lg">
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Appointment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="md:col-span-2 space-y-6">
            {/* About */}
            {doctor.bio && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    About
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{doctor.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Qualifications */}
            {doctor.qualifications && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Qualifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line">{doctor.qualifications}</p>
                </CardContent>
              </Card>
            )}

            {/* Reviews Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Patient Reviews ({reviews?.length || 0})
                </CardTitle>
                {reviews && reviews.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/reviews?doctor=${doctorId}`)}
                  >
                    View All
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {loadingReviews ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : reviews && reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.slice(0, 3).map((review, index) => (
                      <div key={review.id}>
                        <div className="flex items-start gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {review.display_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{review.display_name}</span>
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i < review.rating
                                        ? "text-yellow-500 fill-yellow-500"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {review.comment || "Great experience!"}
                            </p>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                              {format(new Date(review.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        {index < Math.min(reviews.length, 3) - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                    {reviews.length > 3 && (
                      <Button
                        variant="ghost"
                        className="w-full text-primary"
                        onClick={() => navigate(`/reviews?doctor=${doctorId}`)}
                      >
                        View all {reviews.length} reviews →
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No reviews yet. Be the first to review after your appointment!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Info */}
          <div className="space-y-6">
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
                  <span className="font-medium">Rs. {doctor.fee}</span>
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

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Ready to Book?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Schedule your appointment with Dr. {doctor.profile?.name?.split(" ")[0] || "Doctor"} today
                </p>
                <Button onClick={() => navigate(`/booking?doctorId=${doctorId}`)} className="w-full">
                  Book Now
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

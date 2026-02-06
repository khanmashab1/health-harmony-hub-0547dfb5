import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Star, Calendar, Award, Users, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DoctorWithReviews {
  user_id: string;
  specialty: string;
  degree: string | null;
  qualifications: string | null;
  bio: string | null;
  rating: number | null;
  experience_years: number | null;
  fee: number;
  image_path: string | null;
  name: string | null;
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    display_name: string;
    created_at: string;
  }[];
}

export function TopDoctorsSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Fetch doctors with their approved reviews
  const { data: doctors, isLoading } = useQuery({
    queryKey: ["top-doctors-with-reviews"],
    queryFn: async () => {
      // Get all doctors
      const { data: doctorsData, error: doctorsError } = await supabase
        .from("doctors")
        .select(`
          user_id,
          specialty,
          degree,
          qualifications,
          bio,
          rating,
          experience_years,
          fee,
          image_path
        `)
        .order("rating", { ascending: false })
        .limit(3);

      if (doctorsError) throw doctorsError;

      // Get doctor names from profiles and reviews
      const doctorsWithDetails = await Promise.all(
        (doctorsData || []).map(async (doctor) => {
          // Fetch profile name
          const { data: profileData } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", doctor.user_id)
            .maybeSingle();

          // Fetch reviews
          const { data: reviews } = await supabase
            .from("reviews")
            .select("id, rating, comment, display_name, created_at")
            .eq("doctor_user_id", doctor.user_id)
            .eq("status", "Approved")
            .order("created_at", { ascending: false })
            .limit(3);

          return {
            ...doctor,
            name: profileData?.name || null,
            reviews: reviews || [],
          };
        })
      );

      return doctorsWithDetails as DoctorWithReviews[];
    },
  });

  useEffect(() => {
    if (isPaused || !doctors || doctors.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % doctors.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [doctors?.length, isPaused]);

  const goToPrev = () => {
    if (!doctors) return;
    setCurrentIndex((prev) => (prev - 1 + doctors.length) % doctors.length);
  };

  const goToNext = () => {
    if (!doctors) return;
    setCurrentIndex((prev) => (prev + 1) % doctors.length);
  };

  if (isLoading || !doctors || doctors.length === 0) {
    return null;
  }

  const currentDoctor = doctors[currentIndex];

  return (
    <section 
      className="relative flex items-center overflow-hidden py-10 md:py-14 lg:py-16"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 hero-gradient">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 right-10 w-48 md:w-72 h-48 md:h-72 bg-primary/5 rounded-full blur-3xl" 
          />
          <motion.div 
            animate={{ x: [0, -20, 0], y: [0, 10, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-20 left-10 w-64 md:w-96 h-64 md:h-96 bg-accent/5 rounded-full blur-3xl" 
          />
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-center">
          {/* Doctor Photo - Shows first on mobile */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`photo-${currentIndex}`}
              initial={{ opacity: 0, scale: 0.9, y: -30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.5 }}
              className="relative flex justify-center order-first lg:order-last"
            >
              <div className="relative">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/10 rounded-full blur-3xl opacity-60 scale-90" />
                
                {/* Floating Image */}
                <motion.div
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="relative z-10"
                >
                  <Avatar className="w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 lg:w-52 lg:h-52 border-4 md:border-6 border-white shadow-2xl">
                    <AvatarImage 
                      src={currentDoctor.image_path || undefined} 
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-2xl md:text-4xl lg:text-5xl font-bold text-primary">
                      {currentDoctor.name?.charAt(0)?.toUpperCase() || "D"}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>

                {/* Floating Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="absolute -bottom-2 md:-bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-card rounded-full px-3 md:px-5 py-1.5 md:py-2 shadow-xl border"
                >
                  <div className="flex items-center gap-1 md:gap-2">
                    <Star className="w-3 h-3 md:w-4 md:h-4 text-amber-500 fill-amber-500" />
                    <span className="font-bold text-sm md:text-base">{currentDoctor.rating?.toFixed(1) || "4.5"}</span>
                    <span className="text-muted-foreground text-[10px] md:text-xs">Rating</span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Doctor Info */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`doctor-${currentIndex}`}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.5 }}
              className="space-y-3 md:space-y-4 text-center lg:text-left order-last lg:order-first"
            >
              <motion.span 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-block px-3 md:px-4 py-1 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium"
              >
                Top Rated Doctor
              </motion.span>

              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-[1.1] tracking-tight">
                Meet <span className="gradient-text">Dr. {currentDoctor.name || "Our Expert"}</span>
              </h1>

              <div className="flex flex-wrap items-center gap-2 md:gap-4 justify-center lg:justify-start">
                <Badge variant="secondary" className="text-xs md:text-base px-2 md:px-4 py-1">
                  <Stethoscope className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  {currentDoctor.specialty}
                </Badge>
                {currentDoctor.degree && (
                  <Badge variant="outline" className="text-xs md:text-base px-2 md:px-4 py-1">
                    <Award className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                    {currentDoctor.degree}
                  </Badge>
                )}
              </div>

              <p className="text-sm md:text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0 leading-relaxed line-clamp-2 md:line-clamp-3">
                {currentDoctor.bio || `Experienced ${currentDoctor.specialty} with ${currentDoctor.experience_years || 0}+ years of practice. Dedicated to providing quality healthcare.`}
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-4 md:gap-6 py-2 md:py-4 justify-center lg:justify-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Star className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-bold text-base md:text-lg">{currentDoctor.rating?.toFixed(1) || "4.5"}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Rating</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-bold text-base md:text-lg">{currentDoctor.experience_years || 0}+</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Years Exp</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <span className="text-green-600 font-bold text-xs md:text-sm">Rs</span>
                  </div>
                  <div>
                    <p className="font-bold text-base md:text-lg">{currentDoctor.fee}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Fee</p>
                  </div>
                </div>
              </div>

              {/* Recent Reviews - Hidden on small mobile */}
              {currentDoctor.reviews.length > 0 && (
                <div className="space-y-2 md:space-y-3 hidden sm:block">
                  <h3 className="font-semibold text-xs md:text-sm text-muted-foreground uppercase tracking-wide">Recent Reviews</h3>
                  <div className="space-y-2">
                    {currentDoctor.reviews.slice(0, 2).map((review) => (
                      <Card key={review.id} className="p-2 md:p-3 bg-card/50 backdrop-blur-sm border-border/50">
                        <div className="flex items-start gap-2 md:gap-3">
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-2.5 h-2.5 md:w-3 md:h-3 ${i < review.rating ? "text-amber-500 fill-amber-500" : "text-gray-200"}`}
                              />
                            ))}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{review.comment}</p>
                            <p className="text-[10px] md:text-xs text-muted-foreground/70 mt-1">— {review.display_name}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="flex flex-row gap-2 sm:gap-3 md:gap-4 pt-2 md:pt-4 justify-center lg:justify-start">
                <Link to={`/booking?doctor=${currentDoctor.user_id}`} className="flex-1 sm:flex-none">
                  <Button variant="hero" size="lg" className="w-full sm:w-auto gap-2 text-xs sm:text-sm md:text-base px-3 sm:px-6 md:px-8 h-10 sm:h-11 md:h-12">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                    Book Appointment
                  </Button>
                </Link>
                <Link to="/our-doctors" className="flex-1 sm:flex-none">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 text-xs sm:text-sm md:text-base px-3 sm:px-6 md:px-8 h-10 sm:h-11 md:h-12">
                    View All Doctors
                  </Button>
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Arrows */}
        {doctors.length > 1 && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-foreground hover:bg-background transition-all shadow-lg z-20"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-foreground hover:bg-background transition-all shadow-lg z-20"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </>
        )}

        {/* Dot Indicators - Below content */}
        {doctors.length > 1 && (
          <div className="flex justify-center gap-1.5 md:gap-2 mt-6 md:mt-8">
            {doctors.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === currentIndex 
                    ? "w-6 md:w-8 h-2 md:h-3 bg-primary" 
                    : "w-2 md:w-3 h-2 md:h-3 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
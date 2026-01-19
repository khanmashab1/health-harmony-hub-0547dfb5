import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Stethoscope, 
  Calendar, 
  Activity, 
  Star, 
  Heart,
  Brain,
  Baby,
  Eye,
  Bone,
  Smile,
  ArrowRight,
  CheckCircle2,
  Quote,
  Shield,
  Clock,
  Users,
  AlertCircle,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HeroSlider } from "@/components/home/HeroSlider";
import medicareLogo from "@/assets/medicare-logo.png";

const specialties = [
  { name: "General Physician", icon: Stethoscope, color: "from-primary to-primary/70" },
  { name: "Cardiologist", icon: Heart, color: "from-red-500 to-red-400" },
  { name: "Neurologist", icon: Brain, color: "from-purple-500 to-purple-400" },
  { name: "Pediatrician", icon: Baby, color: "from-pink-500 to-pink-400" },
  { name: "Ophthalmologist", icon: Eye, color: "from-blue-500 to-blue-400" },
  { name: "Orthopedic", icon: Bone, color: "from-amber-500 to-amber-400" },
  { name: "Dentist", icon: Smile, color: "from-green-500 to-green-400" },
  { name: "More Specialties", icon: Activity, color: "from-gray-500 to-gray-400" },
];

const howItWorks = [
  { step: 1, title: "Choose Specialty", description: "Select from our wide range of medical specialties" },
  { step: 2, title: "Find a Doctor", description: "Browse qualified doctors in your area with ratings" },
  { step: 3, title: "Pick a Date", description: "Select your preferred appointment date and time" },
  { step: 4, title: "Confirm Booking", description: "Get your token number and appointment confirmation" },
];

const features = [
  { icon: Shield, title: "Verified Doctors", description: "All doctors are verified and certified" },
  { icon: Clock, title: "24/7 Support", description: "Round-the-clock medical assistance" },
  { icon: Users, title: "10K+ Patients", description: "Trusted by thousands of patients" },
];

export default function Index() {
  const { user, profile } = useAuth();

  // Fetch stats including review stats and patient count
  const { data: stats } = useQuery({
    queryKey: ["home-stats"],
    queryFn: async () => {
      const [doctorsRes, patientsRes, reviewsRes] = await Promise.all([
        supabase.from("doctors").select("user_id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "patient").eq("status", "Active"),
        supabase.from("reviews").select("rating").eq("status", "Approved"),
      ]);
      const totalReviews = reviewsRes.data?.length || 0;
      const avgRating = totalReviews 
        ? (reviewsRes.data!.reduce((a, b) => a + b.rating, 0) / totalReviews).toFixed(1)
        : "4.8";
      return {
        doctors: doctorsRes.count || 0,
        patients: patientsRes.count || 0,
        rating: avgRating,
        totalReviews,
      };
    },
  });

  // Fetch patients (profiles with role='patient')
  const { data: patients, isLoading: loadingPatients, error: patientsError } = useQuery({
    queryKey: ["home-patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, age, gender, avatar_path, created_at, city")
        .eq("role", "patient")
        .eq("status", "Active")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch approved reviews
  const { data: reviews, isLoading: loadingReviews, error: reviewsError } = useQuery({
    queryKey: ["approved-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("status", "Approved")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <Layout>
      {/* Hero Slider */}
      <HeroSlider />

      {/* Specialties Section */}
      <section className="py-20 bg-muted/30 overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <motion.span 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4"
            >
              Our Specialties
            </motion.span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Find Doctors by <span className="gradient-text">Specialty</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose from a wide range of medical specialties and book appointments 
              with experienced healthcare professionals.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {specialties.map((specialty, index) => (
              <motion.div
                key={specialty.name}
                initial={{ opacity: 0, y: 40, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ 
                  delay: index * 0.08,
                  duration: 0.5,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <Link to={`/booking?specialty=${encodeURIComponent(specialty.name)}`}>
                  <Card variant="interactive" className="text-center p-6 h-full bg-card group">
                    <motion.div 
                      className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${specialty.color} flex items-center justify-center mb-4 shadow-lg`}
                      whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                      transition={{ duration: 0.4 }}
                    >
                      <specialty.icon className="w-7 h-7 text-white" />
                    </motion.div>
                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{specialty.name}</h3>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <motion.span 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4"
            >
              Simple Process
            </motion.span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It <span className="gradient-text">Works</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Book your appointment in just a few simple steps
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ 
                  delay: index * 0.15,
                  duration: 0.6,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                className="relative"
              >
                <div className="text-center">
                  <motion.div 
                    className="w-16 h-16 mx-auto rounded-2xl bg-gradient-brand flex items-center justify-center text-2xl font-bold text-white mb-4 shadow-lg"
                    initial={{ scale: 0, rotate: -180 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.15 + 0.2, duration: 0.5, type: "spring" }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    {item.step}
                  </motion.div>
                  <motion.h3 
                    className="font-semibold text-lg mb-2"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.15 + 0.3 }}
                  >
                    {item.title}
                  </motion.h3>
                  <motion.p 
                    className="text-sm text-muted-foreground"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.15 + 0.4 }}
                  >
                    {item.description}
                  </motion.p>
                </div>
                {index < howItWorks.length - 1 && (
                  <motion.div 
                    className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/30 to-transparent"
                    initial={{ scaleX: 0, originX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.15 + 0.5, duration: 0.5 }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Patients Section */}
      <section className="py-20 overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <motion.span 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4"
            >
              Community
            </motion.span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Our <span className="gradient-text">Patients</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join our growing community of patients receiving quality healthcare
            </p>
          </motion.div>

          {patientsError ? (
            <Alert variant="destructive" className="max-w-md mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Failed to load patients. Please try again later.</AlertDescription>
            </Alert>
          ) : loadingPatients ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="w-16 h-16 rounded-full mx-auto mb-3" />
                  <Skeleton className="h-4 w-24 mx-auto mb-2" />
                  <Skeleton className="h-3 w-16 mx-auto" />
                </Card>
              ))}
            </div>
          ) : patients && patients.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {patients.map((patient, index) => (
                <motion.div
                  key={patient.id}
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ 
                    delay: index * 0.08,
                    duration: 0.5,
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <Card className="p-4 text-center hover:shadow-lg transition-all group">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Avatar className="w-16 h-16 mx-auto mb-3 border-2 border-primary/20 group-hover:border-primary/50 transition-colors">
                        <AvatarImage src={patient.avatar_path || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                          {patient.name?.charAt(0)?.toUpperCase() || <User className="w-6 h-6" />}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                    <p className="font-semibold text-sm truncate">{patient.name || "Patient"}</p>
                    <p className="text-xs text-muted-foreground">
                      {[patient.age && `${patient.age}y`, patient.gender].filter(Boolean).join(" • ") || patient.city || "Member"}
                    </p>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div 
              className="text-center py-12"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <motion.div 
                className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center mb-4"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Users className="w-10 h-10 text-muted-foreground" />
              </motion.div>
              <p className="text-muted-foreground">No patients yet. Be the first to join!</p>
              <Link to="/auth?mode=signup" className="mt-4 inline-block">
                <Button variant="hero">Create Account</Button>
              </Link>
            </motion.div>
          )}
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-20 bg-muted/30 overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <motion.span 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4"
            >
              Testimonials
            </motion.span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What Patients <span className="gradient-text">Say</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Real reviews from our satisfied patients
            </p>
            {stats && stats.totalReviews > 0 && (
              <motion.div 
                className="flex items-center justify-center gap-4 mt-4"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="font-bold text-lg">{stats.rating}</span>
                </div>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{stats.totalReviews} reviews</span>
              </motion.div>
            )}
          </motion.div>

          {reviewsError ? (
            <Alert variant="destructive" className="max-w-md mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Failed to load reviews. Please try again later.</AlertDescription>
            </Alert>
          ) : loadingReviews ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="w-8 h-8 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-24" />
                </Card>
              ))}
            </div>
          ) : reviews && reviews.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reviews.map((review, index) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 40, rotateX: 15 }}
                    whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                    viewport={{ once: true }}
                    transition={{ 
                      delay: index * 0.1,
                      duration: 0.6,
                      ease: [0.25, 0.46, 0.45, 0.94]
                    }}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  >
                    <Card className="p-6 h-full hover:shadow-xl transition-all">
                      <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
                      >
                        <Quote className="w-8 h-8 text-primary/20 mb-4" />
                      </motion.div>
                      <p className="text-muted-foreground mb-4 line-clamp-3">
                        {review.comment || "Great experience with the doctor and staff!"}
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{review.display_name}</p>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 + 0.3 + i * 0.05 }}
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    i < review.rating
                                      ? "text-amber-500 fill-amber-500"
                                      : "text-gray-200"
                                  }`}
                                />
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
              <motion.div 
                className="text-center mt-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
              >
                <Link to="/reviews">
                  <Button variant="outline" className="gap-2 group">
                    View All Reviews
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </motion.div>
            </>
          ) : (
            <motion.div 
              className="text-center py-12"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <motion.div 
                className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center mb-4"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Star className="w-10 h-10 text-muted-foreground" />
              </motion.div>
              <p className="text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Dashboard CTA for logged in users */}
      {user && profile && (
        <section className="py-8 bg-primary/5">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Welcome back, {profile.name}!</p>
                <p className="text-sm text-muted-foreground">Continue managing your health journey</p>
              </div>
              <Link to={profile.role === "admin" ? "/admin" : profile.role === "doctor" ? "/doctor" : profile.role === "pa" ? "/pa" : "/profile"}>
                <Button variant="hero">Go to Dashboard</Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Card className="relative overflow-hidden bg-gradient-brand text-white p-12 text-center">
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to Book Your Appointment?
                </h2>
                <p className="text-white/80 max-w-2xl mx-auto mb-8">
                  Join thousands of patients who trust MediCare+ for their healthcare needs.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link to="/booking">
                    <Button variant="secondary" size="xl" className="gap-2">
                      <Calendar className="w-5 h-5" />
                      Book Now
                    </Button>
                  </Link>
                  <Link to="/auth?mode=signup">
                    <Button variant="outline-white" size="xl" className="gap-2">
                      Create Account
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}

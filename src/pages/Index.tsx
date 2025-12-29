import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Stethoscope, 
  Calendar, 
  Activity, 
  Star, 
  Users, 
  Award,
  Heart,
  Brain,
  Baby,
  Eye,
  Bone,
  Smile,
  ArrowRight,
  CheckCircle2,
  Quote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import doctorHero from "@/assets/doctor-hero.png";

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

export default function Index() {
  const { data: stats } = useQuery({
    queryKey: ["home-stats"],
    queryFn: async () => {
      const [doctorsRes, reviewsRes] = await Promise.all([
        supabase.from("doctors").select("user_id", { count: "exact", head: true }),
        supabase.from("reviews").select("rating").eq("status", "Approved"),
      ]);
      const avgRating = reviewsRes.data?.length 
        ? (reviewsRes.data.reduce((a, b) => a + b.rating, 0) / reviewsRes.data.length).toFixed(1)
        : "4.8";
      return {
        doctors: doctorsRes.count || 50,
        patients: 10000,
        rating: avgRating,
      };
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["approved-reviews"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("status", "Approved")
        .order("created_at", { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden mesh-gradient">
        <div className="container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Stethoscope className="w-4 h-4" />
                Trusted Healthcare Platform
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Your Health, Our{" "}
                <span className="gradient-text">Priority</span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-lg">
                Book appointments with top doctors, track your health metrics, 
                and get expert medical advice - all in one place.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/booking">
                  <Button variant="hero" size="xl" className="w-full sm:w-auto gap-2">
                    <Calendar className="w-5 h-5" />
                    Book Appointment
                  </Button>
                </Link>
                <Link to="/symptoms-checker">
                  <Button variant="outline" size="xl" className="w-full sm:w-auto gap-2">
                    <Activity className="w-5 h-5" />
                    Check Symptoms
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-8 pt-4">
                {[
                  { value: `${stats?.doctors || 50}+`, label: "Doctors" },
                  { value: `${stats?.patients?.toLocaleString() || "10K"}+`, label: "Patients" },
                  { value: stats?.rating || "4.8", label: "Avg Rating", icon: Star },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-3xl font-bold gradient-text">{stat.value}</span>
                      {stat.icon && <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />}
                    </div>
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right - Floating Doctor Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/20 rounded-full blur-3xl opacity-50" />
                
                {/* Floating Image */}
                <motion.div
                  animate={{ y: [0, -20, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="relative z-10"
                >
                  <img
                    src={doctorHero}
                    alt="Professional Doctor"
                    className="w-full max-w-lg mx-auto drop-shadow-2xl"
                  />
                </motion.div>

                {/* Floating Cards */}
                <motion.div
                  animate={{ y: [0, -10, 0], x: [0, 5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute top-20 -left-4 z-20"
                >
                  <Card variant="glass" className="p-4 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Verified Doctors</p>
                        <p className="text-xs text-muted-foreground">100% Certified</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                <motion.div
                  animate={{ y: [0, 10, 0], x: [0, -5, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute bottom-32 -right-4 z-20"
                >
                  <Card variant="glass" className="p-4 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <Star className="w-5 h-5 text-yellow-600 fill-yellow-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Top Rated</p>
                        <p className="text-xs text-muted-foreground">{stats?.rating || "4.8"} Average</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Specialties Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
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
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={`/booking?specialty=${encodeURIComponent(specialty.name)}`}>
                  <Card variant="interactive" className="text-center p-6 h-full">
                    <div className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${specialty.color} flex items-center justify-center mb-4 shadow-lg`}>
                      <specialty.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-semibold text-sm">{specialty.name}</h3>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
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
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-2xl font-bold text-primary-foreground mb-4 shadow-lg">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                )}
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/booking">
              <Button variant="hero" size="lg" className="gap-2">
                Get Started Now
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      {reviews && reviews.length > 0 && (
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                What Patients <span className="gradient-text">Say</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Real reviews from our satisfied patients
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-6 h-full">
                    <Quote className="w-8 h-8 text-primary/20 mb-4" />
                    <p className="text-muted-foreground mb-4 line-clamp-3">
                      {review.comment || "Great experience with the doctor and staff!"}
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{review.display_name}</p>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? "text-yellow-500 fill-yellow-500"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
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
            <Card className="relative overflow-hidden gradient-bg text-primary-foreground p-12 text-center">
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to Book Your Appointment?
                </h2>
                <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8">
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

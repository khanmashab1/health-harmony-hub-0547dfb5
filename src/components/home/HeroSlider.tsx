import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import doctorHero from "@/assets/hero-doctor-new.png";

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  image_path: string;
  cta_text: string | null;
  cta_link: string | null;
}

export function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const { data: slides } = useQuery({
    queryKey: ["hero-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_slides")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as HeroSlide[];
    },
  });

  // Default slides if none in database
  const defaultSlides: HeroSlide[] = [
    {
      id: "default-1",
      title: "Your Health, Our Priority",
      subtitle: "Book appointments with top doctors, track your health metrics, and get expert medical advice.",
      image_path: doctorHero,
      cta_text: "Book Appointment",
      cta_link: "/booking",
    },
    {
      id: "default-2",
      title: "Expert Medical Care",
      subtitle: "Connect with certified specialists and receive personalized healthcare solutions.",
      image_path: doctorHero,
      cta_text: "Find Doctors",
      cta_link: "/booking",
    },
    {
      id: "default-3",
      title: "Check Your Symptoms",
      subtitle: "Use our AI-powered symptom checker to get instant health insights and recommendations.",
      image_path: doctorHero,
      cta_text: "Start Check",
      cta_link: "/symptoms",
    },
  ];

  const activeSlides = slides && slides.length > 0 ? slides : defaultSlides;

  useEffect(() => {
    if (isPaused || activeSlides.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeSlides.length, isPaused]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrev = () => {
    setCurrentSlide((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
  };

  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith("http") || imagePath.startsWith("/") || imagePath.startsWith("data:")) {
      return imagePath;
    }
    // Get from Supabase storage
    const { data } = supabase.storage.from("hero-slides").getPublicUrl(imagePath);
    return data.publicUrl;
  };

  const currentSlideData = activeSlides[currentSlide];

  return (
    <section 
      className="relative min-h-[calc(100vh-72px)] flex items-center overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background with gradient overlay */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="absolute inset-0 hero-gradient"
        >
          {/* Decorative Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div 
              animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" 
            />
            <motion.div 
              animate={{ x: [0, -20, 0], y: [0, 10, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-20 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" 
            />
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="container mx-auto px-4 py-16 lg:py-24 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${currentSlide}`}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              {/* Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
                {currentSlideData.title.split(" ").map((word, i, arr) => 
                  i === arr.length - 1 ? (
                    <span key={i} className="gradient-text">{word}</span>
                  ) : (
                    <span key={i}>{word} </span>
                  )
                )}
              </h1>
              
              {/* Subheadline */}
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                {currentSlideData.subtitle}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to={currentSlideData.cta_link || "/booking"}>
                  <Button variant="hero" size="xl" className="w-full sm:w-auto gap-2">
                    <Calendar className="w-5 h-5" />
                    {currentSlideData.cta_text || "Book Now"}
                  </Button>
                </Link>
                <Link to="/symptoms">
                  <Button variant="outline" size="xl" className="w-full sm:w-auto gap-2">
                    <Activity className="w-5 h-5" />
                    Check Symptoms
                  </Button>
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Right - Image */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`image-${currentSlide}`}
              initial={{ opacity: 0, scale: 0.9, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: -50 }}
              transition={{ duration: 0.5 }}
              className="relative hidden lg:block"
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
                  <img
                    src={getImageUrl(currentSlideData.image_path)}
                    alt={currentSlideData.title}
                    className="w-full max-w-lg mx-auto drop-shadow-2xl rounded-2xl object-cover"
                  />
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        {activeSlides.length > 1 && (
          <>
            {/* Arrow Navigation */}
            <button
              onClick={goToPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-foreground hover:bg-background transition-all shadow-lg z-20"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-foreground hover:bg-background transition-all shadow-lg z-20"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Dot Navigation */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {activeSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentSlide 
                      ? "w-8 h-3 bg-primary" 
                      : "w-3 h-3 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

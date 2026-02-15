import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HeartPulse, Salad, ArrowRight, Brain, Activity, Dumbbell, Apple, Moon } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    title: "AI Health Risk Evaluator",
    description: "Get an instant AI-driven assessment of your health vitals. Enter your biometrics, lifestyle habits, and get a personalized risk analysis with charts, suggestions, and doctor recommendations.",
    icon: HeartPulse,
    link: "/risk-evaluator",
    gradient: "from-rose-500 to-orange-500",
    bgGlow: "bg-rose-500/10 dark:bg-rose-500/5",
    highlights: [
      { icon: Activity, text: "Vitals & BMI Analysis" },
      { icon: Brain, text: "AI-Powered Risk Score" },
      { icon: HeartPulse, text: "Personalized Suggestions" },
    ],
  },
  {
    title: "Health & Diet Planner",
    description: "Get a personalized AI-generated diet plan, exercise routine, and lifestyle recommendations based on your health profile, goals, and preferences. Achieve your wellness targets with science-backed guidance.",
    icon: Salad,
    link: "/diet-planner",
    gradient: "from-emerald-500 to-teal-500",
    bgGlow: "bg-emerald-500/10 dark:bg-emerald-500/5",
    highlights: [
      { icon: Apple, text: "Custom Diet Plans" },
      { icon: Dumbbell, text: "Exercise Routines" },
      { icon: Moon, text: "Sleep & Lifestyle Tips" },
    ],
    comingSoon: false,
  },
];

export default function AIHealth() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <Layout>
      <SEOHead
        title="AI Health Tools | MediCare+"
        description="Explore AI-powered health tools: Risk Evaluator, Diet & Exercise Planner, and more. Get personalized health insights instantly."
        canonicalUrl="/ai-health"
      />
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Brain className="w-4 h-4" />
            AI-Powered Health Tools
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3">
            Your Personal AI Health Hub
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Leverage artificial intelligence to understand your health better. Choose a tool below to get started with your personalized health journey.
          </p>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 * idx }}
            >
              <Card variant="interactive" className="h-full relative overflow-hidden group">
                {/* Glow background */}
                <div className={`absolute inset-0 ${feature.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                {feature.comingSoon && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold uppercase tracking-wider">
                      Coming Soon
                    </span>
                  </div>
                )}

                <CardContent className="p-6 md:p-8 relative z-10 flex flex-col h-full">
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Title & Description */}
                  <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                    {feature.title}
                  </h2>
                  <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-5 flex-grow">
                    {feature.description}
                  </p>

                  {/* Highlights */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {feature.highlights.map((h) => (
                      <div
                        key={h.text}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 text-xs font-medium text-foreground"
                      >
                        <h.icon className="w-3.5 h-3.5 text-primary" />
                        {h.text}
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  {feature.comingSoon ? (
                    <Button variant="outline" size="lg" className="w-full" disabled>
                      Coming Soon
                    </Button>
                  ) : (
                    <Button asChild size="lg" className="w-full group/btn">
                      <Link to={feature.link} className="flex items-center justify-center gap-2">
                        Get Started
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-muted-foreground mt-8"
        >
          ⚕️ These AI tools provide preliminary insights only and do not replace professional medical diagnosis.
        </motion.p>
      </div>
    </Layout>
  );
}

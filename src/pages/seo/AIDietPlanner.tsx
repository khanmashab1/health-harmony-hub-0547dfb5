import { Layout } from "@/components/layout/Layout";
import { SEOHead, seoSchemas } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Salad, Apple, Dumbbell, Target, Droplets, ArrowRight, CheckCircle2, Brain } from "lucide-react";

export default function AIDietPlanner() {
  return (
    <Layout>
      <SEOHead
        title="AI Diet Planner — Free Personalized Meal Plans"
        description="Free AI-powered diet planner by MediCare+. Get personalized meal plans based on your health goals, dietary preferences, and medical conditions. Track meals, export PDFs, and share via WhatsApp."
        keywords="AI diet planner, free diet plan generator, personalized meal plan, diet planner online free, AI meal planner, healthy diet plan Pakistan, weight loss meal plan, diabetes diet plan, diet chart generator, nutrition planner AI, calorie counter Pakistan, diet plan for weight gain, healthy eating plan free"
        canonicalUrl="/ai-diet-planner"
        jsonLd={[
          seoSchemas.medicalService({
            name: "AI Diet Planner",
            description: "Free AI-powered personalized diet and meal planning tool that creates customized nutrition plans based on your health goals, dietary preferences, and medical conditions.",
            url: "/ai-diet-planner",
          }),
          seoSchemas.breadcrumb([
            { name: "Home", url: "/" },
            { name: "AI Health", url: "/ai-health" },
            { name: "AI Diet Planner", url: "/ai-diet-planner" },
          ]),
          seoSchemas.howTo({
            name: "How to Use MediCare+ AI Diet Planner",
            description: "Step-by-step guide to getting a free personalized diet plan using MediCare+'s AI tool.",
            steps: [
              { name: "Enter Your Profile", text: "Provide your age, weight, height, gender, and activity level to calibrate calorie and nutrient requirements." },
              { name: "Set Your Goals", text: "Choose from weight loss, weight gain, muscle building, maintenance, or medical-specific goals like diabetes management." },
              { name: "Specify Preferences", text: "Select dietary preferences (vegetarian, non-veg, vegan), allergies, and foods you want to avoid." },
              { name: "Generate Your Plan", text: "The AI creates a personalized 7-day meal plan with breakfast, lunch, dinner, and snacks — complete with portion sizes and nutritional info." },
              { name: "Track & Share", text: "Log your meals daily, export the plan as PDF, or share it via WhatsApp with your doctor or nutritionist." },
            ],
          }),
          seoSchemas.faq([
            { question: "Is the AI diet planner free?", answer: "Yes, MediCare+'s AI Diet Planner is free to use. Sign in to save your meal plans and track progress over time." },
            { question: "Can the AI diet planner help with diabetes?", answer: "Yes, you can specify medical conditions like diabetes, hypertension, or cholesterol issues. The AI adjusts your meal plan accordingly with appropriate food choices and portion controls." },
            { question: "Does the diet planner support Pakistani foods?", answer: "Yes, the AI generates meal plans with locally available foods and Pakistani cuisine options, making the plans practical and easy to follow." },
            { question: "Can I export my diet plan?", answer: "Yes, you can export your personalized diet plan as a PDF document and also share it via WhatsApp with your healthcare provider." },
            { question: "How accurate are the meal plans?", answer: "The AI uses established nutritional guidelines to create balanced meal plans. However, for specific medical conditions, always consult your doctor or a certified nutritionist." },
            { question: "Can I track my meals?", answer: "Yes, the diet planner includes a meal tracking feature where you can log what you ate each day and monitor your adherence to the plan." },
          ]),
        ]}
      />

      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
          AI-Powered Diet Planner — Free Personalized Meal Plans
        </h1>
        <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
          Get a customized diet plan tailored to your health goals, dietary preferences, and medical conditions — completely free. Powered by advanced AI technology from MediCare+.
        </p>

        <div className="flex flex-wrap gap-4 mb-16">
          <Button asChild size="lg" variant="hero">
            <Link to="/diet-planner" className="gap-2">
              <Salad className="w-5 h-5" />
              Get Your Free Diet Plan
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/ai-health" className="gap-2">
              <Brain className="w-5 h-5" />
              Explore All AI Health Tools
            </Link>
          </Button>
        </div>

        {/* Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8">
            Why Use MediCare+ AI Diet Planner?
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Target, title: "Goal-Based Plans", desc: "Weight loss, gain, muscle building, or medical diet management — the AI adapts to your specific health objectives." },
              { icon: Apple, title: "Local Food Options", desc: "Get meal suggestions featuring Pakistani cuisine and locally available ingredients for practical, easy-to-follow plans." },
              { icon: Dumbbell, title: "Activity-Adjusted Calories", desc: "Calorie and macro calculations adjusted based on your activity level — from sedentary to highly active lifestyles." },
              { icon: Droplets, title: "Hydration & Nutrition Tracking", desc: "Track water intake, meal adherence, and nutritional balance with built-in logging and progress monitoring." },
            ].map((feature, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-xl border border-border bg-card">
                <feature.icon className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What You Get */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8">
            What's Included in Your AI Diet Plan?
          </h2>
          <div className="space-y-4">
            {[
              "Personalized 7-day meal plan with breakfast, lunch, dinner & snacks",
              "Calorie targets based on your BMR and activity level",
              "Macro breakdown (protein, carbs, fats) for each meal",
              "Portion size recommendations",
              "Special diet support (diabetes, hypertension, PCOS, etc.)",
              "Daily meal tracking and progress logging",
              "PDF export and WhatsApp sharing",
              "Dietary preference support (vegetarian, non-veg, vegan, keto)",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8">
            How Does the AI Diet Planner Work?
          </h2>
          <div className="space-y-6">
            {[
              { step: "1", title: "Enter Your Profile", desc: "Share your age, weight, height, gender, and daily activity level." },
              { step: "2", title: "Set Your Health Goal", desc: "Choose from weight loss, weight gain, maintenance, muscle building, or managing a specific condition." },
              { step: "3", title: "Customize Preferences", desc: "Select your dietary type, list allergies, and specify any foods to avoid." },
              { step: "4", title: "Get Your Plan Instantly", desc: "The AI generates a complete 7-day meal plan with detailed nutritional information." },
              { step: "5", title: "Track, Export & Share", desc: "Log your daily meals, download your plan as PDF, or share it with your doctor via WhatsApp." },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              { q: "Is the AI diet planner free?", a: "Yes, MediCare+'s AI Diet Planner is completely free. Sign in to save your plans and track your progress." },
              { q: "Can I get a diet plan for diabetes or hypertension?", a: "Absolutely. You can specify your medical conditions and the AI will create a plan with appropriate food choices and portion sizes." },
              { q: "Does it support Pakistani food?", a: "Yes, the AI generates plans featuring locally available ingredients and Pakistani cuisine for practical daily use." },
              { q: "Can I share the plan with my doctor?", a: "Yes, export your plan as a PDF or share directly via WhatsApp with any healthcare provider." },
              { q: "How often should I regenerate my plan?", a: "We recommend regenerating weekly or whenever your goals, weight, or activity level changes significantly." },
            ].map((faq, i) => (
              <div key={i} className="p-6 rounded-xl border border-border bg-card">
                <h3 className="text-lg font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center p-10 rounded-2xl bg-primary/5 border border-primary/20">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Ready to Transform Your Eating Habits?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Get your free AI-generated diet plan in seconds. No registration required to try — sign in to save and track.
          </p>
          <Button asChild size="lg" variant="hero">
            <Link to="/diet-planner" className="gap-2">
              <Salad className="w-5 h-5" />
              Create My Diet Plan — It's Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
import { Layout } from "@/components/layout/Layout";
import { SEOHead, seoSchemas } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { HeartPulse, Activity, Brain, ShieldCheck, TrendingUp, Dumbbell, ArrowRight, CheckCircle2, BarChart3 } from "lucide-react";

export default function AIHealthRiskEvaluator() {
  return (
    <Layout>
      <SEOHead
        title="AI Health Risk Evaluator — Free Vitals Assessment"
        description="Free AI-powered health risk evaluator by MediCare+. Enter your vitals — BMI, blood pressure, oxygen level — and get an instant AI-driven risk assessment with personalized health suggestions. No registration required."
        keywords="AI health risk evaluator, free health risk assessment, health risk calculator online, BMI calculator Pakistan, blood pressure check online, AI health checkup, health risk score, vitals assessment tool, heart disease risk calculator, health screening tool free, AI medical assessment, online health evaluation"
        canonicalUrl="/ai-health-risk-evaluator"
        jsonLd={[
          seoSchemas.medicalService({
            name: "AI Health Risk Evaluator",
            description: "Free AI-powered health risk assessment tool that analyzes your vitals including BMI, blood pressure, and oxygen levels to provide a personalized risk score and health suggestions.",
            url: "/ai-health-risk-evaluator",
          }),
          seoSchemas.breadcrumb([
            { name: "Home", url: "/" },
            { name: "AI Health", url: "/ai-health" },
            { name: "AI Health Risk Evaluator", url: "/ai-health-risk-evaluator" },
          ]),
          seoSchemas.howTo({
            name: "How to Use MediCare+ AI Health Risk Evaluator",
            description: "Step-by-step guide to getting a free AI-driven health risk assessment.",
            steps: [
              { name: "Enter Your Vitals", text: "Provide your age, height, weight, blood pressure, and oxygen saturation level." },
              { name: "Add Lifestyle Details", text: "Share your diet type, exercise frequency, sleep hours, stress level, smoking and alcohol habits." },
              { name: "Include Family History", text: "Mention any family history of heart disease, diabetes, or hypertension for more accurate results." },
              { name: "Get AI Analysis", text: "The AI processes your data and returns a comprehensive health risk score with visual charts and actionable suggestions." },
              { name: "Take Action", text: "Review personalized recommendations and book a doctor consultation if needed." },
            ],
          }),
          seoSchemas.faq([
            { question: "Is the AI health risk evaluator free?", answer: "Yes, MediCare+'s AI Health Risk Evaluator is completely free to use. No registration required — though signing in allows you to track your health over time." },
            { question: "What vitals do I need to enter?", answer: "You need your height, weight, blood pressure (systolic), and oxygen saturation level. The tool also considers lifestyle factors like diet, exercise, sleep, and stress levels." },
            { question: "How accurate is the risk assessment?", answer: "The AI uses established medical guidelines and considers multiple health parameters for its assessment. However, it provides preliminary insights only and should not replace professional medical diagnosis." },
            { question: "Can it predict heart disease risk?", answer: "The tool evaluates cardiovascular risk factors including BMI, blood pressure, exercise habits, smoking status, and family history. It provides a risk level (Low/Medium/High/Critical) but is not a definitive predictor." },
            { question: "Does it support Pakistani health standards?", answer: "Yes, the system uses internationally recognized health metrics that apply to all populations, including recommendations relevant to health conditions commonly seen in Pakistan." },
            { question: "Can I share my results with a doctor?", answer: "Yes, after the assessment you can book a doctor directly through MediCare+ and share your risk analysis results during your consultation." },
          ]),
        ]}
      />

      <div className="container mx-auto px-3 sm:px-4 py-10 md:py-16 max-w-4xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 md:mb-6">
          AI Health Risk Evaluator — Free Vitals Assessment
        </h1>

        <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8 leading-relaxed">
          Wondering about your health risks? MediCare+'s AI Health Risk Evaluator analyzes your vitals, lifestyle habits, and family history to provide an instant, AI-powered health risk score. Get personalized suggestions and know when to see a doctor — all for free.
        </p>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-10 md:mb-16">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/risk-evaluator" className="gap-2">
              <HeartPulse className="w-5 h-5" />
              Check Your Health Risk Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link to="/ai-health" className="gap-2">
              <Brain className="w-5 h-5" />
              Explore All AI Health Tools
            </Link>
          </Button>
        </div>

        {/* What It Evaluates */}
        <section className="mb-10 md:mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 md:mb-8">
            What Does the AI Evaluate?
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
            {[
              { icon: Activity, title: "BMI & Body Composition", desc: "Automatic BMI calculation from your height and weight with categorization (underweight, normal, overweight, obese)." },
              { icon: HeartPulse, title: "Blood Pressure Analysis", desc: "Systolic blood pressure assessment with risk classification from normal to hypertensive crisis levels." },
              { icon: ShieldCheck, title: "Oxygen Saturation", desc: "SpO2 level evaluation to detect potential respiratory or cardiovascular concerns early." },
              { icon: Dumbbell, title: "Lifestyle Risk Factors", desc: "Diet quality, exercise frequency, sleep patterns, stress levels, smoking, and alcohol consumption all factor into your score." },
              { icon: TrendingUp, title: "Family History Risk", desc: "Genetic predisposition analysis based on family history of heart disease, diabetes, and hypertension." },
              { icon: BarChart3, title: "Visual Health Dashboard", desc: "Interactive charts showing your health metrics, risk radar, and comparison against healthy ranges." },
            ].map((feature) => (
              <div key={feature.title} className="flex gap-3 md:gap-4 p-4 md:p-6 rounded-xl border border-border bg-card">
                <feature.icon className="w-6 h-6 md:w-8 md:h-8 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-foreground mb-1 md:mb-2">{feature.title}</h3>
                  <p className="text-sm md:text-base text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-10 md:mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 md:mb-8">
            How Does It Work?
          </h2>
          <div className="space-y-4 md:space-y-6">
            {[
              { step: "1", title: "Enter Your Vitals", desc: "Provide age, height, weight, blood pressure, and oxygen saturation — takes less than a minute." },
              { step: "2", title: "Share Lifestyle Details", desc: "Tell us about your diet, exercise, sleep, stress, smoking, and alcohol habits." },
              { step: "3", title: "Add Family History", desc: "Mention any family history of chronic conditions for a more complete risk profile." },
              { step: "4", title: "Get Your Risk Score", desc: "Receive an AI-generated risk assessment with visual charts, metric breakdown, and personalized health suggestions." },
              { step: "5", title: "Take Action", desc: "Follow the recommendations or book a doctor consultation directly through MediCare+." },
            ].map((item) => (
              <div key={item.step} className="flex gap-3 md:gap-4 items-start">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0 text-sm md:text-base">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm md:text-base text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What You Get */}
        <section className="mb-10 md:mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 md:mb-8">
            What's Included in Your Report?
          </h2>
          <div className="space-y-3 md:space-y-4">
            {[
              "Overall health risk score (Low / Medium / High / Critical)",
              "BMI calculation with category and healthy range comparison",
              "Blood pressure analysis with risk classification",
              "Oxygen saturation level assessment",
              "Interactive health metrics chart with normal ranges",
              "Radar chart comparing lifestyle factors",
              "Personalized health suggestions based on your profile",
              "Doctor consultation recommendation when needed",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm md:text-base text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-10 md:mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 md:mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4 md:space-y-6">
            {[
              { q: "Is the health risk evaluator free?", a: "Yes, it's completely free. No registration required to get your risk assessment." },
              { q: "What do I need to use it?", a: "Just your basic vitals: height, weight, blood pressure, and oxygen level. Lifestyle details like diet and exercise habits make the assessment more accurate." },
              { q: "Can it replace a medical checkup?", a: "No, this is a preliminary screening tool. It provides insights and recommendations but does not replace professional medical diagnosis or treatment." },
              { q: "How is the risk score calculated?", a: "The AI analyzes multiple parameters including BMI, blood pressure, oxygen levels, lifestyle factors, and family history using established medical guidelines." },
              { q: "Can I book a doctor after seeing my results?", a: "Yes, you can directly browse available doctors on MediCare+ and book an appointment based on your results." },
            ].map((faq, i) => (
              <div key={i} className="p-4 md:p-6 rounded-xl border border-border bg-card">
                <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-sm md:text-base text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Related Pages */}
        <section className="mb-10 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">Explore More MediCare+ AI Tools</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { title: "AI Symptom Checker", desc: "Describe symptoms and get instant AI analysis.", url: "/ai-symptom-checker" },
              { title: "AI Diet Planner", desc: "Get personalized meal plans based on your goals.", url: "/ai-diet-planner" },
              { title: "Online Doctor Appointments", desc: "Book verified doctors online instantly.", url: "/online-doctor-appointment-system" },
            ].map((page) => (
              <Link key={page.url} to={page.url} className="group p-4 rounded-xl border border-border/50 bg-card/50 hover:border-primary/30 transition-colors">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1 text-sm md:text-base">
                  {page.title} <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">{page.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center p-6 md:p-10 rounded-2xl bg-primary/5 border border-primary/20">
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3 md:mb-4">
            Know Your Health Risk in Under a Minute
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mb-5 md:mb-6 max-w-xl mx-auto">
            Enter your vitals and get an instant AI-powered health risk assessment. Free, private, and no registration needed.
          </p>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/risk-evaluator" className="gap-2">
              <HeartPulse className="w-5 h-5" />
              Start My Health Risk Assessment
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}

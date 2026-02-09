import { Layout } from "@/components/layout/Layout";
import { SEOHead, seoSchemas } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Brain, Search, BookOpen, AlertTriangle, Zap, Lock } from "lucide-react";

export default function AISymptomChecker() {
  return (
    <Layout>
      <SEOHead
        title="AI Symptom Checker"
        description="Free AI-powered symptom checker by MediCare+. Describe your symptoms and get instant health analysis, possible conditions, and doctor recommendations. Available in Pakistan."
        keywords="AI symptom checker, online symptom checker Pakistan, free symptom analysis, health assessment tool, AI health checker, symptom diagnosis online"
        canonicalUrl="/ai-symptom-checker"
        jsonLd={[
          seoSchemas.medicalService({
            name: "AI Symptom Checker",
            description: "Free AI-powered symptom analysis tool that provides preliminary health insights, possible conditions, and recommendations for when to see a doctor.",
            url: "/ai-symptom-checker",
          }),
          seoSchemas.breadcrumb([
            { name: "Home", url: "/" },
            { name: "AI Symptom Checker", url: "/ai-symptom-checker" },
          ]),
        ]}
      />

      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
          AI-Powered Symptom Checker — Free Health Assessment
        </h1>

        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          Not sure what's causing your symptoms? MediCare+'s AI Symptom Checker uses artificial intelligence combined with a curated medical knowledge base to analyze your symptoms and provide preliminary health insights. It's free, instant, and available 24/7 — helping you decide whether to see a doctor and which specialist to consult.
        </p>

        <div className="flex flex-wrap gap-4 mb-12">
          <Button asChild size="lg">
            <Link to="/symptoms">Check Your Symptoms Now</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/our-doctors">Find a Doctor</Link>
          </Button>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">How the AI Symptom Checker Works</h2>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            Our symptom checker uses a Retrieval-Augmented Generation (RAG) architecture. When you describe your symptoms, the system searches a curated database of medical conditions and symptom patterns. This retrieved knowledge is then processed by an AI model to generate a personalized health analysis — including possible conditions, severity assessment, recommended actions, and when to seek immediate medical attention.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            You can enter symptoms as free text or select from common symptom tags. The system also considers your age, gender, symptom duration, and medical history to provide more accurate results. Every analysis comes with clear citations from our medical knowledge base, so you can trust the information provided.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Features of Our AI Health Tool</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Brain, title: "AI-Powered Analysis", desc: "Advanced language model processes your symptoms against a medical knowledge base for accurate preliminary assessment." },
              { icon: Search, title: "Smart Symptom Matching", desc: "Keyword-based search across hundreds of conditions with relevance scoring for the most likely matches." },
              { icon: BookOpen, title: "Medical Knowledge Base", desc: "Curated database of diseases, symptoms, red flags, and recommendations — managed and updated by healthcare professionals." },
              { icon: AlertTriangle, title: "Red Flag Warnings", desc: "The system highlights dangerous symptoms that require immediate medical attention, helping you act quickly." },
              { icon: Zap, title: "Instant Results", desc: "Get your analysis in seconds. No waiting, no registration required — though signed-in users can save their history." },
              { icon: Lock, title: "Privacy First", desc: "Your symptom data is processed securely. Analysis history is only stored if you're logged in and choose to save it." },
            ].map((feature) => (
              <div key={feature.title} className="flex gap-3 p-4 rounded-xl border border-border/50 bg-card/50">
                <feature.icon className="w-6 h-6 text-primary shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">When to Use the Symptom Checker</h2>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            The AI Symptom Checker is ideal for situations where you're experiencing symptoms but aren't sure if they warrant a doctor visit. Common use cases include:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
            <li>You have a headache, fever, or body aches and want to know possible causes</li>
            <li>You're experiencing new symptoms and want to understand the severity</li>
            <li>You want to know which type of specialist to consult</li>
            <li>You need a quick health check before deciding to book an appointment</li>
            <li>You're tracking recurring symptoms and want to document patterns</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            <strong>Important:</strong> The AI Symptom Checker provides preliminary insights only and does not replace professional medical diagnosis. If you're experiencing a medical emergency, contact emergency services immediately. Always consult a qualified healthcare professional for diagnosis and treatment.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">From Symptoms to Appointments</h2>
          <p className="text-muted-foreground leading-relaxed">
            One of the unique advantages of MediCare+'s symptom checker is its integration with our appointment booking system. After analyzing your symptoms, the system recommends the appropriate medical specialty. From there, you can directly browse available doctors in that specialty and book an appointment — creating a seamless journey from symptom awareness to professional consultation.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Admin-Managed Knowledge Base</h2>
          <p className="text-muted-foreground leading-relaxed">
            Unlike generic AI chatbots, MediCare+'s symptom checker draws from a curated knowledge base that administrators can update. This means the system's medical information is always current and relevant to the conditions commonly seen in Pakistan. Administrators can add new disease entries, update symptom keywords, and refine recommendations through a dedicated management panel — ensuring the tool improves over time.
          </p>
        </section>

        <section className="rounded-2xl bg-primary/5 border border-primary/20 p-8">
          <h2 className="text-2xl font-semibold text-foreground mb-3">Try the AI Symptom Checker Now</h2>
          <p className="text-muted-foreground mb-6">
            Describe your symptoms and get an instant AI-powered health analysis. It's free, private, and takes less than a minute.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link to="/symptoms">Start Symptom Analysis</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/online-doctor-appointment-system">Book a Doctor Instead</Link>
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
}

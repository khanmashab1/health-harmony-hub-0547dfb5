import { Layout } from "@/components/layout/Layout";
import { SEOHead, seoSchemas } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LayoutDashboard, Users, FileText, BarChart3, Bell, Settings } from "lucide-react";

export default function ClinicManagementSoftware() {
  return (
    <Layout>
      <SEOHead
        title="Clinic Management Software"
        description="MediCare+ clinic management software for healthcare providers in Pakistan. Manage appointments, patient queues, digital prescriptions, doctor schedules, and clinic analytics from one dashboard."
        keywords="clinic management software, clinic management system Pakistan, doctor practice management, patient queue management software, healthcare CRM"
        canonicalUrl="/clinic-management-software"
        jsonLd={[
          seoSchemas.medicalService({
            name: "Clinic Management Software",
            description: "Complete clinic workflow management with doctor dashboards, PA tools, patient queues, and performance analytics.",
            url: "/clinic-management-software",
          }),
          seoSchemas.breadcrumb([
            { name: "Home", url: "/" },
            { name: "Clinic Management Software", url: "/clinic-management-software" },
          ]),
        ]}
      />

      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
          Clinic Management Software for Doctors & Healthcare Providers
        </h1>

        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          MediCare+ is a modern clinic management software platform that gives doctors, physician assistants, and clinic administrators complete control over daily operations. From patient appointments to prescription management, everything runs through one unified system — no paper, no spreadsheets, no complexity.
        </p>

        <div className="flex flex-wrap gap-4 mb-12">
          <Button asChild size="lg">
            <Link to="/become-doctor">Get Started — Join as Doctor</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/booking">See Patient Experience</Link>
          </Button>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">What Makes MediCare+ Different</h2>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            Most clinic management solutions are either too expensive, too complex, or designed for Western healthcare systems. MediCare+ is purpose-built for clinics and individual practitioners in Pakistan. It supports local payment methods (JazzCash, EasyPaisa, bank transfers), works in both English and Urdu, and runs entirely in the browser — no installation required.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Our multi-role architecture means every stakeholder — doctor, physician assistant, clinic admin, and patient — gets a dedicated dashboard designed for their specific workflow. No feature bloat, no unnecessary complexity.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Core Clinic Management Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: LayoutDashboard, title: "Doctor Dashboard", desc: "Manage today's queue, write prescriptions, order lab tests, view patient history, and track follow-ups — all from one screen." },
              { icon: Users, title: "Physician Assistant (PA) Tools", desc: "PAs can register walk-in patients, enter vitals, manage the queue, and prepare patients before the doctor consultation." },
              { icon: FileText, title: "Digital Prescriptions", desc: "Generate professional prescriptions with medicine search, dosage instructions, and QR-code verification for pharmacies." },
              { icon: BarChart3, title: "Performance Analytics", desc: "Track appointment volumes, patient demographics, revenue, and doctor performance with visual charts and reports." },
              { icon: Bell, title: "Automated Notifications", desc: "Patients receive email confirmations, appointment reminders, follow-up alerts, and prescription delivery automatically." },
              { icon: Settings, title: "Flexible Schedule Management", desc: "Set working hours per day, break times, consultation duration, max daily patients, and delay offsets for accurate timing." },
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
          <h2 className="text-2xl font-semibold text-foreground mb-4">Patient Queue Management</h2>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            The heart of any clinic is its queue. MediCare+ implements an intelligent token-based queue system where patients receive a numbered token with an estimated consultation time. Doctors can pause patients, reorder the queue, and mark consultations as complete. The system automatically recalculates wait times based on the doctor's configured consultation duration and any delays.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Patients with online bookings and walk-in patients managed by the PA are handled in a single unified queue. The doctor sees everything in one dashboard — patient name, vitals, reason for visit, and medical history — before the consultation even begins.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Prescription & Medical Records</h2>
          <p className="text-muted-foreground leading-relaxed">
            Every consultation generates a digital prescription that includes medicines (with dosage, frequency, and duration), diagnosis notes, lab test orders, and doctor comments. Prescriptions are stored permanently and can be accessed by the patient at any time. Each prescription includes a unique QR code that pharmacies can scan to verify authenticity. Doctors can also view a patient's complete prescription history across all visits — enabling better continuity of care.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Subscription Plans for Doctors</h2>
          <p className="text-muted-foreground leading-relaxed">
            MediCare+ is free for patients. Doctors can start with a basic plan and upgrade to access premium features like advanced analytics, priority support, higher patient limits, and organization management. Plans are managed through a secure Stripe-powered billing system with monthly and annual options.
          </p>
        </section>

        <section className="rounded-2xl bg-primary/5 border border-primary/20 p-8">
          <h2 className="text-2xl font-semibold text-foreground mb-3">Ready to Modernize Your Clinic?</h2>
          <p className="text-muted-foreground mb-6">
            Join MediCare+ and transform how your clinic operates. No downloads, no hardware — just sign up and start managing.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link to="/become-doctor">Register Your Practice</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/">Learn More</Link>
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
}

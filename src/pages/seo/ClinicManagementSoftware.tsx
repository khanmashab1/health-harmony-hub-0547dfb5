import { Layout } from "@/components/layout/Layout";
import { SEOHead, seoSchemas } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LayoutDashboard, Users, FileText, BarChart3, Bell, Settings, ArrowRight } from "lucide-react";

export default function ClinicManagementSoftware() {
  return (
    <Layout>
      <SEOHead
        title="Best Clinic Management Software in Pakistan — Free Trial"
        description="Run your clinic from one dashboard: appointments, prescriptions, patient queues & analytics. Used by doctors in Lahore, Karachi & Islamabad. Start free today."
        keywords="clinic management software Pakistan, best clinic management system, clinic management system Lahore, doctor practice management, patient queue management software, healthcare CRM, clinic software Karachi, doctor dashboard software, prescription management system, clinic software free trial"
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
          seoSchemas.softwareApplication(),
          seoSchemas.howTo({
            name: "How to Set Up MediCare+ for Your Clinic",
            description: "Step-by-step guide to getting your clinic running on MediCare+.",
            steps: [
              { name: "Register as a Doctor", text: "Apply online with your medical credentials. Admin reviews and approves your application." },
              { name: "Configure Your Schedule", text: "Set your working hours, break times, consultation duration, and maximum daily patients." },
              { name: "Set Payment Methods", text: "Add your bank account, JazzCash, or EasyPaisa details for patient payments." },
              { name: "Assign a Physician Assistant", text: "Optionally add a PA to manage walk-ins, enter vitals, and handle your patient queue." },
              { name: "Start Accepting Patients", text: "Your profile goes live on the doctor directory. Patients can find and book you instantly." },
            ],
          }),
          seoSchemas.faq([
            { question: "What is clinic management software?", answer: "Clinic management software is a digital system that helps healthcare providers manage appointments, patient records, prescriptions, billing, and clinic operations from a single dashboard." },
            { question: "Is MediCare+ suitable for small clinics in Pakistan?", answer: "Yes, MediCare+ is designed for clinics of all sizes in Pakistan — from individual practitioners to multi-doctor facilities. It runs in any browser with no installation required." },
            { question: "Can physician assistants use MediCare+?", answer: "Yes, PAs get a dedicated dashboard to register walk-in patients, enter vitals, manage the doctor's queue, and prepare patients for consultations." },
            { question: "Does MediCare+ support Urdu language?", answer: "Yes, MediCare+ supports both English and Urdu interfaces, making it accessible for healthcare providers and patients across Pakistan." },
            { question: "How much does MediCare+ cost for doctors?", answer: "MediCare+ is free for patients. Doctors can start with a basic plan and upgrade to access premium features like advanced analytics, higher patient limits, and organization management." },
            { question: "Can I generate digital prescriptions?", answer: "Yes, doctors can create professional prescriptions with medicine search, dosage instructions, and QR-code verification that pharmacies can scan to verify authenticity." },
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
          <h2 className="text-2xl font-semibold text-foreground mb-4">Get Your Clinic Running in 5 Steps</h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "Register as a Doctor", desc: "Apply online with your medical credentials. Admin reviews and approves your application." },
              { step: "2", title: "Configure Your Schedule", desc: "Set working hours, break times, consultation duration, and max daily patients per day." },
              { step: "3", title: "Set Payment Methods", desc: "Add bank account, JazzCash, or EasyPaisa details so patients can pay online." },
              { step: "4", title: "Assign a Physician Assistant", desc: "Optionally add a PA to manage walk-ins, enter vitals, and handle your queue." },
              { step: "5", title: "Start Accepting Patients", desc: "Go live on the doctor directory. Patients find and book you instantly." },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 items-start p-4 rounded-xl border border-border/50 bg-card/50">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">{item.step}</span>
                <div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
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

        {/* Related Pages */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Explore More MediCare+ Solutions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { title: "Online Doctor Appointments", desc: "Book verified doctors online with instant token allocation.", url: "/online-doctor-appointment-system" },
              { title: "Hospital Management Software", desc: "Multi-doctor, multi-department hospital operations.", url: "/hospital-management-software" },
              { title: "AI Symptom Checker", desc: "Free AI-powered health assessment tool.", url: "/ai-symptom-checker" },
            ].map((page) => (
              <Link key={page.url} to={page.url} className="group p-4 rounded-xl border border-border/50 bg-card/50 hover:border-primary/30 transition-colors">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                  {page.title} <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{page.desc}</p>
              </Link>
            ))}
          </div>
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

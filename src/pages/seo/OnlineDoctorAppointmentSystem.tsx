import { Layout } from "@/components/layout/Layout";
import { SEOHead, seoSchemas } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CalendarCheck, Shield, Clock, Smartphone, Star, Stethoscope, ArrowRight } from "lucide-react";

export default function OnlineDoctorAppointmentSystem() {
  return (
    <Layout>
      <SEOHead
        title="Online Doctor Appointment System"
        description="Book doctor appointments online with MediCare+. Verified doctors in Pakistan, instant token allocation, digital prescriptions, and real-time queue tracking. Free for patients."
        keywords="online doctor appointment system, book doctor appointment online Pakistan, doctor booking platform, healthcare appointment software, doctor appointment app, online consultation booking Pakistan, best doctor appointment system Lahore Karachi Islamabad"
        canonicalUrl="/online-doctor-appointment-system"
        jsonLd={[
          seoSchemas.medicalService({
            name: "Online Doctor Appointment System",
            description: "Book appointments with verified doctors online. Instant token allocation, digital prescriptions, and real-time queue tracking.",
            url: "/online-doctor-appointment-system",
          }),
          seoSchemas.breadcrumb([
            { name: "Home", url: "/" },
            { name: "Online Doctor Appointment System", url: "/online-doctor-appointment-system" },
          ]),
          seoSchemas.howTo({
            name: "How to Book a Doctor Appointment Online on MediCare+",
            description: "Step-by-step guide to booking a doctor appointment online using MediCare+.",
            steps: [
              { name: "Create a Free Account", text: "Sign up on MediCare+ with your email. Registration is free for all patients." },
              { name: "Search for a Doctor", text: "Browse doctors by specialty, city, or name. View ratings, fees, and availability." },
              { name: "Select a Date", text: "Choose an available date from the doctor's schedule. See real-time slot availability." },
              { name: "Confirm Your Booking", text: "Select your payment method and confirm. You'll receive a token number with estimated consultation time." },
              { name: "Visit the Doctor", text: "Arrive at your estimated time. After consultation, receive a digital prescription with QR verification." },
            ],
          }),
          seoSchemas.faq([
            { question: "How do I book a doctor appointment online on MediCare+?", answer: "Simply create a free account, search for a doctor by specialty or city, select a date, and confirm your booking. You'll receive a token number with an estimated consultation time." },
            { question: "Is online doctor booking free for patients?", answer: "Yes, booking appointments on MediCare+ is completely free for patients. Doctors may charge a consultation fee which is displayed on their profile." },
            { question: "Can I see doctor availability in real-time?", answer: "Yes, MediCare+ shows real-time doctor schedules including available slots, break times, and daily patient limits before you book." },
            { question: "What payment methods are supported?", answer: "MediCare+ supports cash payment at the clinic, bank transfers, JazzCash, and EasyPaisa for online payments." },
            { question: "Do I get a digital prescription after my appointment?", answer: "Yes, after your consultation, the doctor issues a digital prescription with a QR code that can be verified at any pharmacy." },
            { question: "Can I book appointments in Lahore, Karachi, or Islamabad?", answer: "Yes, MediCare+ has verified doctors across major cities in Pakistan including Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, and more." },
            { question: "Does MediCare+ support Urdu language?", answer: "Yes, the entire platform is available in both English and Urdu, making it accessible for all patients across Pakistan." },
            { question: "Can I track my position in the queue?", answer: "Yes, after booking you can see your live queue position and estimated wait time from your patient dashboard." },
          ]),
        ]}
      />

      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
          Online Doctor Appointment System for Clinics in Pakistan
        </h1>

        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          MediCare+ provides a complete online doctor appointment booking system designed for clinics, hospitals, and individual practitioners across Pakistan. Patients can search for doctors by specialty, view availability in real-time, and book appointments — all from their browser or mobile device.
        </p>

        <div className="flex flex-wrap gap-4 mb-12">
          <Button asChild size="lg">
            <Link to="/booking">Book an Appointment</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/our-doctors">Browse Doctors</Link>
          </Button>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">How Online Appointment Booking Works</h2>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            Our appointment system streamlines the entire patient journey. Instead of waiting in long queues or making phone calls, patients can browse a directory of verified doctors, check real-time schedule availability, and book a token instantly. Each booking generates a unique token number with an estimated consultation time, so patients know exactly when to arrive.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Doctors receive instant notifications for new appointments and can manage their daily patient queue through a dedicated dashboard. The system supports both online payment verification and walk-in patients managed by a physician assistant (PA).
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Step-by-Step: Book Your Appointment</h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "Create a Free Account", desc: "Sign up with your email in seconds. No charges, no hidden fees." },
              { step: "2", title: "Search for a Doctor", desc: "Browse by specialty (cardiologist, dentist, neurologist) or city (Lahore, Karachi, Islamabad)." },
              { step: "3", title: "Check Availability & Book", desc: "View real-time schedules, select a date, choose your payment method, and confirm." },
              { step: "4", title: "Get Your Token & Visit", desc: "Receive a token number with estimated time. After consultation, get a digital prescription." },
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
          <h2 className="text-2xl font-semibold text-foreground mb-4">Key Features of the Appointment System</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: CalendarCheck, title: "Real-Time Availability", desc: "Patients see live doctor schedules with available slots, break times, and daily patient limits." },
              { icon: Clock, title: "Estimated Wait Times", desc: "Each token shows an estimated consultation time based on the doctor's configured duration and delay settings." },
              { icon: Shield, title: "Payment Verification", desc: "Supports bank transfer, JazzCash, and EasyPaisa with receipt upload and admin verification workflows." },
              { icon: Smartphone, title: "Mobile-Friendly Booking", desc: "Fully responsive interface that works seamlessly on smartphones, tablets, and desktops." },
              { icon: Star, title: "Doctor Ratings & Reviews", desc: "Patients can read verified reviews and ratings before choosing a doctor for their appointment." },
              { icon: Stethoscope, title: "Multi-Specialty Support", desc: "Browse doctors across cardiology, neurology, pediatrics, dentistry, and more." },
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
          <h2 className="text-2xl font-semibold text-foreground mb-4">Built for Healthcare in Pakistan</h2>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            MediCare+ understands the unique challenges of healthcare delivery in Pakistan. Our system is designed to work reliably on low-bandwidth connections, supports both English and Urdu interfaces, and integrates with local payment methods including JazzCash, EasyPaisa, and bank transfers.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Whether you're a solo practitioner in a small city or a multi-department hospital in Lahore, Karachi, or Islamabad — MediCare+ adapts to your workflow. Our doctor onboarding process is simple: apply online, get verified by an admin, and start accepting digital appointments within hours.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">For Patients</h2>
          <p className="text-muted-foreground leading-relaxed">
            As a patient, you can create a free account, search for doctors by specialty or city, read reviews from other patients, and book your appointment in under two minutes. After your consultation, you'll receive a digital prescription that can be verified via QR code at any pharmacy. Your complete medical history — diagnoses, prescriptions, lab tests — is stored securely and accessible anytime from your patient dashboard.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">For Doctors & Clinics</h2>
          <p className="text-muted-foreground leading-relaxed">
            Doctors get a powerful dashboard to manage appointments, write prescriptions, order lab tests, and track patient history. Set your own schedule, consultation fees, break times, and daily patient limits. The system handles token allocation automatically and sends email reminders to patients. Clinic administrators can manage multiple doctors, assign physician assistants, and view performance analytics — all from one platform.
          </p>
        </section>

        {/* Related Pages */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Explore More MediCare+ Solutions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { title: "Clinic Management Software", desc: "Complete dashboard for doctors, PAs, and clinic admins.", url: "/clinic-management-software" },
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
          <h2 className="text-2xl font-semibold text-foreground mb-3">Start Booking Appointments Today</h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of patients and doctors already using MediCare+ for hassle-free healthcare appointments.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link to="/booking">Book Now — It's Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/become-doctor">Register as a Doctor</Link>
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
}

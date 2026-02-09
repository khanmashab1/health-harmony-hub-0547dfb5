import { Layout } from "@/components/layout/Layout";
import { SEOHead, seoSchemas } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Building2, UserCog, ShieldCheck, Globe, Database, Layers } from "lucide-react";

export default function HospitalManagementSoftware() {
  return (
    <Layout>
      <SEOHead
        title="Hospital Management Software"
        description="MediCare+ hospital management software for multi-doctor facilities in Pakistan. Organization management, department coordination, doctor onboarding, and centralized patient records."
        keywords="hospital management software Pakistan, hospital management system, multi-doctor clinic software, healthcare organization management, HMS Pakistan"
        canonicalUrl="/hospital-management-software"
        jsonLd={[
          seoSchemas.medicalService({
            name: "Hospital Management Software",
            description: "Multi-doctor hospital management system with organization dashboards, department coordination, and centralized patient records.",
            url: "/hospital-management-software",
          }),
          seoSchemas.breadcrumb([
            { name: "Home", url: "/" },
            { name: "Hospital Management Software", url: "/hospital-management-software" },
          ]),
          seoSchemas.faq([
            { question: "Can MediCare+ manage multiple doctors in one hospital?", answer: "Yes, the Organization Dashboard allows hospital administrators to onboard multiple doctors, assign PAs, manage department-wise schedules, and monitor performance centrally." },
            { question: "Does MediCare+ support multi-department hospitals?", answer: "Yes, doctors can be organized by specialty departments — cardiology, neurology, pediatrics, dentistry — each with independent schedules and patient queues." },
            { question: "How does role-based access work in MediCare+?", answer: "MediCare+ has four distinct roles — Admin, Doctor, PA, and Patient — each with specific permissions and dedicated dashboard views tailored to their workflow." },
          ]),
        ]}
      />

      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
          Hospital Management Software for Multi-Doctor Facilities
        </h1>

        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          MediCare+ extends beyond individual clinic management to serve hospitals and multi-doctor organizations. Our hospital management module enables centralized control over multiple doctors, departments, physician assistants, and patient flows — all through a single administrative interface.
        </p>

        <div className="flex flex-wrap gap-4 mb-12">
          <Button asChild size="lg">
            <Link to="/become-doctor">Register Your Hospital</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/our-doctors">View Doctor Directory</Link>
          </Button>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Organization-Level Management</h2>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            Hospitals and multi-doctor clinics need a different level of management. MediCare+ provides an Organization Dashboard where hospital administrators can onboard new doctors, assign physician assistants to specific doctors, and monitor the performance of the entire facility. Each organization operates as a self-contained unit with its own branding, doctor roster, and subscription management.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            The organization owner can create doctor accounts directly, set consultation fees, configure schedules, and manage access permissions — without requiring each doctor to go through the public registration process. This makes it ideal for hospitals that need to onboard staff quickly and maintain centralized control.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Hospital Management Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Building2, title: "Multi-Department Support", desc: "Organize doctors by specialty departments — cardiology, neurology, pediatrics, dentistry — with independent schedules and queues." },
              { icon: UserCog, title: "Centralized Doctor Onboarding", desc: "Add doctors to your organization instantly. Configure their profiles, fees, and schedules from the admin dashboard." },
              { icon: ShieldCheck, title: "Role-Based Access Control", desc: "Four distinct roles — Admin, Doctor, PA, Patient — each with specific permissions and dedicated dashboard views." },
              { icon: Globe, title: "Public Doctor Directory", desc: "All doctors in your hospital appear in the public directory, making it easy for patients to discover and book appointments." },
              { icon: Database, title: "Centralized Patient Records", desc: "Every patient visit, prescription, and lab test is stored centrally. Doctors can view cross-department medical history." },
              { icon: Layers, title: "Subscription Management", desc: "Organization-level subscription plans with configurable doctor limits, billing management through Stripe." },
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
          <h2 className="text-2xl font-semibold text-foreground mb-4">Designed for Pakistan's Healthcare Infrastructure</h2>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            Pakistan's healthcare system operates across a wide spectrum — from large teaching hospitals in Lahore, Karachi, and Islamabad to small community clinics in rural areas. MediCare+ is designed to serve this entire spectrum. The software requires no hardware installation, runs in any modern browser, and works reliably on mobile networks.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            For hospitals, the key advantage is eliminating paper-based workflows. Patient registration, appointment scheduling, prescription writing, and medical record keeping — all of these traditionally manual processes are digitized and searchable. This reduces errors, speeds up operations, and improves the patient experience.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Physician Assistant (PA) Workflow</h2>
          <p className="text-muted-foreground leading-relaxed">
            In busy hospitals, physician assistants play a critical role. MediCare+ gives PAs a dedicated dashboard where they can register walk-in patients, enter vitals (blood pressure, weight, temperature, heart rate), manage the doctor's queue, and prepare patient information before the consultation. PAs are assigned to specific doctors by the organization admin, ensuring clear accountability and workflow separation.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Analytics & Reporting</h2>
          <p className="text-muted-foreground leading-relaxed">
            Hospital administrators can access detailed analytics including daily appointment volumes, patient demographics, revenue tracking, doctor utilization rates, and email delivery reports. These insights help hospitals optimize staffing, identify peak hours, and measure the impact of service improvements. Data can be exported for external reporting requirements.
          </p>
        </section>

        <section className="rounded-2xl bg-primary/5 border border-primary/20 p-8">
          <h2 className="text-2xl font-semibold text-foreground mb-3">Digitize Your Hospital Operations</h2>
          <p className="text-muted-foreground mb-6">
            Whether you manage a 5-doctor clinic or a 50-doctor hospital, MediCare+ scales with your needs. Get started today.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link to="/become-doctor">Register Your Hospital</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/clinic-management-software">Explore Clinic Features</Link>
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
}

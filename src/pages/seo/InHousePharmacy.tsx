import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, seoSchemas } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Pill,
  ShoppingCart,
  Boxes,
  ShieldCheck,
  ClipboardList,
  Clock,
  Receipt,
  AlertTriangle,
  QrCode,
  ArrowRight,
} from "lucide-react";

export default function InHousePharmacy() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <Layout>
      <SEOHead
        title="In-House Pharmacy — Integrated Medicine Dispensing"
        description="MediCare+ In-House Pharmacy: integrated POS, real-time inventory, prescription scanning, expiry alerts, and supplier orders — all linked to your clinic appointments."
        keywords="in-house pharmacy, clinic pharmacy software, pharmacy POS Pakistan, prescription dispensing system, pharmacy inventory management, medicine stock tracking, hospital pharmacy management"
        canonicalUrl="/in-house-pharmacy"
        jsonLd={[
          seoSchemas.medicalService({
            name: "In-House Pharmacy",
            description:
              "Integrated pharmacy module for clinics and hospitals featuring POS billing, real-time inventory, prescription QR scanning, expiry alerts, and supplier order management.",
            url: "/in-house-pharmacy",
          }),
          seoSchemas.breadcrumb([
            { name: "Home", url: "/" },
            { name: "In-House Pharmacy", url: "/in-house-pharmacy" },
          ]),
          seoSchemas.faq([
            {
              question: "What is the MediCare+ In-House Pharmacy?",
              answer:
                "It is a fully integrated pharmacy module that lets clinics and hospitals dispense medicines directly to patients, manage stock, and process payments — all linked to the same platform that handles their appointments and prescriptions.",
            },
            {
              question: "Can the pharmacy read prescriptions from doctors automatically?",
              answer:
                "Yes. Cashiers can scan the QR code printed on every MediCare+ prescription to instantly load the prescribed medicines into the POS, eliminating manual entry errors.",
            },
            {
              question: "Does it track expiry dates and low stock?",
              answer:
                "Yes. The system raises automatic alerts for medicines that are expiring soon or have fallen below the reorder level, so the pharmacy never runs out or sells expired stock.",
            },
            {
              question: "Can I manage suppliers and purchase orders?",
              answer:
                "Yes. Pharmacy owners can create supplier orders, track expected delivery, record received batches, and update inventory in one place.",
            },
            {
              question: "Who can operate the pharmacy POS?",
              answer:
                "Pharmacy owners can create cashier accounts with limited permissions. Each sale is logged against the cashier for full audit traceability.",
            },
          ]),
        ]}
      />

      <div className="container mx-auto px-3 sm:px-4 py-10 md:py-16 max-w-4xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Pill className="w-6 h-6 text-primary" />
          </div>
          <span className="text-sm font-medium text-primary uppercase tracking-wider">
            In-House Pharmacy
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 md:mb-6">
          A Complete Pharmacy, Built Into Your Clinic
        </h1>

        <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8 leading-relaxed">
          MediCare+ includes a full <strong>In-House Pharmacy</strong> facility so patients can collect their
          prescribed medicines on the spot — no second visit, no separate system. From scanning a doctor's
          prescription QR to printing the receipt, every step is connected to the same platform that runs
          your appointments and clinical records.
        </p>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-8 md:mb-12">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/pharmacy">Open Pharmacy Portal</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link to="/booking">Book an Appointment</Link>
          </Button>
        </div>

        {/* How it works */}
        <section className="mb-10 md:mb-12">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-3 md:mb-4">
            How the In-House Pharmacy Works
          </h2>
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Doctor Issues a Prescription",
                desc: "Every prescription generated in MediCare+ comes with a unique QR code linked to the patient's appointment.",
              },
              {
                step: "2",
                title: "Patient Visits the Pharmacy Counter",
                desc: "The pharmacy cashier scans the QR — prescribed medicines load instantly into the point-of-sale screen.",
              },
              {
                step: "3",
                title: "Stock & Pricing Auto-Filled",
                desc: "Quantities, batch numbers, and selling prices are pulled live from the pharmacy inventory.",
              },
              {
                step: "4",
                title: "Payment & Thermal Receipt",
                desc: "Process cash or digital payment, then print a thermal receipt. Stock is decremented atomically.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex gap-4 items-start p-4 rounded-xl border border-border/50 bg-card/50"
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                  {item.step}
                </span>
                <div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mb-10 md:mb-12">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-4">
            Pharmacy Features at a Glance
          </h2>
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {[
              {
                icon: ShoppingCart,
                title: "Split-Panel POS",
                desc: "Search inventory on one side, build the cart on the other. Optimized for fast counter sales.",
              },
              {
                icon: QrCode,
                title: "Prescription QR Scan",
                desc: "Scan the QR on a MediCare+ prescription to auto-load medicines — zero manual entry.",
              },
              {
                icon: Boxes,
                title: "Real-Time Inventory",
                desc: "Track stock by batch, manufacturer, strength, form, and reorder level in real time.",
              },
              {
                icon: AlertTriangle,
                title: "Expiry & Low-Stock Alerts",
                desc: "Automatic warnings for medicines nearing expiry or falling below the reorder threshold.",
              },
              {
                icon: ClipboardList,
                title: "Supplier Orders",
                desc: "Create purchase orders, log expected delivery, and update stock when batches arrive.",
              },
              {
                icon: Receipt,
                title: "Thermal Receipts",
                desc: "Print clean, branded thermal-style receipts with itemized medicines and totals.",
              },
              {
                icon: ShieldCheck,
                title: "Cashier Accounts",
                desc: "Owners create cashier logins with limited rights. Every sale is attributed for audit trails.",
              },
              {
                icon: Clock,
                title: "Stock Movement Log",
                desc: "Every increase, decrease, sale, or adjustment is recorded for full traceability.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="flex gap-3 p-4 rounded-xl border border-border/50 bg-card/50"
              >
                <feature.icon className="w-6 h-6 text-primary shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why it matters */}
        <section className="mb-10 md:mb-12">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-3">
            Why Patients Love an In-House Pharmacy
          </h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Skip the second trip — collect medicines immediately after consultation.</li>
            <li>No risk of mis-reading handwritten prescriptions; everything is digital.</li>
            <li>Transparent pricing with a printed receipt for every purchase.</li>
            <li>Refills are easy — past prescriptions remain accessible in the patient's records.</li>
          </ul>
        </section>

        <section className="mb-10 md:mb-12">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-3">
            Why Clinics & Hospitals Add It
          </h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>New revenue stream from in-house dispensing.</li>
            <li>Tight integration with appointments, prescriptions, and patient history.</li>
            <li>Real-time inventory prevents stock-outs and expired-medicine losses.</li>
            <li>Multi-cashier support with role-based access for safe operations.</li>
          </ul>
        </section>

        {/* Related */}
        <section className="mb-10 md:mb-12">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-4">
            Explore More MediCare+ Solutions
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                title: "Clinic Management Software",
                desc: "Complete dashboard for doctors, PAs, and clinic admins.",
                url: "/clinic-management-software",
              },
              {
                title: "Hospital Management Software",
                desc: "Multi-doctor, multi-department hospital operations.",
                url: "/hospital-management-software",
              },
              {
                title: "Online Doctor Appointments",
                desc: "Book verified doctors online with instant token allocation.",
                url: "/online-doctor-appointment-system",
              },
            ].map((page) => (
              <Link
                key={page.url}
                to={page.url}
                className="group p-4 rounded-xl border border-border/50 bg-card/50 hover:border-primary/30 transition-colors"
              >
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                  {page.title}{" "}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{page.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-2xl bg-primary/5 border border-primary/20 p-5 md:p-8">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-3">
            Visit Our In-House Pharmacy
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mb-5 md:mb-6">
            Get your prescribed medicines dispensed instantly after your consultation — accurate, fast, and
            fully integrated with your medical records.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/booking">Book a Consultation</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link to="/pharmacy">Open Pharmacy Portal</Link>
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
}

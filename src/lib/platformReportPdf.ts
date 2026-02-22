import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

const formatCurrency = (amount: number) => `PKR ${amount.toLocaleString()}`;

interface ReportData {
  totalDoctors: number;
  subscribedDoctors: number;
  freeDoctors: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  totalPatients: number;
  totalPAs: number;
  newPatientsLast10Days: number;
  newDoctorsLast10Days: number;
  totalRecentAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  pendingAppointments: number;
  cashPayments: number;
  onlinePayments: number;
  totalAIRevenue: number;
  recentAIRevenue: number;
  activeAIUsers: number;
  totalCreditsUsed: number;
  avgRating: string;
  recentReviews: number;
  planDistribution: { name: string; price: number; period: string; count: number; revenue: number }[];
  allSubscribers: { name: string; phone: string; specialty: string; city: string; plan: string; price: string; joined: string }[];
  aiPlanDistribution: { name: string; price: number; credits: number; purchases: number; revenue: number }[];
}

export async function fetchReportData(): Promise<ReportData> {
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

  const [doctorsRes, plansRes, profilesRes, appointmentsRes, aiCreditsRes, aiPurchasesRes, aiPlansRes, reviewsRes] = await Promise.all([
    supabase.from("doctors").select("user_id, specialty, fee, created_at, selected_plan_id, city, organization_id"),
    supabase.from("doctor_payment_plans").select("id, name, price, billing_period, is_active"),
    supabase.from("profiles").select("id, name, phone, status, role, created_at"),
    supabase.from("appointments").select("id, status, appointment_date, payment_method, created_at").gte("created_at", tenDaysAgo.toISOString()),
    supabase.from("patient_ai_credits").select("user_id, total_credits, used_credits"),
    supabase.from("patient_ai_purchases").select("id, user_id, credits_purchased, amount_paid, status, created_at, plan_id").eq("status", "completed"),
    supabase.from("patient_ai_plans").select("id, name, price, credits, is_active"),
    supabase.from("reviews").select("id, rating, created_at").gte("created_at", tenDaysAgo.toISOString()),
  ]);

  const doctors = doctorsRes.data || [];
  const plans = plansRes.data || [];
  const profiles = profilesRes.data || [];
  const recentAppointments = appointmentsRes.data || [];
  const aiCredits = aiCreditsRes.data || [];
  const aiPurchases = aiPurchasesRes.data || [];
  const aiPlans = aiPlansRes.data || [];
  const recentReviews = reviewsRes.data || [];

  const totalDoctors = doctors.length;
  const subscribedDoctors = doctors.filter(d => {
    const plan = plans.find(p => p.id === d.selected_plan_id);
    return plan && plan.price > 0;
  }).length;
  const freeDoctors = totalDoctors - subscribedDoctors;

  const monthlyRevenue = doctors.reduce((sum, d) => {
    const plan = plans.find(p => p.id === d.selected_plan_id);
    if (!plan || plan.price === 0) return sum;
    return sum + (plan.billing_period === "yearly" ? plan.price / 12 : plan.price);
  }, 0);

  const planDistribution = plans.map(plan => {
    const count = doctors.filter(d => d.selected_plan_id === plan.id).length;
    const monthlyRev = count * (plan.billing_period === "yearly" ? plan.price / 12 : plan.price);
    return { name: plan.name, price: plan.price, period: plan.billing_period, count, revenue: monthlyRev };
  });
  planDistribution.push({ name: "Free / No Plan", price: 0, period: "-", count: freeDoctors, revenue: 0 });

  const allSubscribers = doctors
    .filter(d => {
      const plan = plans.find(p => p.id === d.selected_plan_id);
      return plan && plan.price > 0;
    })
    .map(d => {
      const profile = profiles.find(p => p.id === d.user_id);
      const plan = plans.find(p => p.id === d.selected_plan_id);
      return {
        name: profile?.name || "Unknown",
        phone: profile?.phone || "-",
        specialty: d.specialty,
        city: d.city || "-",
        plan: plan?.name || "Unknown",
        price: `${formatCurrency(plan?.price || 0)}/${plan?.billing_period === "yearly" ? "yr" : "mo"}`,
        joined: format(new Date(d.created_at), "MMM d, yyyy"),
      };
    });

  const totalAIRevenue = aiPurchases.reduce((sum, p) => sum + p.amount_paid, 0);
  const recentAIPurchases = aiPurchases.filter(p => new Date(p.created_at) >= tenDaysAgo);
  const recentAIRevenue = recentAIPurchases.reduce((sum, p) => sum + p.amount_paid, 0);
  const totalCreditsUsed = aiCredits.reduce((sum, c) => sum + c.used_credits, 0);
  const activeAIUsers = aiCredits.filter(c => c.total_credits > 0).length;

  const aiPlanDistribution = aiPlans.map(plan => {
    const purchases = aiPurchases.filter(p => p.plan_id === plan.id);
    return { name: plan.name, price: plan.price, credits: plan.credits, purchases: purchases.length, revenue: purchases.reduce((s, p) => s + p.amount_paid, 0) };
  });

  const avgRating = recentReviews.length > 0 ? (recentReviews.reduce((s, r) => s + r.rating, 0) / recentReviews.length).toFixed(1) : "N/A";

  return {
    totalDoctors,
    subscribedDoctors,
    freeDoctors,
    monthlyRevenue,
    yearlyRevenue: monthlyRevenue * 12,
    totalPatients: profiles.filter(p => p.role === "patient").length,
    totalPAs: profiles.filter(p => p.role === "pa").length,
    newPatientsLast10Days: profiles.filter(p => p.role === "patient" && new Date(p.created_at) >= tenDaysAgo).length,
    newDoctorsLast10Days: doctors.filter(d => new Date(d.created_at) >= tenDaysAgo).length,
    totalRecentAppointments: recentAppointments.length,
    completedAppointments: recentAppointments.filter(a => a.status === "Completed").length,
    cancelledAppointments: recentAppointments.filter(a => a.status === "Cancelled").length,
    pendingAppointments: recentAppointments.filter(a => a.status === "Pending" || a.status === "Upcoming").length,
    cashPayments: recentAppointments.filter(a => a.payment_method === "Cash").length,
    onlinePayments: recentAppointments.filter(a => a.payment_method !== "Cash").length,
    totalAIRevenue,
    recentAIRevenue,
    activeAIUsers,
    totalCreditsUsed,
    avgRating,
    recentReviews: recentReviews.length,
    planDistribution,
    allSubscribers,
    aiPlanDistribution,
  };
}

export function generatePlatformReportPDF(data: ReportData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const reportDate = format(new Date(), "MMMM d, yyyy 'at' h:mm a");
  let y = 20;

  // Header
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("MediCare+ Platform Report", pageWidth / 2, 18, { align: "center" });
  doc.setFontSize(10);
  doc.text(reportDate, pageWidth / 2, 28, { align: "center" });
  doc.setFontSize(8);
  doc.text("Comprehensive Analytics • Last 10 Days Reporting Period", pageWidth / 2, 35, { align: "center" });
  y = 50;

  // Helper
  const sectionTitle = (title: string) => {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setTextColor(15, 118, 110);
    doc.text(title, 14, y);
    y += 2;
    doc.setDrawColor(15, 118, 110);
    doc.setLineWidth(0.5);
    doc.line(14, y, pageWidth - 14, y);
    y += 8;
  };

  const statRow = (label: string, value: string | number) => {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(label, 18, y);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(String(value), 90, y);
    doc.setFont("helvetica", "normal");
    y += 7;
  };

  // ═══ PLATFORM OVERVIEW ═══
  sectionTitle("📈 Platform Overview");
  statRow("Total Doctors", data.totalDoctors);
  statRow("Paid Subscribers", data.subscribedDoctors);
  statRow("Free Plan Doctors", data.freeDoctors);
  statRow("Monthly Revenue (MRR)", formatCurrency(data.monthlyRevenue));
  statRow("Yearly Projection (ARR)", formatCurrency(data.yearlyRevenue));
  statRow("Total Patients", data.totalPatients);
  statRow("Physician Assistants", data.totalPAs);
  statRow("New Doctors (10d)", data.newDoctorsLast10Days);
  statRow("New Patients (10d)", data.newPatientsLast10Days);
  y += 5;

  // ═══ PLAN DISTRIBUTION ═══
  sectionTitle("📋 Subscription Plan Distribution");
  autoTable(doc, {
    startY: y,
    head: [["Plan", "Price", "Doctors", "Monthly Revenue"]],
    body: data.planDistribution.map(p => [
      p.name,
      p.price > 0 ? `${formatCurrency(p.price)}/${p.period === "yearly" ? "yr" : "mo"}` : "Free",
      String(p.count),
      `${formatCurrency(p.revenue)}/mo`,
    ]),
    foot: [["TOTAL", "", String(data.totalDoctors), `${formatCurrency(data.monthlyRevenue)}/mo`]],
    theme: "grid",
    headStyles: { fillColor: [15, 118, 110], fontSize: 9 },
    footStyles: { fillColor: [240, 253, 244], textColor: [22, 101, 52], fontStyle: "bold", fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 4 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ═══ PAID SUBSCRIBERS ═══
  if (data.allSubscribers.length > 0) {
    sectionTitle("👨‍⚕️ All Paid Subscribers");
    autoTable(doc, {
      startY: y,
      head: [["Doctor", "Specialty", "City", "Plan", "Price", "Joined"]],
      body: data.allSubscribers.map(s => [s.name, s.specialty, s.city, s.plan, s.price, s.joined]),
      theme: "striped",
      headStyles: { fillColor: [15, 118, 110], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 25 }, 2: { cellWidth: 20 }, 3: { cellWidth: 28 }, 4: { cellWidth: 35 }, 5: { cellWidth: 25 } },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ═══ AI CREDITS ═══
  if (y > 250) { doc.addPage(); y = 20; }
  sectionTitle("🤖 AI Credits System");
  statRow("Total AI Revenue", formatCurrency(data.totalAIRevenue));
  statRow("Revenue (Last 10d)", formatCurrency(data.recentAIRevenue));
  statRow("Active AI Users", data.activeAIUsers);
  statRow("Total Credits Used", data.totalCreditsUsed.toLocaleString());
  y += 3;

  if (data.aiPlanDistribution.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["AI Plan", "Price", "Credits", "Purchases", "Revenue"]],
      body: data.aiPlanDistribution.map(p => [p.name, formatCurrency(p.price), String(p.credits), String(p.purchases), formatCurrency(p.revenue)]),
      theme: "grid",
      headStyles: { fillColor: [124, 58, 237], fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 4 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ═══ APPOINTMENTS ═══
  if (y > 250) { doc.addPage(); y = 20; }
  sectionTitle("📅 Appointment Activity (Last 10 Days)");
  statRow("Total Bookings", data.totalRecentAppointments);
  statRow("Completed", data.completedAppointments);
  statRow("Cancelled", data.cancelledAppointments);
  statRow("Pending/Upcoming", data.pendingAppointments);
  statRow("Cash Payments", data.cashPayments);
  statRow("Online Payments", data.onlinePayments);
  y += 3;

  // ═══ REVIEWS ═══
  sectionTitle("⭐ Reviews & Satisfaction");
  statRow("New Reviews (10d)", data.recentReviews);
  statRow("Average Rating", data.avgRating);

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    doc.text("MediCare+ Confidential Platform Report", pageWidth / 2, doc.internal.pageSize.getHeight() - 5, { align: "center" });
  }

  return doc;
}

export async function downloadPlatformReportPDF() {
  const data = await fetchReportData();
  const doc = generatePlatformReportPDF(data);
  doc.save(`MediCare-Platform-Report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

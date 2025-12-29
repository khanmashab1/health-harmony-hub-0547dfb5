import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PaymentRecord {
  id: string;
  patient_full_name: string | null;
  appointment_date: string;
  token_number: number;
  status: string;
  doctor_comments: string | null;
  updated_at: string;
}

export function exportPaymentHistoryCSV(payments: PaymentRecord[], filename?: string) {
  const headers = ["Patient Name", "Date", "Token #", "Status", "Notes", "Processed At"];
  
  const rows = payments.map((p) => [
    p.patient_full_name || "Unknown",
    format(new Date(p.appointment_date), "yyyy-MM-dd"),
    `#${p.token_number}`,
    p.status === "Cancelled" ? "Rejected" : "Confirmed",
    (p.doctor_comments?.replace(/^Payment (confirmed|rejected): /, "") || "").replace(/,/g, ";"),
    format(new Date(p.updated_at), "yyyy-MM-dd HH:mm"),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `payment-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportPaymentHistoryPDF(payments: PaymentRecord[], filename?: string) {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text("Payment History Report", 14, 22);
  
  // Date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`, 14, 30);
  
  // Stats
  const confirmed = payments.filter((p) => p.status !== "Cancelled").length;
  const rejected = payments.filter((p) => p.status === "Cancelled").length;
  doc.text(`Total: ${payments.length} | Confirmed: ${confirmed} | Rejected: ${rejected}`, 14, 36);
  
  // Table
  const tableData = payments.map((p) => [
    p.patient_full_name || "Unknown",
    format(new Date(p.appointment_date), "MMM d, yyyy"),
    `#${p.token_number}`,
    p.status === "Cancelled" ? "Rejected" : "Confirmed",
    (p.doctor_comments?.replace(/^Payment (confirmed|rejected): /, "") || "-").substring(0, 40),
  ]);

  autoTable(doc, {
    startY: 42,
    head: [["Patient", "Date", "Token", "Status", "Notes"]],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [99, 102, 241] },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 30 },
      2: { cellWidth: 20 },
      3: { cellWidth: 25 },
      4: { cellWidth: 60 },
    },
  });

  doc.save(filename || `payment-history-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
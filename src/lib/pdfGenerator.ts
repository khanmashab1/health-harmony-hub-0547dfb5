import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { formatMedicinesText } from "./utils";

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  department: string | null;
  reason: string | null;
  diagnosis: string | null;
  medicines: string | null;
  lab_tests: string | null;
  doctor_comments: string | null;
  allergies: string | null;
  vitals_bp: string | null;
  vitals_temperature: string | null;
  vitals_weight: string | null;
  vitals_heart_rate: string | null;
  token_number: number;
  doctor?: { name: string | null };
}

interface MedicalRecord {
  id: string;
  record_date: string;
  diagnosis: string | null;
  medicines: string | null;
  lab_tests: string | null;
  comments: string | null;
  doctor_name: string | null;
}

interface PatientInfo {
  name: string;
  email?: string;
  phone?: string;
  age?: number;
  gender?: string;
  blood_type?: string;
}

// Helper to load image as base64 for PDF
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateMedicalHistoryPDF(
  appointments: Appointment[],
  medicalRecords: MedicalRecord[],
  patientInfo: PatientInfo,
  stampImageUrl?: string
): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Load stamp image (use provided URL or fallback to default)
  const stampBase64 = await loadImageAsBase64(stampImageUrl || "/stamp-medicare.png");

  // Header
  doc.setFontSize(24);
  doc.setTextColor(22, 163, 74); // Green color
  doc.text("MediCare+", 14, yPosition);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`, pageWidth - 14, yPosition, { align: "right" });
  
  yPosition += 15;

  // Title
  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.text("Complete Medical History Report", 14, yPosition);
  yPosition += 15;

  // Patient Info Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, yPosition, pageWidth - 28, 35, 3, 3, "F");
  
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`Patient: ${patientInfo.name || "N/A"}`, 20, yPosition + 10);
  
  const infoLine = [
    patientInfo.age ? `Age: ${patientInfo.age}` : null,
    patientInfo.gender ? `Gender: ${patientInfo.gender}` : null,
    patientInfo.blood_type ? `Blood Type: ${patientInfo.blood_type}` : null,
  ].filter(Boolean).join("  |  ");
  
  if (infoLine) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(infoLine, 20, yPosition + 20);
  }
  
  if (patientInfo.phone || patientInfo.email) {
    doc.text(
      [patientInfo.phone, patientInfo.email].filter(Boolean).join("  |  "),
      20,
      yPosition + 28
    );
  }
  
  yPosition += 45;

  // Summary Stats
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Summary", 14, yPosition);
  yPosition += 8;
  
  const completedVisits = appointments.filter(a => a.status === "Completed").length;
  const diagnoses = appointments.filter(a => a.diagnosis).length;
  const prescriptions = appointments.filter(a => a.medicines).length;
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Total Visits: ${appointments.length}  |  Completed: ${completedVisits}  |  Diagnoses: ${diagnoses}  |  Prescriptions: ${prescriptions}`, 14, yPosition);
  yPosition += 15;

  // Appointments Table
  if (appointments.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Appointment History", 14, yPosition);
    yPosition += 5;

    const appointmentData = appointments.map(apt => [
      format(new Date(apt.appointment_date), "MMM d, yyyy"),
      `Dr. ${apt.doctor?.name || "Unknown"}`,
      apt.department || "-",
      apt.status,
      apt.diagnosis || "-",
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [["Date", "Doctor", "Department", "Status", "Diagnosis"]],
      body: appointmentData,
      theme: "striped",
      headStyles: { fillColor: [22, 163, 74] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 35 },
        2: { cellWidth: 30 },
        3: { cellWidth: 22 },
        4: { cellWidth: "auto" },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Detailed Visit Records
  const completedAppointments = appointments.filter(a => 
    a.status === "Completed" && (a.diagnosis || a.medicines || a.lab_tests)
  );

  if (completedAppointments.length > 0) {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Detailed Medical Records", 14, yPosition);
    yPosition += 10;

    completedAppointments.forEach((apt, index) => {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      // Visit header
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(14, yPosition, pageWidth - 28, 8, 2, 2, "F");
      doc.setFontSize(10);
      doc.setTextColor(30, 64, 175);
      doc.text(
        `Visit ${index + 1}: ${format(new Date(apt.appointment_date), "MMMM d, yyyy")} - Dr. ${apt.doctor?.name || "Unknown"}`,
        16,
        yPosition + 6
      );
      yPosition += 12;

      doc.setTextColor(0);

      // Vitals
      const vitals = [
        apt.vitals_bp ? `BP: ${apt.vitals_bp}` : null,
        apt.vitals_temperature ? `Temp: ${apt.vitals_temperature}` : null,
        apt.vitals_weight ? `Weight: ${apt.vitals_weight}` : null,
        apt.vitals_heart_rate ? `Heart Rate: ${apt.vitals_heart_rate}` : null,
      ].filter(Boolean);

      if (vitals.length > 0) {
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("Vitals:", 16, yPosition);
        doc.setTextColor(0);
        doc.text(vitals.join("  |  "), 32, yPosition);
        yPosition += 7;
      }

      // Diagnosis
      if (apt.diagnosis) {
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("Diagnosis:", 16, yPosition);
        doc.setTextColor(0);
        const diagLines = doc.splitTextToSize(apt.diagnosis, pageWidth - 60);
        doc.text(diagLines, 38, yPosition);
        yPosition += diagLines.length * 5 + 3;
      }

      // Medicines
      if (apt.medicines) {
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("Prescription:", 16, yPosition);
        doc.setTextColor(0);
        const formattedMeds = formatMedicinesText(apt.medicines);
        const medLines = doc.splitTextToSize(formattedMeds, pageWidth - 60);
        doc.text(medLines, 42, yPosition);
        yPosition += medLines.length * 5 + 3;
      }

      // Lab Tests
      if (apt.lab_tests) {
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("Lab Tests:", 16, yPosition);
        doc.setTextColor(0);
        const labLines = doc.splitTextToSize(apt.lab_tests, pageWidth - 60);
        doc.text(labLines, 38, yPosition);
        yPosition += labLines.length * 5 + 3;
      }

      // Doctor Comments
      if (apt.doctor_comments) {
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("Notes:", 16, yPosition);
        doc.setTextColor(0);
        const noteLines = doc.splitTextToSize(apt.doctor_comments, pageWidth - 60);
        doc.text(noteLines, 32, yPosition);
        yPosition += noteLines.length * 5 + 3;
      }

      yPosition += 8;
    });
  }

  // Add stamp to every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Add stamp image (bottom-right, semi-transparent effect via positioning)
    if (stampBase64) {
      const stampSize = 35;
      doc.addImage(
        stampBase64,
        "PNG",
        pageWidth - stampSize - 20,
        doc.internal.pageSize.getHeight() - stampSize - 25,
        stampSize,
        stampSize,
        undefined,
        "FAST"
      );
    }

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
    doc.text(
      "This document is confidential and intended for the patient's personal records.",
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: "center" }
    );
  }

  return doc;
}

export async function downloadMedicalHistoryPDF(
  appointments: Appointment[],
  medicalRecords: MedicalRecord[],
  patientInfo: PatientInfo,
  stampImageUrl?: string
) {
  const doc = await generateMedicalHistoryPDF(appointments, medicalRecords, patientInfo, stampImageUrl);
  const fileName = `medical-history-${patientInfo.name?.replace(/\s+/g, "-").toLowerCase() || "patient"}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}

export async function getMedicalHistoryPDFBlob(
  appointments: Appointment[],
  medicalRecords: MedicalRecord[],
  patientInfo: PatientInfo,
  stampImageUrl?: string
): Promise<Blob> {
  const doc = await generateMedicalHistoryPDF(appointments, medicalRecords, patientInfo, stampImageUrl);
  return doc.output("blob");
}

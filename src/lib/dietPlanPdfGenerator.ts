import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface MealItem {
  meal: string;
  calories: number;
  details: string;
}

interface ExerciseItem {
  day: string;
  workout: string;
  duration: string;
  intensity: string;
  details: string;
}

interface HealthPlan {
  summary: string;
  bmi: number;
  bmiCategory: string;
  dailyCalories: number;
  waterIntake: string;
  dietPlan: Record<string, MealItem[]>;
  exercisePlan: ExerciseItem[];
  lifestyleTips: string[];
  sleepRecommendation: string;
  weeklyGoals: string[];
}

interface UserProfile {
  age: string;
  gender: string;
  height: string;
  weight: string;
  goal: string;
  dietaryPreference: string;
  activityLevel: string;
}

interface MealLog {
  eaten: boolean;
  notes: string;
}

const mealOrder = ["breakfast", "morningSnack", "lunch", "eveningSnack", "dinner"];

const mealLabels: Record<string, string> = {
  breakfast: "🌅 Breakfast",
  morningSnack: "🍎 Morning Snack",
  lunch: "🍽️ Lunch",
  eveningSnack: "🫐 Evening Snack",
  dinner: "🌙 Dinner",
};

const mealEmoji: Record<string, string> = {
  breakfast: "🌅",
  morningSnack: "🍎",
  lunch: "🍽️",
  eveningSnack: "🫐",
  dinner: "🌙",
};

function drawSectionHeader(doc: jsPDF, title: string, y: number, color: [number, number, number]): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFillColor(...color);
  doc.roundedRect(14, y, pageWidth - 28, 9, 2, 2, "F");
  doc.setFontSize(12);
  doc.setTextColor(255);
  doc.text(title, 18, y + 6.5);
  return y + 14;
}

export function generateDietPlanPDF(
  plan: HealthPlan,
  profile: UserProfile,
  mealLogs: Record<string, MealLog>,
  _mealLabelsParam?: Record<string, string>
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // ─── Header Bar ───
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setFontSize(20);
  doc.setTextColor(255);
  doc.text("MediCare+", 14, 14);
  doc.setFontSize(10);
  doc.text("Personalized Health & Diet Plan", 14, 22);
  doc.setFontSize(8);
  doc.text(format(new Date(), "MMMM d, yyyy • h:mm a"), pageWidth - 14, 14, { align: "right" });
  y = 36;

  // ─── Profile Card ───
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 26, 3, 3, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 26, 3, 3, "S");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("PATIENT PROFILE", 20, y + 6);
  doc.setFontSize(10);
  doc.setTextColor(30);
  doc.text(`Age: ${profile.age}  •  Gender: ${profile.gender}  •  Height: ${profile.height} cm  •  Weight: ${profile.weight} kg`, 20, y + 13);
  doc.text(`Goal: ${profile.goal}  •  Diet: ${profile.dietaryPreference}  •  Activity: ${profile.activityLevel}`, 20, y + 20);
  y += 33;

  // ─── Stats Cards ───
  const statBoxW = (pageWidth - 28 - 9) / 4;
  const stats = [
    { label: "BMI", value: `${plan.bmi}`, sub: plan.bmiCategory },
    { label: "Daily Calories", value: `${plan.dailyCalories}`, sub: "kcal" },
    { label: "Water Intake", value: plan.waterIntake, sub: "" },
    { label: "Sleep", value: plan.sleepRecommendation.length > 20 ? plan.sleepRecommendation.slice(0, 18) + "…" : plan.sleepRecommendation, sub: "" },
  ];
  stats.forEach((s, i) => {
    const x = 14 + i * (statBoxW + 3);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(x, y, statBoxW, 18, 2, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(s.label.toUpperCase(), x + 3, y + 5);
    doc.setFontSize(11);
    doc.setTextColor(16, 185, 129);
    doc.text(s.value, x + 3, y + 12);
    if (s.sub) {
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(s.sub, x + 3, y + 16);
    }
  });
  y += 24;

  // ─── Summary ───
  doc.setFontSize(9);
  doc.setTextColor(60);
  const summaryLines = doc.splitTextToSize(plan.summary, pageWidth - 28);
  doc.text(summaryLines, 14, y);
  y += summaryLines.length * 4.2 + 6;

  // ─── Diet Plan (Grouped by Meal, Chronological) ───
  y = drawSectionHeader(doc, "Daily Diet Plan", y, [16, 185, 129]);

  mealOrder.forEach((mealKey) => {
    const meals = plan.dietPlan[mealKey];
    if (!meals || meals.length === 0) return;

    const label = mealLabels[mealKey] || mealKey;
    const totalCals = meals.reduce((s, m) => s + m.calories, 0);

    // Meal group header
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, y, pageWidth - 28, 8, 1.5, 1.5, "F");
    doc.setFontSize(10);
    doc.setTextColor(30);
    doc.text(label, 18, y + 5.5);
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129);
    doc.text(`${totalCals} kcal`, pageWidth - 18, y + 5.5, { align: "right" });
    y += 10;

    const rows = meals.map((item, i) => {
      const key = `${mealKey}-${i}`;
      const log = mealLogs[key];
      return [
        item.meal,
        `${item.calories} kcal`,
        item.details,
        log?.eaten ? "✅" : "—",
        log?.notes || "",
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["Item", "Calories", "Details", "Eaten", "Notes"]],
      body: rows,
      theme: "plain",
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [100, 100, 100],
        fontStyle: "bold",
        fontSize: 7.5,
        cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 },
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
        textColor: [40, 40, 40],
      },
      alternateRowStyles: { fillColor: [252, 252, 252] },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: "bold" },
        1: { cellWidth: 20, halign: "center", textColor: [16, 185, 129] },
        2: { cellWidth: 70 },
        3: { cellWidth: 14, halign: "center" },
        4: { cellWidth: "auto" },
      },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 6;
  });

  // ─── Exercise Plan ───
  y = drawSectionHeader(doc, "7-Day Exercise Plan", y + 4, [59, 130, 246]);

  const exerciseRows = plan.exercisePlan.map(ex => [
    ex.day,
    ex.workout,
    ex.duration,
    ex.intensity,
    ex.details,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Day", "Workout", "Duration", "Intensity", "Details"]],
    body: exerciseRows,
    theme: "plain",
    headStyles: {
      fillColor: [239, 246, 255],
      textColor: [59, 130, 246],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
      textColor: [40, 40, 40],
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: "bold" },
      1: { cellWidth: 35 },
      2: { cellWidth: 22, halign: "center" },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: "auto" },
    },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ─── Weekly Goals ───
  y = drawSectionHeader(doc, "Weekly Goals", y, [139, 92, 246]);
  doc.setFontSize(9);
  doc.setTextColor(40);
  plan.weeklyGoals.forEach((g, i) => {
    if (y > 275) { doc.addPage(); y = 20; }
    doc.text(`${i + 1}. ${g}`, 18, y);
    y += 5.5;
  });
  y += 4;

  // ─── Lifestyle Tips ───
  y = drawSectionHeader(doc, "Lifestyle Tips", y, [245, 158, 11]);
  doc.setFontSize(9);
  doc.setTextColor(50);
  plan.lifestyleTips.forEach(tip => {
    if (y > 275) { doc.addPage(); y = 20; }
    const lines = doc.splitTextToSize(`• ${tip}`, pageWidth - 34);
    doc.text(lines, 18, y);
    y += lines.length * 4.5 + 2;
  });

  // ─── Footer on all pages ───
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageH - 16, pageWidth - 14, pageH - 16);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageH - 10, { align: "center" });
    doc.text("AI-generated plan — not a substitute for professional medical advice. MediCare+", pageWidth / 2, pageH - 6, { align: "center" });
  }

  const fileName = `health-plan-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}

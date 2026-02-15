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

const mealLabels: Record<string, string> = {
  breakfast: "Breakfast",
  morningSnack: "Morning Snack",
  lunch: "Lunch",
  eveningSnack: "Evening Snack",
  dinner: "Dinner",
};

export function generateDietPlanPDF(
  plan: HealthPlan,
  profile: UserProfile,
  mealLogs: Record<string, MealLog>,
  _mealLabelsParam?: Record<string, string>
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(16, 185, 129); // emerald
  doc.text("MediCare+", 14, y);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`, pageWidth - 14, y, { align: "right" });
  y += 12;

  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.text("Personalized Health & Diet Plan", 14, y);
  y += 12;

  // Profile box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 22, 3, 3, "F");
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`Age: ${profile.age} | Gender: ${profile.gender} | Height: ${profile.height} cm | Weight: ${profile.weight} kg`, 20, y + 8);
  doc.text(`Goal: ${profile.goal} | Diet: ${profile.dietaryPreference} | Activity: ${profile.activityLevel}`, 20, y + 16);
  y += 30;

  // Stats row
  doc.setFontSize(10);
  doc.setTextColor(0);
  const statsText = `BMI: ${plan.bmi} (${plan.bmiCategory})  |  Daily Calories: ${plan.dailyCalories} kcal  |  Water: ${plan.waterIntake}  |  Sleep: ${plan.sleepRecommendation.slice(0, 30)}`;
  doc.text(statsText, 14, y);
  y += 10;

  // Summary
  doc.setFontSize(9);
  doc.setTextColor(80);
  const summaryLines = doc.splitTextToSize(plan.summary, pageWidth - 28);
  doc.text(summaryLines, 14, y);
  y += summaryLines.length * 4.5 + 8;

  // Diet Plan Table
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Diet Plan", 14, y);
  y += 4;

  const dietRows: string[][] = [];
  Object.entries(plan.dietPlan).forEach(([mealKey, meals]) => {
    (meals as MealItem[]).forEach((item, i) => {
      const key = `${mealKey}-${i}`;
      const log = mealLogs[key];
      dietRows.push([
        mealLabels[mealKey] || mealKey,
        item.meal,
        `${item.calories}`,
        item.details,
        log?.eaten ? "✓" : "",
        log?.notes || "",
      ]);
    });
  });

  autoTable(doc, {
    startY: y,
    head: [["Meal", "Item", "Kcal", "Details", "Eaten", "Notes"]],
    body: dietRows,
    theme: "striped",
    headStyles: { fillColor: [16, 185, 129] },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 30 },
      2: { cellWidth: 14 },
      3: { cellWidth: 50 },
      4: { cellWidth: 12, halign: "center" },
      5: { cellWidth: "auto" },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // Exercise Plan
  if (y > 240) { doc.addPage(); y = 15; }
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Exercise Plan", 14, y);
  y += 4;

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
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8, cellPadding: 2.5 },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // Lifestyle & Goals
  if (y > 240) { doc.addPage(); y = 15; }
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Weekly Goals & Lifestyle Tips", 14, y);
  y += 8;

  doc.setFontSize(9);
  doc.setTextColor(40);
  plan.weeklyGoals.forEach((g, i) => {
    if (y > 275) { doc.addPage(); y = 15; }
    doc.text(`${i + 1}. ${g}`, 16, y);
    y += 5.5;
  });

  y += 4;
  if (y > 260) { doc.addPage(); y = 15; }
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text("Lifestyle Tips", 14, y);
  y += 6;

  doc.setFontSize(9);
  doc.setTextColor(60);
  plan.lifestyleTips.forEach(tip => {
    if (y > 275) { doc.addPage(); y = 15; }
    const lines = doc.splitTextToSize(`• ${tip}`, pageWidth - 30);
    doc.text(lines, 16, y);
    y += lines.length * 4.5 + 2;
  });

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    doc.text("⚕️ AI-generated plan — not a substitute for professional medical advice.", pageWidth / 2, doc.internal.pageSize.getHeight() - 5, { align: "center" });
  }

  const fileName = `health-plan-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}

import { supabase } from "@/integrations/supabase/client";

interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meal_type: string;
  allergy_tags: string[];
  category: string;
}

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

interface GenerateDietPlanInput {
  age: number;
  gender: string;
  height: number;
  weight: number;
  goal: string;
  activityLevel: string;
  allergies: string;
  userId: string;
}

function calculateBMR(weight: number, height: number, age: number, gender: string): number {
  if (gender.toLowerCase() === "female") {
    return (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }
  return (10 * weight) + (6.25 * height) - (5 * age) + 5;
}

function getActivityFactor(level: string): number {
  const map: Record<string, number> = {
    sedentary: 1.2,
    "lightly active": 1.375,
    moderate: 1.55,
    "moderately active": 1.55,
    active: 1.725,
    "very active": 1.725,
    athlete: 1.9,
  };
  return map[level.toLowerCase()] || 1.55;
}

function getGoalAdjustment(goal: string): number {
  const g = goal.toLowerCase();
  if (g.includes("loss")) return -500;
  if (g.includes("gain") || g.includes("muscle")) return 400;
  return 0;
}

function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

function selectMeals(foods: Food[], targetCalories: number, userAllergies: string[]): Food[] {
  const allergyLower = userAllergies.map(a => a.toLowerCase().trim()).filter(Boolean);
  const available = foods.filter(f => {
    if (!f.allergy_tags || f.allergy_tags.length === 0) return true;
    return !f.allergy_tags.some(tag => allergyLower.includes(tag.toLowerCase()));
  });

  if (available.length === 0) return [];

  const sorted = [...available].sort((a, b) =>
    Math.abs(a.calories - targetCalories / 2) - Math.abs(b.calories - targetCalories / 2)
  );

  const selected: Food[] = [];
  let remaining = targetCalories;

  for (const food of sorted) {
    if (remaining <= 0) break;
    if (food.calories <= remaining + 50) {
      selected.push(food);
      remaining -= food.calories;
    }
    if (selected.length >= 3) break;
  }

  if (selected.length === 0 && available.length > 0) {
    const closest = available.reduce((a, b) =>
      Math.abs(a.calories - targetCalories) < Math.abs(b.calories - targetCalories) ? a : b
    );
    selected.push(closest);
  }

  return selected;
}

function getWaterIntake(weight: number): string {
  return `${(weight * 0.033).toFixed(1)} liters`;
}

function getSleepRecommendation(age: number): string {
  if (age < 18) return "8-10 hours per night";
  if (age < 65) return "7-9 hours per night";
  return "7-8 hours per night";
}

function generateExercisePlan(goal: string): ExerciseItem[] {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const g = goal.toLowerCase();
  const isLoss = g.includes("loss");
  const isGain = g.includes("gain") || g.includes("muscle");

  if (isLoss) {
    return [
      { day: days[0], workout: "Brisk Walking", duration: "30 mins", intensity: "Moderate", details: "Walk at a fast pace in a park or treadmill" },
      { day: days[1], workout: "Bodyweight Exercises", duration: "25 mins", intensity: "Moderate", details: "Push-ups, squats, lunges, planks" },
      { day: days[2], workout: "Cycling or Swimming", duration: "30 mins", intensity: "Moderate", details: "Steady-state cardio for fat burning" },
      { day: days[3], workout: "Rest or Stretching", duration: "15 mins", intensity: "Low", details: "Light yoga or stretching routine" },
      { day: days[4], workout: "HIIT Circuit", duration: "20 mins", intensity: "High", details: "30s work / 30s rest intervals" },
      { day: days[5], workout: "Jogging", duration: "25 mins", intensity: "Moderate", details: "Steady jog at comfortable pace" },
      { day: days[6], workout: "Active Rest", duration: "20 mins", intensity: "Low", details: "Light walk or recreational activity" },
    ];
  }

  if (isGain) {
    return [
      { day: days[0], workout: "Upper Body Strength", duration: "40 mins", intensity: "High", details: "Bench press, rows, shoulder press, bicep curls" },
      { day: days[1], workout: "Lower Body Strength", duration: "40 mins", intensity: "High", details: "Squats, deadlifts, leg press, calf raises" },
      { day: days[2], workout: "Active Recovery", duration: "20 mins", intensity: "Low", details: "Light cardio and stretching" },
      { day: days[3], workout: "Push Day", duration: "35 mins", intensity: "High", details: "Chest, shoulders, triceps exercises" },
      { day: days[4], workout: "Pull Day", duration: "35 mins", intensity: "High", details: "Back, biceps, rear delts exercises" },
      { day: days[5], workout: "Legs & Core", duration: "35 mins", intensity: "Moderate", details: "Leg exercises plus core work" },
      { day: days[6], workout: "Rest Day", duration: "—", intensity: "Rest", details: "Complete rest for muscle recovery" },
    ];
  }

  return [
    { day: days[0], workout: "Morning Walk", duration: "30 mins", intensity: "Low", details: "Brisk walk to start the day" },
    { day: days[1], workout: "Bodyweight Training", duration: "25 mins", intensity: "Moderate", details: "Push-ups, squats, planks" },
    { day: days[2], workout: "Yoga / Stretching", duration: "30 mins", intensity: "Low", details: "Full-body flexibility routine" },
    { day: days[3], workout: "Cardio", duration: "25 mins", intensity: "Moderate", details: "Cycling, swimming, or jogging" },
    { day: days[4], workout: "Strength Training", duration: "30 mins", intensity: "Moderate", details: "Light weights or resistance bands" },
    { day: days[5], workout: "Sports / Recreation", duration: "30 mins", intensity: "Moderate", details: "Cricket, badminton, or any sport" },
    { day: days[6], workout: "Rest Day", duration: "—", intensity: "Rest", details: "Relax and recover" },
  ];
}

function generateLifestyleTips(goal: string): string[] {
  const tips = [
    "Drink a glass of water before each meal to aid digestion",
    "Try to eat meals at consistent times each day",
    "Avoid screens 30 minutes before bedtime for better sleep",
    "Take a 10-minute walk after lunch to aid digestion",
    "Practice deep breathing or meditation for 5 minutes daily",
  ];
  if (goal.toLowerCase().includes("loss")) {
    tips.push("Reduce sugar-sweetened beverages and switch to water or green tea");
    tips.push("Use smaller plates to naturally control portion sizes");
  }
  if (goal.toLowerCase().includes("gain")) {
    tips.push("Eat every 3-4 hours to maintain caloric surplus");
    tips.push("Add healthy fats like nuts and avocado to increase calorie intake");
  }
  return tips.slice(0, 5);
}

function generateWeeklyGoals(goal: string): string[] {
  const g = goal.toLowerCase();
  if (g.includes("loss")) {
    return [
      "Stay within your daily calorie target (±100 kcal)",
      "Complete at least 5 workout sessions this week",
      "Drink at least 8 glasses of water daily",
    ];
  }
  if (g.includes("gain") || g.includes("muscle")) {
    return [
      "Meet your daily calorie surplus target",
      "Complete all strength training sessions",
      "Get 7-9 hours of sleep every night for recovery",
    ];
  }
  return [
    "Follow the meal plan consistently for 5 out of 7 days",
    "Exercise at least 4 days this week",
    "Maintain regular sleep schedule (same bedtime/wake time)",
  ];
}

function formatItems(items: Food[]): MealItem[] {
  return items.map(f => ({
    meal: f.name,
    calories: f.calories,
    details: `Protein: ${f.protein}g | Carbs: ${f.carbs}g | Fats: ${f.fats}g`,
  }));
}

export async function generateDietPlan(input: GenerateDietPlanInput) {
  const { age, gender, height, weight, goal, activityLevel, allergies, userId } = input;

  // 1. Calculate BMR, TDEE, target calories
  const bmr = calculateBMR(weight, height, age, gender);
  const activityFactor = getActivityFactor(activityLevel);
  const tdee = bmr * activityFactor;
  const goalAdjustment = getGoalAdjustment(goal);
  const dailyCalories = Math.round(tdee + goalAdjustment);

  // 2. BMI
  const bmi = parseFloat((weight / ((height / 100) ** 2)).toFixed(1));
  const bmiCategory = getBMICategory(bmi);

  // 3. Calorie distribution
  const breakfastCal = Math.round(dailyCalories * 0.25);
  const lunchCal = Math.round(dailyCalories * 0.35);
  const dinnerCal = Math.round(dailyCalories * 0.30);
  const snackCal = Math.round(dailyCalories * 0.10);

  // 4. Fetch foods from external Supabase
  const { data: allFoods, error: foodsError } = await supabase
    .from("foods")
    .select("*")
    .eq("is_active", true);

  if (foodsError) throw new Error("Failed to fetch foods: " + foodsError.message);

  const foods = (allFoods || []) as unknown as Food[];
  const userAllergies = allergies ? allergies.split(",").map(a => a.trim()).filter(Boolean) : [];

  // 5. Select meals
  const breakfastFoods = foods.filter(f => f.meal_type === "breakfast");
  const lunchFoods = foods.filter(f => f.meal_type === "lunch");
  const dinnerFoods = foods.filter(f => f.meal_type === "dinner");
  const snackFoods = foods.filter(f => f.meal_type === "snack");

  const breakfastItems = selectMeals(breakfastFoods, breakfastCal, userAllergies);
  const lunchItems = selectMeals(lunchFoods, lunchCal, userAllergies);
  const dinnerItems = selectMeals(dinnerFoods, dinnerCal, userAllergies);
  const snackItems = selectMeals(snackFoods, snackCal, userAllergies);

  const totalCalories = [...breakfastItems, ...lunchItems, ...dinnerItems, ...snackItems]
    .reduce((s, f) => s + f.calories, 0);

  // 6. Build plan
  const plan = {
    summary: `Based on your profile (${age}y, ${gender}, ${height}cm, ${weight}kg), your estimated daily calorie need is ${dailyCalories} kcal for "${goal}". BMI: ${bmi} (${bmiCategory}).`,
    bmi,
    bmiCategory,
    dailyCalories,
    calorieTarget: dailyCalories,
    totalCalories,
    waterIntake: getWaterIntake(weight),
    sleepRecommendation: getSleepRecommendation(age),
    dietPlan: {
      breakfast: formatItems(breakfastItems),
      morningSnack: [] as MealItem[],
      lunch: formatItems(lunchItems),
      eveningSnack: formatItems(snackItems),
      dinner: formatItems(dinnerItems),
    },
    exercisePlan: generateExercisePlan(goal),
    lifestyleTips: generateLifestyleTips(goal),
    weeklyGoals: generateWeeklyGoals(goal),
  };

  // 7. Save to external Supabase
  const profileData = {
    age: String(age),
    gender,
    height: String(height),
    weight: String(weight),
    goal,
    dietaryPreference: "N/A",
    activityLevel,
  };

  const { data: savedPlan, error: saveError } = await supabase
    .from("diet_plans")
    .insert({
      user_id: userId,
      plan_data: plan as any,
      profile_data: profileData as any,
      calorie_target: dailyCalories,
      meal_logs: {},
    } as any)
    .select("id")
    .single();

  if (saveError) {
    console.error("Save error:", saveError);
  }

  return { ...plan, planId: (savedPlan as any)?.id || null };
}

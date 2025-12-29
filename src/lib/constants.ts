export const PROVINCES = [
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Islamabad Capital Territory",
  "Azad Jammu & Kashmir",
  "Gilgit-Baltistan",
];

export const CITIES: Record<string, string[]> = {
  Punjab: ["Lahore", "Faisalabad", "Rawalpindi", "Multan", "Gujranwala", "Sialkot", "Bahawalpur", "Sargodha"],
  Sindh: ["Karachi", "Hyderabad", "Sukkur", "Larkana", "Nawabshah", "Mirpur Khas"],
  "Khyber Pakhtunkhwa": ["Peshawar", "Mardan", "Abbottabad", "Swat", "Kohat", "Bannu"],
  Balochistan: ["Quetta", "Gwadar", "Turbat", "Khuzdar", "Hub"],
  "Islamabad Capital Territory": ["Islamabad"],
  "Azad Jammu & Kashmir": ["Muzaffarabad", "Mirpur", "Rawalakot"],
  "Gilgit-Baltistan": ["Gilgit", "Skardu", "Hunza"],
};

export const SPECIALTIES = [
  { name: "General Physician", icon: "Stethoscope", color: "medical-teal" },
  { name: "Cardiologist", icon: "Heart", color: "medical-coral" },
  { name: "Dermatologist", icon: "Sparkles", color: "medical-purple" },
  { name: "Orthopedic", icon: "Bone", color: "medical-blue" },
  { name: "Pediatrician", icon: "Baby", color: "medical-green" },
  { name: "Neurologist", icon: "Brain", color: "medical-purple" },
  { name: "Gynecologist", icon: "Heart", color: "medical-coral" },
  { name: "ENT Specialist", icon: "Ear", color: "medical-blue" },
  { name: "Psychiatrist", icon: "Brain", color: "medical-green" },
  { name: "Ophthalmologist", icon: "Eye", color: "medical-teal" },
  { name: "Urologist", icon: "Activity", color: "medical-blue" },
  { name: "Dentist", icon: "Smile", color: "medical-gold" },
];

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const SYMPTOM_TAGS = [
  "Fever",
  "Headache",
  "Cough",
  "Fatigue",
  "Nausea",
  "Chest Pain",
  "Shortness of Breath",
  "Dizziness",
  "Joint Pain",
  "Skin Rash",
  "Abdominal Pain",
  "Back Pain",
  "Sore Throat",
  "Runny Nose",
  "Muscle Aches",
];

export const SEVERITY_LEVELS = [
  { value: "mild", label: "Mild", description: "Noticeable but not interfering with daily activities" },
  { value: "moderate", label: "Moderate", description: "Affecting some daily activities" },
  { value: "severe", label: "Severe", description: "Significantly impacting quality of life" },
  { value: "critical", label: "Critical", description: "Requires immediate medical attention" },
];

export const DURATION_OPTIONS = [
  "Less than 24 hours",
  "1-3 days",
  "4-7 days",
  "1-2 weeks",
  "More than 2 weeks",
  "Recurring/Chronic",
];

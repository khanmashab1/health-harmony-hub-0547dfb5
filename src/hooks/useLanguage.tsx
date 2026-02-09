import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "ur";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header
    "nav.ourDoctors": "Our Doctors",
    "nav.bookAppointment": "Book Appointment",
    "nav.symptomsChecker": "Symptoms Checker",
    "nav.dashboard": "Dashboard",
    "nav.signIn": "Sign In",
    "nav.signOut": "Sign Out",
    "nav.getStarted": "Get Started",
    
    // Common
    "common.token": "Token",
    "common.tokenNumber": "Your Token Number",
    "common.doctor": "Doctor",
    "common.patient": "Patient",
    "common.date": "Date",
    "common.time": "Time",
    "common.location": "Location",
    "common.department": "Department",
    "common.fee": "Consultation Fee",
    "common.status": "Status",
    "common.paymentStatus": "Payment Status",
    "common.estimatedTime": "Estimated Time",
    "common.estimatedNote": "Approx. based on token position",
    "common.delayNote": "Doctor is running late by",
    "common.minutes": "minutes",
    "common.print": "Print",
    "common.back": "Back",
    "common.backToDashboard": "Back to Dashboard",
    "common.search": "Search",
    "common.filter": "Filter",
    "common.today": "Today",
    "common.tomorrow": "Tomorrow",
    "common.thisWeek": "This Week",
    "common.all": "All",
    "common.pending": "Pending",
    "common.upcoming": "Upcoming",
    "common.completed": "Completed",
    "common.cancelled": "Cancelled",
    "common.approve": "Approve",
    "common.reject": "Reject",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.loading": "Loading...",
    
    // Booking
    "booking.selectLocation": "Select Location",
    "booking.selectSpecialty": "Select Specialty",
    "booking.selectDoctor": "Select Doctor",
    "booking.selectPatient": "Select Patient",
    "booking.selectDate": "Select Date",
    "booking.selectPayment": "Payment Method",
    "booking.confirmBooking": "Confirm Booking",
    "booking.cash": "Cash",
    "booking.online": "Online",
    "booking.province": "Province",
    "booking.city": "City",
    
    // Token Print
    "token.appointmentToken": "Appointment Token",
    "token.printToken": "Print Token",
    "token.patientId": "Patient ID",
    "token.tokenId": "Token ID",
    "token.quickSearchNote": "Use Patient ID or Token ID for quick search",
    "token.paymentDetails": "Payment Details",
    "token.mobileWallets": "Mobile Wallets",
    "token.bankTransfer": "Bank Transfer",
    "token.sendPaymentNote": "Send payment and upload receipt below",
    "token.uploadReceipt": "Upload Receipt",
    
    // Doctor Late
    "doctor.isLate": "Doctor Running Late",
    "doctor.delayMinutes": "Delay (minutes)",
    "doctor.setDelay": "Set Delay",
    "doctor.clearDelay": "Clear Delay",
    "doctor.lateToggle": "Mark as Running Late",
    
    // PA Dashboard
    "pa.pendingApprovals": "Pending Approvals",
    "pa.walkInPatient": "Walk-in Patient",
    "pa.vitals": "Vitals",
    "pa.queue": "Queue",
    
    // Footer
    "footer.quickLinks": "Quick Links",
    "footer.services": "Services",
    "footer.contact": "Contact",
    "footer.followUs": "Follow Us",
  },
  ur: {
    // Header
    "nav.ourDoctors": "ہمارے ڈاکٹرز",
    "nav.bookAppointment": "اپائنٹمنٹ بک کریں",
    "nav.symptomsChecker": "علامات چیکر",
    "nav.dashboard": "ڈیش بورڈ",
    "nav.signIn": "سائن ان",
    "nav.signOut": "سائن آؤٹ",
    "nav.getStarted": "شروع کریں",
    
    // Common
    "common.token": "ٹوکن",
    "common.tokenNumber": "آپ کا ٹوکن نمبر",
    "common.doctor": "ڈاکٹر",
    "common.patient": "مریض",
    "common.date": "تاریخ",
    "common.time": "وقت",
    "common.location": "مقام",
    "common.department": "شعبہ",
    "common.fee": "مشاورت فیس",
    "common.status": "حیثیت",
    "common.paymentStatus": "ادائیگی کی حیثیت",
    "common.estimatedTime": "تخمینی وقت",
    "common.estimatedNote": "ٹوکن پوزیشن کی بنیاد پر تخمینہ",
    "common.delayNote": "ڈاکٹر کو دیر ہو رہی ہے",
    "common.minutes": "منٹ",
    "common.print": "پرنٹ",
    "common.back": "واپس",
    "common.backToDashboard": "ڈیش بورڈ پر واپس",
    "common.search": "تلاش",
    "common.filter": "فلٹر",
    "common.today": "آج",
    "common.tomorrow": "کل",
    "common.thisWeek": "اس ہفتے",
    "common.all": "تمام",
    "common.pending": "زیر التواء",
    "common.upcoming": "آنے والا",
    "common.completed": "مکمل",
    "common.cancelled": "منسوخ",
    "common.approve": "منظور",
    "common.reject": "مسترد",
    "common.save": "محفوظ",
    "common.cancel": "منسوخ",
    "common.confirm": "تصدیق",
    "common.loading": "لوڈ ہو رہا ہے...",
    
    // Booking
    "booking.selectLocation": "مقام منتخب کریں",
    "booking.selectSpecialty": "خصوصیت منتخب کریں",
    "booking.selectDoctor": "ڈاکٹر منتخب کریں",
    "booking.selectPatient": "مریض منتخب کریں",
    "booking.selectDate": "تاریخ منتخب کریں",
    "booking.selectPayment": "ادائیگی کا طریقہ",
    "booking.confirmBooking": "بکنگ کی تصدیق کریں",
    "booking.cash": "نقد",
    "booking.online": "آن لائن",
    "booking.province": "صوبہ",
    "booking.city": "شہر",
    
    // Token Print
    "token.appointmentToken": "اپائنٹمنٹ ٹوکن",
    "token.printToken": "ٹوکن پرنٹ کریں",
    "token.patientId": "مریض آئی ڈی",
    "token.tokenId": "ٹوکن آئی ڈی",
    "token.quickSearchNote": "فوری تلاش کے لیے مریض آئی ڈی یا ٹوکن آئی ڈی استعمال کریں",
    "token.paymentDetails": "ادائیگی کی تفصیلات",
    "token.mobileWallets": "موبائل والیٹس",
    "token.bankTransfer": "بینک ٹرانسفر",
    "token.sendPaymentNote": "ادائیگی بھیجیں اور نیچے رسید اپ لوڈ کریں",
    "token.uploadReceipt": "رسید اپ لوڈ کریں",
    
    // Doctor Late
    "doctor.isLate": "ڈاکٹر کو دیر ہو رہی ہے",
    "doctor.delayMinutes": "تاخیر (منٹ)",
    "doctor.setDelay": "تاخیر سیٹ کریں",
    "doctor.clearDelay": "تاخیر صاف کریں",
    "doctor.lateToggle": "دیری سے چلنے کے طور پر نشان زد کریں",
    
    // PA Dashboard
    "pa.pendingApprovals": "زیر التواء منظوریاں",
    "pa.walkInPatient": "واک ان مریض",
    "pa.vitals": "وائٹلز",
    "pa.queue": "قطار",
    
    // Footer
    "footer.quickLinks": "فوری لنکس",
    "footer.services": "خدمات",
    "footer.contact": "رابطہ",
    "footer.followUs": "ہمیں فالو کریں",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("app-language");
    return (saved as Language) || "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app-language", lang);
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.dir = language === "ur" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const isRTL = language === "ur";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

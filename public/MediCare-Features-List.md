# MediCare Plus — Complete FYP Feature List

> **Project:** MediCare Plus – Smart Clinic & Hospital Management System  
> **Students:** Mashab Jadoon, Sardar Zohaib Ahmed, Hashir Iqbal  
> **Supervisor:** Dr. Kamran Javed  
> **Technology Stack:** React, TypeScript, Tailwind CSS, Supabase, Stripe, Vercel

---

## Table of Contents

1. [Authentication & User Management](#1-authentication--user-management)
2. [Patient Dashboard & Features](#2-patient-dashboard--features)
3. [Doctor Dashboard & Features](#3-doctor-dashboard--features)
4. [PA (Personal Assistant) Dashboard](#4-pa-personal-assistant-dashboard)
5. [Admin Dashboard & Features](#5-admin-dashboard--features)
6. [Appointment & Booking System](#6-appointment--booking-system)
7. [Prescription & Medical Records](#7-prescription--medical-records)
8. [AI-Powered Health Tools](#8-ai-powered-health-tools)
9. [Payment & Subscription System](#9-payment--subscription-system)
10. [Email & Notification System](#10-email--notification-system)
11. [Organization / Multi-Clinic Support](#11-organization--multi-clinic-support)
12. [SEO & Public Pages](#12-seo--public-pages)
13. [UI/UX & Accessibility](#13-uiux--accessibility)
14. [DevOps & Infrastructure](#14-devops--infrastructure)

---

## 1. Authentication & User Management

| # | Feature | Description |
|---|---------|-------------|
| 1.1 | Email & Password Sign Up/Login | Secure authentication with email verification before access is granted. |
| 1.2 | Role-Based Access Control (RBAC) | Four distinct roles: Patient, Doctor, PA, Admin — each with dedicated dashboards and permissions. |
| 1.3 | Row-Level Security (RLS) | Database-level security policies ensuring users can only access their own data. |
| 1.4 | Password Change | Authenticated users can change their password from their dashboard. |
| 1.5 | Profile Management | Users can update their name, phone, city, province, date of birth, gender, blood type, and avatar. |
| 1.6 | Patient ID Generation | Unique patient IDs auto-generated (e.g., PAT-XXXXX) for easy identification. |
| 1.7 | First Login Welcome | New users receive a welcome dialog on their first login. |
| 1.8 | User Status Management | Admin can activate/deactivate user accounts. |

---

## 2. Patient Dashboard & Features

| # | Feature | Description |
|---|---------|-------------|
| 2.1 | Upcoming Appointments | View all upcoming and past appointments with doctor details, token number, and status. |
| 2.2 | Live Queue Position | Real-time display of the patient's current position in the doctor's queue. |
| 2.3 | Estimated Wait Time | Calculates approximate waiting time based on queue position, consultation duration, and doctor delay. |
| 2.4 | Prescription History | Browse all past prescriptions with diagnosis, medicines, lab tests, and doctor comments. |
| 2.5 | Medical History Timeline | Visual timeline of all medical records sorted chronologically. |
| 2.6 | Health Metrics Tracking | Log and track blood pressure, weight, and sugar levels over time with charts. |
| 2.7 | Profile Editing | Update personal details including avatar, blood type, and contact information. |
| 2.8 | Write Reviews | Submit star ratings and written reviews for doctors after completed appointments. |
| 2.9 | Patient Switcher | Manage appointments for family members (managed patients) from a single account. |
| 2.10 | AI Credits Section | View remaining AI credits, purchase history, and buy additional credit packs. |
| 2.11 | Prescription Print/Download | Generate professional PDF prescriptions with QR code verification. |
| 2.12 | Token Print | Print appointment tokens with doctor details, date, and token number. |

---

## 3. Doctor Dashboard & Features

| # | Feature | Description |
|---|---------|-------------|
| 3.1 | Today's Queue Management | View and manage today's patient queue with real-time status updates (Waiting → In Progress → Completed). |
| 3.2 | Patient Consultation | Full consultation workflow: view vitals, write diagnosis, prescribe medicines, order lab tests, add comments. |
| 3.3 | Medicine Autocomplete | Search and select from a database of medicines with dosage, frequency, and duration fields. |
| 3.4 | Prescription Generation | Auto-generate professional prescriptions with QR-code verification links. |
| 3.5 | Follow-Up Scheduling | Set follow-up dates for patients; system automatically sends reminder emails. |
| 3.6 | Patient History View | Access complete medical history of any patient from the consultation screen. |
| 3.7 | Schedule Management | Set weekly availability (day-by-day start/end times) for appointment slots. |
| 3.8 | Break Time Management | Configure break periods (e.g., Lunch, Prayer) that are excluded from available slots. |
| 3.9 | Block Specific Slots | Block individual dates or time slots for holidays or unavailability. |
| 3.10 | Delay Toggle | Add delay minutes to shift all appointment times when running late. |
| 3.11 | Pause/Resume Patients | Pause a patient in the queue and resume them later without losing their position. |
| 3.12 | Payment Settings | Configure bank account, JazzCash, and Easypaisa details for patient payments. |
| 3.13 | Doctor Settings Panel | Update bio, qualifications, consultation fee, consultation duration, and max patients per day. |
| 3.14 | PA Management | Create and manage Personal Assistant accounts; assign PAs to handle queue operations. |
| 3.15 | Subscription Management | View current plan, upgrade/downgrade via Stripe, and access billing portal. |
| 3.16 | Plan Feature Gating | Features are restricted based on the doctor's active subscription plan. |
| 3.17 | Performance Analytics | View appointment statistics, patient counts, and revenue summaries. |
| 3.18 | Doctor Application | New doctors can apply through a multi-step form with document uploads (degree, license). |

---

## 4. PA (Personal Assistant) Dashboard

| # | Feature | Description |
|---|---------|-------------|
| 4.1 | Queue Management | Manage the assigned doctor's patient queue: check-in, mark in-progress, complete. |
| 4.2 | Walk-In Patient Registration | Register walk-in patients directly into the queue without prior booking. |
| 4.3 | Vitals Entry | Enter patient vitals (BP, temperature, heart rate, weight) before consultation. |
| 4.4 | Appointment Overview | View today's appointments for the assigned doctor with status indicators. |
| 4.5 | Multi-Doctor Assignment | A PA can be assigned to multiple doctors and switch between their queues. |

---

## 5. Admin Dashboard & Features

| # | Feature | Description |
|---|---------|-------------|
| 5.1 | Doctor Management | View, create, edit, and manage all doctor accounts with full profile details. |
| 5.2 | Doctor Application Review | Review, approve, or reject new doctor applications with admin notes. |
| 5.3 | PA Management | Create PA accounts, assign them to doctors, and manage assignments. |
| 5.4 | Subscription Analytics | Charts showing plan distribution, revenue trends, MRR, and subscriber counts. |
| 5.5 | Subscription Management | View all doctor subscriptions with status, plan details, and Stripe links. |
| 5.6 | Payment Plans Management | Create, edit, and manage doctor subscription plans with Stripe integration. |
| 5.7 | AI Credit Plans Management | Create and manage patient AI credit purchase plans. |
| 5.8 | Medicines Database | Add, edit, and manage the global medicines database used in prescriptions. |
| 5.9 | Email Logs | View all sent emails with status, type, recipient, and timestamp. |
| 5.10 | Email Templates | Customize email templates for appointments, prescriptions, and notifications. |
| 5.11 | Hero Slides Management | Manage homepage hero slider images, titles, subtitles, and CTA links. |
| 5.12 | Video Management | Configure the homepage introduction video URL and settings. |
| 5.13 | Reviews Management | Moderate patient reviews — approve, reject, or delete. |
| 5.14 | Symptom Checker Management | Manage the symptom knowledge base used by the AI symptom checker. |
| 5.15 | Branding Settings | Customize platform branding including logo and stamp images. |
| 5.16 | Footer Settings | Configure footer links, social media URLs, and contact information. |
| 5.17 | Backup Panel | Database export and backup management tools. |
| 5.18 | Analytics Dashboard | Platform-wide statistics: total patients, doctors, appointments, and revenue. |
| 5.19 | Doctor Performance Panel | Compare doctor performance metrics across the platform. |

---

## 6. Appointment & Booking System

| # | Feature | Description |
|---|---------|-------------|
| 6.1 | Doctor Search & Filter | Search doctors by name, specialty, city, province, or fee range. |
| 6.2 | Doctor Profile View | Detailed doctor profiles showing qualifications, schedule, reviews, and availability. |
| 6.3 | Real-Time Slot Availability | Check available slots for a specific date based on doctor schedule, breaks, and existing bookings. |
| 6.4 | Online Booking | Book appointments with selected doctor, date, and payment method. |
| 6.5 | Token Number System | Automatic sequential token allocation per doctor per day. |
| 6.6 | Payment Method Selection | Choose between Cash, Bank Transfer, JazzCash, or Easypaisa at booking time. |
| 6.7 | Receipt Upload | Upload payment receipt/screenshot for non-cash payments. |
| 6.8 | Appointment Confirmation Email | Automatic email notification to patient upon successful booking. |
| 6.9 | Doctor Schedule Display | Visual weekly schedule showing available days and times for each doctor. |
| 6.10 | Walk-In Appointments | PAs can register walk-in patients directly into the queue. |

---

## 7. Prescription & Medical Records

| # | Feature | Description |
|---|---------|-------------|
| 7.1 | Digital Prescription | Doctors create prescriptions with diagnosis, medicines, lab tests, and comments. |
| 7.2 | PDF Generation | Professional PDF prescriptions with clinic branding, doctor details, and QR code. |
| 7.3 | QR Code Verification | Each prescription has a unique QR code linking to a public verification page. |
| 7.4 | Prescription Verification Page | Public page to verify prescription authenticity by scanning QR code or entering appointment ID. |
| 7.5 | Lab Tests Print | Separate printable lab test orders with patient and doctor details. |
| 7.6 | Medical History Print | Print complete medical history for a patient. |
| 7.7 | Prescription Email | Automatic email with prescription details sent to patient after consultation. |
| 7.8 | Medicine Database Integration | Medicines searchable from a centralized database with generic names, forms, and strengths. |

---

## 8. AI-Powered Health Tools

| # | Feature | Description |
|---|---------|-------------|
| 8.1 | AI Symptom Checker | Patients describe symptoms; AI analyzes and suggests possible conditions with confidence levels. |
| 8.2 | AI Health Risk Evaluator | Assess health risks based on lifestyle factors, medical history, and demographics. |
| 8.3 | AI Diet Planner | Generate personalized diet plans based on health goals, restrictions, and preferences. |
| 8.4 | AI Health Chat | Interactive AI-powered health Q&A with context-aware responses. |
| 8.5 | AI Usage Tracking | Track AI feature usage per user with daily limits for free users. |
| 8.6 | AI Credits System | Paid credit packs for unlimited AI access; credits consumed per AI interaction. |
| 8.7 | Credit Purchase via Stripe | Secure credit pack purchases through Stripe checkout. |
| 8.8 | Usage Limit Banner | Visual banner showing remaining free AI uses or credits for the day. |
| 8.9 | Diet Plan PDF Export | Download AI-generated diet plans as formatted PDF documents. |
| 8.10 | Symptom Knowledge Base | Admin-managed database of symptoms, conditions, and recommendations used by AI. |

---

## 9. Payment & Subscription System

| # | Feature | Description |
|---|---------|-------------|
| 9.1 | Stripe Integration | Full Stripe integration for subscription payments and one-time purchases. |
| 9.2 | Doctor Subscription Plans | Multiple tiered plans (e.g., Basic, Professional, Enterprise) with feature gating. |
| 9.3 | Stripe Checkout | Secure hosted checkout for plan purchases and upgrades. |
| 9.4 | Stripe Customer Portal | Self-service portal for doctors to manage billing, invoices, and cancel subscriptions. |
| 9.5 | Stripe Webhooks | Automated handling of payment events: subscription created, updated, canceled, payment failed. |
| 9.6 | Subscription Status Tracking | Real-time subscription status (active, past_due, canceled) synced via webhooks. |
| 9.7 | AI Credit Checkout | Stripe checkout for patient AI credit pack purchases. |
| 9.8 | Purchase Verification | Webhook-based verification of AI credit purchases with automatic credit allocation. |
| 9.9 | Plan Feature Restrictions | Feature access controlled by doctor's active subscription plan tier. |
| 9.10 | Revenue Analytics | Admin dashboard showing MRR, plan distribution, and revenue projections. |

---

## 10. Email & Notification System

| # | Feature | Description |
|---|---------|-------------|
| 10.1 | Welcome Email | Automated welcome email sent to new users upon registration. |
| 10.2 | Appointment Confirmation | Email notification with appointment details sent upon booking. |
| 10.3 | Prescription Email | Detailed prescription emailed to patient after consultation is completed. |
| 10.4 | Follow-Up Reminders | Automated reminder emails sent 3 days before follow-up dates via cron job. |
| 10.5 | Appointment Reminders | Scheduled reminder emails for upcoming appointments. |
| 10.6 | Subscription Emails | Notifications for plan activation, renewal, and cancellation. |
| 10.7 | Doctor Credential Emails | Send login credentials to newly created doctor accounts. |
| 10.8 | Password Reset Emails | Secure password reset flow with email verification. |
| 10.9 | Platform Summary Report | Automated bi-weekly report (via pg_cron) with subscriber stats, AI credit analytics, revenue, and appointment data sent to admin. |
| 10.10 | Email Logging | All sent emails logged in database with status, type, and error tracking. |
| 10.11 | Customizable Templates | Admin can customize email templates with branding, colors, and content. |
| 10.12 | Resend Integration | Professional email delivery via Resend API with HTML templates. |

---

## 11. Organization / Multi-Clinic Support

| # | Feature | Description |
|---|---------|-------------|
| 11.1 | Organization Creation | Create organizations representing clinics or hospitals with branding. |
| 11.2 | Organization Dashboard | Dedicated dashboard for organization owners to manage their doctors. |
| 11.3 | Doctor Management | Add doctors to the organization with automatic account creation. |
| 11.4 | Role-Based Access | Organization members have roles (owner, admin, member) with appropriate permissions. |
| 11.5 | Organization Branding | Custom logo and details for organization-level branding. |
| 11.6 | Multi-Doctor View | Organization owners can view dashboards of all their doctors. |

---

## 12. SEO & Public Pages

| # | Feature | Description |
|---|---------|-------------|
| 12.1 | SEO Meta Tags | Dynamic title tags, meta descriptions, and Open Graph tags on all pages. |
| 12.2 | Semantic HTML | Proper use of header, main, section, and article tags for accessibility and SEO. |
| 12.3 | JSON-LD Structured Data | Schema.org markup for medical services, FAQs, and organization data. |
| 12.4 | XML Sitemap | Auto-generated sitemap.xml for search engine crawling. |
| 12.5 | Robots.txt | Configured robots.txt for search engine directives. |
| 12.6 | Google Search Console | Verification file for Google Search Console integration. |
| 12.7 | SEO Landing Pages | Dedicated landing pages for key search terms (Clinic Management, Hospital Software, Online Appointments, AI Symptom Checker). |
| 12.8 | Public Doctor Profiles | SEO-friendly public doctor profile pages with reviews and booking CTAs. |
| 12.9 | Public Reviews Page | Showcase approved patient reviews publicly. |
| 12.10 | Our Doctors Page | Public directory of all active doctors with search and filtering. |

---

## 13. UI/UX & Accessibility

| # | Feature | Description |
|---|---------|-------------|
| 13.1 | Responsive Design | Fully responsive across desktop, tablet, and mobile devices. |
| 13.2 | Dark/Light Mode | Theme toggle with system preference detection and persistent selection. |
| 13.3 | Multi-Language Support | English and Urdu language toggle with full translation support. |
| 13.4 | Loading States | Skeleton loaders and spinners for all async operations. |
| 13.5 | Toast Notifications | Real-time success/error feedback using toast notifications. |
| 13.6 | Animated Transitions | Smooth page transitions and micro-animations using Framer Motion. |
| 13.7 | Hero Slider | Dynamic homepage slider with admin-configurable slides. |
| 13.8 | Top Doctors Carousel | Auto-scrolling showcase of top-rated doctors on the homepage. |
| 13.9 | Introduction Video | Embedded video section on the homepage for platform overview. |
| 13.10 | Back Button Navigation | Consistent back navigation across all dashboard pages. |
| 13.11 | Form Validation | Client-side validation with Zod schemas and react-hook-form. |
| 13.12 | Accessible Components | Built with Radix UI primitives ensuring keyboard navigation and screen reader support. |

---

## 14. DevOps & Infrastructure

| # | Feature | Description |
|---|---------|-------------|
| 14.1 | Vercel Deployment | Production deployment on Vercel with automatic builds from Git. |
| 14.2 | Supabase Backend | PostgreSQL database, authentication, storage, and edge functions via Supabase. |
| 14.3 | Edge Functions | 18+ serverless functions handling emails, payments, AI, and automation. |
| 14.4 | Database Migrations | Version-controlled database schema changes with migration files. |
| 14.5 | Cron Jobs | Scheduled tasks for follow-up reminders, appointment reminders, and admin reports. |
| 14.6 | File Storage | Secure file storage for avatars, receipts, doctor documents, and organization logos. |
| 14.7 | Audit Logging | Database-level audit logs tracking important actions with user and entity details. |
| 14.8 | Environment Variables | Secure secrets management for API keys and configuration. |
| 14.9 | TypeScript | Full TypeScript implementation with strict typing and auto-generated database types. |
| 14.10 | PWA Manifest | Web app manifest enabling "Add to Home Screen" on mobile devices. |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| **Total Features** | 80+ |
| **User Roles** | 4 (Patient, Doctor, PA, Admin) |
| **Edge Functions** | 18+ |
| **Database Tables** | 25+ |
| **AI Features** | 10 |
| **Email Types** | 12 |
| **SEO Pages** | 10 |
| **Cron Jobs** | 3 |

---

*Document generated for Final Year Project submission — MediCare Plus © 2025*

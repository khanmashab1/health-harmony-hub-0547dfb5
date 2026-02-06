# MediCare+: A Smart Healthcare Appointment Management System with AI-Powered Symptom Analysis

## Final Year Project (FYP) — Complete System Documentation

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [System Architecture](#3-system-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Database Design](#5-database-design)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Module Descriptions](#7-module-descriptions)
   - 7.1 [Patient Module](#71-patient-module)
   - 7.2 [Doctor Module](#72-doctor-module)
   - 7.3 [Physician Assistant (PA) Module](#73-physician-assistant-pa-module)
   - 7.4 [Admin Module](#74-admin-module)
   - 7.5 [Organization / Enterprise Module](#75-organization--enterprise-module)
   - 7.6 [AI Symptom Checker Module](#76-ai-symptom-checker-module)
   - 7.7 [Booking & Queue Management Module](#77-booking--queue-management-module)
   - 7.8 [Notification & Email Module](#78-notification--email-module)
   - 7.9 [Subscription & Payment Module](#79-subscription--payment-module)
   - 7.10 [Review & Rating Module](#710-review--rating-module)
   - 7.11 [Public Prescription Verification Module](#711-public-prescription-verification-module)
8. [Backend Functions (Edge Functions)](#8-backend-functions-edge-functions)
9. [Security Implementation](#9-security-implementation)
10. [User Interface Design](#10-user-interface-design)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Feature Comparison by Plan](#12-feature-comparison-by-plan)
13. [Future Enhancements](#13-future-enhancements)

---

## 1. Project Overview

**MediCare+** is a comprehensive, web-based Smart Healthcare Appointment Management System designed to digitize and streamline the healthcare appointment lifecycle. It provides role-based dashboards for **Patients**, **Doctors**, **Physician Assistants (PAs)**, and **Administrators**, enabling end-to-end clinical workflow management—from appointment booking and queue management to prescription generation and AI-powered symptom analysis.

### Key Highlights

- **Multi-Role Platform**: Four distinct user roles with dedicated dashboards and workflows
- **Token-Based Queue System**: Automated token allocation with break-aware estimated arrival times
- **AI-Powered Symptom Analysis**: RAG-based intelligent symptom checker with medical knowledge base
- **Subscription Tiers**: Stripe-integrated SaaS model with Basic, Professional, and Enterprise plans
- **Enterprise Organization Support**: Multi-doctor clinic management under a single subscription
- **Real-Time Notifications**: Automated email system for appointments, prescriptions, and follow-ups
- **Public Prescription Verification**: QR-code-based verification for pharmacists and patients
- **Responsive Design**: Mobile-first, theme-aware (light/dark) interface with glassmorphism aesthetic

### Thematic Area

Healthcare Technology / Digital Health

---

## 2. Problem Statement

Traditional healthcare appointment systems in many regions suffer from:

1. **Manual Queue Management**: Patients waste hours in physical waiting rooms with no visibility into their position or estimated wait time.
2. **Paper-Based Records**: Prescriptions and medical records are maintained on paper, leading to loss, duplication, and difficulty in longitudinal tracking.
3. **No Digital Booking**: Patients must physically visit clinics or make phone calls to book appointments, with no visibility into doctor availability.
4. **Lack of Symptom Guidance**: Patients lack accessible tools to understand their symptoms before consulting a doctor, leading to unnecessary visits or delayed care.
5. **No Centralized Administration**: Clinic administrators lack tools for analytics, subscription management, and multi-doctor oversight.

**MediCare+** addresses these challenges by providing a unified digital platform that automates appointment scheduling, queue management, prescription handling, and health tracking—all accessible via a modern web interface.

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (Browser)                       │
│                                                                     │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│   │ Patient  │  │ Doctor   │  │   PA     │  │  Admin   │          │
│   │Dashboard │  │Dashboard │  │Dashboard │  │Dashboard │          │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
│        │              │              │              │                │
│   ┌────┴──────────────┴──────────────┴──────────────┴────┐          │
│   │              React + TypeScript + Vite                │          │
│   │         TanStack Query (State Management)            │          │
│   │         Tailwind CSS + shadcn/ui (Design System)     │          │
│   │         Framer Motion (Animations)                   │          │
│   └──────────────────────┬───────────────────────────────┘          │
└──────────────────────────┼──────────────────────────────────────────┘
                           │ HTTPS / WebSocket
┌──────────────────────────┼──────────────────────────────────────────┐
│                     BACKEND LAYER (Lovable Cloud / Supabase)        │
│                           │                                         │
│   ┌───────────────────────┴───────────────────────────────┐         │
│   │                   API Gateway                         │         │
│   │            (PostgREST + GoTrue + Realtime)            │         │
│   └──┬──────────┬──────────┬──────────┬───────────────────┘         │
│      │          │          │          │                              │
│   ┌──┴───┐  ┌──┴───┐  ┌──┴───┐  ┌──┴───────────┐                  │
│   │ Auth │  │  DB  │  │Store │  │Edge Functions│                   │
│   │      │  │      │  │      │  │  (18 total)  │                   │
│   └──────┘  └──────┘  └──────┘  └──────────────┘                   │
│                                                                     │
│   ┌─────────────────────────────────────────────────────┐           │
│   │              PostgreSQL Database                     │           │
│   │     20+ Tables │ RLS Policies │ Functions │ Triggers │           │
│   └─────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────────┐
│                   EXTERNAL SERVICES                                 │
│                           │                                         │
│   ┌──────────┐  ┌────────┴───┐  ┌───────────────┐                  │
│   │  Stripe  │  │Gmail SMTP  │  │  Lovable AI   │                  │
│   │(Payments)│  │  (Emails)  │  │(Symptom RAG)  │                  │
│   └──────────┘  └────────────┘  └───────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow Diagram

```
Patient                    System                         Doctor
  │                          │                              │
  ├─── Search Doctors ──────►│                              │
  │◄── Doctor List ──────────┤                              │
  │                          │                              │
  ├─── Book Appointment ────►│                              │
  │    (Select date/doctor)  │── Allocate Token ───────────►│
  │                          │── Send Email Notification ──►│
  │◄── Token + Est. Time ───┤                              │
  │                          │                              │
  │    [At Clinic]           │                              │
  │                          │◄── Call Next Patient ────────┤
  │◄── Queue Update ────────┤                              │
  │                          │                              │
  │                          │◄── Write Prescription ───────┤
  │                          │    (Diagnosis + Medicines)   │
  │◄── Prescription Email ──┤                              │
  │                          │                              │
  ├─── View Medical History ►│                              │
  │◄── Timeline + Records ──┤                              │
  │                          │                              │
  ├─── AI Symptom Check ────►│                              │
  │◄── Analysis + Advice ───┤                              │
```

### 3.3 Component Architecture

```
src/
├── pages/                          # Route-level page components
│   ├── Index.tsx                   # Landing page (hero, top doctors, video)
│   ├── Auth.tsx                    # Login / Signup
│   ├── Booking.tsx                 # Doctor search & appointment booking
│   ├── PatientDashboard.tsx        # Patient portal
│   ├── DoctorDashboard.tsx         # Doctor portal (queue, prescriptions, settings)
│   ├── PADashboard.tsx             # PA portal (walk-ins, vitals)
│   ├── AdminDashboard.tsx          # Admin portal (management, analytics)
│   ├── OrganizationDashboard.tsx   # Enterprise org management
│   ├── DoctorProfile.tsx           # Public doctor profile + reviews
│   ├── SymptomsChecker.tsx         # AI symptom analysis
│   ├── BecomeDoctor.tsx            # Doctor registration application
│   ├── PrescriptionPrint.tsx       # Printable prescription (A4)
│   ├── TokenPrint.tsx              # Printable token with QR code
│   ├── MedicalHistoryPrint.tsx     # Printable medical history
│   ├── LabTestsPrint.tsx           # Printable lab test orders
│   ├── PrescriptionVerify.tsx      # Public prescription verification
│   └── Reviews.tsx                 # Public reviews listing
│
├── components/
│   ├── admin/                      # Admin dashboard panels (14 components)
│   ├── auth/                       # Auth forms, password dialogs
│   ├── booking/                    # Booking workflow components
│   ├── doctor/                     # Doctor dashboard components (15 components)
│   ├── home/                       # Landing page sections
│   ├── layout/                     # Header, Footer, Layout wrapper
│   ├── organization/               # Enterprise org components
│   ├── pa/                         # PA-specific dialogs
│   ├── patient/                    # Patient dashboard sections (9 components)
│   ├── shared/                     # Cross-role shared components
│   └── ui/                         # shadcn/ui base components (50+ components)
│
├── hooks/                          # Custom React hooks
│   ├── useAuth.tsx                 # Authentication state management
│   ├── usePlanFeatures.tsx         # Subscription plan feature gating
│   ├── useSiteSettings.tsx         # Dynamic site configuration
│   ├── useFooterSettings.tsx       # Footer configuration
│   └── use-mobile.tsx              # Responsive breakpoint detection
│
├── lib/                            # Utility libraries
│   ├── appointmentTimeCalculator.ts # Break-aware time estimation
│   ├── pdfGenerator.ts             # PDF document generation
│   ├── exportUtils.ts              # Data export utilities
│   ├── constants.ts                # App-wide constants
│   └── utils.ts                    # General utilities (cn, etc.)
│
└── integrations/supabase/          # Auto-generated Supabase client
    ├── client.ts                   # Supabase JS client instance
    └── types.ts                    # TypeScript types from DB schema
```

---

## 4. Technology Stack

### 4.1 Frontend

| Technology | Purpose | Version |
|---|---|---|
| **React** | UI component library | 18.3.x |
| **TypeScript** | Type-safe JavaScript | 5.x |
| **Vite** | Build tool & dev server | Latest |
| **Tailwind CSS** | Utility-first CSS framework | 3.x |
| **shadcn/ui** | Accessible component library | Latest |
| **TanStack React Query** | Server state management | 5.x |
| **React Router DOM** | Client-side routing | 6.x |
| **Framer Motion** | Animation library | 12.x |
| **Recharts** | Data visualization charts | 2.x |
| **jsPDF + AutoTable** | Client-side PDF generation | 3.x |
| **QRCode.react** | QR code generation | 4.x |
| **Zod** | Schema validation | 3.x |
| **React Hook Form** | Form state management | 7.x |
| **Lucide React** | Icon library | Latest |
| **next-themes** | Dark/Light theme management | 0.3.x |
| **date-fns** | Date utility library | 3.x |
| **Sonner** | Toast notification library | 1.x |

### 4.2 Backend (Lovable Cloud / Supabase)

| Technology | Purpose |
|---|---|
| **PostgreSQL** | Relational database |
| **PostgREST** | Auto-generated REST API from DB schema |
| **GoTrue** | Authentication & JWT management |
| **Supabase Realtime** | WebSocket-based real-time subscriptions |
| **Supabase Storage** | File storage (avatars, receipts, hero slides) |
| **Deno Edge Functions** | Serverless backend logic (18 functions) |
| **Row Level Security (RLS)** | Database-level access control |

### 4.3 External Services

| Service | Purpose |
|---|---|
| **Stripe** | Payment processing, subscription management, billing portal |
| **Gmail SMTP** | Transactional email delivery via `denomailer` |
| **Lovable AI** | RAG-based AI symptom analysis |
| **Vercel** | Frontend hosting & CDN |

---

## 5. Database Design

### 5.1 Entity Relationship Overview

The system uses **20+ tables** with PostgreSQL, enforced with Row Level Security (RLS) policies on every table.

#### Core Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `profiles` | User profiles (all roles) | id, name, role, phone, city, province, date_of_birth, patient_id, avatar_path, blood_type, gender |
| `user_roles` | RBAC role assignments | user_id, role (enum: patient, doctor, pa, admin) |
| `doctors` | Doctor professional data | user_id, specialty, degree, fee, experience_years, max_patients_per_day, organization_id, selected_plan_id, consultation_duration, rating |
| `appointments` | Appointment records | doctor_user_id, patient_user_id, appointment_date, token_number, status, diagnosis, medicines (JSON), lab_tests, vitals_*, payment_method, payment_status |
| `doctor_schedules` | Weekly availability | doctor_user_id, day_of_week, start_time, end_time, is_available |
| `doctor_breaks` | Break time definitions | doctor_user_id, break_name, start_time, end_time, applies_to_days |
| `blocked_slots` | Blocked dates/times | doctor_user_id, blocked_date, blocked_time, reason |

#### Supporting Tables

| Table | Purpose |
|---|---|
| `doctor_payment_plans` | Subscription plan definitions (name, price, features, Stripe IDs) |
| `doctor_applications` | Doctor registration applications (pending admin approval) |
| `pa_assignments` | PA-to-Doctor linkages |
| `organizations` | Enterprise clinic/hospital entities |
| `organization_members` | Org membership with roles |
| `managed_patients` | Family member patient management |
| `medical_records` | Historical medical records |
| `health_metrics` | Patient health tracking (BP, weight, sugar) |
| `reviews` | Patient reviews with moderation workflow |
| `medicines` | Medicine catalog database |
| `email_templates` | Customizable email templates |
| `email_logs` | Email delivery tracking |
| `hero_slides` | Homepage slider content |
| `site_settings` | Dynamic site configuration |
| `disease_symptoms` | Symptom-disease mapping knowledge base |
| `symptom_knowledge` | Detailed symptom information |
| `symptom_submissions` | AI analysis submission history |
| `audit_logs` | System audit trail |

### 5.2 Key Database Functions

| Function | Purpose |
|---|---|
| `allocate_token(doctor_id, date)` | Atomically allocates next available token number |
| `get_available_slots(doctor_id, date)` | Calculates remaining slots for a date |
| `calculate_age(birth_date)` | Computes age from date of birth (SECURITY DEFINER) |
| `has_role(user_id, role)` | Checks user role without RLS recursion |
| `is_pa_for_doctor(pa_id, doctor_id)` | Validates PA-doctor assignment |
| `is_org_admin(org_id, user_id)` | Checks organization admin status |
| `generate_patient_id()` | Auto-generates sequential patient IDs (PAT-000001) |
| `handle_new_user()` | Trigger: creates profile + role on signup |

### 5.3 Storage Buckets

| Bucket | Public | Purpose |
|---|---|---|
| `avatars` | Yes | User profile pictures |
| `receipts` | No | Payment receipt uploads |
| `hero-slides` | Yes | Homepage slider images |
| `doctor-applications` | No | Application documents (certificates, licenses) |

---

## 6. Authentication & Authorization

### 6.1 Authentication Flow

1. **Registration**: Users sign up with email + password → GoTrue creates auth record → `handle_new_user()` trigger creates profile + role
2. **Login**: Email/password authentication → JWT token issued → Client stores in localStorage
3. **Session Management**: Auto-refresh tokens, persistent sessions across browser tabs
4. **Password Reset**: Edge function generates reset link → Email sent via SMTP → User updates password

### 6.2 Role-Based Access Control (RBAC)

```
┌─────────────────────────────────────────────────────┐
│                   AUTHENTICATION                     │
│              (GoTrue / JWT Tokens)                   │
└──────────────────────┬──────────────────────────────┘
                       │
           ┌───────────┼───────────┐
           │           │           │
    ┌──────┴──┐  ┌─────┴───┐  ┌──┴────────┐
    │ app_role │  │  RLS    │  │  Edge Fn  │
    │  enum   │  │Policies │  │ Auth Check│
    └─────────┘  └─────────┘  └───────────┘
           │           │           │
    ┌──────┴───────────┴───────────┴──────┐
    │         AUTHORIZATION MATRIX         │
    ├──────────┬───────┬──────┬────────────┤
    │ patient  │doctor │  pa  │   admin    │
    ├──────────┼───────┼──────┼────────────┤
    │/profile  │/doctor│/pa   │/admin      │
    │Book appt │Queue  │Walk- │Manage all  │
    │View hist │Rx     │ins   │Analytics   │
    │Health    │Analyt │Vitals│Approve docs│
    │Reviews   │Sched  │      │Templates   │
    │AI Symp.  │PA mgmt│      │Medicines   │
    └──────────┴───────┴──────┴────────────┘
```

### 6.3 Row Level Security (RLS)

Every table has RLS enabled with policies such as:

- **Patients**: Can only read/write their own appointments, medical records, and health metrics
- **Doctors**: Can access appointments assigned to them, manage their own schedules and settings
- **PAs**: Can create/manage appointments only for their assigned doctor(s)
- **Admins**: Full read access to all tables for management purposes
- **Public**: Limited read access to approved reviews, doctor profiles, and prescription verification

---

## 7. Module Descriptions

### 7.1 Patient Module

**Route**: `/profile`

#### Features

| Feature | Description |
|---|---|
| **Appointment Dashboard** | Categorized tabs: Today, Upcoming, Completed, Cancelled |
| **Medical History Timeline** | Chronological view of all past consultations with diagnosis, medicines, and lab tests |
| **Health Metrics Tracking** | Log and visualize BP (systolic/diastolic), weight, and sugar levels with interactive charts |
| **Family Management** | Add and manage family members (children, elderly) as sub-patients with relationship mapping |
| **Follow-up Reminders** | Badge-based categorization: Today, Upcoming, Overdue |
| **Profile Management** | Edit personal info, avatar upload, date of birth, blood type, city/province |
| **Prescription History** | View and print past prescriptions with doctor details |
| **Review System** | Write reviews for doctors (1 per day), edit/delete pending reviews |
| **Appointment Cancellation** | Cancel upcoming bookings with confirmation dialog |
| **Change Password** | Secure password update from dashboard settings |

### 7.2 Doctor Module

**Route**: `/doctor`

#### Features

| Feature | Description |
|---|---|
| **Queue Management** | Real-time patient queue with Call Next, Skip, No Show, Cancel actions |
| **Prescription System** | Structured prescription form: diagnosis, medicines (JSON), lab tests, follow-up date |
| **Analytics Dashboard** | Weekly/monthly appointment trends, revenue stats, patient demographics |
| **Schedule Configuration** | Day-wise availability (start/end times), break management |
| **Patient Search** | Search patients by name/phone to view medical history before consultation |
| **PA Team Management** | Create/manage physician assistant accounts |
| **Payment Settings** | Configure bank account, JazzCash, EasyPaisa details |
| **Subscription Management** | View plan, upgrade via Stripe checkout, manage billing |
| **Max Patients Control** | Editable for Enterprise plan (1-500), fixed by plan for others |
| **Profile Settings** | Edit specialty, degree, bio, consultation duration, fee |
| **Paused Patients** | Temporarily pause patients in queue |

#### Prescription Workflow

```
Doctor Views Queue → Calls Patient → Opens Prescription Sheet
    │
    ├── Enter Diagnosis (required)
    ├── Add Medicines (name, dosage, frequency, duration, notes)
    ├── Add Lab Tests (optional)
    ├── Set Follow-up Date (optional)
    ├── Add Doctor Comments (optional)
    │
    └── Save → Status changes to "Completed"
              → Medical record auto-created
              → Email sent to patient
              → Prescription printable (A4) with QR verification
```

### 7.3 Physician Assistant (PA) Module

**Route**: `/pa`

#### Features

| Feature | Description |
|---|---|
| **Walk-in Registration** | Register on-site patients with auto token allocation, payment confirmation, auto-print |
| **Vitals Entry** | Record BP, temperature, heart rate, weight for patients |
| **Appointment Management** | Pending and Completed Today views |
| **Patient Search** | Search by name, unique ID, or Patient ID (PAT-XXXXXX) |
| **Settings** | Change password functionality |

#### Walk-in Flow

```
PA Opens Walk-in Dialog → Enters Patient Details (name, phone, email, reason)
    │
    ├── System auto-allocates token
    ├── Payment set to "Cash" + auto-confirmed
    ├── Appointment created with status "Waiting"
    │
    └── Token print auto-opens in new tab
```

### 7.4 Admin Module

**Route**: `/admin`

#### Features

| Feature | Description |
|---|---|
| **Doctor Management** | Create doctor accounts, edit profiles, assign PAs |
| **Doctor Applications** | Review and approve/reject doctor registration applications |
| **Subscription Analytics** | Revenue charts (monthly/yearly), plan distribution, paid vs free |
| **Doctor Performance** | Individual doctor metrics and activity tracking |
| **Medicines Database** | CRUD operations on medicine catalog (name, generic, category, form, strength, manufacturer) |
| **Email Management** | View email logs, customize email templates |
| **Content Management** | Hero slides, intro video, branding settings |
| **Site Configuration** | Footer settings, site-wide settings |
| **Review Moderation** | Approve/reject patient reviews |
| **Symptom Checker Admin** | Manage disease-symptom knowledge base entries |
| **Backup Panel** | Database management utilities |

### 7.5 Organization / Enterprise Module

**Route**: `/organization`

#### Features

| Feature | Description |
|---|---|
| **Doctor Creation** | Create new doctor accounts with auto-provisioned credentials |
| **Member Management** | View all organization doctors with roles |
| **Unified Analytics** | Cross-doctor revenue and appointment statistics |
| **Individual Dashboards** | View specific doctor's dashboard and performance |
| **Welcome Emails** | Auto-send login credentials to new doctors |
| **Security Enforcement** | Mandatory password change on first login for created accounts |
| **Doctor Limits** | Configurable max doctors per organization |

### 7.6 AI Symptom Checker Module

**Route**: `/symptoms-checker`

#### Architecture

```
Patient Input                    Backend Processing              Response
┌────────────┐     ┌──────────────────────────────┐    ┌────────────────┐
│ Symptoms   │     │  Edge Function:              │    │ Condition      │
│ Duration   │────►│  analyze-symptoms            │───►│ Confidence %   │
│ Severity   │     │                              │    │ Advice         │
│ Age/Gender │     │  ┌────────────────────┐      │    │ Red Flags      │
│ History    │     │  │ symptom_knowledge  │      │    │ When to Seek   │
│ Tags       │     │  │ disease_symptoms   │      │    │   Help         │
│            │     │  │ (RAG Knowledge)    │      │    │                │
└────────────┘     │  └────────────────────┘      │    └────────────────┘
                   │                              │
                   │  Uses Lovable AI for         │
                   │  natural language analysis   │
                   └──────────────────────────────┘
```

#### Features

- Natural language symptom input with pre-defined tag selection
- Patient context: age, gender, duration, severity, medical history
- AI analysis returns: possible condition, confidence score, advice, red flags
- All submissions saved for patient history tracking
- Admin-managed knowledge base of symptoms and conditions

### 7.7 Booking & Queue Management Module

**Route**: `/booking`

#### Booking Flow

```
Step 1: Search & Filter                Step 2: Select Slot
┌─────────────────────┐               ┌─────────────────────┐
│ Filter by:          │               │ Available dates     │
│ • Specialty         │──────────────►│ Doctor schedule     │
│ • City              │               │ Break-aware times   │
│ • Doctor name       │               │ Remaining slots     │
│ • Province          │               └─────────┬───────────┘
└─────────────────────┘                         │
                                                │
Step 3: Patient Details               Step 4: Confirmation
┌─────────────────────┐               ┌─────────────────────┐
│ Name, Phone, Email  │               │ Token #             │
│ Reason for visit    │◄──────────────│ Estimated time      │
│ Allergies           │               │ Doctor details      │
│ Payment method      │               │ QR code             │
│ Receipt upload      │               │ Print token         │
└─────────────────────┘               │ Email confirmation  │
                                      └─────────────────────┘
```

#### Estimated Time Calculation

The system calculates estimated arrival times using:

```
estimated_time = doctor_start_time + (token_number - 1) × consultation_duration

// Break-aware adjustment:
if (estimated_time falls within a break) {
    estimated_time = break_end_time + remaining_offset
}
```

### 7.8 Notification & Email Module

#### Email Types

| Email Type | Trigger | Recipients |
|---|---|---|
| Welcome Email | Doctor account creation | New doctors |
| Appointment Confirmation | Booking created | Patient + Doctor |
| Appointment Reminder | Scheduled (cron-like) | Patients with upcoming appointments |
| Prescription Ready | Doctor completes appointment | Patient |
| Follow-up Reminder | Scheduled | Patients with due follow-ups |
| Password Reset | User request | Requesting user |
| Subscription Events | Plan change, payment failure | Doctor |
| Doctor Credentials | Org creates doctor | New doctor |
| Review Status | Admin approves/rejects review | Patient |

#### Email Infrastructure

- **SMTP Provider**: Gmail (via `denomailer` library)
- **Template System**: Customizable HTML templates stored in `email_templates` table
- **Tracking**: All emails logged in `email_logs` table with status and error tracking
- **Security**: All edge functions require JWT authentication; internal calls use service role key

### 7.9 Subscription & Payment Module

#### Stripe Integration Flow

```
Doctor selects plan → create-plan-checkout (Edge Fn) → Stripe Checkout Session
    │
    ├── Success → stripe-webhook (Edge Fn) → Update doctor's plan
    │                                      → Send confirmation email
    │
    └── Manage → doctor-customer-portal (Edge Fn) → Stripe Billing Portal
                                                   → Cancel/Upgrade/Downgrade
```

#### Edge Functions

| Function | Purpose |
|---|---|
| `create-plan-checkout` | Creates Stripe checkout session for plan purchase |
| `stripe-webhook` | Handles Stripe events (subscription created/updated/deleted, payment success/failure) |
| `doctor-customer-portal` | Opens Stripe customer billing portal |
| `check-doctor-subscription` | Syncs local subscription status with Stripe |
| `send-subscription-email` | Sends subscription-related notifications |
| `send-subscription-report` | Generates and sends subscription analytics reports |

### 7.10 Review & Rating Module

#### Lifecycle

```
Patient writes review → Status: "Pending"
    │
    ├── Admin approves → Status: "Approved" → Visible on doctor profile
    │                                        → Doctor rating recalculated
    │
    └── Admin rejects → Status: "Rejected" → Email notification to patient
```

#### Constraints

- One review per patient per day per doctor
- Patients can edit/delete their own pending reviews
- Approved reviews are publicly visible on doctor profiles
- Average rating displayed on doctor cards and profiles

### 7.11 Public Prescription Verification Module

**Route**: `/verify/:appointmentId`

#### Features

- **QR Code Scanning**: Each printed prescription has a QR code linking to verification page
- **No Authentication Required**: Pharmacists and patients can verify without logging in
- **Displayed Information**: Doctor name, patient name, date, diagnosis, medicines, vitals
- **Verification Badge**: "Verified" stamp confirms prescription authenticity
- **RLS Policy**: Special public read access only via appointment ID lookup

---

## 8. Backend Functions (Edge Functions)

The system uses **18 Deno-based Edge Functions** deployed on Lovable Cloud:

| # | Function | Auth | Purpose |
|---|---|---|---|
| 1 | `analyze-symptoms` | JWT | AI-powered symptom analysis using RAG |
| 2 | `approve-doctor-application` | JWT + Admin | Process doctor application approvals |
| 3 | `check-doctor-subscription` | JWT | Sync subscription status from Stripe |
| 4 | `create-org-doctor` | JWT + Org Admin | Create doctor accounts within organizations |
| 5 | `create-plan-checkout` | JWT | Generate Stripe checkout sessions |
| 6 | `delete-user` | JWT + Admin | Permanently delete user accounts |
| 7 | `doctor-customer-portal` | JWT | Open Stripe billing portal |
| 8 | `resend-doctor-credentials` | JWT + Admin | Re-send login credentials to doctors |
| 9 | `send-appointment-notification` | JWT | Send appointment confirmation emails |
| 10 | `send-appointment-reminders` | Service Role | Scheduled appointment reminder emails |
| 11 | `send-email` | JWT / Service | Core email sending service (Gmail SMTP) |
| 12 | `send-followup-reminders` | Service Role | Scheduled follow-up reminder emails |
| 13 | `send-password-reset` | Public | Generate and send password reset links |
| 14 | `send-prescription-email` | JWT | Send prescription details to patients |
| 15 | `send-subscription-email` | JWT | Subscription event notifications |
| 16 | `send-subscription-report` | JWT + Admin | Generate subscription analytics reports |
| 17 | `send-welcome-email` | JWT | Welcome email for new user registrations |
| 18 | `stripe-webhook` | Stripe Signature | Handle Stripe webhook events |

---

## 9. Security Implementation

### 9.1 Authentication Security

| Measure | Implementation |
|---|---|
| Password Hashing | Handled by GoTrue (bcrypt) |
| JWT Tokens | Short-lived access tokens with auto-refresh |
| Session Persistence | localStorage with automatic token refresh |
| First-Login Force Change | Metadata flag `requires_password_change` for org-created accounts |
| Rate Limiting | Applied on public endpoints (password reset, symptom analysis) |

### 9.2 Database Security

| Measure | Implementation |
|---|---|
| Row Level Security | Enabled on ALL tables with role-based policies |
| Security Definer Functions | Prevent RLS recursion and search_path hijacking |
| Input Validation | Zod schemas on frontend, SQL function constraints on backend |
| No Raw SQL in Edge Functions | All DB access via Supabase client methods |

### 9.3 API Security

| Measure | Implementation |
|---|---|
| JWT Verification | All edge functions validate Bearer tokens |
| CORS Headers | Configured on all edge functions |
| Service Role Isolation | Internal function-to-function calls use service role key |
| Stripe Webhook Verification | Signature validation on incoming webhooks |

### 9.4 Frontend Security

| Measure | Implementation |
|---|---|
| Role-Based Routing | Client-side route guards with server-side RLS enforcement |
| No Sensitive Data in Client | API keys and secrets stored in edge function environment |
| XSS Prevention | React's built-in escaping + no dangerouslySetInnerHTML |

---

## 10. User Interface Design

### 10.1 Design System

- **Aesthetic**: Theme-aware glassmorphism with light/dark mode
- **Component Library**: shadcn/ui (50+ accessible components)
- **Color System**: HSL-based semantic tokens (--primary, --secondary, --muted, --accent, --destructive)
- **Typography**: System font stack with consistent sizing scale
- **Animations**: Framer Motion for page transitions, hover effects, and micro-interactions
- **Responsive**: Mobile-first design with `use-mobile` hook for breakpoint detection

### 10.2 Key UI Patterns

| Pattern | Usage |
|---|---|
| **Tabs** | Dashboard section navigation (Appointments, History, Profile) |
| **Dialogs** | Prescription entry, walk-in registration, vitals input |
| **Cards** | Doctor listings, appointment summaries, analytics widgets |
| **Data Tables** | Admin panels, email logs, medicine catalog |
| **Charts** | Recharts for analytics (line, bar, pie charts) |
| **Badges** | Status indicators (Waiting, In Progress, Completed, Cancelled) |
| **Toast Notifications** | Success/error feedback via Sonner |
| **Skeleton Loaders** | Loading states for async data |

### 10.3 Print Optimization

- **Token Print**: Compact receipt format with QR code and estimated time
- **Prescription Print**: A4-optimized clinical document with watermark and verification QR
- **Medical History**: Multi-page document with all historical records
- **Lab Tests**: Formatted lab order with doctor and patient details
- **CSS**: Dedicated print media queries for clean output

---

## 11. Deployment Architecture

```
┌──────────────────────────────────────────────────────┐
│                    VERCEL (CDN)                       │
│                                                      │
│   ┌─────────────────────────────────────────┐        │
│   │  Static Assets (React SPA)              │        │
│   │  • HTML, CSS, JS bundles                │        │
│   │  • Images, fonts                        │        │
│   │  • vercel.json SPA routing config       │        │
│   └─────────────────────────────────────────┘        │
│                                                      │
│   Production URL: medicare-nine-wine.vercel.app      │
└──────────────────────────┬───────────────────────────┘
                           │ API Calls
┌──────────────────────────┼───────────────────────────┐
│              LOVABLE CLOUD (Supabase)                │
│                          │                            │
│   ┌──────────┐  ┌───────┴──────┐  ┌──────────┐      │
│   │PostgreSQL│  │Edge Functions│  │ Storage  │      │
│   │  (DB)    │  │  (18 Fns)   │  │(4 Buckets)│     │
│   └──────────┘  └──────────────┘  └──────────┘      │
│                                                      │
│   ┌──────────┐  ┌──────────────┐                     │
│   │  GoTrue  │  │  Realtime    │                     │
│   │  (Auth)  │  │ (WebSocket)  │                     │
│   └──────────┘  └──────────────┘                     │
└──────────────────────────────────────────────────────┘
```

### Build Configuration

```json
// vercel.json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

- **Build Tool**: Vite (optimized production builds with tree-shaking)
- **SPA Routing**: All routes rewrite to index.html
- **PDF Library**: jsPDF pinned to ^3.0.0 for peer dependency compatibility

---

## 12. Feature Comparison by Plan

| Feature | Basic (Free) | Professional | Enterprise |
|---|---|---|---|
| **Price** | ₨0/month | ~₨2,000+/month | ~₨7,000+/month |
| **Max Patients/Day** | 10 | 30 | Unlimited (editable 1-500) |
| **Queue Management** | ✅ | ✅ | ✅ |
| **Prescription System** | ✅ | ✅ | ✅ |
| **Schedule Management** | ✅ | ✅ | ✅ |
| **Analytics Dashboard** | ❌ | ✅ | ✅ |
| **Advanced Analytics** | ❌ | ✅ | ✅ |
| **Team Management (PAs)** | ❌ | ✅ | ✅ |
| **Custom Branding** | ❌ | ✅ | ✅ |
| **Priority Support** | ❌ | ✅ | ✅ |
| **API Access** | ❌ | ❌ | ✅ |
| **Phone Support (24/7)** | ❌ | ❌ | ✅ |
| **Multi-Doctor Organization** | ❌ | ❌ | ✅ |
| **Stripe Billing Portal** | ❌ | ✅ | ✅ |

---

## 13. Future Enhancements

1. **Python-Based RAG AI Agent**: Standalone Python service using LangChain for more advanced symptom analysis with vector embeddings (planned for Semester 8)
2. **Telemedicine / Video Consultations**: Real-time video calling integration for remote consultations
3. **Mobile Application**: React Native or PWA for improved mobile experience
4. **SMS Notifications**: WhatsApp/SMS integration for appointment reminders
5. **Multi-Language Support**: Urdu and regional language translations
6. **Lab Integration**: Direct lab test result uploads and integration
7. **Insurance Processing**: Insurance claim management and verification
8. **Advanced Reporting**: Exportable PDF reports for clinics and health departments

---

## Appendix A: Environment Variables

| Variable | Scope | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | Admin-level DB access |
| `GMAIL_USER` | Edge Functions | SMTP sender email |
| `GMAIL_APP_PASSWORD` | Edge Functions | Gmail app-specific password |
| `STRIPE_SECRET_KEY` | Edge Functions | Stripe API secret key |
| `LOVABLE_API_KEY` | Edge Functions | Lovable AI service key |

## Appendix B: API Endpoints (Edge Functions)

All edge functions are accessible at:
```
POST https://<project-id>.supabase.co/functions/v1/<function-name>
```

Authentication: `Authorization: Bearer <JWT_TOKEN>` header required (except webhooks and public endpoints).

---

*Document generated for MediCare+ FYP — February 2026*
*Version 1.0*

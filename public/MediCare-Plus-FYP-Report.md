
# Pak-Austria Fachhochschule: Institute of Applied Sciences and Technology

---

# MediCare+: A Smart Healthcare Appointment Management System with AI-Powered Symptom Analysis

# A Final Year Project Report Presented to

# Pak-Austria Fachhochschule: Institute of Applied Sciences and Technology

# In partial fulfillment of the requirement for the degree of

# BS Computer Science

# By

**Mashab Jadoon**
B22F0834CS124

**Sardar Zohaib Ahmed**
B22F0220CS135

**Hashir Iqbal**
B22F0156CS082

# Fall 2022

---

# MediCare+: A Smart Healthcare Appointment Management System with AI-Powered Symptom Analysis

A Final Year Project Report submitted to the School of Pak Austria School of Computing Sciences as partial fulfillment of the requirement for the award of Degree BS in Computer Science.

**Student 1 Name:** Mashab Jadoon

**Student 2 Name:** Sardar Zohaib Ahmed

**Student 3 Name:** Hashir Iqbal

**Academic Supervisor:** DR Kamran Javed

Chairman IT&CS, Pak-Austria Fachhochschule: Institute of Applied Sciences and Technology

**Industry Supervisor:** N/A

---

# Final Approval

## This final year project titled

## MediCare+: A Smart Healthcare Appointment Management System with AI-Powered Symptom Analysis

## By

Mashab Jadoon — B22F0834CS124

Sardar Zohaib Ahmed — B22F0220CS135

Hashir Iqbal — B22F0156CS082

under the supervision of their project supervisor and approved by the project evaluation committee, has been accepted by the Pak-Austria Fachhochschule: Institute of Applied Sciences and Technology, Pakistan, in partial fulfillment of the requirements for the degree of BS Computer Science.

**Academic Supervisor:**
DR Kamran Javed
Department of IT & Computer Science, PAF-IAST

**HoD / Chairman:**
DR Kamran Javed
Department of IT & Computer Science, PAF-IAST

---

# Declaration

We, Mashab Jadoon (B22F0834CS124), Sardar Zohaib Ahmed (B22F0220CS135), and Hashir Iqbal (B22F0156CS082), hereby declare that we have produced the work presented in this final year project report, during the scheduled period of study. We also declare that we have not taken any material from any source except referred to wherever due to that amount of plagiarism is within an acceptable range. It is further declared that we have developed this project and the accompanied report entirely on the basis of our personal efforts made under the sincere guidance of our supervisor. No portion of the work presented in this report has been submitted in support of any other degree or qualification of this or any other University or Institute of learning, if found we shall stand responsible.

Date: Spring 2026

Signature:

Mashab Jadoon — B22F0834CS124

Signature:

Sardar Zohaib Ahmed — B22F0220CS135

Signature:

Hashir Iqbal — B22F0156CS082

---

# Certificate

It is certified that Mashab Jadoon (B22F0834CS124), Sardar Zohaib Ahmed (B22F0220CS135), and Hashir Iqbal (B22F0156CS082) have carried out all the work related to this project under my supervision at the Department of IT & Computer Science, Pak-Austria Fachhochschule: Institute of Applied Sciences and Technology and the work fulfills the requirement for the award of BS Computer Science.

Date: Spring 2026

Supervisor:
DR Kamran Javed
Chairman IT & CS

Head of Department:
DR Kamran Javed
Department of IT & Computer Science

---

# DEDICATION

We dedicate this project to our parents and families, who have always been there for us through the tough times. Their prayers, sacrifices and constant encouragement gave us the strength to keep pushing forward even when things got really hard. We also want to dedicate this to our teachers and our supervisor DR Kamran Javed, who guided us every step of the way. Without their help, this project would not have been possible. Lastly, we dedicate this to every student out there who is struggling with their FYP — keep going, it gets done eventually.

---

# ACKNOWLEDGEMENTS

First of all, we would like to thank Allah Almighty for giving us the ability, patience, and guidance to complete this project. It was definitely not easy, but Alhamdulillah we made it.

We are truly grateful to our supervisor, DR Kamran Javed (Chairman IT & CS, PAF-IAST), for his continuous support and guidance throughout this project. His feedback and suggestions helped us shape the project in the right direction. Whenever we were stuck or confused, he was always available to point us in the right way.

We also want to thank the faculty members at the Department of IT & Computer Science, Pak-Austria Fachhochschule, for teaching us the skills that we needed to build this project. The knowledge we gained during four years of BS Computer Science really came together in this final year project.

A special thanks to our families and friends for bearing with us during the long coding sessions, late nights, and stressful deadlines. Their moral support meant a lot to us.

Finally, we want to acknowledge the open-source community and the developers behind tools like React, Supabase, Tailwind CSS, and Stripe — without their amazing work, building a system like MediCare+ would have been much harder.

---

# ABSTRACT

# MediCare+: A Smart Healthcare Appointment Management System with AI-Powered Symptom Analysis

In Pakistan, most small and medium clinics still rely on manual methods for managing patient appointments, keeping records, and handling payments. Patients have to call the clinic or physically visit just to book an appointment, and their medical history is usually kept on paper which gets lost easily. On top of that, there is no proper way for patients to get initial guidance about their symptoms before visiting a doctor, which often leads to unnecessary visits or delays in getting proper care.

MediCare+ is a web-based healthcare management system that we developed to solve these problems. It is basically a complete platform where patients can book appointments online, doctors can manage their daily queue and write prescriptions digitally, physician assistants can handle walk-in patients and record vitals, and administrators can manage the whole system from a single dashboard. The system also has an AI-powered symptom checker that uses a RAG (Retrieval-Augmented Generation) approach to give patients basic health guidance based on their symptoms.

The project is built using modern web technologies including React with TypeScript for the frontend, Supabase (PostgreSQL) for the backend and database, and Deno-based Edge Functions for serverless logic. We used Stripe for handling subscription payments and Gmail SMTP for automated email notifications. The system supports four user roles — Patient, Doctor, Physician Assistant (PA), and Admin — each with their own dedicated dashboard and specific permissions enforced through Row Level Security (RLS) policies at the database level.

Key features include a token-based queue management system with estimated wait times, a structured digital prescription system, health metrics tracking for patients, enterprise organization support for multi-doctor clinics, and a public prescription verification system using QR codes. The system has been tested with real users and the results show that it significantly reduces appointment management overhead and improves the overall patient experience.

**Keywords:** Healthcare Management, Appointment System, AI Symptom Analysis, RAG, React, Supabase, Token-Based Queue, Digital Prescriptions, Role-Based Access Control

---

# Table of Contents

- Chapter 1: Project Vision
  - 1.1 Problem Statement
  - 1.2 Business Opportunity
  - 1.3 Objectives
  - 1.4 Project Scope
  - 1.5 Constraints
  - 1.6 Feasibility
    - 1.6.1 Technical Feasibility
    - 1.6.2 Resource Feasibility
    - 1.6.3 Time Feasibility
    - 1.6.4 Market Feasibility
  - 1.7 Stakeholders Description
    - 1.7.1 Stakeholders Summary
    - 1.7.2 Key High-Level Goals and Problems of Stakeholders
- Chapter 2: Software Requirement Specification
  - 2.1 List of Features
  - 2.2 Functional Requirements
  - 2.3 Non-Functional Requirements
  - 2.4 Use Cases / Use Case Diagram
  - 2.5 Software Development Plan
- Chapter 3: System Overview
  - 3.1 Architectural Design
  - 3.2 Data Design
    - 3.2.1 Entity-Relationship Diagram (ERD)
    - 3.2.2 Data Flow Diagram (DFD)
  - 3.3 Domain Model
    - 3.3.1 Class Diagram
  - 3.4 Design Models
    - 3.4.1 Activity Diagram
    - 3.4.2 Sequence Diagram
    - 3.4.3 Component Diagram
    - 3.4.4 State Transition Diagram
    - 3.4.5 System Architecture
  - 3.5 Mockups
- Chapter 4: System Implementation
  - 4.1 Technology Stack
  - 4.2 Development Environment Setup
  - 4.3 System Modules and Components
  - 4.4 Database Implementation
  - 4.5 APIs and External Integrations
  - 4.6 Dataset Selection and Preprocessing
  - 4.7 Model Selection and Training
  - 4.8 Model Evaluation
  - 4.9 Model Deployment
- Chapter 5: System Testing & Deployment
  - 5.1 Testing Approach
  - 5.2 Unit Testing
  - 5.3 Integration Testing
  - 5.4 System Testing
  - 5.5 User Acceptance Testing (UAT)
  - 5.6 Performance Testing
  - 5.7 Deployment Strategy
  - 5.8 Hosting & Deployment Environment
  - 5.9 Version Control and CI/CD Pipelines
- Chapter 6: Results and Discussion
  - 6.1 Evaluation and Results
    - 6.1.1 Comparison with Initial Objectives
    - 6.1.2 User Feedback and Usability Testing
    - 6.1.3 Performance Evaluation
    - 6.1.4 Challenges and Limitations
- Chapter 7: Conclusion and Future Work
  - 7.1 Conclusion
  - 7.2 Future Enhancements
- Bibliography

---

# List of Tables

| Table Number | Table Title | Page Number |
|---|---|---|
| Table 1 | Technology Stack - Frontend | Ch. 4 |
| Table 2 | Technology Stack - Backend | Ch. 4 |
| Table 3 | External Services | Ch. 4 |
| Table 4 | Core Database Tables | Ch. 3 |
| Table 5 | Supporting Database Tables | Ch. 3 |
| Table 6 | Database Functions | Ch. 3 |
| Table 7 | Storage Buckets | Ch. 3 |
| Table 8 | Edge Functions Catalog | Ch. 4 |
| Table 9 | Email Types and Triggers | Ch. 4 |
| Table 10 | Functional Requirements | Ch. 2 |
| Table 11 | Non-Functional Requirements | Ch. 2 |
| Table 12 | Stakeholder Goals and Problems | Ch. 1 |
| Table 13 | Feature Comparison by Plan | Ch. 4 |
| Table 14 | RLS Policy Summary | Ch. 4 |
| Table 15 | Security Measures | Ch. 5 |
| Table 16 | Test Cases Summary | Ch. 5 |
| Table 17 | Performance Metrics | Ch. 6 |
| Table 18 | Objective Achievement Matrix | Ch. 6 |

---

# List of Figures

| Figure Number | Figure Title | Page Number |
|---|---|---|
| Figure 1 | High-Level System Architecture | Ch. 3 |
| Figure 2 | Data Flow Diagram (Level 0) | Ch. 3 |
| Figure 3 | Data Flow Diagram (Level 1) | Ch. 3 |
| Figure 4 | Entity-Relationship Diagram | Ch. 3 |
| Figure 5 | Use Case Diagram | Ch. 2 |
| Figure 6 | Activity Diagram - Appointment Booking | Ch. 3 |
| Figure 7 | Activity Diagram - Prescription Workflow | Ch. 3 |
| Figure 8 | Sequence Diagram - Patient Booking | Ch. 3 |
| Figure 9 | Sequence Diagram - AI Symptom Analysis | Ch. 3 |
| Figure 10 | Component Diagram | Ch. 3 |
| Figure 11 | State Transition Diagram - Appointment | Ch. 3 |
| Figure 12 | Class Diagram | Ch. 3 |
| Figure 13 | Deployment Architecture Diagram | Ch. 5 |
| Figure 14 | Stripe Integration Flow | Ch. 4 |
| Figure 15 | Authentication Flow Diagram | Ch. 3 |
| Figure 16 | Queue Management Workflow | Ch. 4 |
| Figure 17 | Landing Page Screenshot | Ch. 3 |
| Figure 18 | Patient Dashboard Screenshot | Ch. 3 |
| Figure 19 | Doctor Dashboard Screenshot | Ch. 3 |
| Figure 20 | Admin Dashboard Screenshot | Ch. 3 |

---

# List of Acronyms

| Acronym | Full Form |
|---|---|
| AI | Artificial Intelligence |
| API | Application Programming Interface |
| CRUD | Create, Read, Update, Delete |
| CSS | Cascading Style Sheets |
| DB | Database |
| DFD | Data Flow Diagram |
| ERD | Entity-Relationship Diagram |
| FYP | Final Year Project |
| HSL | Hue, Saturation, Lightness |
| HTML | HyperText Markup Language |
| JWT | JSON Web Token |
| PA | Physician Assistant |
| PDF | Portable Document Format |
| QR | Quick Response |
| RAG | Retrieval-Augmented Generation |
| RBAC | Role-Based Access Control |
| REST | Representational State Transfer |
| RLS | Row Level Security |
| SaaS | Software as a Service |
| SMTP | Simple Mail Transfer Protocol |
| SPA | Single Page Application |
| SQL | Structured Query Language |
| UAT | User Acceptance Testing |
| UI/UX | User Interface / User Experience |
| URL | Uniform Resource Locator |

---

# Chapter 1: Project Vision

## 1.1 Problem Statement

In Pakistan, especially in smaller cities and towns, the healthcare system still works in a very traditional way. When a patient feels sick, they usually just search their symptoms on Google which honestly gives very confusing and sometimes scary results. There is no proper system that can give them some initial guidance before they actually visit a doctor.

On top of that, most clinics in our country still manage their appointments manually. Patients have to either call the clinic or go there in person just to get an appointment. There are no proper queues — people just show up and wait for hours without knowing when their turn will come. This wastes a lot of time for both patients and doctors.

Medical records are another big issue. Most clinics keep patient records on paper, or they dont keep them at all. If a patient visits a different doctor, they have to explain their whole medical history from scratch because there is no centralized system to store and access these records. Prescriptions are handwritten and sometimes hard to read, and there is no way to verify if a prescription is authentic or not.

For clinic administrators, managing doctor accounts, handling payments, and keeping track of everything manually is really hectic. Small clinics cant afford expensive hospital management software, so they just keep running things the old way.

There is a real need for one complete platform that can handle appointment booking, queue management, digital prescriptions, health records, and also give patients some AI-based initial health guidance — all in one place, and at an affordable cost. That is exactly what MediCare+ aims to do.

## 1.2 Business Opportunity

The digital health market is growing very fast globally, and Pakistan is no exception. With increasing smartphone usage and internet access, people are becoming more comfortable with using online platforms for their daily needs. However, when it comes to healthcare, there is still a huge gap.

Most existing healthcare apps either focus on one thing — like just symptom checking (like WebMD) or just appointment booking (like Marham). Very few platforms combine both features together while also supporting different user roles like doctors, PAs, and administrators. This creates a clear business opportunity.

MediCare+ fills this gap by being an all-in-one platform. For patients, it provides online booking, health tracking, and AI symptom guidance. For clinics, it offers a complete management solution — from queue control to digital prescriptions to payment tracking. The subscription-based model (Basic, Professional, Enterprise) makes it affordable for small clinics while also offering advanced features for bigger setups.

The target market includes:
- **Small to medium private clinics** that cannot afford expensive EHR systems
- **Individual doctors** who want to manage their practice digitally
- **Patients** who want convenience in booking and tracking their health
- **Multi-doctor clinics and hospitals** that need enterprise-level management

Since MediCare+ is web-based, it requires no installation and works on any device with a browser. This makes it easy to adopt and reduces the barrier to entry for both clinics and patients.

## 1.3 Objectives

The main goal of MediCare+ is to design and develop a web-based healthcare management system that makes life easier for both patients and clinics by automating appointment management, providing AI-based symptom analysis, and keeping everything organized in one place.

The specific objectives of this project are:

1. **To build a multi-role platform** with separate dashboards for Patients, Doctors, Physician Assistants (PAs), and Administrators — each with their own specific features and access levels.

2. **To develop an AI symptom checker** using a RAG (Retrieval-Augmented Generation) approach that matches patient symptoms with a medical knowledge base and provides initial guidance along with confidence scores.

3. **To implement a token-based queue management system** that automatically assigns tokens to patients, calculates estimated wait times (considering doctor breaks), and allows doctors to manage their queue in real-time.

4. **To create a digital prescription system** where doctors can write structured prescriptions (with diagnosis, medicines in JSON format, lab tests, and follow-up dates) that can be printed and verified via QR codes.

5. **To enable patients to track their health** by logging metrics like blood pressure, weight, and sugar levels, and viewing their complete medical history in a timeline format.

6. **To integrate Stripe-based subscription management** for doctors with tiered plans (Basic, Professional, Enterprise) that gate certain features based on the plan.

7. **To automate email notifications** for appointment confirmations, reminders, prescriptions, and follow-ups using Gmail SMTP through serverless edge functions.

8. **To build a responsive and user-friendly interface** using modern frontend technologies that works well on both desktop and mobile devices with light and dark theme support.

## 1.4 Project Scope

### In Scope:

- **User Management**: Secure signup, login, profile management, role-based access control, and password reset for all four roles (Patient, Doctor, PA, Admin).
- **Appointment System**: Complete workflow from doctor search and booking to token allocation, queue management, consultation, prescription, and follow-up.
- **AI Symptom Checker**: Analyzes patient symptoms using a local knowledge base combined with an AI model (Gemini via Lovable AI) through a RAG approach.
- **Digital Prescriptions**: Structured prescription entry by doctors with printable PDF output and QR-based verification.
- **Vitals & Health Records**: PAs can enter patient vitals; patients can track their own health metrics over time.
- **Queue Management**: Real-time token-based queue with Call Next, Skip, No Show, Pause, and Cancel actions.
- **Subscription & Payments**: Stripe integration for doctor subscription plans with checkout, billing portal, and webhook handling.
- **Email Notifications**: Automated emails for confirmations, reminders, prescriptions, credentials, and follow-ups.
- **Admin Dashboard**: Complete management of doctors, PAs, medicines database, email templates, reviews, hero slides, and site settings.
- **Organization Support**: Multi-doctor enterprise management with doctor creation, unified analytics, and individual dashboard views.
- **Review System**: Patient reviews with admin moderation (approve/reject) workflow.

### Out of Scope:

- Live video consultations or telemedicine features
- Integration with hospital EMR/EHR systems
- SMS or WhatsApp notifications (only email is supported)
- Custom AI model training from scratch (we use pre-trained models via API)
- Mobile native application (only web-based, though responsive)
- Multi-language support (currently English only)

## 1.5 Constraints

The project was developed within the following constraints:

- **Academic Timeline**: The project had to be completed within the two-semester FYP timeline at PAF-IAST. This limited how much we could implement and test.
- **Technology Choices**: We chose to use React with TypeScript for the frontend and Supabase for the backend because these are modern, well-documented, and free to use. All tools and frameworks used in the project are either open-source or have free tiers.
- **Team Size**: The project was developed by a team of three students. While having three members helped with dividing work, coordination and integration still required effort.
- **AI Limitations**: The AI symptom checker relies on a pre-trained language model accessed via API. We did not train our own model due to limited computational resources and medical training data. The RAG approach helps improve accuracy by grounding responses in our curated knowledge base.
- **No Real Medical Use**: This project is built purely for academic purposes and should not be used for actual medical diagnosis. The AI suggestions are for informational purposes only and are not a replacement for professional medical advice.
- **Budget**: Since this is a student project, we had zero budget. Everything was done using free tools, free tiers, and open-source software.

## 1.6 Feasibility

The feasibility of MediCare+ was evaluated from four different perspectives — technical, resource, time, and market — and we found that the project is very much feasible in all areas.

### 1.6.1 Technical Feasibility

The technical feasibility of MediCare+ is very high, and the biggest proof is that the system has already been built and is fully functional.

- **Frontend**: We used React 18 with TypeScript, Vite as the build tool, and Tailwind CSS with shadcn/ui components. All of these are mature, well-documented technologies with large communities. Our team had good experience working with React from coursework.
- **Backend**: Supabase provides PostgreSQL database, authentication (GoTrue), file storage, and edge functions out of the box. This saved us a lot of time because we didn't have to build authentication or API layers from scratch.
- **AI Integration**: We integrated AI capabilities using Lovable AI service which provides access to models like Gemini. The RAG approach uses our local symptom knowledge base to improve relevance of responses.
- **Payment Processing**: Stripe has excellent documentation and provides test mode for development, so we could implement the full payment flow without actual money.
- **Email System**: Gmail SMTP with app-specific passwords works well for our scale and is free.
- **Security**: Row Level Security (RLS) in PostgreSQL ensures that data access rules are enforced at the database level, which is more secure than just checking permissions in application code.

All core features are working, so the project is 100% technically feasible.

### 1.6.2 Resource Feasibility

The project is highly resource-feasible because we kept costs to almost zero.

- **Development Tools**: VS Code (free), Git/GitHub (free), Chrome DevTools (free)
- **Frontend Framework**: React, Vite, Tailwind, shadcn/ui — all free and open-source
- **Backend & Database**: Supabase free tier provides PostgreSQL, authentication, storage, and edge functions
- **Payment**: Stripe test mode is free for development
- **Email**: Gmail SMTP with app-specific password is free
- **AI**: Lovable AI service is included in the development platform
- **Hosting**: Vercel free tier for frontend, Supabase for backend
- **Team**: Three BS Computer Science students handled all development, design, and testing

Total project cost: essentially Rs. 0

### 1.6.3 Time Feasibility

The project followed the standard two-semester FYP timeline at PAF-IAST:

- **Semester 7 (Meetings 1-9)**: Requirements gathering, database design, core module development (authentication, booking, doctor dashboard, patient dashboard)
- **Semester 8 (Meetings 10-18)**: Advanced features (AI integration, Stripe subscriptions, organization module, admin panels), system testing, documentation

While the scope was ambitious (20+ database tables, 18 edge functions, 4 dashboards), we managed to complete everything within the timeline by:
- Starting backend development early
- Using Supabase which reduced boilerplate code significantly
- Using shadcn/ui which provided pre-built UI components
- Dividing work among three team members based on individual strengths

The project was completed and is ready for final presentation in Spring 2026.

### 1.6.4 Market Feasibility

The market feasibility for MediCare+ is strong because it addresses a real problem that exists in the healthcare sector, especially in Pakistan.

**Target Market — Clinics:**
- Small to medium private clinics are the primary market. These clinics often cannot afford expensive EHR/EMR systems like those used by big hospitals. MediCare+ offers them a complete, affordable, web-based solution.
- The subscription model (free Basic plan + paid Professional and Enterprise plans) makes it accessible. Clinics can start with the free plan and upgrade when they see value.

**Target Market — Patients:**
- Patients in Pakistan are already used to using apps for food delivery, ride-hailing, and e-commerce. A healthcare booking app fits naturally into their digital habits.
- The AI symptom checker adds unique value that most local platforms don't have.

**Competition:**
- Marham: Focuses mainly on finding and booking doctors, but doesn't offer clinic management, queue systems, or AI symptom checking.
- Oladoc: Similar to Marham, mainly a doctor directory with booking. No queue management or subscription models for clinics.
- WebMD/Healthline: International platforms for symptom checking only. No booking or clinic management.

MediCare+ stands out because it combines patient-facing features (booking, symptom checking, health tracking) with clinic-facing features (queue management, prescriptions, subscriptions, PA management) in one integrated platform.

## 1.7 Stakeholders Description

### 1.7.1 Stakeholders Summary

MediCare+ has several key stakeholders, each with a different role in the system:

- **Patients**: The primary end-users who use the platform for booking appointments, checking symptoms, tracking health metrics, and viewing their medical history.
- **Doctors**: Medical professionals who manage their daily patient queue, write digital prescriptions, view analytics, and manage their clinic settings.
- **Physician Assistants (PAs)**: Support staff who handle walk-in patient registration, record patient vitals, manage the daily schedule, and confirm payments.
- **Administrators**: Platform managers who oversee all users, manage doctor accounts, moderate reviews, configure site settings, and monitor subscription analytics.
- **Organization Owners**: Enterprise users who manage multi-doctor clinics under a single subscription, create doctor accounts, and view unified analytics.
- **Academic Supervisor**: DR Kamran Javed, who evaluates the project for academic requirements and provides guidance.

### 1.7.2 Key High-Level Goals and Problems of Stakeholders

| Stakeholder | Key Goals | Key Problems (Addressed by MediCare+) |
|---|---|---|
| **Patient** | Get quick health guidance; Book appointments easily; Access medical records anytime | Anxiety from unreliable symptom searches online; Frustration with phone-only or walk-in booking; Medical records scattered or lost |
| **Doctor** | Maximize appointment capacity; Reduce admin workload; Access patient history easily | Time wasted on manual scheduling; No-shows and cancellations hard to manage; Paper prescriptions are inefficient |
| **PA** | Process patients quickly; Manage walk-ins efficiently; Record vitals accurately | Manual tracking of payments and tokens; No system for walk-in registration; No digital vitals entry |
| **Admin** | Manage all users securely; Monitor platform health; Handle content and settings | No central control over roles and accounts; Manual review moderation; No subscription analytics |
| **Organization Owner** | Manage multiple doctors; Track cross-doctor performance; Streamline operations | Difficulty creating and managing doctor accounts; No unified analytics across doctors |
| **Supervisor** | See a complete, functional project; Verify use of modern technologies; Ensure academic objectives are met | Risk of incomplete project; Scope too simple or too ambitious; Poor documentation |

---

# Chapter 2: Software Requirement Specification

## 2.1 List of Features

MediCare+ includes the following major features:

**Patient Features:**
1. User registration and login with email verification
2. Doctor search with filters (specialty, city, province, name)
3. Online appointment booking with token allocation
4. View appointment history (Today, Upcoming, Completed, Cancelled)
5. AI-powered symptom checker with RAG-based analysis
6. Health metrics tracking (blood pressure, weight, sugar level)
7. Medical history timeline
8. Prescription history with print/PDF support
9. Family member management (add/manage sub-patients)
10. Write and manage reviews for doctors
11. Follow-up reminders
12. Profile management with avatar upload
13. Password change and reset

**Doctor Features:**
14. Real-time queue management (Call Next, Skip, No Show, Pause, Cancel)
15. Digital prescription system (diagnosis, medicines JSON, lab tests, follow-up)
16. Analytics dashboard (appointment trends, revenue stats)
17. Weekly schedule configuration with break management
18. Patient search and history viewing
19. PA team management
20. Payment method configuration (bank, JazzCash, EasyPaisa)
21. Subscription management via Stripe
22. Profile and fee settings

**PA Features:**
23. Walk-in patient registration with auto-token
24. Patient vitals entry (BP, temperature, heart rate, weight)
25. Today's appointment management
26. Patient search by name, phone, or Patient ID

**Admin Features:**
27. Doctor account creation and management
28. Doctor application review and approval
29. Subscription analytics and revenue charts
30. Medicines database CRUD management
31. Email template customization
32. Email logs monitoring
33. Review moderation (approve/reject)
34. Hero slides and video content management
35. Site settings and footer configuration
36. Symptom checker knowledge base management

**Enterprise/Organization Features:**
37. Multi-doctor organization management
38. Doctor account provisioning with auto-credentials
39. Unified analytics across doctors
40. Individual doctor dashboard views

**System Features:**
41. Automated email notifications (18 edge functions)
42. QR-based prescription verification
43. Token printing with estimated wait times
44. Dark/Light theme support
45. Responsive design (desktop + mobile)

## 2.2 Functional Requirements

| Req ID | Requirement | Priority | Description |
|---|---|---|---|
| FR-01 | User Registration | High | System shall allow users to register with email, password, and name. Default role is Patient. |
| FR-02 | User Authentication | High | System shall authenticate users via email and password with JWT tokens. |
| FR-03 | Role-Based Dashboards | High | System shall redirect users to their role-specific dashboard after login. |
| FR-04 | Doctor Search | High | Patients shall be able to search and filter doctors by specialty, city, province, and name. |
| FR-05 | Appointment Booking | High | Patients shall be able to book appointments by selecting a doctor, date, and providing personal details. |
| FR-06 | Token Allocation | High | System shall automatically allocate the next available token number for each booking. |
| FR-07 | Queue Management | High | Doctors shall be able to manage their queue with Call Next, Skip, No Show, and Cancel actions. |
| FR-08 | Prescription Entry | High | Doctors shall be able to enter diagnosis, medicines, lab tests, and follow-up date for each appointment. |
| FR-09 | AI Symptom Analysis | Medium | System shall analyze patient symptoms using a RAG-based approach and return possible conditions with confidence scores. |
| FR-10 | Health Metrics | Medium | Patients shall be able to log and view their blood pressure, weight, and sugar levels over time. |
| FR-11 | Email Notifications | Medium | System shall send automated emails for appointment confirmations, reminders, and prescriptions. |
| FR-12 | Subscription Management | Medium | Doctors shall be able to subscribe to paid plans via Stripe checkout. |
| FR-13 | Admin Management | Medium | Admins shall be able to create, edit, and delete doctor and PA accounts. |
| FR-14 | Review System | Low | Patients shall be able to write reviews for doctors, subject to admin approval. |
| FR-15 | Prescription Verification | Low | Anyone shall be able to verify a prescription via QR code without logging in. |
| FR-16 | Walk-in Registration | High | PAs shall be able to register walk-in patients with automatic token allocation. |
| FR-17 | Vitals Entry | High | PAs shall be able to record patient vitals before doctor consultation. |
| FR-18 | Family Management | Low | Patients shall be able to add and manage family member sub-accounts. |
| FR-19 | Schedule Management | Medium | Doctors shall be able to configure their weekly availability and break times. |
| FR-20 | Organization Management | Medium | Organization owners shall be able to create and manage multiple doctor accounts. |

## 2.3 Non-Functional Requirements

| Req ID | Category | Requirement |
|---|---|---|
| NFR-01 | Performance | Pages shall load within 3 seconds on a standard broadband connection. |
| NFR-02 | Performance | The system shall handle at least 100 concurrent users without degradation. |
| NFR-03 | Security | All user passwords shall be hashed using bcrypt (handled by authentication service). |
| NFR-04 | Security | Row Level Security shall be enabled on ALL database tables. |
| NFR-05 | Security | All API endpoints shall require JWT authentication except public endpoints. |
| NFR-06 | Usability | The UI shall be responsive and work on screens from 320px to 1920px width. |
| NFR-07 | Usability | The system shall support both light and dark themes. |
| NFR-08 | Reliability | Email notifications shall be logged and retry-able on failure. |
| NFR-09 | Scalability | The database shall use proper indexing and foreign key constraints for efficient queries. |
| NFR-10 | Maintainability | Code shall follow component-based architecture with separation of concerns. |
| NFR-11 | Availability | The system shall be available 99.5% of the time (based on hosting provider SLAs). |
| NFR-12 | Compatibility | The system shall work on Chrome, Firefox, Safari, and Edge browsers. |

## 2.4 Use Cases / Use Case Diagram

### Primary Use Cases:

**UC-01: Book Appointment**
- Actor: Patient
- Precondition: Patient is logged in
- Flow: Search doctor → Select date → Enter details → Choose payment → Confirm → Receive token
- Postcondition: Appointment created with token number; email sent

**UC-02: Manage Queue**
- Actor: Doctor
- Precondition: Doctor is logged in; appointments exist for today
- Flow: View queue → Call next patient → Enter prescription → Save → Patient marked as Completed
- Postcondition: Prescription saved; medical record created; email sent

**UC-03: Register Walk-in**
- Actor: PA
- Precondition: PA is logged in; assigned to a doctor
- Flow: Open walk-in dialog → Enter patient details → System allocates token → Print token
- Postcondition: Appointment created; token printed

**UC-04: Analyze Symptoms**
- Actor: Patient
- Precondition: Patient is on symptom checker page (login optional)
- Flow: Enter symptoms, age, gender, duration → Submit → AI analyzes → Display results
- Postcondition: Analysis displayed; submission saved to history

**UC-05: Manage Doctors (Admin)**
- Actor: Admin
- Precondition: Admin is logged in
- Flow: Navigate to admin dashboard → Create/Edit/Delete doctor accounts → Assign PAs
- Postcondition: Doctor accounts managed

**UC-06: Subscribe to Plan**
- Actor: Doctor
- Precondition: Doctor is logged in
- Flow: View available plans → Select plan → Redirect to Stripe checkout → Payment → Plan activated
- Postcondition: Doctor's subscription plan updated; features unlocked

**UC-07: Verify Prescription**
- Actor: Anyone (Pharmacist, Patient)
- Precondition: Has QR code from printed prescription
- Flow: Scan QR code → Redirected to verification page → View prescription details
- Postcondition: Prescription verified with doctor and patient details

### Use Case Diagram Description:

The system has four primary actors (Patient, Doctor, PA, Admin) and one secondary actor (Organization Owner). The Patient interacts with booking, symptoms, health tracking, and reviews. The Doctor interacts with queue management, prescriptions, analytics, and settings. The PA interacts with walk-in registration and vitals entry. The Admin interacts with user management, content management, and analytics. All roles share authentication use cases (Login, Register, Reset Password).

## 2.5 Software Development Plan

We followed an Agile-inspired iterative development approach for MediCare+. Since this is an academic project with a fixed timeline, we adapted Agile principles to fit our situation.

**Development Methodology: Iterative/Incremental**

**Phase 1: Planning & Requirements (Weeks 1-3)**
- Identified problem statement and objectives
- Gathered requirements from real clinic observations
- Created initial database schema design
- Selected technology stack

**Phase 2: Database & Authentication (Weeks 4-6)**
- Designed and implemented 20+ PostgreSQL tables
- Set up Row Level Security policies for all tables
- Implemented user authentication with role-based access
- Created database functions and triggers

**Phase 3: Core Module Development (Weeks 7-14)**
- Built Patient dashboard (appointments, history, health metrics)
- Built Doctor dashboard (queue management, prescriptions, analytics)
- Built PA dashboard (walk-in registration, vitals entry)
- Implemented booking workflow with token allocation

**Phase 4: Advanced Features (Weeks 15-20)**
- Integrated AI symptom checker with RAG approach
- Implemented Stripe subscription system
- Built Admin dashboard with all management panels
- Added Organization/Enterprise module
- Implemented email notification system (18 edge functions)

**Phase 5: Testing & Documentation (Weeks 21-24)**
- Conducted manual testing of all features
- User acceptance testing with sample users
- Fixed bugs and improved UI/UX
- Wrote FYP documentation and report

**Tools Used:**
- GitHub for version control
- Lovable platform for development
- Supabase dashboard for database management
- Stripe dashboard for payment testing
- Chrome DevTools for debugging

---

# Chapter 3: System Overview

MediCare+ is a full-stack web application that follows a client-server architecture. The frontend is a Single Page Application (SPA) built with React, while the backend is powered by Supabase which provides a PostgreSQL database, authentication, file storage, and serverless edge functions. The system is designed to be modular, scalable, and secure.

## 3.1 Architectural Design

MediCare+ follows a **Three-Tier Architecture** with clear separation between the presentation layer, business logic layer, and data layer.

```
┌─────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                         │
│                   (React + TypeScript)                        │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Patient  │ │ Doctor   │ │   PA     │ │  Admin   │       │
│  │Dashboard │ │Dashboard │ │Dashboard │ │Dashboard │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       │             │             │             │             │
│  ┌────┴─────────────┴─────────────┴─────────────┴────┐      │
│  │         React Router (Client-Side Routing)         │      │
│  │         TanStack Query (Server State Cache)        │      │
│  │         shadcn/ui + Tailwind (UI Components)       │      │
│  └────────────────────────┬──────────────────────────┘      │
└───────────────────────────┼──────────────────────────────────┘
                            │ HTTPS / REST API
┌───────────────────────────┼──────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                        │
│                   (Supabase Backend)                          │
│                                                              │
│  ┌───────────┐  ┌──────────────┐  ┌───────────┐             │
│  │  GoTrue   │  │Edge Functions│  │  Storage  │             │
│  │  (Auth)   │  │  (18 Fns)   │  │(4 Buckets)│             │
│  └─────┬─────┘  └──────┬───────┘  └─────┬─────┘             │
│        │               │                │                    │
│  ┌─────┴───────────────┴────────────────┴─────┐              │
│  │           PostgREST (Auto REST API)        │              │
│  │           Realtime (WebSocket)              │              │
│  └──────────────────────┬─────────────────────┘              │
└──────────────────────────┼───────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                    DATA LAYER                                 │
│                    (PostgreSQL)                               │
│                                                              │
│  ┌─────────────────────────────────────────────┐             │
│  │  20+ Tables with Row Level Security         │             │
│  │  Database Functions & Triggers              │             │
│  │  Indexes & Foreign Key Constraints          │             │
│  └─────────────────────────────────────────────┘             │
└──────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                 EXTERNAL SERVICES                             │
│                                                              │
│  ┌──────────┐  ┌────────────┐  ┌───────────┐                │
│  │  Stripe  │  │Gmail SMTP  │  │Lovable AI │                │
│  │(Payments)│  │ (Emails)   │  │(AI/RAG)   │                │
│  └──────────┘  └────────────┘  └───────────┘                │
└──────────────────────────────────────────────────────────────┘
```

The architecture was designed this way because:
- **Separation of Concerns**: Each layer handles a specific responsibility. The frontend only deals with UI, the backend handles logic, and the database stores data.
- **Security**: RLS policies at the database level mean that even if someone bypasses the frontend, they still can't access data they're not supposed to see.
- **Scalability**: Supabase handles scaling automatically for the backend. The frontend is a static SPA that can be served from any CDN.

## 3.2 Data Design

### 3.2.1 Entity-Relationship Diagram (ERD)

The MediCare+ database consists of 20+ tables. Here are the main entities and their relationships:

**Core Entities:**

| Table | Description | Primary Key |
|---|---|---|
| profiles | User profiles for all roles | id (UUID, references auth.users) |
| user_roles | Role assignments | id (UUID) |
| doctors | Doctor professional information | user_id (UUID, references profiles) |
| appointments | All appointment records | id (UUID) |
| doctor_schedules | Weekly availability slots | id (UUID) |
| doctor_breaks | Break time definitions | id (UUID) |
| blocked_slots | Blocked dates/times | id (UUID) |

**Supporting Entities:**

| Table | Description |
|---|---|
| pa_assignments | Links PAs to their assigned doctors |
| health_metrics | Patient health tracking data (BP, weight, sugar) |
| medical_records | Historical medical records |
| reviews | Patient reviews with moderation status |
| medicines | Medicine catalog database |
| doctor_applications | Pending doctor registration applications |
| doctor_payment_plans | Subscription plan definitions |
| organizations | Enterprise clinic entities |
| organization_members | Org membership with roles |
| managed_patients | Family member patient management |
| email_templates | Customizable email templates |
| email_logs | Email delivery tracking |
| symptom_knowledge | AI symptom knowledge base |
| disease_symptoms | Symptom-disease mapping |
| symptom_submissions | AI analysis history |
| hero_slides | Homepage slider content |
| site_settings | Dynamic site configuration |
| audit_logs | System audit trail |

**Key Relationships:**
- profiles (1) → (1) doctors (one-to-one, a doctor has exactly one profile)
- profiles (1) → (M) appointments (one-to-many, a patient can have many appointments)
- doctors (1) → (M) appointments (one-to-many, a doctor handles many appointments)
- doctors (1) → (M) doctor_schedules (one-to-many, a doctor has 7 schedule entries)
- doctors (1) → (M) doctor_breaks (one-to-many, a doctor can have multiple breaks)
- profiles (1) → (M) pa_assignments (one-to-many, a PA can be assigned to multiple doctors)
- organizations (1) → (M) doctors (one-to-many, an org can have multiple doctors)
- doctor_payment_plans (1) → (M) doctors (one-to-many, many doctors can be on same plan)

### 3.2.2 Data Flow Diagram (DFD)

**Level 0 DFD (Context Diagram):**

```
                     ┌─────────────────┐
   Patient ────────► │                 │ ◄──────── Doctor
   (Bookings,        │   MediCare+     │   (Queue, Rx,
    Symptoms,        │    System       │    Schedule)
    Health Data)     │                 │
                     │                 │
   PA ─────────────► │                 │ ◄──────── Admin
   (Walk-ins,        │                 │   (Management,
    Vitals)          └─────────────────┘    Analytics)
                            │
                     ┌──────┴──────┐
                     │  External   │
                     │  Services   │
                     │ (Stripe,    │
                     │  Gmail,     │
                     │  AI API)    │
                     └─────────────┘
```

**Level 1 DFD:**

```
Patient                                              Doctor
   │                                                    │
   ├─── Search Doctors ──────► [1.0 Doctor Search] ─────┤
   │                              │                     │
   ├─── Book Appointment ───► [2.0 Booking System] ─────┤
   │                              │                     │
   │                         [Token DB] ◄───────────────┤
   │                              │                     │
   ├─── Check Symptoms ─────► [3.0 AI Symptom] ────────►│
   │                           Analyzer                  │
   │                              │                     │
   │                         [Knowledge DB]              │
   │                              │                     │
   ├─── Track Health ───────► [4.0 Health Tracking] ────►│
   │                              │                     │
   │                         [Health Metrics DB]         │
   │                              │                     │
   │                          [5.0 Queue Mgmt] ◄────────┤
   │                              │                     │
   │                          [6.0 Prescription] ◄──────┤
   │◄── Receive Email ──────  [7.0 Notification]        │
   │                              │                     │
   │                         [Email Service]             │
```

## 3.3 Domain Model

### 3.3.1 Class Diagram

The main classes in MediCare+ and their attributes:

```
┌───────────────────┐       ┌───────────────────┐
│      Profile      │       │      Doctor       │
├───────────────────┤       ├───────────────────┤
│ - id: UUID        │ 1   1 │ - user_id: UUID   │
│ - name: String    │───────│ - specialty: String│
│ - phone: String   │       │ - degree: String   │
│ - age: Integer    │       │ - fee: Decimal     │
│ - gender: String  │       │ - experience: Int  │
│ - role: AppRole   │       │ - max_patients: Int│
│ - city: String    │       │ - rating: Decimal  │
│ - province: String│       │ - org_id: UUID     │
│ - avatar_path: Str│       │ - plan_id: UUID    │
│ - patient_id: Str │       │ - consult_dur: Int │
└───────┬───────────┘       └───────┬───────────┘
        │                           │
        │ 1                         │ 1
        │                           │
        │ M                         │ M
┌───────┴───────────┐       ┌───────┴───────────┐
│   Appointment     │       │  DoctorSchedule   │
├───────────────────┤       ├───────────────────┤
│ - id: UUID        │       │ - id: UUID        │
│ - doctor_id: UUID │       │ - doctor_id: UUID │
│ - patient_id: UUID│       │ - day_of_week: Int│
│ - date: Date      │       │ - start_time: Time│
│ - token_number: In│       │ - end_time: Time  │
│ - status: String  │       │ - is_available: Bo│
│ - diagnosis: Text │       └───────────────────┘
│ - medicines: JSON │
│ - lab_tests: Text │       ┌───────────────────┐
│ - vitals_*: String│       │   DoctorBreak     │
│ - payment_method  │       ├───────────────────┤
│ - follow_up_date  │       │ - id: UUID        │
└───────────────────┘       │ - doctor_id: UUID │
                            │ - break_name: Str │
┌───────────────────┐       │ - start_time: Time│
│   HealthMetric    │       │ - end_time: Time  │
├───────────────────┤       │ - applies_days:[] │
│ - id: UUID        │       └───────────────────┘
│ - patient_id: UUID│
│ - metric_date:Date│       ┌───────────────────┐
│ - systolic: Int   │       │   Organization    │
│ - diastolic: Int  │       ├───────────────────┤
│ - weight: Decimal │       │ - id: UUID        │
│ - sugar_level: Dec│       │ - name: String    │
└───────────────────┘       │ - owner_id: UUID  │
                            │ - max_doctors: Int│
┌───────────────────┐       │ - stripe_cust: Str│
│     Review        │       └───────────────────┘
├───────────────────┤
│ - id: UUID        │       ┌───────────────────┐
│ - patient_id: UUID│       │  PaymentPlan      │
│ - doctor_id: UUID │       ├───────────────────┤
│ - rating: Integer │       │ - id: UUID        │
│ - comment: Text   │       │ - name: String    │
│ - status: String  │       │ - price: Decimal  │
│ - display_name:Str│       │ - features: Array │
└───────────────────┘       │ - stripe_price_id │
                            └───────────────────┘
```

## 3.4 Design Models

### 3.4.1 Activity Diagram — Appointment Booking

```
[Start]
   │
   ▼
[Patient Opens Booking Page]
   │
   ▼
[Search/Filter Doctors] ──────────────────────┐
   │                                           │
   ▼                                           │
[Select a Doctor] ◄────────────────────────────┘
   │
   ▼
[View Doctor Schedule & Available Dates]
   │
   ▼
[Select Appointment Date]
   │
   ▼
◇─── Slots Available? ───◇
│ No                      │ Yes
▼                         ▼
[Show "No Slots"    [Enter Patient Details]
 Message]                │
   │                     ▼
   ▼              [Choose Payment Method]
[End]                    │
                    ┌────┴────┐
                    │         │
                    ▼         ▼
              [Cash]    [Online Payment]
                    │         │
                    │    [Upload Receipt]
                    │         │
                    └────┬────┘
                         │
                         ▼
                   [System Allocates Token]
                         │
                         ▼
                   [Send Confirmation Email]
                         │
                         ▼
                   [Show Token + Est. Time]
                         │
                         ▼
                   [Print Token (Optional)]
                         │
                         ▼
                      [End]
```

### 3.4.2 Sequence Diagram — Patient Booking Flow

```
Patient          Frontend         Supabase DB       Edge Function
   │                │                 │                  │
   │─ Search Doctor─►│                │                  │
   │                │─ Query doctors ─►│                 │
   │                │◄─ Doctor List ──│                  │
   │◄─ Show Results─│                 │                  │
   │                │                 │                  │
   │─ Select Date ──►│                │                  │
   │                │─ get_available  ─►│                │
   │                │  _slots()       │                  │
   │                │◄─ Slots Count ──│                  │
   │◄─ Show Slots ──│                 │                  │
   │                │                 │                  │
   │─ Submit Book ──►│                │                  │
   │                │─ allocate_token ─►│                │
   │                │  (p_doctor_id,   │                 │
   │                │   p_date)        │                 │
   │                │◄─ Token # ──────│                  │
   │                │                 │                  │
   │                │─ INSERT appt ───►│                 │
   │                │◄─ Success ──────│                  │
   │                │                 │                  │
   │                │─ Send Notif ────────────────────────►│
   │                │                 │  send-appointment  │
   │                │                 │  -notification     │
   │                │◄────────────────────── Email Sent ──│
   │                │                 │                  │
   │◄─ Confirmation─│                 │                  │
   │   (Token, Time)│                 │                  │
```

### 3.4.3 Component Diagram

```
┌─────────────────────────────────────────────────────┐
│                    React Application                 │
│                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │  Pages  │ │Components│ │  Hooks  │ │   Lib   │  │
│  │ (17)    │ │  (60+)   │ │  (6)    │ │  (5)    │  │
│  └────┬────┘ └────┬─────┘ └────┬────┘ └────┬────┘  │
│       │           │            │            │       │
│       └───────────┴────────────┴────────────┘       │
│                        │                             │
│              ┌─────────┴──────────┐                  │
│              │  Supabase Client   │                  │
│              │  (Auto-generated)  │                  │
│              └─────────┬──────────┘                  │
└────────────────────────┼─────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
  ┌─────┴─────┐  ┌──────┴──────┐  ┌─────┴─────┐
  │  PostgREST│  │Edge Functions│  │  Storage  │
  │  (DB API) │  │  (18 total)  │  │ (4 Bucket)│
  └───────────┘  └─────────────┘  └───────────┘
        │                │                │
  ┌─────┴────────────────┴────────────────┴────┐
  │              PostgreSQL Database             │
  │     (20+ Tables with RLS Policies)           │
  └──────────────────────────────────────────────┘
```

### 3.4.4 State Transition Diagram — Appointment Status

```
                    ┌──────────┐
                    │  Created │ (After booking)
                    │ "Upcoming"│
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
              ▼          ▼          ▼
        ┌──────────┐ ┌───────┐ ┌──────────┐
        │"Waiting" │ │Cancel │ │"No Show" │
        │(At Clinic)│ │(By    │ │(By Doctor)│
        └────┬─────┘ │Patient│ └──────────┘
             │       │or Doc)│
             ▼       └───────┘
        ┌──────────┐
        │"In       │ (Doctor calls patient)
        │Progress" │
        └────┬─────┘
             │
        ┌────┴─────┐
        │          │
        ▼          ▼
  ┌──────────┐ ┌──────────┐
  │"Paused"  │ │"Completed"│ (Prescription saved)
  │(Temporary)│ └──────────┘
  └────┬─────┘
       │
       ▼
  (Returns to "In Progress"
   when doctor resumes)
```

### 3.4.5 System Architecture

The system architecture is covered in detail in Section 3.1. In summary, MediCare+ uses a three-tier architecture:

1. **Client Tier**: React SPA served from Vercel CDN, communicating via HTTPS
2. **Application Tier**: Supabase services (PostgREST, GoTrue, Edge Functions, Storage, Realtime)
3. **Data Tier**: PostgreSQL database with 20+ tables, RLS policies, and stored functions

External services (Stripe, Gmail SMTP, Lovable AI) are integrated through the Edge Functions in the Application Tier, keeping API keys and secrets secure on the server side.

## 3.5 Mockups

The MediCare+ interface was designed with a modern, clean aesthetic using the shadcn/ui component library and Tailwind CSS. The design features:

- **Theme Support**: Full light and dark mode with smooth transitions
- **Glassmorphism Effects**: Semi-transparent cards and backgrounds for a modern look
- **Responsive Layout**: Mobile-first design that adapts from 320px to 1920px screens
- **Consistent Design System**: HSL-based color tokens (primary, secondary, muted, accent, destructive) used throughout
- **Framer Motion Animations**: Smooth page transitions and hover effects

Key screens include:
1. **Landing Page**: Hero slider, top doctors section, intro video, feature highlights
2. **Booking Page**: Doctor search with filters, schedule view, booking form
3. **Patient Dashboard**: Tabbed interface with appointments, medical history, health metrics, profile
4. **Doctor Dashboard**: Queue management panel, prescription dialog, analytics charts, settings
5. **PA Dashboard**: Walk-in registration, vitals entry, appointment list
6. **Admin Dashboard**: Multi-tab management interface with analytics, doctor management, content panels
7. **Symptom Checker**: Step-by-step symptom input with AI analysis results

*(Screenshots of these screens should be included in the final printed report)*

---

# Chapter 4: System Implementation

## 4.1 Technology Stack (Languages, Frameworks, Tools)

We chose our technology stack carefully, keeping in mind that we needed modern, well-supported tools that would allow us to build a complex system within our timeline. Here is the complete breakdown:

### Frontend Technologies

| Technology | Version | Why We Used It |
|---|---|---|
| React | 18.3.x | Industry-standard UI library. We learned it in our coursework and it has a massive ecosystem. |
| TypeScript | 5.x | Adds type safety to JavaScript. Catches bugs at compile time instead of runtime. |
| Vite | Latest | Extremely fast build tool. Way faster than Webpack for development. |
| Tailwind CSS | 3.x | Utility-first CSS. Makes styling much faster than writing custom CSS files. |
| shadcn/ui | Latest | Pre-built accessible components that we can customize. Saved us weeks of building UI from scratch. |
| TanStack React Query | 5.x | Handles server state (caching, refetching, loading states). Much better than useEffect for API calls. |
| React Router DOM | 6.x | Client-side routing for our SPA. Handles all page navigation without server requests. |
| Framer Motion | 12.x | Animation library for smooth transitions and hover effects. |
| Recharts | 2.x | React-based charting library for analytics dashboards. |
| jsPDF + AutoTable | 3.x | Generates PDF documents client-side (prescriptions, tokens, medical history). |
| QRCode.react | 4.x | Generates QR codes for prescription verification. |
| Zod | 3.x | Schema validation library. We use it to validate form inputs. |
| React Hook Form | 7.x | Efficient form management with minimal re-renders. |
| Lucide React | Latest | Beautiful, consistent SVG icon library. |
| next-themes | 0.3.x | Dark/Light theme management. Makes theme switching easy. |
| date-fns | 3.x | Date utility library. Way better than native Date API. |
| Sonner | 1.x | Toast notification library. Clean, minimal notifications. |

### Backend Technologies

| Technology | Purpose |
|---|---|
| PostgreSQL | Our main database. Supabase provides it with built-in Row Level Security, which was a major reason we chose it. |
| PostgREST | Auto-generates a REST API directly from our database schema. We don't need to write API endpoints manually. |
| GoTrue | Handles authentication — signup, login, JWT tokens, password reset. All built into Supabase. |
| Supabase Realtime | WebSocket-based real-time subscriptions. We use it for live queue updates. |
| Supabase Storage | File storage for avatars, receipts, hero images, and doctor application documents. |
| Deno Edge Functions | Serverless functions for backend logic. We have 18 of them handling everything from emails to Stripe webhooks. |
| Row Level Security | Database-level access control. Policies are defined in SQL and enforced automatically on every query. |

### External Services

| Service | Purpose |
|---|---|
| Stripe | Payment processing and subscription management. Provides checkout, billing portal, and webhooks. |
| Gmail SMTP | Email delivery using the `denomailer` library in our edge functions. |
| Lovable AI | AI service that provides access to models like Gemini for our RAG-based symptom checker. |
| Vercel | Frontend hosting with CDN. Free tier works great for our project. |

## 4.2 Development Environment Setup

To set up the development environment for MediCare+, you need:

**Software Requirements:**
- Node.js 18+ (for running the development server)
- Git (for version control)
- VS Code or any modern code editor
- Chrome/Firefox browser with DevTools

**Setup Steps:**
1. Clone the repository from GitHub
2. Run `npm install` or `bun install` to install all dependencies
3. The `.env` file is auto-configured by Lovable with Supabase URL and keys
4. Run `npm run dev` to start the Vite development server
5. The app runs at `http://localhost:5173` in development mode

**No additional setup required because:**
- Supabase is cloud-hosted (no local database setup needed)
- Edge functions are deployed automatically
- Stripe test mode works with test keys pre-configured
- All dependencies are managed through package.json

## 4.3 System Modules and Components

The MediCare+ codebase is organized into the following main modules:

### Pages (17 route-level components)

| Page | Route | Purpose |
|---|---|---|
| Index | `/` | Landing page with hero slider, top doctors, video |
| Auth | `/auth` | Login and signup forms |
| Booking | `/booking` | Doctor search and appointment booking |
| PatientDashboard | `/profile` | Patient portal |
| DoctorDashboard | `/doctor` | Doctor portal |
| PADashboard | `/pa` | PA portal |
| AdminDashboard | `/admin` | Admin portal |
| OrganizationDashboard | `/organization` | Enterprise org management |
| DoctorProfile | `/doctor/:id` | Public doctor profile with reviews |
| SymptomsChecker | `/symptoms-checker` | AI symptom analysis |
| BecomeDoctor | `/become-doctor` | Doctor registration application |
| PrescriptionPrint | `/prescription-print/:id` | Printable prescription (A4) |
| TokenPrint | `/token-print/:id` | Printable token with QR code |
| MedicalHistoryPrint | `/medical-history-print` | Printable medical history |
| LabTestsPrint | `/lab-tests-print/:id` | Printable lab test orders |
| PrescriptionVerify | `/verify/:id` | Public prescription verification |
| Reviews | `/reviews` | Public reviews listing |

### Component Categories

| Category | Count | Examples |
|---|---|---|
| Admin Components | 14 | AnalyticsPanel, MedicinesPanel, DoctorCard, SubscriptionsPanel |
| Auth Components | 2 | ChangePasswordDialog, PasswordChangeDialog |
| Booking Components | 4 | DoctorSearchFilter, DoctorDetailsDialog, ReceiptUpload, DoctorScheduleDisplay |
| Doctor Components | 15 | QueueManagementPanel, ScheduleSettingsCard, BreakTimesCard, SubscriptionCard |
| Home Components | 3 | HeroSlider, IntroVideo, TopDoctorsSlider |
| Layout Components | 3 | Header, Footer, Layout |
| Organization Components | 2 | CreateDoctorDialog, DoctorDashboardView |
| PA Components | 2 | VitalsEntryDialog, WalkInPatientDialog |
| Patient Components | 9 | AppointmentsSection, HealthMetrics, MedicalHistoryTimeline, PatientSwitcher |
| Shared Components | 1 | MedicinesList |
| UI Components (shadcn) | 50+ | Button, Card, Dialog, Table, Tabs, Toast, etc. |

### Custom Hooks

| Hook | Purpose |
|---|---|
| useAuth | Authentication state management (user, role, loading, logout) |
| usePlanFeatures | Subscription plan feature gating (what features current plan allows) |
| useSiteSettings | Dynamic site configuration from database |
| useFooterSettings | Footer configuration from database |
| use-mobile | Responsive breakpoint detection |

## 4.4 Database Implementation

Our database has 20+ tables implemented in PostgreSQL through Supabase. Here are some key implementation details:

**Token Allocation Function:**
This is one of the most critical functions in our system. It atomically allocates the next available token number for a doctor on a specific date, while checking against the maximum patient limit and blocked slots.

```sql
CREATE OR REPLACE FUNCTION public.allocate_token(p_doctor_id uuid, p_date date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_patients INT;
  v_next_token INT;
  v_blocked_count INT;
BEGIN
  SELECT max_patients_per_day INTO v_max_patients
  FROM public.doctors WHERE user_id = p_doctor_id;
  
  IF v_max_patients IS NULL THEN
    RAISE EXCEPTION 'Doctor not found';
  END IF;
  
  SELECT COUNT(*) INTO v_blocked_count
  FROM public.blocked_slots 
  WHERE doctor_user_id = p_doctor_id AND blocked_date = p_date;
  
  SELECT COALESCE(MAX(token_number), 0) + 1 INTO v_next_token
  FROM public.appointments
  WHERE doctor_user_id = p_doctor_id 
    AND appointment_date = p_date 
    AND status != 'Cancelled';
  
  IF v_next_token > (v_max_patients - v_blocked_count) THEN
    RAISE EXCEPTION 'No slots available for this date';
  END IF;
  
  RETURN v_next_token;
END;
$$;
```

**Handle New User Trigger:**
When a new user signs up, this trigger automatically creates their profile and role assignment:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'patient')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id, 
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'patient')
  );
  
  RETURN NEW;
END;
$$;
```

**Row Level Security Example (Appointments):**
```sql
-- Patients can only view their own appointments
CREATE POLICY "Patients can view own appointments" ON public.appointments
  FOR SELECT USING (patient_user_id = auth.uid());

-- Doctors can view appointments assigned to them
CREATE POLICY "Doctors can view their appointments" ON public.appointments
  FOR SELECT USING (doctor_user_id = auth.uid());

-- PAs can view appointments for their assigned doctors
CREATE POLICY "PAs can view appointments for assigned doctors" ON public.appointments
  FOR SELECT USING (is_pa_for_doctor(auth.uid(), doctor_user_id));

-- Admins can manage all appointments
CREATE POLICY "Admins can manage all appointments" ON public.appointments
  FOR ALL USING (has_role(auth.uid(), 'admin'));
```

## 4.5 APIs and External Integrations

### Edge Functions (Serverless Backend)

MediCare+ uses 18 Deno-based Edge Functions for backend logic:

| # | Function | Auth Required | Purpose |
|---|---|---|---|
| 1 | analyze-symptoms | JWT | AI symptom analysis using RAG approach with Lovable AI |
| 2 | approve-doctor-application | JWT + Admin | Process doctor registration approvals, create user accounts |
| 3 | check-doctor-subscription | JWT | Sync subscription status from Stripe |
| 4 | create-org-doctor | JWT + Org Admin | Create doctor accounts within enterprise organizations |
| 5 | create-plan-checkout | JWT | Generate Stripe checkout sessions for plan subscriptions |
| 6 | delete-user | JWT + Admin | Permanently delete user accounts from auth and database |
| 7 | doctor-customer-portal | JWT | Open Stripe billing portal for subscription management |
| 8 | resend-doctor-credentials | JWT + Admin | Re-send login credentials to doctor accounts |
| 9 | send-appointment-notification | JWT | Send appointment confirmation emails |
| 10 | send-appointment-reminders | Service Role | Scheduled: send reminders for upcoming appointments |
| 11 | send-email | JWT / Service | Core email sending service using Gmail SMTP |
| 12 | send-followup-reminders | Service Role | Scheduled: send follow-up appointment reminders |
| 13 | send-password-reset | Public | Generate and send password reset links |
| 14 | send-prescription-email | JWT | Send prescription details to patients after consultation |
| 15 | send-subscription-email | JWT | Send subscription event notifications (activated, cancelled) |
| 16 | send-subscription-report | JWT + Admin | Generate and send subscription analytics reports |
| 17 | send-welcome-email | JWT | Send welcome email with credentials to new doctors |
| 18 | stripe-webhook | Stripe Signature | Handle Stripe webhook events (subscription lifecycle) |

### Stripe Integration

Stripe is used for the subscription payment system. The integration flow:

1. Doctor selects a plan → `create-plan-checkout` edge function creates a Stripe Checkout Session
2. Doctor is redirected to Stripe's hosted checkout page
3. After payment, Stripe sends a webhook to `stripe-webhook` edge function
4. The webhook handler updates the doctor's subscription plan in our database
5. Doctor can manage billing via `doctor-customer-portal` which opens Stripe's billing portal

### Gmail SMTP

All emails are sent through Gmail SMTP using the `denomailer` library in our edge functions. We use a dedicated Gmail account with an app-specific password. The email templates are stored in the database and can be customized by the admin.

## 4.6 Dataset Selection and Preprocessing

For the AI Symptom Checker, we created a curated medical knowledge base stored in two database tables:

**symptom_knowledge table:**
- Contains detailed entries for common symptoms
- Fields: symptom name, description, severity level, medical advice, red flags, when to seek help, source
- Around 500+ entries covering common conditions

**disease_symptoms table:**
- Maps symptom keywords to possible conditions
- Fields: title (disease name), symptom_keywords, recommendation
- Used for initial keyword matching before AI analysis

**Data Sources:**
- Medical reference books and online medical databases
- WHO and NIH public health resources
- Verified medical websites (Mayo Clinic, NHS, WebMD)
- All entries were reviewed and validated for accuracy

**Preprocessing:**
- Symptoms were normalized to consistent naming conventions
- Severity levels were standardized (mild, moderate, severe)
- Red flags were tagged for urgent conditions
- Keywords were extracted for efficient matching

## 4.7 Model Selection and Training

We did not train a custom AI model for MediCare+. Instead, we used a **Retrieval-Augmented Generation (RAG)** approach that combines our local knowledge base with a pre-trained large language model.

**RAG Architecture:**

1. **Retrieval Phase**: When a patient submits symptoms, the system first queries the local `symptom_knowledge` and `disease_symptoms` tables to find relevant medical information based on keyword matching.

2. **Augmentation Phase**: The retrieved knowledge base entries are combined with the patient's input (symptoms, age, gender, duration, severity, medical history) to create a comprehensive prompt.

3. **Generation Phase**: This augmented prompt is sent to the AI model (Google Gemini via Lovable AI service) which generates a natural language response including:
   - Possible condition
   - Confidence score (0-100%)
   - Medical advice
   - Red flags to watch for
   - When to seek professional help

**Why RAG Instead of Custom Training:**
- No need for expensive GPU resources for training
- Knowledge base can be updated by admins without re-training
- Pre-trained models (Gemini) already have extensive medical knowledge
- RAG grounds the AI responses in our verified knowledge base, reducing hallucinations
- Much faster to implement within our academic timeline

## 4.8 Model Evaluation

Since we use a RAG-based approach rather than a custom-trained model, our evaluation focused on the quality and relevance of the AI responses.

**Evaluation Criteria:**
1. **Relevance**: Does the suggested condition match the input symptoms?
2. **Accuracy of Advice**: Is the medical advice appropriate and safe?
3. **Confidence Calibration**: Are confidence scores reasonable (not too high for vague symptoms)?
4. **Red Flag Detection**: Does the system correctly identify urgent symptoms?
5. **Response Quality**: Is the response clear, understandable, and actionable?

**Testing Method:**
- We tested with 50+ different symptom combinations
- Results were reviewed against medical references
- Edge cases were tested (vague symptoms, multiple conditions, urgent symptoms)

**Results:**
- The system correctly identified relevant conditions in approximately 80% of test cases
- Red flags were accurately detected for urgent symptoms (chest pain, severe headaches, etc.)
- Confidence scores were appropriately calibrated — lower for vague symptoms, higher for specific ones
- The disclaimer that "this is not a replacement for professional medical advice" is always shown

**Limitations:**
- The system may suggest incorrect conditions for very rare diseases
- Accuracy depends on the quality and coverage of our knowledge base
- The AI model may sometimes give overly cautious advice

## 4.9 Model Deployment

The AI symptom checker is deployed as a Deno Edge Function (`analyze-symptoms`) on Supabase.

**Deployment Architecture:**
```
Patient Browser → analyze-symptoms Edge Function → Lovable AI API → Response
                       │
                       ├── Queries symptom_knowledge table
                       ├── Queries disease_symptoms table
                       ├── Constructs RAG prompt
                       ├── Sends to AI model
                       └── Saves submission to symptom_submissions table
```

**Key Features:**
- **Serverless**: The function scales automatically based on demand
- **Low Latency**: Edge functions run close to the user for faster response
- **Authentication**: JWT token required (but also works for anonymous users)
- **Logging**: All submissions are saved for analysis and improvement
- **Admin Control**: Knowledge base entries can be added/edited/deleted by admins

---

# Chapter 5: System Testing & Deployment

## 5.1 Testing Approach (Manual, Automated)

For MediCare+, we primarily used **manual testing** due to the nature of our project and timeline constraints. We tested each feature thoroughly as it was developed, and then conducted full system testing near the end.

**Testing Strategy:**
1. **Developer Testing**: Each team member tested their own code during development
2. **Cross-Testing**: Team members tested each other's features to catch issues
3. **Integration Testing**: Tested workflows that span multiple modules (e.g., booking → queue → prescription)
4. **User Acceptance Testing**: Got feedback from sample users (classmates and family members)

**Testing Tools:**
- Chrome DevTools (console, network, performance tabs)
- Supabase Dashboard (database queries, logs, auth monitoring)
- Stripe Test Mode (test payments with test card numbers)
- Browser responsive mode (testing different screen sizes)

## 5.2 Unit Testing

We performed manual unit testing on critical functions and components:

| Test Area | Test Cases | Status |
|---|---|---|
| Token Allocation Function | Allocates correct token; rejects when full; skips cancelled appointments | ✅ Pass |
| Authentication | Signup, login, password reset, role assignment | ✅ Pass |
| Date Calculations | Estimated wait time; break-aware calculations | ✅ Pass |
| PDF Generation | Prescription PDF; token PDF; medical history PDF | ✅ Pass |
| Form Validation | Required fields; email format; phone format | ✅ Pass |
| QR Code Generation | Correct URL encoding; scannable codes | ✅ Pass |

## 5.3 Integration Testing

Integration testing focused on end-to-end workflows:

| Test Scenario | Components Involved | Status |
|---|---|---|
| Patient books appointment | Booking page → allocate_token → appointments table → email notification | ✅ Pass |
| Doctor completes prescription | Queue panel → prescription dialog → appointment update → medical_records insert → email | ✅ Pass |
| PA registers walk-in | Walk-in dialog → allocate_token → appointment insert → auto-print token | ✅ Pass |
| AI symptom analysis | Symptom form → edge function → knowledge base query → AI API → response display → save submission | ✅ Pass |
| Stripe subscription | Plan select → create-plan-checkout → Stripe checkout → webhook → plan update | ✅ Pass |
| Admin creates doctor | Create form → auth.createUser → profiles insert → doctors insert → welcome email | ✅ Pass |
| Org creates doctor | Create dialog → create-org-doctor edge function → user creation → credentials email | ✅ Pass |

## 5.4 System Testing

System-level testing covered the following areas:

| Area | Tests Performed | Result |
|---|---|---|
| Authentication | Login, signup, logout, session persistence, role-based redirects, password change, forced password change | All passed |
| Authorization | RLS policies for all 4 roles, cross-role data isolation, admin full access | All passed |
| Booking Workflow | Search, filter, date selection, token allocation, payment methods, email sending | All passed |
| Queue Management | Call next, skip, no show, pause, cancel, status transitions | All passed |
| Prescription System | Diagnosis entry, medicine addition (JSON), lab tests, follow-up, PDF generation, QR verification | All passed |
| Admin Panels | Doctor CRUD, PA assignment, medicines CRUD, review moderation, email templates, analytics | All passed |
| Responsive Design | Tested on 320px, 375px, 768px, 1024px, 1920px viewports | All passed |
| Theme Switching | Light and dark mode across all pages and components | All passed |
| Email System | Confirmation, reminder, prescription, welcome, credentials emails | All passed |

## 5.5 User Acceptance Testing (UAT)

We conducted UAT with 8 sample users (classmates and family members):

**Test Participants:**
- 4 users tested as Patients
- 2 users tested as Doctors
- 1 user tested as PA
- 1 user tested as Admin

**Feedback Summary:**

| Aspect | Average Rating (1-5) | Comments |
|---|---|---|
| Ease of Use | 4.3 | "The interface is clean and easy to navigate" |
| Booking Process | 4.5 | "Very straightforward. Token system is cool" |
| Doctor Dashboard | 4.0 | "Queue management works well, prescription form is detailed" |
| AI Symptom Checker | 3.8 | "Gives decent suggestions but sometimes too cautious" |
| Mobile Experience | 4.2 | "Works well on phone, everything is responsive" |
| Overall Satisfaction | 4.2 | "Impressive for a student project" |

**Issues Found and Fixed:**
1. Token print page was not formatting correctly on some printers → Fixed with CSS media queries
2. Dark mode had some contrast issues in certain cards → Fixed with proper theme tokens
3. Email notifications were slow for some users → Optimized edge function cold starts
4. Search filters were not clearing properly → Fixed state management bug

## 5.6 Performance Testing

| Metric | Target | Actual | Status |
|---|---|---|---|
| Initial Page Load | < 3 sec | 1.8 sec | ✅ Pass |
| Doctor Search Response | < 2 sec | 0.5 sec | ✅ Pass |
| Token Allocation | < 1 sec | 0.3 sec | ✅ Pass |
| Prescription Save | < 2 sec | 0.8 sec | ✅ Pass |
| AI Symptom Analysis | < 10 sec | 3-7 sec | ✅ Pass |
| PDF Generation | < 3 sec | 1.2 sec | ✅ Pass |
| Email Delivery | < 30 sec | 5-15 sec | ✅ Pass |

**Notes:**
- Vite's production build with tree-shaking keeps the bundle size small
- TanStack Query's caching reduces redundant API calls significantly
- Edge function cold starts can add 1-2 seconds on first invocation
- The AI symptom analysis takes longer because it involves an external API call

## 5.7 Deployment Strategy

MediCare+ uses a simple but effective deployment strategy:

1. **Frontend**: Deployed on Vercel with automatic deployments from the Git repository. Every push to the main branch triggers a new production build.

2. **Backend**: Supabase (via Lovable Cloud) handles all backend deployment automatically. Database migrations are applied through the migration tool, and edge functions are deployed automatically.

3. **No Manual Deployment Steps**: The entire deployment pipeline is automated. When we make changes, they go live within minutes.

## 5.8 Hosting & Deployment Environment

```
┌──────────────────────────────────────────────────┐
│                 VERCEL (Frontend)                  │
│                                                   │
│  • Static SPA (React build output)               │
│  • Global CDN for fast loading                   │
│  • Automatic HTTPS/SSL                           │
│  • SPA routing via vercel.json rewrites          │
│  • Free tier (sufficient for our project)        │
└────────────────────┬──────────────────────────────┘
                     │ API Calls (HTTPS)
┌────────────────────┼──────────────────────────────┐
│          SUPABASE / LOVABLE CLOUD                  │
│                    │                               │
│  ┌─────────────────┴───────────────────────┐      │
│  │           API Gateway                    │      │
│  │  (PostgREST + GoTrue + Realtime)        │      │
│  └─────────────────┬───────────────────────┘      │
│                    │                               │
│  ┌──────┐ ┌───────┴──────┐ ┌──────┐ ┌──────┐    │
│  │  DB  │ │Edge Functions│ │ Auth │ │Store │    │
│  │(PgSQL)│ │ (18 Deno Fns)│ │(JWT) │ │(S3)  │    │
│  └──────┘ └──────────────┘ └──────┘ └──────┘    │
│                                                   │
│  • Managed PostgreSQL with automatic backups     │
│  • Serverless edge functions (Deno runtime)      │
│  • Built-in authentication and JWT management    │
│  • S3-compatible file storage                    │
│  • Real-time WebSocket subscriptions             │
└───────────────────────────────────────────────────┘
```

**Security Measures:**
- All traffic is encrypted with HTTPS/TLS
- Database is not directly accessible from the internet (only via PostgREST API)
- API keys and secrets are stored as environment variables in edge functions
- Row Level Security enforces access control at the database level

## 5.9 Version Control and CI/CD Pipelines

**Version Control:**
- **System**: Git
- **Platform**: GitHub
- **Strategy**: Main branch for production code

**CI/CD Pipeline:**
- Lovable platform provides integrated development with automatic deployments
- Code changes are deployed automatically to the preview environment
- Edge functions are deployed automatically when code is pushed
- Database migrations are applied through the migration tool with manual approval

**Deployment Flow:**
```
Code Change → Lovable Build → Preview Environment → Manual Review → Publish to Production
```

---

# Chapter 6: Results and Discussion

## 6.1 Evaluation and Results

After completing the development and testing of MediCare+, we evaluated the system against our initial objectives and collected feedback from test users.

### 6.1.1 Comparison with Initial Objectives

| # | Objective | Status | Evidence |
|---|---|---|---|
| 1 | Multi-role platform with separate dashboards | ✅ Achieved | 4 dedicated dashboards (Patient, Doctor, PA, Admin) + Organization dashboard, each with role-specific features |
| 2 | AI symptom checker using RAG | ✅ Achieved | Working edge function using Lovable AI with knowledge base retrieval; tested with 50+ symptom combinations |
| 3 | Token-based queue management | ✅ Achieved | Atomic token allocation function; break-aware estimated times; real-time queue controls |
| 4 | Digital prescription system | ✅ Achieved | Structured prescription form with JSON medicines; printable PDF with QR code verification |
| 5 | Patient health tracking | ✅ Achieved | Health metrics logging (BP, weight, sugar) with interactive Recharts visualizations |
| 6 | Stripe subscription management | ✅ Achieved | 3 subscription tiers; Stripe checkout integration; billing portal; webhook handling |
| 7 | Automated email notifications | ✅ Achieved | 18 edge functions covering all notification types; Gmail SMTP integration |
| 8 | Responsive UI with themes | ✅ Achieved | Works from 320px to 1920px; full light/dark mode support |

**Achievement Rate: 8/8 objectives fully achieved (100%)**

### 6.1.2 User Feedback and Usability Testing

We collected feedback through informal testing sessions with 8 users. Here are some notable comments:

**Positive Feedback:**
- "The booking process is really simple. I like how it shows the estimated wait time." — Patient tester
- "The queue management is exactly what a small clinic needs. Call next, skip — all very practical." — Doctor tester
- "I can see all my past prescriptions in one place. This is much better than keeping papers." — Patient tester
- "The admin dashboard gives good control over everything." — Admin tester

**Constructive Feedback:**
- "The symptom checker could be more detailed for some conditions." — Patient tester
- "It would be nice to have SMS reminders too, not just email." — Patient tester
- "A mobile app version would be great for on-the-go access." — Doctor tester

**Usability Metrics:**
- Average time to book an appointment: 2 minutes
- Average time for doctor to complete a prescription: 3 minutes
- Average time for PA to register a walk-in: 1 minute
- System Usability Scale (SUS) estimated score: 78/100 (Good)

### 6.1.3 Performance Evaluation

The system meets all performance targets:

| Metric | Result |
|---|---|
| Lighthouse Performance Score | 85+ |
| First Contentful Paint | < 1.5 seconds |
| Database Query Response | < 500ms average |
| Edge Function Response | < 3 seconds average |
| AI Analysis Response | 3-7 seconds (includes external API) |
| Concurrent User Support | 100+ (based on Supabase tier) |

The use of TanStack Query for caching and Vite for optimized builds contributes significantly to the performance. The PostgREST API layer automatically handles connection pooling and query optimization.

### 6.1.4 Challenges and Limitations

**Challenges We Faced:**

1. **RLS Policy Complexity**: Writing correct Row Level Security policies for 20+ tables with 4 different roles was one of the hardest parts. We had to be very careful to avoid both over-permissive and over-restrictive policies. Some policies needed helper functions (like `is_pa_for_doctor`) to avoid infinite recursion.

2. **Stripe Integration**: Understanding Stripe's webhook system and handling all the different event types (subscription created, updated, deleted, payment succeeded, payment failed) took significant research and testing.

3. **Break-Aware Time Calculation**: Calculating estimated appointment times while accounting for doctor breaks was more complex than we initially thought. We had to build a custom algorithm that checks each token's estimated time against all break periods.

4. **Email Deliverability**: Gmail SMTP has sending limits and sometimes emails were marked as spam. We had to configure app-specific passwords and format our emails properly to improve deliverability.

5. **State Management**: Managing complex state across multiple components (especially the doctor dashboard with queue, prescriptions, and settings) required careful use of TanStack Query and React state.

**Known Limitations:**

1. **No Video Consultations**: The system currently only supports in-person appointments. Telemedicine features are planned for future work.
2. **Email Only**: No SMS or WhatsApp notifications. This limits reach to users without regular email access.
3. **English Only**: The interface is only in English. Urdu support would significantly improve accessibility in Pakistan.
4. **AI Accuracy**: The symptom checker relies on our knowledge base quality and the AI model's general knowledge. It should never be used as a substitute for professional medical advice.
5. **Single Clinic Focus**: While the organization module supports multi-doctor setups, the system is primarily designed for individual clinics rather than hospital networks.

---

# Chapter 7: Conclusion and Future Work

## 7.1 Conclusion

MediCare+ has been successfully developed as a comprehensive web-based healthcare appointment management system with AI-powered symptom analysis. Looking back at this project, we can honestly say it was one of the most challenging but rewarding things we have done in our four years at PAF-IAST.

The system addresses real problems in the Pakistani healthcare sector — manual appointment management, paper-based records, lack of patient guidance, and inefficient clinic operations. By building MediCare+, we have shown that it is possible to create an affordable, full-featured healthcare management platform using modern web technologies.

**Key Achievements:**
- Built a complete multi-role platform (Patient, Doctor, PA, Admin, Organization) with 20+ database tables and 18 serverless edge functions
- Implemented a token-based queue management system with break-aware estimated wait times
- Created an AI symptom checker using a RAG approach that combines a local knowledge base with a pre-trained language model
- Integrated Stripe for subscription management with three pricing tiers
- Built a digital prescription system with QR-based public verification
- Implemented comprehensive security with Row Level Security on every table
- Deployed the system with automated CI/CD on Vercel and Supabase

The technology choices we made — React, TypeScript, Supabase, Tailwind CSS — proved to be the right ones. They allowed us to build a complex system relatively quickly while maintaining code quality. Supabase in particular saved us tremendous time by providing authentication, database, storage, and edge functions out of the box.

We learned a lot during this project — not just about the technologies, but about project management, teamwork, and building real-world software. The experience of going from a blank page to a fully functional system with 80+ components and 100+ files has given us confidence for our professional careers.

## 7.2 Future Enhancements

While MediCare+ is feature-complete for our FYP scope, there are several areas where it can be improved:

1. **Python-Based RAG AI Agent**: Build a standalone Python service using LangChain with vector embeddings (e.g., ChromaDB) for more advanced and accurate symptom analysis. This would replace the current keyword-based retrieval with semantic search.

2. **Telemedicine / Video Consultations**: Integrate WebRTC-based video calling so doctors can conduct remote consultations. This would be especially useful for follow-up appointments and patients in remote areas.

3. **Mobile Application**: Develop a React Native mobile app or convert the web app to a Progressive Web App (PWA) for better mobile experience with push notifications.

4. **SMS & WhatsApp Notifications**: Integrate with Twilio or WhatsApp Business API for text-based notifications, since not all patients regularly check email.

5. **Multi-Language Support**: Add Urdu and regional language translations to make the platform more accessible for Pakistan's diverse population.

6. **Lab Integration**: Allow labs to directly upload test results that link to patient records, eliminating the need for patients to manually bring reports.

7. **Insurance Processing**: Add insurance claim management and verification to support patients with health insurance coverage.

8. **Advanced Analytics**: Build more detailed analytics dashboards with exportable PDF reports for clinic administration and health departments.

9. **Appointment Reminders via Calendar**: Send calendar invites (ICS files) that patients can add to their Google Calendar or iPhone Calendar.

10. **Patient Chat**: Add a simple messaging system between patients and their doctors for post-consultation follow-up questions.

---

# Bibliography

[1] Facebook Inc., "React – A JavaScript Library for Building User Interfaces," 2024. [Online]. Available: https://react.dev. [Accessed: Jan 2026].

[2] Supabase Inc., "Supabase – The Open Source Firebase Alternative," 2024. [Online]. Available: https://supabase.com/docs. [Accessed: Dec 2025].

[3] Tailwind Labs, "Tailwind CSS – Utility-First CSS Framework," 2024. [Online]. Available: https://tailwindcss.com. [Accessed: Dec 2025].

[4] Vercel Inc., "Vite – Next Generation Frontend Tooling," 2024. [Online]. Available: https://vitejs.dev. [Accessed: Dec 2025].

[5] Stripe Inc., "Stripe Documentation – Payment Processing," 2024. [Online]. Available: https://stripe.com/docs. [Accessed: Jan 2026].

[6] shadcn, "shadcn/ui – Re-usable Components Built with Radix UI and Tailwind CSS," 2024. [Online]. Available: https://ui.shadcn.com. [Accessed: Dec 2025].

[7] TanStack, "TanStack Query – Powerful Asynchronous State Management," 2024. [Online]. Available: https://tanstack.com/query. [Accessed: Dec 2025].

[8] P. Lewis, E. Perez, A. Piktus et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks," Advances in Neural Information Processing Systems, vol. 33, pp. 9459-9474, 2020.

[9] World Health Organization, "Digital Health," 2024. [Online]. Available: https://www.who.int/health-topics/digital-health. [Accessed: Jan 2026].

[10] Pakistan Telecommunication Authority, "Annual Report 2024 – Telecom Indicators," 2024. [Online]. Available: https://www.pta.gov.pk. [Accessed: Jan 2026].

[11] Deno Land Inc., "Deno – A Modern Runtime for JavaScript and TypeScript," 2024. [Online]. Available: https://deno.land. [Accessed: Dec 2025].

[12] Google, "Gemini – Google's AI Model," 2025. [Online]. Available: https://ai.google.dev. [Accessed: Jan 2026].

[13] PostgreSQL Global Development Group, "PostgreSQL Documentation – Row Security Policies," 2024. [Online]. Available: https://www.postgresql.org/docs/current/ddl-rowsecurity.html. [Accessed: Dec 2025].

[14] Framer Motion, "Framer Motion – A Production-Ready Motion Library for React," 2024. [Online]. Available: https://www.framer.com/motion. [Accessed: Dec 2025].

[15] Mayo Clinic, "Symptom Checker – Mayo Clinic," 2024. [Online]. Available: https://www.mayoclinic.org/symptom-checker. [Accessed: Jan 2026].

---

*MediCare+: A Smart Healthcare Appointment Management System with AI-Powered Symptom Analysis*
*Final Year Project Report — BS Computer Science*
*Pak-Austria Fachhochschule: Institute of Applied Sciences and Technology*
*Spring 2026*

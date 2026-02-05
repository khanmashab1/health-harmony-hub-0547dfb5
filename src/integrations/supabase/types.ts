export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          allergies: string | null
          appointment_date: string
          created_at: string
          department: string | null
          diagnosis: string | null
          doctor_comments: string | null
          doctor_user_id: string
          follow_up_date: string | null
          follow_up_reminder_sent: boolean | null
          id: string
          is_paused: boolean | null
          lab_tests: string | null
          medicines: string | null
          patient_email: string | null
          patient_full_name: string | null
          patient_phone: string | null
          patient_user_id: string | null
          payment_method: string
          payment_status: string
          reason: string | null
          receipt_path: string | null
          status: string
          token_number: number
          updated_at: string
          vitals_bp: string | null
          vitals_heart_rate: string | null
          vitals_temperature: string | null
          vitals_weight: string | null
        }
        Insert: {
          allergies?: string | null
          appointment_date: string
          created_at?: string
          department?: string | null
          diagnosis?: string | null
          doctor_comments?: string | null
          doctor_user_id: string
          follow_up_date?: string | null
          follow_up_reminder_sent?: boolean | null
          id?: string
          is_paused?: boolean | null
          lab_tests?: string | null
          medicines?: string | null
          patient_email?: string | null
          patient_full_name?: string | null
          patient_phone?: string | null
          patient_user_id?: string | null
          payment_method?: string
          payment_status?: string
          reason?: string | null
          receipt_path?: string | null
          status?: string
          token_number: number
          updated_at?: string
          vitals_bp?: string | null
          vitals_heart_rate?: string | null
          vitals_temperature?: string | null
          vitals_weight?: string | null
        }
        Update: {
          allergies?: string | null
          appointment_date?: string
          created_at?: string
          department?: string | null
          diagnosis?: string | null
          doctor_comments?: string | null
          doctor_user_id?: string
          follow_up_date?: string | null
          follow_up_reminder_sent?: boolean | null
          id?: string
          is_paused?: boolean | null
          lab_tests?: string | null
          medicines?: string | null
          patient_email?: string | null
          patient_full_name?: string | null
          patient_phone?: string | null
          patient_user_id?: string | null
          payment_method?: string
          payment_status?: string
          reason?: string | null
          receipt_path?: string | null
          status?: string
          token_number?: number
          updated_at?: string
          vitals_bp?: string | null
          vitals_heart_rate?: string | null
          vitals_temperature?: string | null
          vitals_weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_user_id_fkey"
            columns: ["doctor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_slots: {
        Row: {
          blocked_date: string
          blocked_time: string | null
          created_at: string
          doctor_user_id: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_date: string
          blocked_time?: string | null
          created_at?: string
          doctor_user_id: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_date?: string
          blocked_time?: string | null
          created_at?: string
          doctor_user_id?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_slots_doctor_user_id_fkey"
            columns: ["doctor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disease_symptoms: {
        Row: {
          created_at: string
          id: string
          recommendation: string | null
          symptom_keywords: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          recommendation?: string | null
          symptom_keywords: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          recommendation?: string | null
          symptom_keywords?: string
          title?: string
        }
        Relationships: []
      }
      doctor_applications: {
        Row: {
          admin_notes: string | null
          bio: string | null
          city: string | null
          consultation_fee: number
          created_at: string
          date_of_birth: string | null
          degree: string
          degree_certificate_path: string | null
          email: string
          experience_years: number
          full_name: string
          gender: string | null
          id: string
          medical_license_path: string | null
          phone: string
          province: string | null
          qualifications: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selected_plan_id: string | null
          specialty: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          bio?: string | null
          city?: string | null
          consultation_fee: number
          created_at?: string
          date_of_birth?: string | null
          degree: string
          degree_certificate_path?: string | null
          email: string
          experience_years: number
          full_name: string
          gender?: string | null
          id?: string
          medical_license_path?: string | null
          phone: string
          province?: string | null
          qualifications?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selected_plan_id?: string | null
          specialty: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          bio?: string | null
          city?: string | null
          consultation_fee?: number
          created_at?: string
          date_of_birth?: string | null
          degree?: string
          degree_certificate_path?: string | null
          email?: string
          experience_years?: number
          full_name?: string
          gender?: string | null
          id?: string
          medical_license_path?: string | null
          phone?: string
          province?: string | null
          qualifications?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selected_plan_id?: string | null
          specialty?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_applications_selected_plan_id_fkey"
            columns: ["selected_plan_id"]
            isOneToOne: false
            referencedRelation: "doctor_payment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_breaks: {
        Row: {
          applies_to_days: number[] | null
          break_name: string
          created_at: string
          doctor_user_id: string
          end_time: string
          id: string
          is_active: boolean | null
          start_time: string
          updated_at: string
        }
        Insert: {
          applies_to_days?: number[] | null
          break_name: string
          created_at?: string
          doctor_user_id: string
          end_time: string
          id?: string
          is_active?: boolean | null
          start_time: string
          updated_at?: string
        }
        Update: {
          applies_to_days?: number[] | null
          break_name?: string
          created_at?: string
          doctor_user_id?: string
          end_time?: string
          id?: string
          is_active?: boolean | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_breaks_doctor_user_id_fkey"
            columns: ["doctor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_payment_plans: {
        Row: {
          billing_period: string
          created_at: string
          description: string | null
          features: string[] | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          price: number
          sort_order: number | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          billing_period?: string
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          price?: number
          sort_order?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_period?: string
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          price?: number
          sort_order?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      doctor_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          doctor_user_id: string
          end_time: string
          id: string
          is_available: boolean | null
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          doctor_user_id: string
          end_time?: string
          id?: string
          is_available?: boolean | null
          start_time?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          doctor_user_id?: string
          end_time?: string
          id?: string
          is_available?: boolean | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_schedules_doctor_user_id_fkey"
            columns: ["doctor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          bank_account_number: string | null
          bank_account_title: string | null
          bank_name: string | null
          bio: string | null
          city: string | null
          consultation_duration: number | null
          created_at: string
          degree: string | null
          easypaisa_number: string | null
          experience_years: number | null
          fee: number
          image_path: string | null
          jazzcash_number: string | null
          max_patients_per_day: number
          province: string | null
          qualifications: string | null
          rating: number | null
          selected_plan_id: string | null
          specialty: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_account_number?: string | null
          bank_account_title?: string | null
          bank_name?: string | null
          bio?: string | null
          city?: string | null
          consultation_duration?: number | null
          created_at?: string
          degree?: string | null
          easypaisa_number?: string | null
          experience_years?: number | null
          fee?: number
          image_path?: string | null
          jazzcash_number?: string | null
          max_patients_per_day?: number
          province?: string | null
          qualifications?: string | null
          rating?: number | null
          selected_plan_id?: string | null
          specialty: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_account_number?: string | null
          bank_account_title?: string | null
          bank_name?: string | null
          bio?: string | null
          city?: string | null
          consultation_duration?: number | null
          created_at?: string
          degree?: string | null
          easypaisa_number?: string | null
          experience_years?: number | null
          fee?: number
          image_path?: string | null
          jazzcash_number?: string | null
          max_patients_per_day?: number
          province?: string | null
          qualifications?: string | null
          rating?: number | null
          selected_plan_id?: string | null
          specialty?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctors_selected_plan_id_fkey"
            columns: ["selected_plan_id"]
            isOneToOne: false
            referencedRelation: "doctor_payment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          appointment_id: string | null
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          recipient_email: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          recipient_email?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_template: string
          clinic_logo_url: string | null
          clinic_name: string | null
          created_at: string
          footer_text: string | null
          header_text: string | null
          id: string
          primary_color: string | null
          subject: string
          template_type: string
          updated_at: string
        }
        Insert: {
          body_template: string
          clinic_logo_url?: string | null
          clinic_name?: string | null
          created_at?: string
          footer_text?: string | null
          header_text?: string | null
          id?: string
          primary_color?: string | null
          subject: string
          template_type: string
          updated_at?: string
        }
        Update: {
          body_template?: string
          clinic_logo_url?: string | null
          clinic_name?: string | null
          created_at?: string
          footer_text?: string | null
          header_text?: string | null
          id?: string
          primary_color?: string | null
          subject?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      health_metrics: {
        Row: {
          created_at: string
          diastolic: number | null
          id: string
          metric_date: string
          notes: string | null
          patient_user_id: string
          sugar_level: number | null
          systolic: number | null
          weight: number | null
        }
        Insert: {
          created_at?: string
          diastolic?: number | null
          id?: string
          metric_date?: string
          notes?: string | null
          patient_user_id: string
          sugar_level?: number | null
          systolic?: number | null
          weight?: number | null
        }
        Update: {
          created_at?: string
          diastolic?: number | null
          id?: string
          metric_date?: string
          notes?: string | null
          patient_user_id?: string
          sugar_level?: number | null
          systolic?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_metrics_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_slides: {
        Row: {
          created_at: string
          cta_link: string | null
          cta_text: string | null
          id: string
          image_path: string
          is_active: boolean | null
          sort_order: number | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          id?: string
          image_path: string
          is_active?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          id?: string
          image_path?: string
          is_active?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      managed_patients: {
        Row: {
          created_at: string
          id: string
          manager_user_id: string
          patient_name: string
          patient_user_id: string
          relationship: string
        }
        Insert: {
          created_at?: string
          id?: string
          manager_user_id: string
          patient_name: string
          patient_user_id: string
          relationship?: string
        }
        Update: {
          created_at?: string
          id?: string
          manager_user_id?: string
          patient_name?: string
          patient_user_id?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "managed_patients_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          comments: string | null
          created_at: string
          diagnosis: string | null
          doctor_name: string | null
          id: string
          lab_tests: string | null
          medicines: string | null
          patient_user_id: string
          record_date: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_name?: string | null
          id?: string
          lab_tests?: string | null
          medicines?: string | null
          patient_user_id: string
          record_date?: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_name?: string | null
          id?: string
          lab_tests?: string | null
          medicines?: string | null
          patient_user_id?: string
          record_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      medicines: {
        Row: {
          category: string | null
          created_at: string
          form: string | null
          generic_name: string | null
          id: string
          is_active: boolean | null
          manufacturer: string | null
          name: string
          strength: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          form?: string | null
          generic_name?: string | null
          id?: string
          is_active?: boolean | null
          manufacturer?: string | null
          name: string
          strength?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          form?: string | null
          generic_name?: string | null
          id?: string
          is_active?: boolean | null
          manufacturer?: string | null
          name?: string
          strength?: string | null
        }
        Relationships: []
      }
      pa_assignments: {
        Row: {
          created_at: string
          doctor_user_id: string
          id: string
          pa_user_id: string
        }
        Insert: {
          created_at?: string
          doctor_user_id: string
          id?: string
          pa_user_id: string
        }
        Update: {
          created_at?: string
          doctor_user_id?: string
          id?: string
          pa_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pa_assignments_doctor_user_id_fkey"
            columns: ["doctor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pa_assignments_pa_user_id_fkey"
            columns: ["pa_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          avatar_path: string | null
          blood_type: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          first_login_welcomed: boolean | null
          gender: string | null
          id: string
          name: string | null
          patient_id: string | null
          phone: string | null
          province: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          avatar_path?: string | null
          blood_type?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_login_welcomed?: boolean | null
          gender?: string | null
          id: string
          name?: string | null
          patient_id?: string | null
          phone?: string | null
          province?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          avatar_path?: string | null
          blood_type?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_login_welcomed?: boolean | null
          gender?: string | null
          id?: string
          name?: string | null
          patient_id?: string | null
          phone?: string | null
          province?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          display_name: string
          doctor_user_id: string | null
          id: string
          patient_user_id: string | null
          rating: number
          source: string | null
          status: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          display_name: string
          doctor_user_id?: string | null
          id?: string
          patient_user_id?: string | null
          rating: number
          source?: string | null
          status?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          display_name?: string
          doctor_user_id?: string | null
          id?: string
          patient_user_id?: string | null
          rating?: number
          source?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_doctor_user_id_fkey"
            columns: ["doctor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      symptom_knowledge: {
        Row: {
          advice: string
          created_at: string
          description: string
          id: string
          red_flags: string | null
          severity: string
          source: string | null
          symptom: string
          when_to_seek_help: string | null
        }
        Insert: {
          advice: string
          created_at?: string
          description: string
          id?: string
          red_flags?: string | null
          severity: string
          source?: string | null
          symptom: string
          when_to_seek_help?: string | null
        }
        Update: {
          advice?: string
          created_at?: string
          description?: string
          id?: string
          red_flags?: string | null
          severity?: string
          source?: string | null
          symptom?: string
          when_to_seek_help?: string | null
        }
        Relationships: []
      }
      symptom_submissions: {
        Row: {
          age: number | null
          created_at: string
          duration: string | null
          gender: string | null
          id: string
          medical_history: string | null
          patient_user_id: string | null
          result_advice: string | null
          result_condition: string | null
          result_confidence: number | null
          selected_tags: string[] | null
          severity: string | null
          symptoms_text: string | null
        }
        Insert: {
          age?: number | null
          created_at?: string
          duration?: string | null
          gender?: string | null
          id?: string
          medical_history?: string | null
          patient_user_id?: string | null
          result_advice?: string | null
          result_condition?: string | null
          result_confidence?: number | null
          selected_tags?: string[] | null
          severity?: string | null
          symptoms_text?: string | null
        }
        Update: {
          age?: number | null
          created_at?: string
          duration?: string | null
          gender?: string | null
          id?: string
          medical_history?: string | null
          patient_user_id?: string | null
          result_advice?: string | null
          result_condition?: string | null
          result_confidence?: number | null
          selected_tags?: string[] | null
          severity?: string | null
          symptoms_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "symptom_submissions_patient_user_id_fkey"
            columns: ["patient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allocate_token: {
        Args: { p_date: string; p_doctor_id: string }
        Returns: number
      }
      calculate_age: { Args: { birth_date: string }; Returns: number }
      get_available_slots: {
        Args: { p_date: string; p_doctor_id: string }
        Returns: number
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          check_role: Database["public"]["Enums"]["app_role"]
          user_uuid: string
        }
        Returns: boolean
      }
      is_pa_for_doctor: {
        Args: { doctor_uuid: string; pa_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "patient" | "doctor" | "pa" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["patient", "doctor", "pa", "admin"],
    },
  },
} as const

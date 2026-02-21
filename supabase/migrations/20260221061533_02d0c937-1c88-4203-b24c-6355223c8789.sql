
-- Drop has_role and all dependent policies
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;

-- Recreate has_role using user_roles table (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- Recreate all dropped RLS policies

-- profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Doctors can view patient profiles for their appointments" ON public.profiles FOR SELECT USING (EXISTS (SELECT 1 FROM appointments WHERE appointments.patient_user_id = profiles.id AND appointments.doctor_user_id = auth.uid()));
CREATE POLICY "PAs can view profiles for assigned doctors" ON public.profiles FOR SELECT USING (EXISTS (SELECT 1 FROM pa_assignments WHERE pa_assignments.pa_user_id = auth.uid()));

-- user_roles
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- doctors
CREATE POLICY "Admins can manage doctors" ON public.doctors FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- pa_assignments
CREATE POLICY "Admins can manage PA assignments" ON public.pa_assignments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- appointments
CREATE POLICY "Admins can manage all appointments" ON public.appointments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- blocked_slots
CREATE POLICY "Admins can manage all blocked slots" ON public.blocked_slots FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- health_metrics
CREATE POLICY "Doctors can view patient health metrics" ON public.health_metrics FOR SELECT USING (public.has_role(auth.uid(), 'doctor') AND EXISTS (SELECT 1 FROM appointments WHERE appointments.patient_user_id = health_metrics.patient_user_id AND appointments.doctor_user_id = auth.uid()));
CREATE POLICY "Admins can view all health metrics" ON public.health_metrics FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- medical_records
CREATE POLICY "Doctors can manage medical records for their patients" ON public.medical_records FOR ALL USING (EXISTS (SELECT 1 FROM appointments WHERE appointments.patient_user_id = medical_records.patient_user_id AND appointments.doctor_user_id = auth.uid()));
CREATE POLICY "Admins can view all medical records" ON public.medical_records FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- reviews
CREATE POLICY "Admins can manage all reviews" ON public.reviews FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- symptom_submissions
CREATE POLICY "Admins can view all symptom submissions" ON public.symptom_submissions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- audit_logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- email_logs
CREATE POLICY "Admins can manage email logs" ON public.email_logs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- email_templates
CREATE POLICY "Admins can manage email templates" ON public.email_templates FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- symptom_knowledge
CREATE POLICY "Admins can manage symptom knowledge" ON public.symptom_knowledge FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- hero_slides
CREATE POLICY "Admins can manage hero slides" ON public.hero_slides FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- site_settings
CREATE POLICY "Admins can manage site settings" ON public.site_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- medicines
CREATE POLICY "Admins can manage medicines" ON public.medicines FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- managed_patients
CREATE POLICY "Admins can view all managed patients" ON public.managed_patients FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- doctor_schedules
CREATE POLICY "Admins can manage all schedules" ON public.doctor_schedules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- doctor_breaks
CREATE POLICY "Admins can manage all breaks" ON public.doctor_breaks FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- doctor_payment_plans
CREATE POLICY "Admins can manage payment plans" ON public.doctor_payment_plans FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ai_usage_tracking
CREATE POLICY "Admins can view all usage" ON public.ai_usage_tracking FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- patient_ai_plans
CREATE POLICY "Admins can manage plans" ON public.patient_ai_plans FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- patient_ai_credits
CREATE POLICY "Admins can manage all credits" ON public.patient_ai_credits FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- patient_ai_purchases
CREATE POLICY "Admins can view all purchases" ON public.patient_ai_purchases FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- test_reports
CREATE POLICY "Admins can manage all test reports" ON public.test_reports FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- diet_plans
CREATE POLICY "Admins can view all diet plans" ON public.diet_plans FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- doctor_applications
CREATE POLICY "Admins can view all applications" ON public.doctor_applications FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update applications" ON public.doctor_applications FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete applications" ON public.doctor_applications FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- foods
CREATE POLICY "Admins can manage foods" ON public.foods FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- pharmacies
CREATE POLICY "Admins can manage all pharmacies" ON public.pharmacies FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- pharmacy tables
CREATE POLICY "Admins can manage all inventory" ON public.pharmacy_inventory FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage all sales" ON public.pharmacy_sales FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage all sale items" ON public.pharmacy_sale_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage all supplier orders" ON public.pharmacy_supplier_orders FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage all order items" ON public.pharmacy_order_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage all cashiers" ON public.pharmacy_cashiers FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage all stock logs" ON public.pharmacy_stock_logs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Storage policies
CREATE POLICY "Admins can view all receipts" ON storage.objects FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can upload hero slides images" ON storage.objects FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') AND bucket_id = 'hero-slides');
CREATE POLICY "Admins can update hero slides images" ON storage.objects FOR UPDATE USING (public.has_role(auth.uid(), 'admin') AND bucket_id = 'hero-slides');
CREATE POLICY "Admins can delete hero slides images" ON storage.objects FOR DELETE USING (public.has_role(auth.uid(), 'admin') AND bucket_id = 'hero-slides');
CREATE POLICY "Admins can view application documents" ON storage.objects FOR SELECT USING (public.has_role(auth.uid(), 'admin') AND bucket_id = 'doctor-applications');
CREATE POLICY "Admins can delete application documents" ON storage.objects FOR DELETE USING (public.has_role(auth.uid(), 'admin') AND bucket_id = 'doctor-applications');

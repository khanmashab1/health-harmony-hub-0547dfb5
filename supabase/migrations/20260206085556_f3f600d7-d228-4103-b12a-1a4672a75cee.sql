-- Create organizations table for multi-doctor Enterprise support
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'active',
  subscription_plan_id UUID REFERENCES public.doctor_payment_plans(id),
  max_doctors INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add organization_id to doctors table
ALTER TABLE public.doctors 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Create organization_members table to track admins and roles within org
CREATE TABLE public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for organizations
CREATE POLICY "Organization owners can view their organization"
ON public.organizations FOR SELECT
USING (owner_user_id = auth.uid());

CREATE POLICY "Organization members can view their organization"
ON public.organizations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = organizations.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Organization owners can update their organization"
ON public.organizations FOR UPDATE
USING (owner_user_id = auth.uid());

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations FOR INSERT
WITH CHECK (auth.uid() = owner_user_id);

-- RLS policies for organization_members
CREATE POLICY "Organization owners can manage members"
ON public.organization_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = organization_members.organization_id AND owner_user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can view members"
ON public.organization_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om 
    WHERE om.organization_id = organization_members.organization_id 
    AND om.user_id = auth.uid() 
    AND om.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Members can view their own membership"
ON public.organization_members FOR SELECT
USING (user_id = auth.uid());

-- Function to check if user is org admin
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations WHERE id = org_id AND owner_user_id = check_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = org_id AND user_id = check_user_id AND role IN ('owner', 'admin')
  );
$$;

-- Trigger for updated_at
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_doctors_organization_id ON public.doctors(organization_id);
CREATE INDEX idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org_id ON public.organization_members(organization_id);
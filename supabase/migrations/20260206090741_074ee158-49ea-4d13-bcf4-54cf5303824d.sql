-- Create security definer function to check organization membership without recursion
CREATE OR REPLACE FUNCTION public.is_org_member(check_user_id uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = org_id AND user_id = check_user_id
  );
$$;

-- Create security definer function to check if user owns an organization
CREATE OR REPLACE FUNCTION public.is_org_owner(check_user_id uuid, org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = org_id AND owner_user_id = check_user_id
  );
$$;

-- Drop existing problematic policies on organizations
DROP POLICY IF EXISTS "Organization members can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- Create fixed policies for organizations table
CREATE POLICY "Owners can view their organization"
ON public.organizations FOR SELECT
USING (owner_user_id = auth.uid());

CREATE POLICY "Members can view their organization"
ON public.organizations FOR SELECT
USING (public.is_org_member(auth.uid(), id));

CREATE POLICY "Owners can update their organization"
ON public.organizations FOR UPDATE
USING (owner_user_id = auth.uid());

CREATE POLICY "Users can create organizations"
ON public.organizations FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

-- Drop and recreate organization_members policies to avoid recursion
DROP POLICY IF EXISTS "Organization admins can view members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Members can view their own membership" ON public.organization_members;

-- Create fixed policies for organization_members table
CREATE POLICY "Members can view own membership"
ON public.organization_members FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Org admins can view all members"
ON public.organization_members FOR SELECT
USING (public.is_org_owner(auth.uid(), organization_id));

CREATE POLICY "Org owners can manage members"
ON public.organization_members FOR ALL
USING (public.is_org_owner(auth.uid(), organization_id));
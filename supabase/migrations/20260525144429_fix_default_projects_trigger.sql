/*
  # Fix create_default_projects trigger

  The trigger was failing during signup because the function lacked a proper
  search_path, causing it to fail to resolve the public.projects table when
  called from the auth schema context. Also adds error handling so a trigger
  failure never blocks user creation.
*/

CREATE OR REPLACE FUNCTION public.create_default_projects()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.projects (user_id, name, slug, icon, color, is_default) VALUES
    (NEW.id, 'aiwithrakshith', 'aiwithrakshith', '🎯', 'blue', true),
    (NEW.id, 'aiwithpanchami', 'aiwithpanchami', '✨', 'purple', true);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log but don't block user creation
  RAISE WARNING 'create_default_projects failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Recreate the trigger to make sure it uses the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_projects();

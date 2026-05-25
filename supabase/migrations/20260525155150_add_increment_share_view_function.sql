/*
  # Add increment_share_view RPC function
  Safely increments view_count on file_shares without requiring a full UPDATE policy for anon users.
*/
CREATE OR REPLACE FUNCTION increment_share_view(share_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE file_shares SET view_count = view_count + 1 WHERE id = share_id;
$$;

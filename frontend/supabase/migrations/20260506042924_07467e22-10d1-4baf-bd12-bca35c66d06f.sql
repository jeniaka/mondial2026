-- Allow league creator to remove (kick) any member from their league
CREATE POLICY "Creator can kick members"
ON public.league_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leagues l
    WHERE l.id = league_members.league_id
      AND l.created_by = auth.uid()
  )
);

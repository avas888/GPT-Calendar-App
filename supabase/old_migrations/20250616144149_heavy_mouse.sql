/*
  # Fix Personal Table RLS Policies for Development

  1. Security Changes
    - Add temporary development-friendly policies for personal table
    - Allow authenticated users to manage personal records during development
    - Maintain existing admin policies for production use
  
  2. Changes Made
    - Add policy to allow authenticated users to insert personal records
    - Add policy to allow authenticated users to update personal records
    - Add policy to allow authenticated users to delete personal records
    - Keep existing admin and read policies intact

  Note: These policies are for development purposes. In production, 
  proper role-based access should be implemented.
*/

-- Add development-friendly policies for personal table
CREATE POLICY "Allow authenticated users to insert personal (dev)"
  ON personal
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update personal (dev)"
  ON personal
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete personal (dev)"
  ON personal
  FOR DELETE
  TO authenticated
  USING (true);
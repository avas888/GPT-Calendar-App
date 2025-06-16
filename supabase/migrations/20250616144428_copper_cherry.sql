/*
  # Add development policies for personal table

  1. Security Changes
    - Add temporary policies to allow anonymous users to perform CRUD operations on personal table
    - These policies are intended for MVP development mode only
    - Existing admin policies remain intact for production use

  2. Important Notes
    - These policies should be removed or restricted in production
    - The policies allow full access to anonymous users for development purposes
    - Consider implementing proper authentication before production deployment
*/

-- Add policy to allow anonymous users to read personal records (for development)
CREATE POLICY "Allow anonymous read for development"
  ON personal
  FOR SELECT
  TO anon
  USING (true);

-- Add policy to allow anonymous users to insert personal records (for development)
CREATE POLICY "Allow anonymous insert for development"
  ON personal
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Add policy to allow anonymous users to update personal records (for development)
CREATE POLICY "Allow anonymous update for development"
  ON personal
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Add policy to allow anonymous users to delete personal records (for development)
CREATE POLICY "Allow anonymous delete for development"
  ON personal
  FOR DELETE
  TO anon
  USING (true);
-- =============================================
-- STEP 1: Add 'directeur' to grade_hierarchique enum
-- =============================================
ALTER TYPE public.grade_hierarchique ADD VALUE IF NOT EXISTS 'directeur' AFTER 'secretaire_permanent';
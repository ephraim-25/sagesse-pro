ALTER TABLE public.telework_sessions
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS location_accuracy double precision,
  ADD COLUMN IF NOT EXISTS is_vpn boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_proxy boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS network_check jsonb;
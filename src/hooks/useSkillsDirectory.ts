import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SkillRow {
  id: string;
  category: string;
  label: string;
  active: boolean;
  sort_order: number;
}

export function useSkillsDirectory(opts: { onlyActive?: boolean } = {}) {
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = (supabase as any)
      .from("skills_directory")
      .select("id, category, label, active, sort_order")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });
    if (opts.onlyActive) q = q.eq("active", true);
    const { data } = await q;
    setSkills((data as SkillRow[]) || []);
    setLoading(false);
  }, [opts.onlyActive]);

  useEffect(() => {
    load();
  }, [load]);

  return { skills, loading, reload: load };
}

export function groupByCategory(skills: SkillRow[]): Record<string, SkillRow[]> {
  return skills.reduce<Record<string, SkillRow[]>>((acc, s) => {
    (acc[s.category] ||= []).push(s);
    return acc;
  }, {});
}

export const NIVEAU_OPTIONS = [
  { value: 2, label: "Junior" },
  { value: 3, label: "Intermédiaire" },
  { value: 5, label: "Expert" },
] as const;

export function niveauLabel(n: number | null | undefined): string {
  if (n === 2) return "Junior";
  if (n === 3) return "Intermédiaire";
  if (n === 5) return "Expert";
  return "Non évalué";
}

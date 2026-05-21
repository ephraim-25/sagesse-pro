// Integration tests for hierarchical inheritance.
//
// Cover:
//   1. RPC `resolve_profile_structure` — walks the supervisor chain and
//      returns the inherited Bureau / Division / Direction for a profile.
//   2. Trigger `prevent_superieur_cycle` — blocks self-reference and
//      blocks descendant→ancestor cycles in the supervisor chain.
//
// Full-auth scenario (no SERVICE_ROLE). Each test account updates ONLY
// its own profile (profiles_update_own RLS). The chain is :
//   Directeur  →  Chef de Division  →  Chef de Bureau
//
// Required env (test is skipped if missing) :
//   SUPABASE_URL                 (or VITE_SUPABASE_URL)
//   SUPABASE_ANON_KEY            (or SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_PUBLISHABLE_KEY)
//   TEST_DIRECTOR_EMAIL / TEST_DIRECTOR_PASSWORD
//   TEST_DIVISION_EMAIL / TEST_DIVISION_PASSWORD
//   TEST_BUREAU_EMAIL   / TEST_BUREAU_PASSWORD
//
// Run :
//   deno test --allow-net --allow-env supabase/functions/_tests/resolve_profile_structure_test.ts

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { assert, assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "";
const ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  "";

const DIR_EMAIL = Deno.env.get("TEST_DIRECTOR_EMAIL") ?? "";
const DIR_PASSWORD = Deno.env.get("TEST_DIRECTOR_PASSWORD") ?? "";
const DIV_EMAIL = Deno.env.get("TEST_DIVISION_EMAIL") ?? "";
const DIV_PASSWORD = Deno.env.get("TEST_DIVISION_PASSWORD") ?? "";
const BUR_EMAIL = Deno.env.get("TEST_BUREAU_EMAIL") ?? "";
const BUR_PASSWORD = Deno.env.get("TEST_BUREAU_PASSWORD") ?? "";

const ENV_READY = Boolean(
  SUPABASE_URL && ANON_KEY &&
    DIR_EMAIL && DIR_PASSWORD &&
    DIV_EMAIL && DIV_PASSWORD &&
    BUR_EMAIL && BUR_PASSWORD,
);

if (!ENV_READY) {
  console.warn(
    "[resolve_profile_structure_test] SKIPPED — set SUPABASE_URL, SUPABASE_ANON_KEY and " +
      "TEST_{DIRECTOR,DIVISION,BUREAU}_{EMAIL,PASSWORD} to run.",
  );
}

function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
}

async function signIn(email: string, password: string): Promise<SupabaseClient> {
  const c = anonClient();
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn(${email}) failed: ${error.message}`);
  return c;
}

async function getOwnProfileId(c: SupabaseClient): Promise<string> {
  const { data, error } = await c
    .from("profiles")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (error || !data) throw new Error(`getOwnProfileId failed: ${error?.message ?? "no row"}`);
  return data.id as string;
}

async function updateOwn(
  c: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<{ error: unknown }> {
  const { error } = await c.from("profiles").update(patch).eq("id", id);
  return { error };
}

Deno.test({
  name: "resolve_profile_structure: hérite Bureau/Division/Direction via la chaîne hiérarchique",
  ignore: !ENV_READY,
  fn: async () => {
    const tag = `IT-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 6)}`;
    const dirName = `Direction ${tag}`;
    const divName = `Division ${tag}`;
    const burName = `Bureau ${tag}`;

    // 1. Directeur : racine de la chaîne
    const dirC = await signIn(DIR_EMAIL, DIR_PASSWORD);
    const directorId = await getOwnProfileId(dirC);
    let r = await updateOwn(dirC, directorId, {
      nom_direction: dirName,
      superieur_id: null,
    });
    assert(!r.error, `directeur update failed: ${(r.error as any)?.message}`);

    // 2. Chef de Division : superieur = directeur
    const divC = await signIn(DIV_EMAIL, DIV_PASSWORD);
    const divisionId = await getOwnProfileId(divC);
    r = await updateOwn(divC, divisionId, {
      nom_division: divName,
      superieur_id: directorId,
    });
    assert(!r.error, `division update failed: ${(r.error as any)?.message}`);

    // 3. Chef de Bureau : superieur = division
    const burC = await signIn(BUR_EMAIL, BUR_PASSWORD);
    const bureauId = await getOwnProfileId(burC);
    r = await updateOwn(burC, bureauId, {
      nom_bureau: burName,
      superieur_id: divisionId,
    });
    assert(!r.error, `bureau update failed: ${(r.error as any)?.message}`);

    // 4. Résolution : depuis le chef de bureau on doit retrouver les 3 niveaux
    const { data, error } = await burC.rpc("resolve_profile_structure", {
      p_profile_id: bureauId,
    });
    assert(!error, `RPC failed: ${error?.message}`);
    assert(Array.isArray(data) && data.length === 1, "RPC must return one row");
    const row = (data as any[])[0];
    assertEquals(row.bureau, burName, "bureau doit être hérité du chef de bureau");
    assertEquals(row.division, divName, "division doit être héritée du chef de division");
    assertEquals(row.direction, dirName, "direction doit être héritée du directeur");

    // Cleanup partiel : on casse la chaîne pour les prochains runs
    await updateOwn(burC, bureauId, { superieur_id: null });
    await updateOwn(divC, divisionId, { superieur_id: null });

    await dirC.auth.signOut();
    await divC.auth.signOut();
    await burC.auth.signOut();
  },
});

Deno.test({
  name: "prevent_superieur_cycle: refuse l'auto-référence (id = superieur_id)",
  ignore: !ENV_READY,
  fn: async () => {
    const dirC = await signIn(DIR_EMAIL, DIR_PASSWORD);
    const directorId = await getOwnProfileId(dirC);

    const { error } = await updateOwn(dirC, directorId, { superieur_id: directorId });
    assert(error, "l'auto-référence doit être bloquée par le trigger");
    const msg = String((error as any)?.message ?? "").toLowerCase();
    assert(
      msg.includes("propre supérieur") || msg.includes("cycle") || msg.includes("supérieur"),
      `message inattendu: ${(error as any)?.message}`,
    );

    await dirC.auth.signOut();
  },
});

Deno.test({
  name: "prevent_superieur_cycle: refuse un cycle indirect (ancêtre → descendant)",
  ignore: !ENV_READY,
  fn: async () => {
    const tag = `IT-CYC-${Date.now().toString(36)}`;

    // Reconstruire une mini-chaîne : directeur → division
    const dirC = await signIn(DIR_EMAIL, DIR_PASSWORD);
    const directorId = await getOwnProfileId(dirC);
    await updateOwn(dirC, directorId, { nom_direction: `Direction ${tag}`, superieur_id: null });

    const divC = await signIn(DIV_EMAIL, DIV_PASSWORD);
    const divisionId = await getOwnProfileId(divC);
    let r = await updateOwn(divC, divisionId, {
      nom_division: `Division ${tag}`,
      superieur_id: directorId,
    });
    assert(!r.error, `setup division failed: ${(r.error as any)?.message}`);

    // Tentative : le directeur (ancêtre) prend pour supérieur sa propre division (descendant)
    const { error } = await updateOwn(dirC, directorId, { superieur_id: divisionId });
    assert(error, "un cycle indirect doit être détecté et bloqué");
    const msg = String((error as any)?.message ?? "").toLowerCase();
    assert(msg.includes("cycle") || msg.includes("supérieur"), `message inattendu: ${(error as any)?.message}`);

    // Cleanup
    await updateOwn(divC, divisionId, { superieur_id: null });

    await dirC.auth.signOut();
    await divC.auth.signOut();
  },
});

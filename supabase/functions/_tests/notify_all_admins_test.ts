// Integration test for the SECURITY DEFINER RPC `notify_all_admins`.
//
// Full-auth scenario: aucune utilisation de la SERVICE_ROLE_KEY pour exécuter
// la logique sous test. On utilise uniquement :
//   - SUPABASE_URL + SUPABASE_ANON_KEY (clé publishable / publique)
//   - Un compte agent existant (TEST_AGENT_EMAIL / TEST_AGENT_PASSWORD)
//   - Au moins un compte admin pré-existant (la RPC notifie TOUS les admins)
//
// Les comptes peuvent être créés à la main via l'UI d'inscription puis
// promus via la procédure standard de matricule administrateur.
//
// Le test :
//   1. signIn agent (JWT only)
//   2. appelle la RPC notify_all_admins
//   3. vérifie qu'au moins 1 notification a été délivrée (compteur retourné)
//   4. relit les notifications visibles par l'agent (RLS) pour confirmer
//      que sa propre notification n'apparaît PAS (transparence sans auto-spam).
//
// Run with:
//   deno test --allow-net --allow-env supabase/functions/_tests/notify_all_admins_test.ts
//
// Skip si les variables ne sont pas définies — on n'échoue pas le runner.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { assert, assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "";
const ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  "";
const AGENT_EMAIL = Deno.env.get("TEST_AGENT_EMAIL") ?? "";
const AGENT_PASSWORD = Deno.env.get("TEST_AGENT_PASSWORD") ?? "";

const ENV_READY = Boolean(SUPABASE_URL && ANON_KEY && AGENT_EMAIL && AGENT_PASSWORD);

if (!ENV_READY) {
  console.warn(
    "[notify_all_admins_test] SKIPPED — set SUPABASE_URL, SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY), TEST_AGENT_EMAIL and TEST_AGENT_PASSWORD to run this full-auth integration test.",
  );
}

function anonClient() {
  return createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
}

async function signedInAgent() {
  const c = anonClient();
  const { error } = await c.auth.signInWithPassword({
    email: AGENT_EMAIL,
    password: AGENT_PASSWORD,
  });
  if (error) throw new Error(`agent signIn failed: ${error.message}`);
  return c;
}

Deno.test({
  name: "notify_all_admins (full-auth): agent peut alerter tous les admins via RPC",
  ignore: !ENV_READY,
  fn: async () => {
    const c = await signedInAgent();
    const tag = `IT-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;

    const { data: count, error } = await c.rpc("notify_all_admins", {
      p_title: tag,
      p_body: "Full-auth integration test alert from agent",
      p_type: "admin_alert",
      p_meta: { it_tag: tag },
    });

    assert(!error, `RPC failed: ${error?.message}`);
    assert(typeof count === "number", "RPC must return numeric row count");
    assert(
      (count as number) >= 1,
      `expected ≥ 1 admin recipient (provision at least one admin in the project), got ${count}`,
    );

    // L'agent ne doit PAS voir sa propre notification (RLS: notifications_select_own
    // ne renvoie que les notifications adressées à l'agent connecté). On vérifie
    // qu'aucune notification de ce tag n'apparaît côté agent.
    const { data: visible, error: readErr } = await c
      .from("notifications")
      .select("id, title, user_id")
      .eq("title", tag);
    assert(!readErr, `read failed: ${readErr?.message}`);
    assertEquals(
      (visible ?? []).length,
      0,
      "L'agent expéditeur ne doit voir aucune notif (RLS scope par destinataire)",
    );

    await c.auth.signOut();
  },
});

Deno.test({
  name: "notify_all_admins (full-auth): appel anonyme rejeté",
  ignore: !ENV_READY,
  fn: async () => {
    const anon = anonClient();
    const { error } = await anon.rpc("notify_all_admins", {
      p_title: "should-not-pass",
      p_body: null,
      p_type: "admin_alert",
      p_meta: {},
    });
    assert(error, "anonymous call must fail (auth.uid() is null)");
  },
});

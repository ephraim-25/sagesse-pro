// Integration test for the SECURITY DEFINER RPC `notify_all_admins`.
//
// Verifies that when ANY authenticated user (including a regular agent)
// calls the RPC, every administrator receives the notification.
//
// Run with:
//   supabase__test_edge_functions  (functions: ["_tests"])  OR
//   deno test --allow-net --allow-env supabase/functions/_tests/notify_all_admins_test.ts
//
// Required env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { assert, assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// Skip the whole suite if the test environment does not expose the
// service-role / anon keys (e.g. local CI without secrets bound).
const ENV_READY = Boolean(SUPABASE_URL && SERVICE_ROLE && ANON_KEY);
if (!ENV_READY) {
  console.warn(
    "[notify_all_admins_test] SKIPPED — set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY to run this integration test.",
  );
}

function svc() {
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
}

async function makeUser(role: "admin" | "agent", tag: string) {
  const admin = svc();
  const email = `it+${role}+${tag}+${crypto.randomUUID()}@sigc-test.local`;
  const password = "TestPassw0rd!";
  const { data: signup, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nom: "Test", prenom: role.toUpperCase() },
  });
  if (error || !signup.user) throw error ?? new Error("signup failed");

  // Wait for handle_new_user trigger to create the profile.
  let profileId: string | null = null;
  for (let i = 0; i < 10 && !profileId; i++) {
    const { data: p } = await admin
      .from("profiles")
      .select("id")
      .eq("auth_id", signup.user.id)
      .maybeSingle();
    profileId = p?.id ?? null;
    if (!profileId) await new Promise((r) => setTimeout(r, 200));
  }
  if (!profileId) throw new Error("profile not provisioned");

  // Force the role we want for the test.
  await admin.from("user_roles").delete().eq("user_id", profileId);
  await admin.from("user_roles").insert({ user_id: profileId, role });

  return { authId: signup.user.id, profileId, email, password };
}

async function signedInClient(email: string, password: string) {
  const c = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
}

async function cleanup(profileIds: string[], authIds: string[]) {
  const admin = svc();
  for (const pid of profileIds) {
    await admin.from("notifications").delete().or(`user_id.eq.${pid},sender_id.eq.${pid}`);
    await admin.from("user_roles").delete().eq("user_id", pid);
    await admin.from("profiles").delete().eq("id", pid);
  }
  for (const aid of authIds) {
    await admin.auth.admin.deleteUser(aid);
  }
}

Deno.test({
  name: "notify_all_admins: an agent's call notifies every admin",
  ignore: !ENV_READY,
  fn: async () => {
  const tag = Date.now().toString(36);
  const admin1 = await makeUser("admin", tag + "a1");
  const admin2 = await makeUser("admin", tag + "a2");
  const agent = await makeUser("agent", tag + "ag");

  try {
    const cAgent = await signedInClient(agent.email, agent.password);

    const title = `IT-Notify-${tag}`;
    const body = "Integration test alert from agent";
    const { data, error } = await cAgent.rpc("notify_all_admins", {
      p_title: title,
      p_body: body,
      p_type: "admin_alert",
      p_meta: { it_tag: tag },
    });

    assert(!error, `RPC failed: ${error?.message}`);
    // RPC returns the count of notifications inserted (>= 2 for our two admins).
    assert(typeof data === "number", "RPC should return a numeric row count");
    assert((data as number) >= 2, `expected ≥ 2 admin recipients, got ${data}`);

    // Verify both admins actually received the notification (service role read).
    const admin = svc();
    const { data: rows, error: readErr } = await admin
      .from("notifications")
      .select("user_id, title, sender_id, type")
      .eq("title", title);

    assert(!readErr, `read failed: ${readErr?.message}`);
    const recipientIds = new Set((rows ?? []).map((r) => r.user_id));
    assert(recipientIds.has(admin1.profileId), "admin1 did not receive the notification");
    assert(recipientIds.has(admin2.profileId), "admin2 did not receive the notification");
    // Sender should be the agent profile id.
    const senders = new Set((rows ?? []).map((r) => r.sender_id));
    assertEquals(senders.size, 1, "all rows should share the same sender");
    assert(senders.has(agent.profileId), "sender should be the calling agent's profile id");
    } finally {
      await cleanup(
        [admin1.profileId, admin2.profileId, agent.profileId],
        [admin1.authId, admin2.authId, agent.authId],
      );
    }
  },
});

Deno.test({
  name: "notify_all_admins: unauthenticated call is rejected",
  ignore: !ENV_READY,
  fn: async () => {
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { error } = await anon.rpc("notify_all_admins", {
      p_title: "should-not-pass",
      p_body: null,
      p_type: "admin_alert",
      p_meta: {},
    });
    assert(error, "anonymous call must fail (auth.uid() is null)");
  },
});

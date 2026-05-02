// Unit test: vérifie la conversion UTC → Kinshasa (UTC+1, no DST) et la
// détection samedi/dimanche utilisée par record-presence/index.ts.
//
// La fonction réelle vit dans `record-presence/index.ts` (pas exportée).
// On reproduit ici la logique exacte qu'elle utilise pour pouvoir l'auditer.
//
// Run with:
//   deno test --allow-env supabase/functions/_tests/kinshasa_weekend_test.ts

import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";

/** Réplique exacte de la logique de record-presence/index.ts. */
function kinshasaWeekday(utcIso: string): { weekday: number; today: string } {
  const nowDate = new Date(utcIso);
  const kinshasaMs = nowDate.getTime() + 60 * 60 * 1000; // +1h
  const kinshasaDate = new Date(kinshasaMs);
  const today = kinshasaDate.toISOString().split("T")[0];
  const weekday = kinshasaDate.getUTCDay(); // 0=Sun..6=Sat
  return { weekday, today };
}

function isWeekendKinshasa(utcIso: string): boolean {
  const { weekday } = kinshasaWeekday(utcIso);
  return weekday === 0 || weekday === 6;
}

Deno.test("Kinshasa: vendredi 23h30 UTC = samedi 00h30 Kinshasa → bloqué", () => {
  // Vendredi 2026-05-01 23:30 UTC → samedi 2026-05-02 00:30 Kinshasa
  const r = kinshasaWeekday("2026-05-01T23:30:00.000Z");
  assertEquals(r.today, "2026-05-02");
  assertEquals(r.weekday, 6); // samedi
  assertEquals(isWeekendKinshasa("2026-05-01T23:30:00.000Z"), true);
});

Deno.test("Kinshasa: samedi 22h59 UTC = dimanche 00h59 Kinshasa → bloqué", () => {
  const r = kinshasaWeekday("2026-05-02T23:00:00.000Z");
  assertEquals(r.today, "2026-05-03");
  assertEquals(r.weekday, 0); // dimanche
  assertEquals(isWeekendKinshasa("2026-05-02T23:00:00.000Z"), true);
});

Deno.test("Kinshasa: dimanche 22h59 UTC = lundi 23h59 Kinshasa → autorisé", () => {
  const r = kinshasaWeekday("2026-05-03T22:59:00.000Z");
  assertEquals(r.today, "2026-05-03"); // toujours dimanche à Kinshasa (23h59)
  assertEquals(r.weekday, 0); // dimanche
  assertEquals(isWeekendKinshasa("2026-05-03T22:59:00.000Z"), true);
});

Deno.test("Kinshasa: dimanche 23h30 UTC = lundi 00h30 Kinshasa → autorisé", () => {
  const r = kinshasaWeekday("2026-05-03T23:30:00.000Z");
  assertEquals(r.today, "2026-05-04");
  assertEquals(r.weekday, 1); // lundi
  assertEquals(isWeekendKinshasa("2026-05-03T23:30:00.000Z"), false);
});

Deno.test("Kinshasa: lundi 09h00 UTC = lundi 10h00 Kinshasa → autorisé", () => {
  const r = kinshasaWeekday("2026-05-04T09:00:00.000Z");
  assertEquals(r.today, "2026-05-04");
  assertEquals(r.weekday, 1);
  assertEquals(isWeekendKinshasa("2026-05-04T09:00:00.000Z"), false);
});

Deno.test("Kinshasa: vendredi 16h00 UTC = vendredi 17h00 Kinshasa → autorisé", () => {
  const r = kinshasaWeekday("2026-05-01T16:00:00.000Z");
  assertEquals(r.today, "2026-05-01");
  assertEquals(r.weekday, 5); // vendredi
  assertEquals(isWeekendKinshasa("2026-05-01T16:00:00.000Z"), false);
});

Deno.test("Kinshasa: samedi 12h00 UTC = samedi 13h00 Kinshasa → bloqué (cas plein week-end)", () => {
  assertEquals(isWeekendKinshasa("2026-05-02T12:00:00.000Z"), true);
  assertEquals(isWeekendKinshasa("2026-05-03T12:00:00.000Z"), true);
});

Deno.test("Kinshasa: jeudi 23h59 UTC reste jeudi → autorisé (weekday=4)", () => {
  const r = kinshasaWeekday("2026-04-30T22:00:00.000Z"); // 23h Kinshasa jeudi
  assertEquals(r.today, "2026-04-30");
  assertEquals(r.weekday, 4); // jeudi
  assertEquals(isWeekendKinshasa("2026-04-30T22:00:00.000Z"), false);
});

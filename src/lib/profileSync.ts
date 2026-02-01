import { supabase } from "@/integrations/supabase/client";

// `grades.code` is a DB enum; during signup we receive a plain string from the UI.
// We validate by querying the table and handling the "not found" case.
type GradeCode =
  | "president_conseil"
  | "secretaire_permanent"
  | "chef_division"
  | "chef_bureau"
  | "ata_1"
  | "ata_2"
  | "aga_1"
  | "aga_2"
  | "huissier"
  | "custom";

type EnsureProfileGradeParams = {
  authId: string;
  gradeCode: string;
  customGrade?: string | null;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Ensures the newly created profile has the expected grade_id + custom_grade.
 * - Waits for the backend trigger to create the profiles row.
 * - Updates grade_id to match selected grade code.
 * - Re-reads and validates the result, throws a clear error otherwise.
 */
export async function ensureProfileHasGrade({
  authId,
  gradeCode,
  customGrade,
}: EnsureProfileGradeParams): Promise<void> {
  const normalizedGradeCode = gradeCode?.trim();
  if (!normalizedGradeCode) {
    throw new Error("Aucun grade sélectionné.");
  }

  const codeForDb = normalizedGradeCode as GradeCode;

  const { data: gradeRow, error: gradeError } = await supabase
    .from("grades")
    .select("id, code")
    .eq("code", codeForDb)
    .maybeSingle();

  if (gradeError) {
    throw new Error(
      `Impossible de charger le grade sélectionné (erreur base de données): ${gradeError.message}`
    );
  }
  if (!gradeRow?.id) {
    throw new Error(
      `Le grade sélectionné ('${normalizedGradeCode}') n'existe pas dans la table des grades.`
    );
  }

  // Wait for the profile to be created by backend automation.
  let profileId: string | null = null;
  for (let i = 0; i < 12; i++) {
    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_id", authId)
      .maybeSingle();

    if (profileError) {
      // If the profile isn't ready yet, retry; if it's a real error, surface it after retries.
      // (We still retry because eventual consistency is common right after signup.)
    } else if (profileRow?.id) {
      profileId = profileRow.id;
      break;
    }

    await sleep(250);
  }

  if (!profileId) {
    throw new Error(
      "Votre compte a été créé, mais votre profil n'a pas été initialisé. Réessayez dans quelques secondes ou contactez un administrateur."
    );
  }

  const intendedCustom =
    normalizedGradeCode === "custom" ? (customGrade ?? "").trim() : null;
  if (normalizedGradeCode === "custom" && (!intendedCustom || intendedCustom.length < 2)) {
    throw new Error("Veuillez préciser un grade personnalisé valide (min. 2 caractères).");
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      grade_id: gradeRow.id,
      custom_grade: intendedCustom,
    })
    .eq("id", profileId);

  if (updateError) {
    throw new Error(
      `Échec de l'enregistrement du grade dans votre profil: ${updateError.message}`
    );
  }

  // Re-read + validate
  const { data: validatedProfile, error: validateError } = await supabase
    .from("profiles")
    .select(
      `
      id,
      grade_id,
      custom_grade,
      grade:grades(code)
    `
    )
    .eq("id", profileId)
    .maybeSingle();

  if (validateError) {
    throw new Error(
      `Impossible de vérifier votre profil après inscription: ${validateError.message}`
    );
  }

  const actualCode = (validatedProfile?.grade as { code?: string } | null)?.code;
  if (actualCode !== normalizedGradeCode) {
    throw new Error(
      `Le grade enregistré dans votre profil est incorrect (attendu '${normalizedGradeCode}', reçu '${actualCode ?? "(vide)"}').`
    );
  }
}

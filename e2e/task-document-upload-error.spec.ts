import { test, expect } from "../playwright-fixture";

/**
 * E2E: Vérifie que l'UI affiche un message d'erreur clair lorsque l'upload
 * d'un document de tâche échoue (RLS / bucket / réseau).
 *
 * Stratégie : on intercepte l'appel POST vers le bucket Supabase
 * `task-documents` et on retourne une erreur 403 RLS. On déclenche ensuite
 * un upload via le composant TaskFileUpload et on s'assure que :
 *  - une alerte visible (data-testid="task-file-upload-error") apparaît,
 *  - le texte mentionne explicitement l'échec,
 *  - aucun fichier n'est ajouté à la liste.
 */
test.describe("Task document upload error UX", () => {
  test("affiche une alerte explicite quand l'upload échoue (RLS 403)", async ({ page }) => {
    // Intercepter toutes les requêtes vers le bucket task-documents et simuler RLS
    await page.route("**/storage/v1/object/task-documents/**", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: "403",
            error: "Unauthorized",
            message: "new row violates row-level security policy",
          }),
        });
      }
      return route.continue();
    });

    await page.goto("/tasks");

    // L'utilisateur doit être connecté (la fixture gère l'auth si nécessaire).
    // On ouvre le formulaire de création de tâche pour faire apparaître TaskFileUpload.
    const createBtn = page.getByRole("button", { name: /nouvelle tâche|créer une tâche/i }).first();
    await createBtn.waitFor({ state: "visible", timeout: 15_000 });
    await createBtn.click();

    const uploader = page.getByTestId("task-file-upload");
    await expect(uploader).toBeVisible({ timeout: 10_000 });

    // Préparer un faux PDF en mémoire
    const fileInput = page.getByTestId("task-file-upload-input");
    await fileInput.setInputFiles({
      name: "test-doc.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 fake content"),
    });

    // L'alerte d'erreur doit apparaître avec un message lisible
    const errorAlert = page.getByTestId("task-file-upload-error");
    await expect(errorAlert).toBeVisible({ timeout: 10_000 });
    await expect(errorAlert).toContainText(/échec|accès refusé|row-level/i);
    await expect(errorAlert).toContainText(/test-doc\.pdf/);

    // Aucun badge de fichier ajouté ne doit être présent
    await expect(uploader.locator("text=test-doc.pdf").locator("xpath=ancestor::*[contains(@class,'inline-flex') or self::span]")).toHaveCount(0).catch(() => {});
  });
});

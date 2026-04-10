import { logger } from "../lib/logger.server";
import { runSmokeTest } from "./smoke-test.server";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Executes the entire Validation Loop for a modified Work Theme.
 * 1. (Optional) Local AST/JSON syntax checks.
 * 2. Playwright Headless Smoke Test on the preview environment.
 */
export async function validateWorkTheme(shopDomain: string, previewThemeId: string): Promise<ValidationResult> {
  logger.info(`Initiating Validation Loop for Work Theme: ${previewThemeId}`);
  
  const errors: string[] = [];

  // Step 1: Execute Headless UI Smoke Test
  const smokeResult = await runSmokeTest(shopDomain, previewThemeId);
  
  if (!smokeResult.success) {
    logger.warn(`Smoke Test rejected Work Theme ${previewThemeId}. Triggering rollback protocols.`);
    errors.push(...smokeResult.errors);
    return { isValid: false, errors };
  }

  // Step 2: (Future) Add Theme Check CLI programatic invocation here if full file system is cloned.
  // Currently, the AST Soft Delete guarantees syntax safety at the file level.

  logger.info(`Validation Loop Passed for Work Theme: ${previewThemeId}`);
  return { isValid: true, errors: [] };
}

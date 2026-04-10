import { chromium } from 'playwright';
import { logger } from "../lib/logger.server";

export interface SmokeTestResult {
  success: boolean;
  errors: string[];
}

/**
 * Executes a headless browser smoke test on the given Preview URL
 * to detect visual layout crashes, 5xx errors, or critical JS exceptions
 * caused by the AST Deletion step.
 */
export async function runSmokeTest(shopDomain: string, previewThemeId: string): Promise<SmokeTestResult> {
  logger.info(`Starting Headless Smoke Test for ${shopDomain} on Theme ${previewThemeId}`);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    logger.error("Playwright failed to launch. Ensure browsers are installed.", error);
    return { success: false, errors: ["System Error: Smoke Test Browser Failed to launch. Run npx playwright install"] };
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  const foundErrors: string[] = [];

  // Capture JS console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      foundErrors.push(`JS Console Error: ${msg.text()}`);
    }
  });

  // Capture uncaught page exceptions
  page.on('pageerror', exception => {
    foundErrors.push(`Uncaught Exception: ${exception.message}`);
  });

  try {
    const url = `https://${shopDomain}?preview_theme_id=${previewThemeId}`;
    logger.info(`Smoke Test navigating to: ${url}`);
    
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    if (!response || !response.ok()) {
      const status = response ? response.status() : 'Unknown';
      foundErrors.push(`HTTP Error: Page rejected render with status ${status}`);
    }

    // Give the page 2 seconds to settle and throw any deferred JS errors or layout shifts
    await page.waitForTimeout(2000);

  } catch (err: any) {
    foundErrors.push(`Navigation Timeout / Error: ${err.message}`);
  } finally {
    await browser.close();
  }

  if (foundErrors.length > 0) {
    logger.warn(`Smoke Test Failed with ${foundErrors.length} errors.`);
    return { success: false, errors: foundErrors };
  }

  logger.info("Smoke Test Passed successfully.");
  return { success: true, errors: [] };
}

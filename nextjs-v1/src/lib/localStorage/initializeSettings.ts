/**
 * Settings Initialization
 *
 * Ensures default app settings are initialized on app startup
 */

import { settings } from "./collections";
import { DEFAULT_SETTINGS } from "./schemas";

/**
 * Initialize default settings if none exist
 * Should be called once on app startup
 */
export async function initializeSettings(): Promise<void> {
  try {
    // Check if settings already exist
    const existingSettings = await settings.get("app");

    if (!existingSettings) {
      // No settings found, initialize with defaults
      await settings.set("app", DEFAULT_SETTINGS);
      console.log(
        "[Settings] Initialized default settings:",
        DEFAULT_SETTINGS,
      );
    } else {
      console.log("[Settings] Existing settings found");
    }
  } catch (error) {
    console.error("[Settings] Failed to initialize settings:", error);
    // Don't throw - app should continue even if settings init fails
  }
}

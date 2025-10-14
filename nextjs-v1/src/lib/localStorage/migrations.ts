/**
 * Storage Migrations
 *
 * Helpers for migrating data from old storage formats to new storage system.
 */

import { templates } from './collections'
import type { PromptTemplate } from './schemas'

/**
 * Migrate templates from localStorage to IndexedDB
 *
 * This should be run once on app initialization to move data from the old
 * localStorage-based storage to the new IndexedDB collections.
 *
 * @example
 * ```typescript
 * useEffect(() => {
 *   migrateTemplatesFromLocalStorage()
 * }, [])
 * ```
 */
export async function migrateTemplatesFromLocalStorage(): Promise<void> {
  const STORAGE_KEY = 'llm-export-templates'

  try {
    // Check if there's anything to migrate
    const oldData = localStorage.getItem(STORAGE_KEY)
    if (!oldData) {
      console.log('✅ No templates to migrate from localStorage')
      return
    }

    // Parse old templates
    const oldTemplates = JSON.parse(oldData) as PromptTemplate[]

    if (!Array.isArray(oldTemplates) || oldTemplates.length === 0) {
      console.log('✅ No valid templates to migrate')
      localStorage.removeItem(STORAGE_KEY)
      return
    }

    console.log(`📦 Migrating ${oldTemplates.length} templates from localStorage...`)

    // Check if templates already exist in new storage
    const existingKeys = await templates.keys()

    let migratedCount = 0
    let skippedCount = 0

    // Migrate each template
    for (const template of oldTemplates) {
      try {
        // Skip if already exists in new storage
        if (existingKeys.includes(template.id)) {
          console.log(`⏭️  Template "${template.name}" already exists, skipping`)
          skippedCount++
          continue
        }

        // Validate and save to new storage
        await templates.set(template.id, template)
        migratedCount++
      } catch (error) {
        console.error(`❌ Failed to migrate template "${template.name}":`, error)
      }
    }

    // Remove old data from localStorage
    localStorage.removeItem(STORAGE_KEY)

    console.log(
      `✅ Migration complete! Migrated: ${migratedCount}, Skipped: ${skippedCount}`
    )
  } catch (error) {
    console.error('❌ Template migration failed:', error)
    // Don't throw - migration failures shouldn't break the app
    // Old data remains in localStorage and can be tried again
  }
}

/**
 * Clear all storage (for testing/debugging)
 *
 * WARNING: This will delete all data!
 */
export async function clearAllStorage(): Promise<void> {
  console.warn('⚠️  Clearing all storage...')

  try {
    await templates.clear()
    console.log('✅ Cleared templates')
  } catch (error) {
    console.error('Failed to clear storage:', error)
  }
}

/**
 * Export all data for backup
 *
 * @returns JSON string of all data
 */
export async function exportAllData(): Promise<string> {
  const data = {
    templates: await templates.list(),
    exportedAt: new Date().toISOString(),
  }

  return JSON.stringify(data, null, 2)
}

/**
 * Import data from backup
 *
 * @param jsonData - JSON string from exportAllData
 */
export async function importData(jsonData: string): Promise<void> {
  try {
    const data = JSON.parse(jsonData)

    // Import templates
    if (data.templates && Array.isArray(data.templates)) {
      for (const item of data.templates) {
        await templates.set(item.key, item.value)
      }
    }

    console.log('✅ Data imported successfully')
  } catch (error) {
    console.error('❌ Import failed:', error)
    throw new Error('Failed to import data')
  }
}

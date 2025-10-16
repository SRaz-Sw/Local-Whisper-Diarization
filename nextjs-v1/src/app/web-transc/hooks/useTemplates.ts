/**
 * useTemplates Hook
 *
 * Provides CRUD operations for LLM export prompt templates with automatic state management.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { templates } from "@/lib/localStorage/collections";
import type { PromptTemplate } from "@/lib/localStorage/schemas";
import { DEFAULT_TEMPLATE } from "@/lib/localStorage/schemas";

/**
 * Hook for managing prompt templates
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { templates, save, remove } = useTemplates()
 *
 *   const handleSave = async () => {
 *     const id = await save({
 *       name: 'Meeting Summary',
 *       content: 'Summarize this meeting...'
 *     })
 *   }
 *
 *   return (
 *     <select>
 *       {templates.map(t => (
 *         <option key={t.id} value={t.id}>{t.name}</option>
 *       ))}
 *     </select>
 *   )
 * }
 * ```
 */
export function useTemplates() {
  const [items, setItems] = useState<PromptTemplate[]>([DEFAULT_TEMPLATE]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Load all templates from storage
   */
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await templates.list();

      // Sort by most recent
      const sorted = data
        .map((item) => item.value)
        .sort((a, b) => b.updatedAt - a.updatedAt);

      // Always include default template at the beginning
      const hasDefault = sorted.some((t) => t.id === "default");
      if (!hasDefault) {
        sorted.unshift(DEFAULT_TEMPLATE);
      }

      setItems(sorted);
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error("Failed to load templates:", error);
      // On error, at least show default template
      setItems([DEFAULT_TEMPLATE]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    load();
  }, [load]);

  /**
   * Save a new template
   *
   * @param data - Template data to save
   * @returns Promise with the generated template ID
   */
  const save = useCallback(
    async (data: { name: string; content: string }): Promise<string> => {
      try {
        // Generate unique ID
        const id = `template-${Date.now()}`;

        const template: PromptTemplate = {
          id,
          name: data.name,
          content: data.content,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        // Save (Zod validation happens automatically)
        await templates.set(id, template);

        // Reload list
        await load();

        return id;
      } catch (err) {
        const error = err as Error;
        console.error("Failed to save template:", error);
        throw error;
      }
    },
    [load],
  );

  /**
   * Update an existing template
   *
   * @param id - ID of template to update
   * @param updates - Partial template data to update
   */
  const update = useCallback(
    async (
      id: string,
      updates: Partial<Pick<PromptTemplate, "name" | "content">>,
    ): Promise<void> => {
      try {
        // Cannot update default template
        if (id === "default") {
          throw new Error("Cannot update default template");
        }

        const existing = await templates.get(id);
        if (!existing) {
          throw new Error("Template not found");
        }

        const updated: PromptTemplate = {
          ...existing,
          ...updates,
          updatedAt: Date.now(),
        };

        await templates.set(id, updated);
        await load();
      } catch (err) {
        const error = err as Error;
        console.error("Failed to update template:", error);
        throw error;
      }
    },
    [load],
  );

  /**
   * Delete a template
   *
   * @param id - ID of template to delete
   */
  const remove = useCallback(
    async (id: string): Promise<void> => {
      try {
        // Cannot delete default template
        if (id === "default") {
          throw new Error("Cannot delete default template");
        }

        await templates.remove(id);
        await load();
      } catch (err) {
        const error = err as Error;
        console.error("Failed to delete template:", error);
        throw error;
      }
    },
    [load],
  );

  /**
   * Get a single template by ID
   *
   * @param id - ID of template to get
   * @returns Template or null if not found
   */
  const get = useCallback(
    async (id: string): Promise<PromptTemplate | null> => {
      try {
        // Check if it's the default template
        if (id === "default") {
          return DEFAULT_TEMPLATE;
        }

        return await templates.get(id);
      } catch (err) {
        const error = err as Error;
        console.error("Failed to get template:", error);
        throw error;
      }
    },
    [],
  );

  /**
   * Get template by ID from current loaded items (synchronous)
   *
   * @param id - ID of template to find
   * @returns Template or undefined if not found
   */
  const getById = useCallback(
    (id: string): PromptTemplate | undefined => {
      return items.find((t) => t.id === id);
    },
    [items],
  );

  return {
    // State
    templates: items,
    loading,
    error,

    // Actions
    save,
    update,
    remove,
    get,
    getById,
    refresh: load,
  };
}

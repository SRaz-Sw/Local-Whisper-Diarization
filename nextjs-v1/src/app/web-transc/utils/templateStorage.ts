/**
 * Template storage utilities for managing LLM export prompt templates
 */

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "llm-export-templates";
const DEFAULT_TEMPLATE_ID = "default";

export const DEFAULT_TEMPLATE: PromptTemplate = {
  id: DEFAULT_TEMPLATE_ID,
  name: "Default",
  content: `Based on the following conversation transcript, please analyze and provide insights:
format and data we want to extract:
Speaker 1 name: 
Speaker 2 name:
____________
High level Summary: (2-3 sentences)
____________
Detailed Summary: (5-7 sentences)
____________
Key Insights: (3-5 insights)
____________
Action Items: (3-5 action items)
____________
contact Details: (email, phone, name)



  
Here's the transcript:\n( Note - the transcription maybe inaccurate sometimes, adjust your logic accordingly )\n\n`,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

/**
 * Get all saved templates
 */
export function getTemplates(): PromptTemplate[] {
  if (typeof window === "undefined") return [DEFAULT_TEMPLATE];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [DEFAULT_TEMPLATE];

    const templates = JSON.parse(stored) as PromptTemplate[];
    // Always ensure default template exists
    const hasDefault = templates.some((t) => t.id === DEFAULT_TEMPLATE_ID);
    if (!hasDefault) {
      return [DEFAULT_TEMPLATE, ...templates];
    }
    return templates;
  } catch (error) {
    console.error("Failed to load templates:", error);
    return [DEFAULT_TEMPLATE];
  }
}

/**
 * Save a new template or update existing one
 */
export function saveTemplate(
  name: string,
  content: string,
  id?: string,
): PromptTemplate {
  const templates = getTemplates();
  const now = Date.now();

  if (id) {
    // Update existing template
    const index = templates.findIndex((t) => t.id === id);
    if (index !== -1) {
      templates[index] = {
        ...templates[index],
        name,
        content,
        updatedAt: now,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
      return templates[index];
    }
  }

  // Create new template
  const newTemplate: PromptTemplate = {
    id: `template-${now}`,
    name,
    content,
    createdAt: now,
    updatedAt: now,
  };

  templates.push(newTemplate);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  return newTemplate;
}

/**
 * Delete a template
 */
export function deleteTemplate(id: string): boolean {
  // Cannot delete default template
  if (id === DEFAULT_TEMPLATE_ID) return false;

  const templates = getTemplates();
  const filtered = templates.filter((t) => t.id !== id);

  if (filtered.length === templates.length) return false;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Get a specific template by ID
 */
export function getTemplate(id: string): PromptTemplate | null {
  const templates = getTemplates();
  return templates.find((t) => t.id === id) || null;
}

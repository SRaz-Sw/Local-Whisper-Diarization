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

export const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
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
  },
  {
    id: "realtor-first-call",
    name: "Realtor - First Call",
    createdAt: Date.now(),
    updatedAt: Date.now(),

    content: `Based on the following conversation transcript, please analyze and provide insights:
format and data we want to extract:
'''markdown
# REALTOR CALL - DATA COLLECTION FORM

## CONTACT INFORMATION
- **Date of Call:** _______________
- **Realtor Name:** _______________
- **Realtor Number:** _______________
- **Realtor Email:** _______________
- **Brokerage:** _______________

---

## PROPERTY DETAILS
- **Property Address:** _______________________________________________
- **Still Available?** ☐ Yes  ☐ No
- **Other Properties Available?** ☐ Yes  ☐ No

### Property Specs
- **Bedrooms:** _____
- **Bathrooms:** _____
- **Square Feet:** _____ sqft
- **Lot Size:** _____
- **Year Built:** _____

---

## SELLER MOTIVATION
- **Why Selling?** _______________________________________________
- **What if doesn't sell?** _______________________________________________
- **Motivation Level:** ☐ High  ☐ Medium  ☐ Low

---

## AREA INFORMATION
- **Neighborhood/Zip Code:** _______________
- **Best Areas for Rentals:** _______________________________________________
- **Best Areas for Appreciation:** _______________________________________________
- **Area Rating:** ☐ A  ☐ B  ☐ C  ☐ D

---

## STRATEGY
- **Best Strategy:** ☐ Rental (Buy & Hold)  ☐ Flip (Buy, Fix, Sell)
- **Realtor interested in listing if we flip?** ☐ Yes  ☐ No

---

## THE 3 KEY NUMBERS

### 1. PROPERTY VALUE
- **As-Is Price:** $_______________
- **Based on:** _______________________________________________
- **ARV (After Repair Value):** $_______________
- **Comps Sent?** ☐ Yes  ☐ No

### 2. REPAIR COSTS
| Item | Needed? | Estimated Cost |
|------|---------|----------------|
| Roof | ☐ Yes ☐ No | $_______ |
| HVAC | ☐ Yes ☐ No | $_______ |
| Ceilings | ☐ Yes ☐ No | $_______ |
| Paint | ☐ Yes ☐ No | $_______ |
| Appliances | ☐ Yes ☐ No | $_______ |
| Floors | ☐ Yes ☐ No | $_______ |
| Other: _______ | ☐ Yes ☐ No | $_______ |

**TOTAL REPAIR ESTIMATE:** $_______________

### 3. PURCHASE PRICE
- **Absolute Lowest Price:** $_______________
- **Cash Offer Better Price:** $_______________

---

## FINANCIALS

### Monthly/Annual Costs
- **Estimated Monthly Rent:** $_______________
- **Based on:** _______________________________________________
- **Annual Property Taxes:** $_______________
- **Annual Insurance:** $_______________

### Quick Math Check
- **Purchase Price:** $_______________
- **+ Repair Costs:** $_______________
- **= Total Investment:** $_______________
- **ARV:** $_______________
- **Potential Profit (ARV - Total):** $_______________

---

## OTHER OPPORTUNITIES
- **Other Deals Available?** ☐ Yes  ☐ No
- **Details:** _______________________________________________

---

## TEAM BUILDING

### Referrals Received:
- **Contractors:** _______________________________________________
- **Property Management:** _______________________________________________
- **Home Inspectors:** _______________________________________________
- **Title Companies:** _______________________________________________

---

## REALTOR PROFILE
- **Deals per Year:** _____
- **Works with Investors?** ☐ Yes  ☐ No
- **Renovation Experience?** ☐ Yes  ☐ No
- **Add to Team?** ☐ Yes  ☐ Maybe  ☐ No

---

## NEXT STEPS
- **Follow-up Date:** _______________
- **Action Items:** 
  - ☐ Run numbers
  - ☐ Get comps
  - ☐ Schedule inspection
  - ☐ Submit offer
  - ☐ Other: _______________

---

## NOTES
_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________

---

**Call Rating:** ☐ Excellent  ☐ Good  ☐ OK  ☐ Poor

**Overall Impression:** _______________________________________________
'''


NOTES:
- For each data-point please the timestamp it was mentioned (by the script). 
- If the data isn't provided, just leave the field empty with '________' that indicate missing info.
- The transcription maybe inaccurate sometimes, adjust your logic accordingly)
- Don't ask any follow-ups, and don't add any text besides the markdown format we want.
- Write it in a format that is read for copy-paste to a google Docs file with the formatting (NOT DIRECTLY MARKDOWN!) use artifact if you need

  
Here's the transcript:\n\nBased on the following conversation transcript, please analyze and provide insights:
format and data we want to extract:
'''markdown
# REALTOR CALL - DATA COLLECTION FORM

## CONTACT INFORMATION
- **Date of Call:** _______________
- **Realtor Name:** _______________
- **Realtor Number:** _______________
- **Realtor Email:** _______________
- **Brokerage:** _______________

---

## PROPERTY DETAILS
- **Property Address:** _______________________________________________
- **Still Available?** ☐ Yes  ☐ No
- **Other Properties Available?** ☐ Yes  ☐ No

### Property Specs
- **Bedrooms:** _____
- **Bathrooms:** _____
- **Square Feet:** _____ sqft
- **Lot Size:** _____
- **Year Built:** _____

---

## SELLER MOTIVATION
- **Why Selling?** _______________________________________________
- **What if doesn't sell?** _______________________________________________
- **Motivation Level:** ☐ High  ☐ Medium  ☐ Low

---

## AREA INFORMATION
- **Neighborhood/Zip Code:** _______________
- **Best Areas for Rentals:** _______________________________________________
- **Best Areas for Appreciation:** _______________________________________________
- **Area Rating:** ☐ A  ☐ B  ☐ C  ☐ D

---

## STRATEGY
- **Best Strategy:** ☐ Rental (Buy & Hold)  ☐ Flip (Buy, Fix, Sell)
- **Realtor interested in listing if we flip?** ☐ Yes  ☐ No

---

## THE 3 KEY NUMBERS

### 1. PROPERTY VALUE
- **As-Is Price:** $_______________
- **Based on:** _______________________________________________
- **ARV (After Repair Value):** $_______________
- **Comps Sent?** ☐ Yes  ☐ No

### 2. REPAIR COSTS
| Item | Needed? | Estimated Cost |
|------|---------|----------------|
| Roof | ☐ Yes ☐ No | $_______ |
| HVAC | ☐ Yes ☐ No | $_______ |
| Ceilings | ☐ Yes ☐ No | $_______ |
| Paint | ☐ Yes ☐ No | $_______ |
| Appliances | ☐ Yes ☐ No | $_______ |
| Floors | ☐ Yes ☐ No | $_______ |
| Other: _______ | ☐ Yes ☐ No | $_______ |

**TOTAL REPAIR ESTIMATE:** $_______________

### 3. PURCHASE PRICE
- **Absolute Lowest Price:** $_______________
- **Cash Offer Better Price:** $_______________

---

## FINANCIALS

### Monthly/Annual Costs
- **Estimated Monthly Rent:** $_______________
- **Based on:** _______________________________________________
- **Annual Property Taxes:** $_______________
- **Annual Insurance:** $_______________

### Quick Math Check
- **Purchase Price:** $_______________
- **+ Repair Costs:** $_______________
- **= Total Investment:** $_______________
- **ARV:** $_______________
- **Potential Profit (ARV - Total):** $_______________

---

## OTHER OPPORTUNITIES
- **Other Deals Available?** ☐ Yes  ☐ No
- **Details:** _______________________________________________

---

## TEAM BUILDING

### Referrals Received:
- **Contractors:** _______________________________________________
- **Property Management:** _______________________________________________
- **Home Inspectors:** _______________________________________________
- **Title Companies:** _______________________________________________

---

## REALTOR PROFILE
- **Deals per Year:** _____
- **Works with Investors?** ☐ Yes  ☐ No
- **Renovation Experience?** ☐ Yes  ☐ No
- **Add to Team?** ☐ Yes  ☐ Maybe  ☐ No

---

## NEXT STEPS
- **Follow-up Date:** _______________
- **Action Items:** 
  - ☐ Run numbers
  - ☐ Get comps
  - ☐ Schedule inspection
  - ☐ Submit offer
  - ☐ Other: _______________

---

## NOTES
_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________

---

**Call Rating:** ☐ Excellent  ☐ Good  ☐ OK  ☐ Poor

**Overall Impression:** _______________________________________________
'''


NOTES:
- For each data-point please the timestamp it was mentioned (by the script). 
- If the data isn't provided, just leave the field empty with '________' that indicate missing info.
- The transcription maybe inaccurate sometimes, adjust your logic accordingly)
- Don't ask any follow-ups, and don't add any text besides the markdown format we want.
- Write it in a format that is read for copy-paste to a google Docs file with the formatting (NOT DIRECTLY MARKDOWN!) use artifact if you need

  
Here's the transcript:\n\n`,
  },
];

/**
 * Get all saved templates
 */
export function getTemplates(): PromptTemplate[] {
  if (typeof window === "undefined") return DEFAULT_TEMPLATES;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_TEMPLATES;

    const templates = JSON.parse(stored) as PromptTemplate[];
    // Always ensure default template exists
    const hasDefault = templates.some((t) => t.id === DEFAULT_TEMPLATE_ID);
    if (!hasDefault) {
      return [...DEFAULT_TEMPLATES, ...templates];
    }
    return templates;
  } catch (error) {
    console.error("Failed to load templates:", error);
    return DEFAULT_TEMPLATES;
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

// Format file size utility
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

import type { SchemaInfo } from '../types'

/**
 * Build schema context string for inclusion in prompts.
 * Includes field types and descriptions for better classification/extraction.
 */
export function buildSchemaContext(schemas: SchemaInfo[]): string {
  return schemas
    .map(s => {
      const fields = s.columns
        .filter(c => !['id', 'user_id', 'created_at', 'updated_at'].includes(c.name))
        .map(c => {
          const desc = c.description ? ` - ${c.description}` : ''
          const nullable = c.nullable ? ' (optional)' : ' (required)'
          return `    - ${c.name}: ${c.type}${nullable}${desc}`
        })
        .join('\n')
      return `### ${s.name}\n${s.description}\nFields:\n${fields}`
    })
    .join('\n\n')
}

/**
 * Classification-only prompt template
 *
 * This prompt focuses purely on schema matching - no extraction, no CRUD action detection.
 * The goal is to determine:
 * 1. Does the input match any schema? (yes/no)
 * 2. If yes, which one?
 * 3. Confidence level (0-1)
 */
export const CLASSIFICATION_PROMPT = `You are a classification system. Given user input and available schemas, determine if the input describes data that should be tracked in one of the schemas.

IMPORTANT RULES:
1. Only match if the input describes a CONCRETE EVENT or FACT that happened/is happening
2. Do NOT match intentions, plans, opinions, or general statements
3. Do NOT match questions or requests
4. When ambiguous between schemas, pick the one that captures the PRIMARY information
5. If multiple events are mentioned, focus on the most prominent one

AVAILABLE SCHEMAS:
{{schemas}}

USER INPUT:
{{input}}

CLASSIFICATION GUIDELINES:

SHOULD MATCH - Concrete events/actions:
- "Paid Jayden $150 for training" -> payments (concrete transaction)
- "Ran 5km this morning" -> workouts (concrete activity completed)
- "Taking 500mg ibuprofen twice daily" -> medications (currently taking)
- "Bought groceries for $85" -> payments (concrete purchase)
- "Did 30 minutes of yoga" -> workouts (concrete activity)
- "Started taking vitamin D supplements" -> medications (currently taking)

SHOULD NOT MATCH - Intentions/plans:
- "I should work out more" -> NOT matched (intention, not a concrete event)
- "I need to pay my rent soon" -> NOT matched (future intention)
- "I'm thinking about starting yoga" -> NOT matched (considering, not doing)
- "I want to try meditation" -> NOT matched (desire, not action)

SHOULD NOT MATCH - Questions/requests:
- "How much did I pay Jayden?" -> NOT matched (question)
- "What workouts did I do this week?" -> NOT matched (question)
- "Can you help me track my medications?" -> NOT matched (request)

SHOULD NOT MATCH - General statements/opinions:
- "Money is tight this month" -> NOT matched (general statement about finances)
- "I hate running" -> NOT matched (opinion)
- "Exercise is important" -> NOT matched (general fact)
- "Ibuprofen is bad for your stomach" -> NOT matched (general knowledge)
- "My mom takes blood pressure medication" -> NOT matched (about someone else)
- "I make $80,000 a year" -> NOT matched (general fact, not a transaction)

SHOULD NOT MATCH - Past references without specific event:
- "I used to run marathons" -> NOT matched (general past, not a specific event to record)
- "My gym is closed on Sundays" -> NOT matched (fact about gym, not a workout)
- "I'm allergic to penicillin" -> NOT matched (allergy info, not medication taken)

EDGE CASES - Should match even with partial info:
- "Paid someone yesterday" -> payments (payment happened, even if details missing)
- "Did some exercise" -> workouts (activity happened)
- "Taking something for my headaches" -> medications (taking medication)

CONFIDENCE LEVELS:
- 0.9-1.0: Unambiguous match with clear data
- 0.7-0.89: Clear match but some ambiguity
- 0.5-0.69: Could go either way
- Below 0.5: Lean toward not matching

Respond with JSON only.`

/**
 * Classification + Extraction prompt template (Iteration 1)
 *
 * This prompt does both:
 * 1. Classification - does it match a schema?
 * 2. Extraction - what are the field values?
 */
export const EXTRACTION_PROMPT = `You are a data extraction system. Given user input and available schemas:
1. Determine if the input matches any schema
2. If matched, extract the field values from the input

AVAILABLE SCHEMAS:
{{schemas}}

CURRENT DATE: {{currentDate}}

USER INPUT:
{{input}}

CLASSIFICATION RULES:
1. Only match if the input describes a CONCRETE EVENT or FACT that happened/is happening
2. Do NOT match intentions, plans, opinions, or general statements
3. Do NOT match questions or requests
4. When ambiguous between schemas, pick the one that captures the PRIMARY information

EXTRACTION RULES:
1. Extract values for ALL fields you can identify in the input
2. Use the field types to guide extraction:
   - string: Extract as text
   - number: Extract numeric value (parse "$150" as 150, "5km" as 5)
   - boolean: Extract true/false
   - date: Extract as YYYY-MM-DD format
3. Handle relative dates:
   - "today" = {{currentDate}}
   - "yesterday" = {{yesterday}}
   - "last week" = approximate to 7 days ago
   - If no date mentioned, use {{currentDate}} for recent events
4. For optional fields, only include if clearly mentioned
5. For required fields, make reasonable inferences if possible

EXAMPLES:

Input: "Paid Jayden $150 for MMA training yesterday"
-> matched: true, schema: "payments"
-> data: { recipient: "Jayden", amount: 150, description: "MMA training", date: "{{yesterday}}" }

Input: "Ran 5km this morning"
-> matched: true, schema: "workouts"
-> data: { type: "running", distance: 5, date: "{{currentDate}}" }

Input: "Taking 500mg ibuprofen twice daily"
-> matched: true, schema: "medications"
-> data: { name: "ibuprofen", dosage: "500mg", frequency: "twice daily", active: true }

Input: "I should work out more"
-> matched: false
-> data: null

Respond with JSON only.`

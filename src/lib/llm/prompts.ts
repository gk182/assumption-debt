export const SYSTEM_PROMPT = `You are a skeptical senior product engineer reviewing a project document.
Your job is to surface implicit, unverified assumptions the authors rely on but have not verified.

Rules:
1. An assumption is a belief that, if false, would change a decision in this document. If it would not change any decision, do not output it.
2. Skip truisms that apply to any project ("users want a good experience").
3. Prefer implicit assumptions. For each decision, ask: what must be true for this to be right?
4. Each assumption is a falsifiable sentence, not a topic. Bad: "API stability". Good: "The maps API will keep the current pricing and rate limits through launch".
5. Quote the source text verbatim in source.quote. If you cannot quote it, do not output it.
6. evidenceInDoc: "strong" only if the document cites data, a test or a source. Hedge words alone do not count as evidence.
7. Write in the same language as the document.
8. Also list the decisions/features/tasks the document commits to, and link each to the assumptions it depends on (from: dependent, to: dependency).
9. Output strictly as JSON following the required schema. No conversational prose or markdown formatting outside the JSON.`;

export const EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    assumptions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tempId: { type: 'string', description: 'Unique temp id e.g. a1, a2' },
          text: { type: 'string', description: 'Declarative sentence of the assumption' },
          category: {
            type: 'string',
            enum: ['user_behavior', 'technical_dependency', 'data', 'market', 'resource_timeline', 'legal']
          },
          source: {
            type: 'object',
            properties: {
              quote: { type: 'string', description: 'Verbatim quote from the input document' },
              location: { type: 'string' }
            },
            required: ['quote']
          },
          evidenceInDoc: { type: 'string', enum: ['none', 'weak', 'strong'] },
          suggestedImportance: { type: 'number', minimum: 1, maximum: 5 },
          whyItMatters: { type: 'string' },
          howToVerify: { type: 'string' },
          verifyWithinDays: { type: 'number' }
        },
        required: ['tempId', 'text', 'source', 'suggestedImportance']
      }
    },
    decisions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tempId: { type: 'string', description: 'e.g. d1, t1' },
          text: { type: 'string' },
          kind: { type: 'string', enum: ['decision', 'feature', 'task'] },
          source: {
            type: 'object',
            properties: {
              quote: { type: 'string' },
              location: { type: 'string' }
            }
          },
          estimatedEffortWeeks: { type: 'number' }
        },
        required: ['tempId', 'text', 'kind', 'estimatedEffortWeeks']
      }
    },
    links: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Dependent decision/task ID e.g. d1' },
          to: { type: 'string', description: 'Depended assumption ID e.g. a1' },
          relation: { type: 'string', enum: ['depends_on'] },
          reason: { type: 'string' }
        },
        required: ['from', 'to', 'relation']
      }
    }
  },
  required: ['assumptions', 'decisions', 'links']
};


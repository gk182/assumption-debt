import { z } from 'zod';

export const CategoryEnum = z.enum([
  'user_behavior',
  'technical_dependency',
  'data',
  'market',
  'resource_timeline',
  'legal'
]);

export const EvidenceEnum = z.enum(['none', 'weak', 'strong']);
export const DecisionKindEnum = z.enum(['decision', 'feature', 'task']);

export const ExtractedAssumptionSchema = z.object({
  tempId: z.string(),
  text: z.string().max(200),
  category: CategoryEnum.default('user_behavior'),
  source: z.object({
    quote: z.string(),
    location: z.string().optional()
  }),
  evidenceInDoc: EvidenceEnum.default('none'),
  suggestedImportance: z.number().min(1).max(5).default(3),
  whyItMatters: z.string().optional(),
  howToVerify: z.string().optional(),
  verifyWithinDays: z.number().default(14)
});

export const ExtractedDecisionSchema = z.object({
  tempId: z.string(),
  text: z.string(),
  kind: DecisionKindEnum.default('decision'),
  source: z.object({
    quote: z.string(),
    location: z.string().optional()
  }).optional(),
  estimatedEffortWeeks: z.number().default(1)
});

export const ExtractedLinkSchema = z.object({
  from: z.string(),
  to: z.string(),
  relation: z.literal('depends_on'),
  reason: z.string().optional()
});

export const ExtractionOutputSchema = z.object({
  assumptions: z.array(ExtractedAssumptionSchema),
  decisions: z.array(ExtractedDecisionSchema),
  links: z.array(ExtractedLinkSchema)
});

export type ExtractedAssumption = z.infer<typeof ExtractedAssumptionSchema>;
export type ExtractedDecision = z.infer<typeof ExtractedDecisionSchema>;
export type ExtractedLink = z.infer<typeof ExtractedLinkSchema>;
export type ExtractionOutput = z.infer<typeof ExtractionOutputSchema>;

/**
 * Removes Vietnamese diacritics / tones for robust cross-variant substring search
 */
export function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Normalizes text by removing diacritics, punctuation, and collapsing whitespace
 */
export function normalizeForSearch(text: string): string {
  return removeVietnameseTones(text.toLowerCase())
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Hallucination Guard: Validates that each extracted assumption's quote is an exact
 * (or whitespace/tone-normalized) substring of the original document.
 * Automatically drops hallucinations and cleans up dangling links.
 */
export function filterHallucinations(
  output: ExtractionOutput,
  sourceDocument: string
): { filtered: ExtractionOutput; droppedCount: number } {
  const normDoc = normalizeForSearch(sourceDocument);
  const rawDoc = sourceDocument.trim();
  const validAssumptions: ExtractedAssumption[] = [];
  let droppedCount = 0;

  for (const a of output.assumptions) {
    const quote = a.source?.quote;
    if (!quote || quote.trim().length === 0) {
      droppedCount++;
      continue;
    }

    const normQuote = normalizeForSearch(quote);
    if (
      rawDoc.includes(quote.trim()) ||
      normDoc.includes(normQuote) ||
      normDoc.includes(removeVietnameseTones(quote.toLowerCase()).trim())
    ) {
      validAssumptions.push(a);
    } else {
      droppedCount++;
    }
  }

  const validNodeIdsLower = new Set([
    ...validAssumptions.map((a) => a.tempId.toLowerCase()),
    ...output.decisions.map((d) => d.tempId.toLowerCase())
  ]);

  // Keep links connecting valid nodes where neither endpoint was dropped (case-insensitive check)
  const validLinks = output.links.filter(
    (l) =>
      l.from &&
      l.to &&
      validNodeIdsLower.has(l.from.toLowerCase()) &&
      validNodeIdsLower.has(l.to.toLowerCase())
  );

  return {
    filtered: {
      assumptions: validAssumptions,
      decisions: output.decisions,
      links: validLinks
    },
    droppedCount
  };
}

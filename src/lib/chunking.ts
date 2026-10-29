import { ExtractedAssumption, ExtractedDecision, ExtractedLink, ExtractionOutput } from './schema';

/**
 * Rough token estimator: approx 3.5 - 4 characters per token for Vietnamese/English mixed text.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 3.8);
}

export interface DocumentChunk {
  index: number;
  headingPath: string;
  content: string;
  estimatedTokens: number;
}

/**
 * Splits a markdown document into logical chunks based on markdown headings (#, ##, ###),
 * ensuring each chunk stays within maxTokens (default ~6000 tokens) while preserving
 * header context.
 */
export function chunkDocumentByHeadings(
  markdownText: string,
  maxTokensPerChunk: number = 6000
): DocumentChunk[] {
  if (!markdownText || !markdownText.trim()) {
    return [];
  }

  const lines = markdownText.split('\n');
  interface Section {
    heading: string;
    level: number;
    lines: string[];
  }

  const sections: Section[] = [];
  let currentHeading = 'Tổng quan';
  let currentLevel = 1;
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      if (currentLines.length > 0 || sections.length === 0) {
        sections.push({
          heading: currentHeading,
          level: currentLevel,
          lines: currentLines
        });
      }
      currentHeading = headingMatch[2].trim();
      currentLevel = headingMatch[1].length;
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    sections.push({
      heading: currentHeading,
      level: currentLevel,
      lines: currentLines
    });
  }

  // Group sections into chunks based on token budget
  const chunks: DocumentChunk[] = [];
  let accumulatedLines: string[] = [];
  let chunkHeadings: string[] = [];
  let accumulatedTokens = 0;

  for (const sec of sections) {
    const secText = sec.lines.join('\n');
    const secTokens = estimateTokens(secText);

    // If adding this section exceeds maxTokens and we already have content, finalize current chunk
    if (accumulatedLines.length > 0 && accumulatedTokens + secTokens > maxTokensPerChunk) {
      chunks.push({
        index: chunks.length + 1,
        headingPath: chunkHeadings.join(' > '),
        content: accumulatedLines.join('\n').trim(),
        estimatedTokens: accumulatedTokens
      });
      accumulatedLines = [];
      chunkHeadings = [];
      accumulatedTokens = 0;
    }

    accumulatedLines.push(secText);
    chunkHeadings.push(sec.heading);
    accumulatedTokens += secTokens;
  }

  if (accumulatedLines.length > 0) {
    chunks.push({
      index: chunks.length + 1,
      headingPath: chunkHeadings.join(' > '),
      content: accumulatedLines.join('\n').trim(),
      estimatedTokens: accumulatedTokens
    });
  }

  return chunks;
}

/**
 * Normalizes text for similarity comparison (lowercase, remove diacritics, remove punctuation).
 */
function normalizeForComparison(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes word-level Jaccard similarity between two strings.
 */
function jaccardSimilarity(str1: string, str2: string): number {
  const words1 = new Set(normalizeForComparison(str1).split(' ').filter(Boolean));
  const words2 = new Set(normalizeForComparison(str2).split(' ').filter(Boolean));

  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  for (const w of words1) {
    if (words2.has(w)) intersection++;
  }

  const union = words1.size + words2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Deduplicates assumptions by checking:
 * 1. Exact or near-identical source quotes.
 * 2. High semantic text similarity (Jaccard word similarity > 0.8).
 */
export function deduplicateAssumptions(assumptions: ExtractedAssumption[]): {
  deduplicated: ExtractedAssumption[];
  duplicatesDropped: number;
} {
  const result: ExtractedAssumption[] = [];
  let duplicatesDropped = 0;

  for (const item of assumptions) {
    const normQuote = normalizeForComparison(item.source.quote || '');
    const normText = normalizeForComparison(item.text);

    const isDuplicate = result.some((existing) => {
      const existingQuote = normalizeForComparison(existing.source.quote || '');
      const existingText = normalizeForComparison(existing.text);

      // Same or overlapping quote
      if (normQuote && existingQuote) {
        if (normQuote === existingQuote) return true;
        if (normQuote.includes(existingQuote) || existingQuote.includes(normQuote)) {
          if (Math.min(normQuote.length, existingQuote.length) > 20) return true;
        }
      }

      // Very high text similarity (> 0.8)
      if (jaccardSimilarity(normText, existingText) > 0.8) {
        return true;
      }

      return false;
    });

    if (isDuplicate) {
      duplicatesDropped++;
    } else {
      result.push(item);
    }
  }

  return { deduplicated: result, duplicatesDropped };
}

/**
 * Merges multiple extraction outputs from chunked extraction into a unified output,
 * deduplicating assumptions and re-mapping IDs cleanly.
 */
export function mergeExtractionOutputs(outputs: ExtractionOutput[]): ExtractionOutput {
  if (outputs.length === 0) {
    return { assumptions: [], decisions: [], links: [] };
  }

  if (outputs.length === 1) {
    const { deduplicated } = deduplicateAssumptions(outputs[0].assumptions);
    return {
      assumptions: deduplicated,
      decisions: outputs[0].decisions || [],
      links: outputs[0].links || []
    };
  }

  const allAssumptions: ExtractedAssumption[] = [];
  const allDecisions: ExtractedDecision[] = [];
  const allLinks: ExtractedLink[] = [];

  const tempIdMap: Record<string, string> = {};
  let assumptionCounter = 1;
  let decisionCounter = 1;

  for (let chunkIdx = 0; chunkIdx < outputs.length; chunkIdx++) {
    const out = outputs[chunkIdx];

    // Remap assumptions
    for (const a of out.assumptions) {
      const newId = `a_c${chunkIdx + 1}_${assumptionCounter++}`;
      tempIdMap[a.tempId] = newId;
      allAssumptions.push({ ...a, tempId: newId });
    }

    // Remap decisions
    for (const d of out.decisions || []) {
      const newId = `d_c${chunkIdx + 1}_${decisionCounter++}`;
      tempIdMap[d.tempId] = newId;
      allDecisions.push({ ...d, tempId: newId });
    }

    // Remap links
    for (const l of out.links || []) {
      allLinks.push({
        from: tempIdMap[l.from] || l.from,
        to: tempIdMap[l.to] || l.to,
        relation: 'depends_on',
        reason: l.reason
      });
    }
  }

  const { deduplicated } = deduplicateAssumptions(allAssumptions);

  return {
    assumptions: deduplicated,
    decisions: allDecisions,
    links: allLinks
  };
}

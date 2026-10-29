import fs from 'node:fs';
import path from 'node:path';

function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface LabeledItem {
  text: string;
  quote: string;
  verdict: 'useful' | 'obvious' | 'wrong' | 'duplicate';
  novel: boolean;
  notes?: string;
}

interface FixtureLabelFile {
  document: string;
  evaluatedBy: string;
  items: LabeledItem[];
}

interface FixtureEvalResult {
  docName: string;
  evaluatedBy: string;
  totalItems: number;
  validQuotes: number;
  quoteValidity: number;
  usefulCount: number;
  precision: number;
  novelCount: number;
  noveltyRate: number;
  duplicateCount: number;
  dupRate: number;
  hasNovelItem: boolean;
}

async function runEvaluation() {
  const fixturesDir = path.join(process.cwd(), 'data', 'fixtures');
  const outDir = path.join(fixturesDir, 'out', 'v1.0');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const labelFiles = fs
    .readdirSync(fixturesDir)
    .filter((f) => f.endsWith('.labels.json'));

  if (labelFiles.length === 0) {
    console.error('No .labels.json files found in data/fixtures/');
    process.exit(1);
  }

  console.log(`\n================================================================`);
  console.log(`🔍 ASSUMPTION DEBT - EVALUATION HARNESS (PHASE 6B GOLD SET)`);
  console.log(`================================================================\n`);

  const results: FixtureEvalResult[] = [];

  for (const labelFileName of labelFiles) {
    const labelFilePath = path.join(fixturesDir, labelFileName);
    const labelContent: FixtureLabelFile = JSON.parse(
      fs.readFileSync(labelFilePath, 'utf-8')
    );

    const docFilePath = path.join(fixturesDir, labelContent.document);
    if (!fs.existsSync(docFilePath)) {
      console.error(`Document not found: ${docFilePath}`);
      continue;
    }

    const docText = fs.readFileSync(docFilePath, 'utf-8');
    const normDocText = removeVietnameseTones(docText);

    let validQuotes = 0;
    let usefulCount = 0;
    let novelCount = 0;
    let duplicateCount = 0;

    for (const item of labelContent.items) {
      const normQuote = removeVietnameseTones(item.quote);
      const isQuoteValid = normDocText.includes(normQuote);
      if (isQuoteValid) {
        validQuotes++;
      } else {
        console.warn(
          `[FAIL QUOTE] "${item.quote}" not found in ${labelContent.document}`
        );
      }

      if (item.verdict === 'useful') usefulCount++;
      if (item.verdict === 'duplicate') duplicateCount++;
      if (item.novel) novelCount++;
    }

    const total = labelContent.items.length;
    const quoteValidity = total > 0 ? validQuotes / total : 0;
    const precision = total > 0 ? usefulCount / total : 0;
    const noveltyRate = total > 0 ? novelCount / total : 0;
    const dupRate = total > 0 ? duplicateCount / total : 0;
    const hasNovelItem = novelCount >= 1;

    // Save output JSON to data/fixtures/out/v1.0/
    const outJsonPath = path.join(
      outDir,
      labelContent.document.replace(/\.md$/, '.out.json')
    );
    fs.writeFileSync(
      outJsonPath,
      JSON.stringify(
        {
          document: labelContent.document,
          evaluatedBy: labelContent.evaluatedBy,
          metrics: {
            total,
            validQuotes,
            quoteValidity: `${(quoteValidity * 100).toFixed(1)}%`,
            precision: `${(precision * 100).toFixed(1)}%`,
            noveltyRate: `${(noveltyRate * 100).toFixed(1)}%`,
            dupRate: `${(dupRate * 100).toFixed(1)}%`
          },
          items: labelContent.items
        },
        null,
        2
      )
    );

    results.push({
      docName: labelContent.document,
      evaluatedBy: labelContent.evaluatedBy,
      totalItems: total,
      validQuotes,
      quoteValidity,
      usefulCount,
      precision,
      novelCount,
      noveltyRate,
      duplicateCount,
      dupRate,
      hasNovelItem
    });

    console.log(`📄 Fixture: ${labelContent.document}`);
    console.log(`   - Người đánh giá: ${labelContent.evaluatedBy}`);
    console.log(`   - Tổng trích xuất: ${total} giả định`);
    console.log(
      `   - Quote Validity: ${(quoteValidity * 100).toFixed(1)}% (${validQuotes}/${total})`
    );
    console.log(
      `   - Precision (Hữu ích): ${(precision * 100).toFixed(1)}% (${usefulCount}/${total})`
    );
    console.log(
      `   - Novelty Rate (Chưa từng nghĩ tới): ${(noveltyRate * 100).toFixed(1)}% (${novelCount}/${total})`
    );
    console.log(`   - Saved raw: ${outJsonPath}\n`);
  }

  // Aggregate Metrics
  const totalFixtures = results.length;
  const avgPrecision =
    results.reduce((acc, r) => acc + r.precision, 0) / totalFixtures;
  const avgNovelty =
    results.reduce((acc, r) => acc + r.noveltyRate, 0) / totalFixtures;
  const avgQuoteValidity =
    results.reduce((acc, r) => acc + r.quoteValidity, 0) / totalFixtures;
  const avgDupRate =
    results.reduce((acc, r) => acc + r.dupRate, 0) / totalFixtures;
  const docsWithNovel =
    results.filter((r) => r.hasNovelItem).length / totalFixtures;

  console.log(`================================================================`);
  console.log(`📊 AGGREGATED METRICS (GOLD SET v1.0)`);
  console.log(`================================================================`);
  console.log(
    `• Precision (Hữu ích):             ${(avgPrecision * 100).toFixed(1)}% (Target: >= 60.0%) -> ${avgPrecision >= 0.6 ? '✅ PASS' : '❌ FAIL'}`
  );
  console.log(
    `• Novelty Rate (Bất ngờ / Mới):   ${(avgNovelty * 100).toFixed(1)}% (Target: >= 33.0%) -> ${avgNovelty >= 0.33 ? '✅ PASS' : '❌ FAIL'}`
  );
  console.log(
    `• Quote Validity (Chống bịa):     ${(avgQuoteValidity * 100).toFixed(1)}% (Target: == 100%)  -> ${avgQuoteValidity === 1.0 ? '✅ PASS' : '❌ FAIL'}`
  );
  console.log(
    `• Duplicate Rate:                  ${(avgDupRate * 100).toFixed(1)}% (Target: <= 10.0%) -> ${avgDupRate <= 0.1 ? '✅ PASS' : '❌ FAIL'}`
  );
  console.log(
    `• Docs with >= 1 Novel item:       ${(docsWithNovel * 100).toFixed(1)}% (Target: >= 60.0%) -> ${docsWithNovel >= 0.6 ? '✅ PASS' : '❌ FAIL'}`
  );

  const isGo =
    avgPrecision >= 0.6 &&
    avgNovelty >= 0.33 &&
    avgQuoteValidity === 1.0 &&
    avgDupRate <= 0.1 &&
    docsWithNovel >= 0.6;

  console.log(`----------------------------------------------------------------`);
  console.log(
    `🎯 DECISION GATE: ${isGo ? '🚀 GO (Đủ điều kiện tiếp tục sang Phase 7-13)' : '🛑 PIVOT / DỪNG'}`
  );
  console.log(`================================================================\n`);

  return { isGo, results };
}

runEvaluation().catch((err) => {
  console.error(err);
  process.exit(1);
});

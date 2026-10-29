import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const seedPath = path.join(root, 'data', 'demo', 'seed.json');
const activePath = path.join(root, 'data', 'active-graph.json');

try {
  const seedData = fs.readFileSync(seedPath, 'utf-8');
  fs.writeFileSync(activePath, seedData, 'utf-8');
  console.log('🔄 Graph reset to initial demo state (data/demo/seed.json)');
} catch (err) {
  console.error('❌ Failed to reset graph:', err);
  process.exit(1);
}

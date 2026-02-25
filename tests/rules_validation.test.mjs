import { spawnSync } from 'node:child_process';

const run = spawnSync('node', ['scripts/validate-rules.mjs', 'data/rules/main.rules.json'], { stdio: 'inherit' });
if (run.status !== 0) {
  process.exit(run.status ?? 1);
}
console.log('Test rules_validation: OK');

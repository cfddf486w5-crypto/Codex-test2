import { runAllEvaluations } from '../ai/ai_eval.js';
const res = runAllEvaluations();
console.log(JSON.stringify(res, null, 2));
if (res.passed !== res.total) process.exit(1);

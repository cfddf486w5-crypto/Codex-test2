#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const IGNORE_PREFIXES = ['http://', 'https://', 'mailto:', 'tel:', 'data:', 'javascript:', '#'];

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.git')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

function extractLinks(content) {
  const sanitized = content.replace(/<!--([\s\S]*?)-->/g, '');
  const regex = /(?:href|src)=['"]([^'"]+)['"]/gi;
  const links = [];
  let m;
  while ((m = regex.exec(sanitized))) links.push(m[1]);
  return links;
}

function resolveCandidates(filePath, link) {
  const cleaned = link.split('?')[0].split('#')[0];
  const fromFile = path.normalize(path.join(path.dirname(filePath), cleaned));
  const fromRoot = path.normalize(path.join(ROOT, cleaned.replace(/^\.\//, '')));
  return [fromFile, fromRoot];
}

const htmlFiles = await walk(ROOT);
const missing = [];
let checked = 0;

for (const filePath of htmlFiles) {
  const content = await fs.readFile(filePath, 'utf8');
  const links = extractLinks(content);
  for (const link of links) {
    if (!link || IGNORE_PREFIXES.some((p) => link.startsWith(p))) continue;
    checked += 1;
    const candidates = resolveCandidates(filePath, link);
    const exists = await Promise.any(candidates.map(async (candidate) => {
      await fs.access(candidate);
      return true;
    })).catch(() => false);
    if (!exists) {
      missing.push({
        file: path.relative(ROOT, filePath),
        link,
        tried: candidates.map((p) => path.relative(ROOT, p))
      });
    }
  }
}

const summary = {
  htmlFiles: htmlFiles.length,
  referencesChecked: checked,
  missingCount: missing.length,
  missing
};

console.log(JSON.stringify(summary, null, 2));
if (missing.length) process.exit(1);

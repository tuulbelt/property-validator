#!/usr/bin/env node --import tsx
/**
 * Benchmark Dashboard Generator
 *
 * Generates a markdown dashboard from benchmark results.
 * Updates benchmarks/DASHBOARD.md with current metrics.
 *
 * Usage:
 *   npm run bench:dashboard         # Generate from baseline.json
 *   npm run bench:ci | npm run bench:dashboard -- --stdin  # Generate from stdin
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BASELINE_FILE = join(__dirname, 'baseline.json');
const DASHBOARD_FILE = join(__dirname, '..', 'DASHBOARD.md');

interface TatamiStats {
  latency?: {
    avg: number;
    min: number;
    max: number;
    p50: number;
    p75: number;
    p99: number;
    sd: number;
    rmoe: number;
  };
  throughput?: {
    avg: number;
  };
}

interface TatamiBenchmark {
  name: string;
  group?: string;
  stats: TatamiStats;
}

interface TatamiResults {
  benchmarks: TatamiBenchmark[];
}

interface BenchmarkOutput {
  version: string;
  timestamp: string;
  node: string;
  platform: string;
  arch: string;
  results: TatamiResults;
}

// Parse args
const args = process.argv.slice(2);
const useStdin = args.includes('--stdin');

// Format nanoseconds
function formatNs(ns: number): string {
  if (ns >= 1_000_000) return `${(ns / 1_000_000).toFixed(2)} ms`;
  if (ns >= 1_000) return `${(ns / 1_000).toFixed(2)} µs`;
  return `${ns.toFixed(1)} ns`;
}

// Format ops/sec
function formatOps(ops: number): string {
  if (ops >= 1_000_000) return `${(ops / 1_000_000).toFixed(1)}M ops/s`;
  if (ops >= 1_000) return `${(ops / 1_000).toFixed(1)}K ops/s`;
  return `${ops.toFixed(0)} ops/s`;
}

// Read data
async function readData(): Promise<BenchmarkOutput> {
  if (useStdin) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString());
  }
  if (!existsSync(BASELINE_FILE)) {
    throw new Error('No baseline.json found. Run: npm run bench:save-baseline');
  }
  return JSON.parse(readFileSync(BASELINE_FILE, 'utf-8'));
}

// Group benchmarks by category
function groupBenchmarks(benchmarks: TatamiBenchmark[]): Map<string, TatamiBenchmark[]> {
  const groups = new Map<string, TatamiBenchmark[]>();
  for (const b of benchmarks) {
    const group = b.group || 'default';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(b);
  }
  return groups;
}

// Generate dashboard markdown
function generateDashboard(data: BenchmarkOutput): string {
  const groups = groupBenchmarks(data.results.benchmarks);

  let md = `# Performance Dashboard

**Version:** ${data.version}
**Generated:** ${new Date().toISOString()}
**Baseline:** ${data.timestamp}
**Node:** ${data.node}
**Platform:** ${data.platform}/${data.arch}

---

## Summary

| Category | API | Latency (avg) | Throughput |
|----------|-----|---------------|------------|
`;

  // Summary table
  for (const [groupName, benchmarks] of groups) {
    for (const b of benchmarks) {
      const latency = b.stats?.latency?.avg;
      const throughput = b.stats?.throughput?.avg;
      if (latency && throughput) {
        md += `| ${groupName.replace('ci:', '')} | ${b.name} | ${formatNs(latency)} | ${formatOps(throughput)} |\n`;
      }
    }
  }

  md += `
---

## Detailed Metrics

`;

  // Detailed tables per group
  for (const [groupName, benchmarks] of groups) {
    md += `### ${groupName.replace('ci:', '').toUpperCase()}

| Benchmark | Avg | Min | Max | P50 | P99 | StdDev |
|-----------|-----|-----|-----|-----|-----|--------|
`;
    for (const b of benchmarks) {
      const s = b.stats?.latency;
      if (s) {
        md += `| ${b.name} | ${formatNs(s.avg)} | ${formatNs(s.min)} | ${formatNs(s.max)} | ${formatNs(s.p50)} | ${formatNs(s.p99)} | ±${s.rmoe?.toFixed(1) || '?'}% |\n`;
      }
    }
    md += '\n';
  }

  md += `---

## API Tier Comparison

| Scenario | validate() | check() | compileCheck() | check() vs validate | compileCheck() vs validate |
|----------|------------|---------|----------------|--------------------|-----------------------------|
`;

  // Extract API tier comparisons
  const scenarios = ['string', 'number', 'simple', 'complex', 'array10', 'array100', 'union', 'invalid'];
  for (const scenario of scenarios) {
    const validate = data.results.benchmarks.find(b => b.name === `${scenario}:validate`);
    const check = data.results.benchmarks.find(b => b.name === `${scenario}:check`);
    const compileCheck = data.results.benchmarks.find(b => b.name === `${scenario}:compileCheck`);

    if (validate && check && compileCheck) {
      const vLatency = validate.stats?.latency?.avg || 0;
      const cLatency = check.stats?.latency?.avg || 0;
      const ccLatency = compileCheck.stats?.latency?.avg || 0;

      const checkVsValidate = vLatency > 0 ? (((vLatency - cLatency) / vLatency) * 100).toFixed(1) : '?';
      const ccVsValidate = vLatency > 0 ? (((vLatency - ccLatency) / vLatency) * 100).toFixed(1) : '?';

      md += `| ${scenario} | ${formatNs(vLatency)} | ${formatNs(cLatency)} | ${formatNs(ccLatency)} | ${checkVsValidate}% faster | ${ccVsValidate}% faster |\n`;
    }
  }

  md += `
---

## Key Insights

- **check()** skips Result allocation → faster for valid data
- **compileCheck()** uses cached JIT → fastest for repeated validation
- **Invalid data** shows biggest gap (check/compileCheck skip error path)

---

## How to Update

\`\`\`bash
# Run benchmarks and update dashboard
npm run bench:ci | npm run bench:dashboard -- --stdin

# Or regenerate from existing baseline
npm run bench:dashboard
\`\`\`

---

*Generated by \`benchmarks/ci/generate-dashboard.ts\`*
`;

  return md;
}

async function main() {
  const data = await readData();
  const dashboard = generateDashboard(data);
  writeFileSync(DASHBOARD_FILE, dashboard);
  console.log(`✅ Dashboard generated: ${DASHBOARD_FILE}`);
  console.log(`   Version: ${data.version}`);
  console.log(`   Benchmarks: ${data.results.benchmarks.length}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

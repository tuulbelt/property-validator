#!/usr/bin/env node --import tsx
/**
 * Baseline Comparison Script
 *
 * Compares current benchmark results against a baseline to detect regressions.
 * Exits with code 1 if regression exceeds threshold.
 *
 * Usage:
 *   npm run bench:compare                    # Compare against default baseline
 *   npm run bench:compare -- --threshold 10  # Set regression threshold to 10%
 *   npm run bench:compare -- --save          # Save current as new baseline
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BASELINE_FILE = join(__dirname, 'baseline.json');

// tatami-ng JSON output structure
interface TatamiStats {
  latency?: {
    avg: number;
    min: number;
    max: number;
    p50: number;
    p75: number;
    p99: number;
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

interface Comparison {
  name: string;
  group: string;
  baseline: number;
  current: number;
  change: number; // percentage
  regression: boolean;
}

// Parse command line arguments
const args = process.argv.slice(2);
const threshold = parseFloat(args.find((_, i, a) => a[i - 1] === '--threshold') || '15');
const shouldSave = args.includes('--save');

// Helper to extract avg latency from benchmark result
function getAvgLatency(benchmarkName: string, benchmarks: TatamiBenchmark[]): number | null {
  const bench = benchmarks.find((b) => b.name === benchmarkName);
  return bench?.stats?.latency?.avg ?? null;
}

// Format nanoseconds for display
function formatNs(ns: number): string {
  if (ns >= 1_000_000) {
    return `${(ns / 1_000_000).toFixed(2)} ms`;
  } else if (ns >= 1_000) {
    return `${(ns / 1_000).toFixed(2)} µs`;
  }
  return `${ns.toFixed(2)} ns`;
}

// Read current results from stdin
async function readCurrentResults(): Promise<BenchmarkOutput> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const input = Buffer.concat(chunks).toString();
  return JSON.parse(input);
}

async function main() {
  // If --save flag, read stdin and save as baseline
  if (shouldSave) {
    const current = await readCurrentResults();
    writeFileSync(BASELINE_FILE, JSON.stringify(current, null, 2));
    console.log(`✅ Saved baseline: ${BASELINE_FILE}`);
    console.log(`   Version: ${current.version}`);
    console.log(`   Timestamp: ${current.timestamp}`);
    console.log(`   Benchmarks: ${current.results.benchmarks.length}`);
    process.exit(0);
  }

  // Check baseline exists
  if (!existsSync(BASELINE_FILE)) {
    console.error('❌ No baseline found. Run: npm run bench:ci | npm run bench:compare -- --save');
    process.exit(1);
  }

  // Read baseline and current
  const baseline: BenchmarkOutput = JSON.parse(readFileSync(BASELINE_FILE, 'utf-8'));
  const current = await readCurrentResults();

  console.log('\n📊 Benchmark Comparison');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`Baseline: v${baseline.version} (${baseline.timestamp})`);
  console.log(`Current:  v${current.version} (${current.timestamp})`);
  console.log(`Threshold: ${threshold}% regression triggers failure\n`);

  // Compare results
  const comparisons: Comparison[] = [];

  for (const bench of current.results.benchmarks) {
    const baselineLatency = getAvgLatency(bench.name, baseline.results.benchmarks);
    const currentLatency = bench.stats?.latency?.avg;

    if (baselineLatency && currentLatency) {
      const change = ((currentLatency - baselineLatency) / baselineLatency) * 100;
      comparisons.push({
        name: bench.name,
        group: bench.group || 'default',
        baseline: baselineLatency,
        current: currentLatency,
        change,
        regression: change > threshold,
      });
    }
  }

  // Sort by change (worst regressions first)
  comparisons.sort((a, b) => b.change - a.change);

  // Display results
  console.log('Results:');
  console.log('─────────────────────────────────────────────────────────────────\n');

  const regressions = comparisons.filter((c) => c.regression);
  const improvements = comparisons.filter((c) => c.change < -5); // >5% improvement
  const stable = comparisons.filter((c) => c.change >= -5 && c.change <= threshold);

  if (regressions.length > 0) {
    console.log('🔴 REGRESSIONS (exceeds threshold):');
    for (const r of regressions) {
      console.log(`   ${r.group}/${r.name}`);
      console.log(`      Baseline: ${formatNs(r.baseline)} → Current: ${formatNs(r.current)}`);
      console.log(`      Change: +${r.change.toFixed(1)}% ❌\n`);
    }
  }

  if (improvements.length > 0) {
    console.log('🟢 IMPROVEMENTS (>5% faster):');
    for (const i of improvements) {
      console.log(`   ${i.group}/${i.name}`);
      console.log(`      Baseline: ${formatNs(i.baseline)} → Current: ${formatNs(i.current)}`);
      console.log(`      Change: ${i.change.toFixed(1)}% ✅\n`);
    }
  }

  if (stable.length > 0) {
    console.log('⚪ STABLE (within threshold):');
    for (const s of stable) {
      const symbol = s.change > 0 ? '+' : '';
      console.log(`   ${s.group}/${s.name}: ${symbol}${s.change.toFixed(1)}%`);
    }
    console.log('');
  }

  // Summary
  console.log('─────────────────────────────────────────────────────────────────');
  console.log(`Summary: ${regressions.length} regressions, ${improvements.length} improvements, ${stable.length} stable\n`);

  // Exit with failure if regressions found
  if (regressions.length > 0) {
    console.log('❌ FAILED: Performance regressions detected!');
    console.log(`   ${regressions.length} benchmark(s) exceeded ${threshold}% regression threshold.\n`);
    process.exit(1);
  }

  console.log('✅ PASSED: No performance regressions detected.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

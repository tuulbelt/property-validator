/**
 * Flakiness Detection Test (Dogfooding)
 *
 * Uses the Test Flakiness Detector tool to validate that all tests in this tool
 * are deterministic and non-flaky.
 *
 * This demonstrates dogfooding: using Tuulbelt tools to validate other Tuulbelt tools.
 *
 * Run this test:
 *   npx tsx test/flakiness-detection.test.ts
 *
 * Prerequisites:
 *   - test-flakiness-detector must be available in parent directory (meta repo)
 *   - Node.js and npm must be installed
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Configuration
const FLAKINESS_DETECTOR_PATH = join(process.cwd(), '..', 'test-flakiness-detector');
const TEST_RUNS = 10; // Run each test suite 10 times to detect flakiness
const TEST_COMMAND = 'npm test';

console.log('Dogfooding: Using Test Flakiness Detector to validate tests\n');

// Verify Test Flakiness Detector exists
if (!existsSync(FLAKINESS_DETECTOR_PATH)) {
  console.log('Test Flakiness Detector not found at:', FLAKINESS_DETECTOR_PATH);
  console.log('   Make sure test-flakiness-detector tool is available in parent directory');
  console.log('');
  console.log('   This is expected if running standalone (outside meta repo).');
  console.log('   Dogfooding is optional and only works in meta repo context.');
  process.exit(0);
}

console.log('Test Flakiness Detector location:', FLAKINESS_DETECTOR_PATH);
console.log('Test command:', TEST_COMMAND);
console.log('Number of runs:', TEST_RUNS);
console.log('');

try {
  console.log('Running flakiness detection (this may take several minutes)...\n');

  const startTime = Date.now();

  // Run the flakiness detector
  const result = execSync(
    `npx tsx ${join(FLAKINESS_DETECTOR_PATH, 'src', 'index.ts')} --test "${TEST_COMMAND}" --runs ${TEST_RUNS}`,
    {
      encoding: 'utf-8',
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large output
    }
  );

  const elapsed = Date.now() - startTime;

  // Parse the JSON result
  const report = JSON.parse(result);

  console.log('Flakiness detection completed in', (elapsed / 1000).toFixed(2), 'seconds\n');

  // Display results
  console.log('Results:');
  console.log('   Total runs:', report.totalRuns);
  console.log('   Passed runs:', report.passedRuns);
  console.log('   Failed runs:', report.failedRuns);
  console.log('');

  // Check for flakiness
  if (report.passedRuns > 0 && report.failedRuns > 0) {
    console.error('FLAKY TESTS DETECTED!');
    console.error('');
    console.error('The test suite has intermittent failures:');
    console.error(`   ${report.passedRuns}/${report.totalRuns} runs passed (${Math.round((report.passedRuns / report.totalRuns) * 100)}%)`);
    console.error(`   ${report.failedRuns}/${report.totalRuns} runs failed (${Math.round((report.failedRuns / report.totalRuns) * 100)}%)`);
    console.error('');
    console.error('Flaky tests found:');
    for (const test of report.flakyTests) {
      console.error(`   - ${test.testName}: ${test.failureRate.toFixed(1)}% failure rate`);
    }
    console.error('');
    console.error('Fix these flaky tests before releasing!');
    process.exit(1);
  } else if (report.failedRuns === report.totalRuns) {
    console.error('ALL TESTS FAILED');
    console.error('');
    console.error('All test runs failed consistently.');
    console.error('This indicates a genuine test failure, not flakiness.');
    console.error('');
    console.error('First failure output:');
    if (report.runs && report.runs[0]) {
      console.error(report.runs[0].stderr || report.runs[0].stdout);
    }
    process.exit(1);
  } else if (report.passedRuns === report.totalRuns) {
    console.log('NO FLAKINESS DETECTED');
    console.log('');
    console.log('All', report.totalRuns, 'test runs passed consistently.');
    console.log('The test suite is deterministic and reliable!');
    console.log('');
    console.log('This validates that:');
    console.log('   - All tests are deterministic');
    console.log('   - No race conditions in async code');
    console.log('   - No probabilistic test logic');
    console.log('   - No shared state between tests');
    console.log('   - File cleanup is thorough');
    process.exit(0);
  } else {
    console.error('UNEXPECTED RESULT');
    console.error('Unexpected test results. Check the report:');
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
} catch (error) {
  if (error instanceof Error) {
    console.error('Error running flakiness detection:');
    console.error(error.message);

    if ('stderr' in error && error.stderr) {
      console.error('\nError output:');
      console.error(error.stderr);
    }

    if ('stdout' in error && error.stdout) {
      console.error('\nStandard output:');
      console.error(error.stdout);
    }
  } else {
    console.error('Unknown error:', error);
  }

  process.exit(1);
}

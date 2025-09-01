#!/usr/bin/env node

/**
 * Performance Benchmarking Script
 *
 * Measures the execution time improvement from E2E test optimization.
 * Compares old E2E suite vs optimized E2E suite.
 */

import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

console.log('🚀 MindMeld E2E Test Performance Benchmark\n');

async function runBenchmark() {
  const results = {};

  console.log('📊 Running benchmarks...\n');

  // Benchmark 1: Unit Tests (baseline)
  console.log('1️⃣ Running unit tests...');
  const unitStart = performance.now();
  try {
    const unitOutput = execSync('npm run test:unit', {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 60000,
    });
    const unitEnd = performance.now();
    const unitTime = (unitEnd - unitStart) / 1000;

    // Extract test count from Jest output
    const unitTestMatch = unitOutput.match(
      /Tests:\s+\d+\s+skipped,\s+(\d+)\s+passed/,
    );
    const unitTestCount = unitTestMatch ? parseInt(unitTestMatch[1]) : 0;

    results.unit = {
      time: unitTime,
      tests: unitTestCount,
      testsPerSecond: unitTestCount / unitTime,
    };

    console.log(
      `   ✅ ${unitTestCount} tests in ${unitTime.toFixed(1)}s (${results.unit.testsPerSecond.toFixed(1)} tests/sec)\n`,
    );
  } catch (error) {
    console.log(`   ❌ Unit tests failed or timed out: ${error.message}\n`);
    results.unit = { time: 0, tests: 0, testsPerSecond: 0 };
  }

  // Benchmark 2: Original E2E Suite (smoke tests only for speed)
  console.log('2️⃣ Running original E2E smoke tests...');
  const originalStart = performance.now();
  try {
    const originalOutput = execSync('npm run test:e2e:smoke', {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 120000,
    });
    const originalEnd = performance.now();
    const originalTime = (originalEnd - originalStart) / 1000;

    // Extract test count from Playwright output
    const originalTestMatch = originalOutput.match(/(\d+)\s+passed/);
    const originalTestCount = originalTestMatch
      ? parseInt(originalTestMatch[1])
      : 0;

    results.originalE2E = {
      time: originalTime,
      tests: originalTestCount,
      testsPerSecond: originalTestCount / originalTime,
    };

    console.log(
      `   ✅ ${originalTestCount} tests in ${originalTime.toFixed(1)}s (${results.originalE2E.testsPerSecond.toFixed(1)} tests/sec)\n`,
    );
  } catch (error) {
    console.log(
      `   ❌ Original E2E tests failed or timed out: ${error.message}\n`,
    );
    results.originalE2E = { time: 0, tests: 0, testsPerSecond: 0 };
  }

  // Benchmark 3: Optimized E2E Suite
  console.log('3️⃣ Running optimized E2E tests...');
  const optimizedStart = performance.now();
  try {
    const optimizedOutput = execSync(
      'npx playwright test tests/e2e-optimized/',
      {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 60000,
      },
    );
    const optimizedEnd = performance.now();
    const optimizedTime = (optimizedEnd - optimizedStart) / 1000;

    // Extract test count from Playwright output
    const optimizedTestMatch = optimizedOutput.match(/(\d+)\s+passed/);
    const optimizedTestCount = optimizedTestMatch
      ? parseInt(optimizedTestMatch[1])
      : 0;

    results.optimizedE2E = {
      time: optimizedTime,
      tests: optimizedTestCount,
      testsPerSecond: optimizedTestCount / optimizedTime,
    };

    console.log(
      `   ✅ ${optimizedTestCount} tests in ${optimizedTime.toFixed(1)}s (${results.optimizedE2E.testsPerSecond.toFixed(1)} tests/sec)\n`,
    );
  } catch (error) {
    console.log(
      `   ❌ Optimized E2E tests failed or timed out: ${error.message}\n`,
    );
    results.optimizedE2E = { time: 0, tests: 0, testsPerSecond: 0 };
  }

  // Report Results
  console.log('📈 BENCHMARK RESULTS\n');
  console.log(
    '┌─────────────────┬───────────┬─────────────┬───────────────────┐',
  );
  console.log(
    '│ Test Suite      │ Tests     │ Time (sec)  │ Tests/Second      │',
  );
  console.log(
    '├─────────────────┼───────────┼─────────────┼───────────────────┤',
  );
  console.log(
    `│ Unit Tests      │ ${results.unit.tests.toString().padEnd(9)} │ ${results.unit.time.toFixed(1).padEnd(11)} │ ${results.unit.testsPerSecond.toFixed(1).padEnd(17)} │`,
  );
  console.log(
    `│ Original E2E    │ ${results.originalE2E.tests.toString().padEnd(9)} │ ${results.originalE2E.time.toFixed(1).padEnd(11)} │ ${results.originalE2E.testsPerSecond.toFixed(1).padEnd(17)} │`,
  );
  console.log(
    `│ Optimized E2E   │ ${results.optimizedE2E.tests.toString().padEnd(9)} │ ${results.optimizedE2E.time.toFixed(1).padEnd(11)} │ ${results.optimizedE2E.testsPerSecond.toFixed(1).padEnd(17)} │`,
  );
  console.log(
    '└─────────────────┴───────────┴─────────────┴───────────────────┘\n',
  );

  if (results.originalE2E.time > 0 && results.optimizedE2E.time > 0) {
    const timeImprovement =
      ((results.originalE2E.time - results.optimizedE2E.time) /
        results.originalE2E.time) *
      100;
    const efficiencyImprovement =
      ((results.optimizedE2E.testsPerSecond -
        results.originalE2E.testsPerSecond) /
        results.originalE2E.testsPerSecond) *
      100;

    console.log('🎯 OPTIMIZATION IMPACT\n');
    console.log(`⚡ Time Reduction: ${timeImprovement.toFixed(1)}%`);
    console.log(`📈 Efficiency Gain: ${efficiencyImprovement.toFixed(1)}%`);
    console.log(
      `🔥 Speed Multiplier: ${(results.optimizedE2E.testsPerSecond / results.originalE2E.testsPerSecond).toFixed(1)}x faster\n`,
    );
  }

  // Estimate full suite improvement
  if (results.originalE2E.testsPerSecond > 0) {
    const fullOriginalEstimate = 143 / results.originalE2E.testsPerSecond;
    const fullOptimizedEstimate =
      12 /
      (results.optimizedE2E.testsPerSecond ||
        results.originalE2E.testsPerSecond);

    console.log('📊 FULL SUITE PROJECTION\n');
    console.log(
      `Original full suite (143 tests): ~${fullOriginalEstimate.toFixed(1)}s`,
    );
    console.log(
      `Optimized suite (12 tests): ~${fullOptimizedEstimate.toFixed(1)}s`,
    );
    console.log(
      `Total improvement: ${(((fullOriginalEstimate - fullOptimizedEstimate) / fullOriginalEstimate) * 100).toFixed(1)}% faster\n`,
    );
  }

  console.log('✨ Benchmark complete!');
}

runBenchmark().catch(console.error);

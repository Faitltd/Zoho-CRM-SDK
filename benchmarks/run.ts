import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bench, formatMs } from './harness';
import { startMockServer } from './mock-server';
import {
  BenchmarkAuth,
  consumeBulk,
  consumeBulkWithMemory,
  createHttpClient,
  createRateLimiterScenario,
  rawHttpGet,
  sdkGet
} from './scenarios';

type BenchOutput = {
  generatedAt: string;
  system: {
    node: string;
    platform: string;
    arch: string;
  };
  metrics: Record<string, number>;
  benchmarks: Record<string, unknown>;
};

async function run() {
  const server = await startMockServer();
  try {
    const baseUrl = server.baseUrl;
    const leadUrl = `${baseUrl}/crm/v2/Leads`;

    const warmAuth = new BenchmarkAuth(0);

    const sdkWarmClient = createHttpClient(warmAuth, false);
    const sdkValidatedClient = createHttpClient(warmAuth, true);

    const raw = await bench('raw_http', () => rawHttpGet(leadUrl), { iterations: 20, warmup: 5 });
    const cold = await bench(
      'sdk_cold_start',
      async () => {
        const coldAuth = new BenchmarkAuth(50);
        const client = createHttpClient(coldAuth, false);
        await sdkGet(client, leadUrl, false);
      },
      {
        iterations: 5,
        warmup: 1
      }
    );
    const warm = await bench('sdk_warm_path', () => sdkGet(sdkWarmClient, leadUrl, false), {
      iterations: 50,
      warmup: 5
    });

    const refresh = await bench('token_refresh', () => {
      warmAuth.invalidateToken();
      return sdkGet(sdkWarmClient, leadUrl, false);
    }, {
      iterations: 5,
      warmup: 0
    });

    const validationOff = await bench('validation_off', () => sdkGet(sdkWarmClient, leadUrl, false), {
      iterations: 50,
      warmup: 5
    });
    const validationOn = await bench('validation_on', () => sdkGet(sdkValidatedClient, leadUrl, true), {
      iterations: 50,
      warmup: 5
    });

    const rateLimiterScenario = createRateLimiterScenario();
    const rateLimiterResult = await bench(
      'rate_limiter',
      () => rateLimiterScenario.run(5),
      { iterations: 5, warmup: 1 }
    );
    const delays = rateLimiterScenario.startTimes;
    const rateLimiterDelayMs = delays.length > 1 ? delays[delays.length - 1] - delays[0] : 0;

    const bulk10k = await bench('bulk_10k', () => consumeBulk(10_000, 1000), {
      iterations: 1
    });

    const bulkMemoryStart = process.memoryUsage().heapUsed;
    const bulkMemory = await consumeBulkWithMemory(100_000, 5000);
    const bulkMemoryEnd = process.memoryUsage().heapUsed;

    const sdkOverheadMs = warm.avgMs - raw.avgMs;
    const bulk10kThroughput = 10_000 / (bulk10k.totalMs / 1000);

    const output: BenchOutput = {
      generatedAt: new Date().toISOString(),
      system: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      },
      metrics: {
        rawHttpAvgMs: raw.avgMs,
        sdkWarmAvgMs: warm.avgMs,
        sdkColdAvgMs: cold.avgMs,
        sdkOverheadMs,
        tokenRefreshAvgMs: refresh.avgMs,
        validationOverheadMs: validationOn.avgMs - validationOff.avgMs,
        rateLimiterDelayMs,
        bulk10kMs: bulk10k.totalMs,
        bulk10kRecordsPerSec: bulk10kThroughput,
        bulk100kHeapDeltaMb: (bulkMemoryEnd - bulkMemoryStart) / 1024 / 1024,
        bulk100kHeapMaxMb: bulkMemory.maxHeap / 1024 / 1024
      },
      benchmarks: {
        raw,
        cold,
        warm,
        refresh,
        validationOff,
        validationOn,
        rateLimiter: rateLimiterResult,
        bulk10k
      }
    };

    const outputPath = resolveOutputPath();
    writeFileSync(outputPath, JSON.stringify(output, null, 2));

    printSummary(output);
  } finally {
    await server.close();
  }
}

function resolveOutputPath() {
  const arg = process.argv.find((value) => value.startsWith('--output='));
  if (arg) {
    return arg.split('=')[1];
  }
  return join(process.cwd(), 'benchmarks', 'results.json');
}

function printSummary(output: BenchOutput) {
  const metrics = output.metrics;
  console.log('Benchmark summary');
  console.log(`Raw HTTP avg: ${formatMs(metrics.rawHttpAvgMs)}`);
  console.log(`SDK warm avg: ${formatMs(metrics.sdkWarmAvgMs)}`);
  console.log(`SDK overhead: ${formatMs(metrics.sdkOverheadMs)}`);
  console.log(`Token refresh avg: ${formatMs(metrics.tokenRefreshAvgMs)}`);
  console.log(`Validation overhead: ${formatMs(metrics.validationOverheadMs)}`);
  console.log(`Rate limiter delay: ${formatMs(metrics.rateLimiterDelayMs)}`);
  console.log(`Bulk 10k total: ${formatMs(metrics.bulk10kMs)}`);
  console.log(`Bulk 10k throughput: ${metrics.bulk10kRecordsPerSec.toFixed(1)} records/sec`);
  console.log(`Bulk 100k heap delta: ${metrics.bulk100kHeapDeltaMb.toFixed(2)} MB`);
  console.log(`Bulk 100k heap max: ${metrics.bulk100kHeapMaxMb.toFixed(2)} MB`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

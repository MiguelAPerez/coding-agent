import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';


export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const otlpEndpoint = process.env.OTLP_ENDPOINT;

    if (otlpEndpoint) {
      console.log('OpenTelemetry: Initializing with endpoint:', otlpEndpoint);

      const sdk = new NodeSDK({
        resource: resourceFromAttributes({
          [ATTR_SERVICE_NAME]: 'coding-agent',
        }),
        traceExporter: new OTLPTraceExporter({
          url: otlpEndpoint.endsWith('/v1/traces') ? otlpEndpoint : `${otlpEndpoint}/v1/traces`,
        }),
        instrumentations: [getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-http': {
            enabled: false,
          },
        })],
      });

      sdk.start();

      process.on('SIGTERM', () => {
        sdk.shutdown()
          .then(() => console.log('OpenTelemetry: SDK shut down'))
          .catch((error) => console.log('OpenTelemetry: Error shutting down SDK', error))
          .finally(() => process.exit(0));
      });


      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const cron = require("node-cron");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { analyzeRepoDocs } = require("./lib/analysis");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { syncRepositories } = require("./lib/sync");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { semanticIndexing } = require("./lib/semanticIndexing");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { cleanupOldExternalChats } = require("./lib/chat-cleanup");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { runBackgroundJob } = require("./lib/background-jobs");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { CRON_DEFINITIONS } = require("./lib/cron-constants");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ConnectionManager } = require("./lib/connections/manager");

      const jobs: Record<string, () => Promise<unknown>> = {
        repository_sync: syncRepositories,
        repository_analysis_docs: analyzeRepoDocs,
        semantic_indexing: semanticIndexing,
        chat_cleanup: cleanupOldExternalChats,
      };

      for (const def of CRON_DEFINITIONS) {
        const task = jobs[def.id];
        if (task) {
          cron.schedule(def.schedule, async () => {
            console.log(`Starting scheduled ${def.name}...`);
            await runBackgroundJob(def.id, async () => {
              return await task();
            });
          });
        }
      }

      console.log("Internal cron jobs registered from centralized definitions");

      // Start all enabled connections
      console.log("[Instrumentation] Starting connection manager...");
      ConnectionManager.getInstance().startAll().catch((err: Error) => {
        console.error("[Instrumentation] Failed to start connections:", err);
      });
    } else {
      console.log('OpenTelemetry: OTLP_ENDPOINT not set, collection disabled.');
    }
  }
}

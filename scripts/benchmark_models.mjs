
import { Ollama } from 'ollama';

const ollama = new Ollama({ host: 'https://ollama.miguelaperez.dev' });
import { models, testCases } from './mock/test_cases.mjs';

const RUNS_PER_MODEL = 1;
const COOLDOWN_MS = 5000; // 10 seconds to let GPU breathe

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runBenchmark() {
    console.log("Starting Comprehensive Model Consistency & Performance Benchmark...\n");
    const results = {};
    const totalModels = models.length;
    const totalTests = models.length * testCases.length;
    let testsCompleted = 0;

    for (let mIdx = 0; mIdx < totalModels; mIdx++) {
        const model = models[mIdx];
        const modelNum = mIdx + 1;
        console.log(`\n=== [${modelNum}/${totalModels}] Testing Model: ${model} ===`);
        results[model] = {
            categories: {},
            totalWeightedScore: 0,
            totalWeight: 0,
            totalLatency: 0,
            runs: 0
        };

        for (const testCase of testCases) {
            process.stdout.write(`  [${testCase.category}] ${testCase.name} ... `);
            let testCaseLatencies = [];
            let testCaseScores = [];

            let overallProgress = 0;
            for (let i = 0; i < RUNS_PER_MODEL; i++) {
                const start = Date.now();
                try {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 120000); // Increased timeout for high context

                    let progress = 0;
                    const loaderInterval = setInterval(() => {
                        progress = (progress + 1) % 5;
                        const dots = ".".repeat(progress);
                        process.stdout.write(`\r  [${testCase.category}] ${testCase.name} ${dots}    `);
                    }, 500);

                    const messages = [];
                    if (testCase.systemContext) {
                        messages.push({ role: 'system', content: testCase.systemContext });
                    }
                    messages.push({ role: 'user', content: testCase.prompt });

                    const response = await ollama.chat({
                        model: model,
                        messages: messages,
                        stream: false,
                        keep_alive: 0,
                    }, { signal: controller.signal });

                    const duration = Date.now() - start;
                    const content = response.message.content;

                    let matches = 0;
                    testCase.control.forEach(keyword => {
                        if (content.toLowerCase().includes(keyword.toLowerCase())) {
                            matches++;
                        }
                    });

                    let score = (matches / testCase.control.length) * 100;
                    if (testCase.maxSentences) {
                        const sentenceCount = content.split(/[.!?]+\s/).filter(s => s.trim().length > 0).length;
                        if (sentenceCount > testCase.maxSentences) score *= 0.5;
                    }

                    testCaseLatencies.push(duration);
                    testCaseScores.push(score);
                } catch (err) {
                    testCaseScores.push(0);
                    testCaseLatencies.push(60000);
                } finally {
                    if (typeof loaderInterval !== 'undefined') clearInterval(loaderInterval);
                    if (typeof timeout !== 'undefined') clearTimeout(timeout);
                    testsCompleted++;
                    overallProgress = ((testsCompleted / totalTests) * 100).toFixed(1);
                    process.stdout.write(`\r  [${testCase.category}] ${testCase.name} ... `);
                }
            }

            const avgScore = testCaseScores.reduce((a, b) => a + b, 0) / testCaseScores.length;
            const avgLatency = testCaseLatencies.reduce((a, b) => a + b, 0) / testCaseLatencies.length;

            if (!results[model].categories[testCase.category]) {
                results[model].categories[testCase.category] = { score: 0, count: 0 };
            }
            results[model].categories[testCase.category].score += avgScore;
            results[model].categories[testCase.category].count++;

            results[model].totalWeightedScore += avgScore * testCase.weight;
            results[model].totalWeight += testCase.weight;
            results[model].totalLatency += avgLatency;
            results[model].runs++;

            console.log(`DONE (${avgScore.toFixed(0)}% | ${avgLatency}ms) | Overall: ${overallProgress}%`);
        }

        console.log(`\nFinished testing ${model}. Cooling down for ${COOLDOWN_MS / 1000}s...`);
        await sleep(COOLDOWN_MS);
    }

    console.log("\n\n" + "=".repeat(60));
    console.log("FINAL COMPREHENSIVE BENCHMARK REPORT");
    console.log("=".repeat(60));

    const finalTable = Object.entries(results).map(([name, data]) => {
        const row = {
            Model: name,
            "Overall (%)": (data.totalWeightedScore / data.totalWeight).toFixed(1),
            "Avg Latency (ms)": (data.totalLatency / data.runs).toFixed(0)
        };
        // Add categories to table
        Object.entries(data.categories).forEach(([cat, cdata]) => {
            row[cat] = (cdata.score / cdata.count).toFixed(0) + "%";
        });
        return row;
    }).sort((a, b) => b["Overall (%)"] - a["Overall (%)"]);

    console.table(finalTable);
}

runBenchmark()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
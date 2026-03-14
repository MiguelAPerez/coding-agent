import { db } from "./index"
import { users, accounts, sessions, verificationTokens, permissions, userPermissions, giteaConfigurations, repositories, agentConfigurations, skills, tools, contextGroups, benchmarks, benchmarkEntries, ollamaConfigurations, ollamaModels } from "./schema"

async function clear() {
    console.log("🧹 Clearing database...")

    try {
        // Order matters if there are foreign key constraints without cascade (though schema has onDelete: "cascade")

    const tables = [
        { name: "repositories", table: repositories },
        { name: "ollamaModels", table: ollamaModels },
        { name: "ollamaConfigurations", table: ollamaConfigurations },
        { name: "benchmarkEntries", table: benchmarkEntries },
        { name: "benchmarks", table: benchmarks },
        { name: "contextGroups", table: contextGroups },
        { name: "skills", table: skills },
        { name: "tools", table: tools },
        { name: "agentConfigurations", table: agentConfigurations },
        { name: "userPermissions", table: userPermissions },
        { name: "giteaConfigurations", table: giteaConfigurations },
        { name: "sessions", table: sessions },
        { name: "accounts", table: accounts },
        { name: "verificationTokens", table: verificationTokens },
        { name: "users", table: users },
        { name: "permissions", table: permissions },
    ];

    for (const { name, table } of tables) {
        try {
            console.log(`- Clearing ${name}...`);
            await db.delete(table);
        } catch (error: unknown) {
            const err = error as Error;
            if (err.message && err.message.includes("no such table")) {
                console.log(`  (Table ${name} does not exist, skipping)`);
            } else {
                console.error(`❌ Failed to clear ${name}:`, err.message);
            }
        }

    }

    console.log("\n✅ Database clear process completed!");
} catch (error) {
    console.error("❌ Clearing failed:", error)
    process.exit(1)
}

}

clear()

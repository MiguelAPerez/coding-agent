import { db } from "./index"
import { users, accounts, sessions, verificationTokens, permissions, userPermissions, giteaConfigurations, repositories, repositoryMetadata, agentConfigurations, skills, tools, contextGroups, benchmarks, benchmarkEntries } from "./schema"

async function clear() {
    console.log("🧹 Clearing database...")

    try {
        // Order matters if there are foreign key constraints without cascade (though schema has onDelete: "cascade")

        console.log("- Clearing repository metadata...")
        await db.delete(repositoryMetadata)

        console.log("- Clearing repositories...")
        await db.delete(repositories)

        console.log("- Clearing benchmark entries...")
        await db.delete(benchmarkEntries)

        console.log("- Clearing benchmarks...")
        await db.delete(benchmarks)

        console.log("- Clearing context groups...")
        await db.delete(contextGroups)

        console.log("- Clearing skills...")
        await db.delete(skills)


        console.log("- Clearing tools...")
        await db.delete(tools)

        console.log("- Clearing agent configurations...")
        await db.delete(agentConfigurations)

        console.log("- Clearing user permissions...")
        await db.delete(userPermissions)

        console.log("- Clearing Gitea configurations...")
        await db.delete(giteaConfigurations)

        console.log("- Clearing sessions...")
        await db.delete(sessions)

        console.log("- Clearing accounts...")
        await db.delete(accounts)

        console.log("- Clearing verification tokens...")
        await db.delete(verificationTokens)

        console.log("- Clearing users...")
        await db.delete(users)

        console.log("- Clearing permissions...")
        await db.delete(permissions)

        console.log("\n✅ Database cleared successfully!")
    } catch (error) {
        console.error("❌ Clearing failed:", error)
        process.exit(1)
    }
}

clear()

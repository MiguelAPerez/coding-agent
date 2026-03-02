import { db } from "./index"
import { eq } from "drizzle-orm"
import bcryptjs from "bcryptjs"
import { contextGroups as mockContexts } from "../data/repos/agent_data/contexts"
import { systemPrompts as mockPrompts, systemPromptSets as mockSets } from "../data/repos/agent_data/systemPrompts"
import { systemPrompts, systemPromptSets, contextGroups, permissions, users, userPermissions } from "./schema"

// The default permissions we want every environment to have
const DEFAULT_PERMISSIONS = [
    {
        name: "admin",
        description: "Full administrative access to settings and users",
    },
    {
        name: "users:read",
        description: "Can view the list of users",
    },
    {
        name: "users:write",
        description: "Can create, update, and delete users",
    },
    {
        name: "settings:read",
        description: "Can view application settings",
    },
    {
        name: "settings:write",
        description: "Can update application settings",
    },
]

async function seed() {
    console.log("🌱 Seeding database...")

    try {
        for (const permission of DEFAULT_PERMISSIONS) {
            // Idempotent approach: Check if it exists before trying to insert to avoid Unique Constraint errors
            const existing = await db
                .select()
                .from(permissions)
                .where(eq(permissions.name, permission.name))
                .get()

            if (!existing) {
                console.log(`Inserting permission: ${permission.name}`)
                await db.insert(permissions).values({
                    name: permission.name,
                    description: permission.description,
                })
            } else {
                console.log(`Skipping permission: ${permission.name} (already exists)`)
            }
        }

        // --- SEED ADMIN USER ---
        const ADMIN_EMAIL = "admin@example.com"
        const PASS = "admin";
        const existingAdmin = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).get()

        let adminUserId: string

        if (!existingAdmin) {
            console.log("Creating default admin user...")
            const hashedPassword = await bcryptjs.hash(PASS, 10)
            const [newUser] = await db
                .insert(users)
                .values({
                    name: "Admin User",
                    username: "admin",
                    email: ADMIN_EMAIL,
                    password: hashedPassword,
                })
                .returning()

            adminUserId = newUser.id
        } else {
            console.log("Admin user already exists.")
            adminUserId = existingAdmin.id
        }

        // Grant the admin user the 'admin' permission
        const adminPerm = await db.select().from(permissions).where(eq(permissions.name, "admin")).get()

        if (adminPerm) {
            try {
                // We'll just attempt it and ignore if the compound key already exists
                await db.insert(userPermissions).values({
                    userId: adminUserId,
                    permissionId: adminPerm.id
                })
                console.log("Granted 'admin' permission to admin user.")
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                if (e.message && e.message.includes("UNIQUE constraint failed")) {
                    console.log("Admin user already has 'admin' permission.")
                } else {
                    throw e
                }
            }
        }

        // --- SEED SYSTEM PROMPTS ---
        console.log("\n🌱 Seeding system prompts...")
        const promptIdMap = new Map<string, string>(); // mockId -> actualId

        for (const mp of mockPrompts) {
            const existing = await db.select().from(systemPrompts).where(eq(systemPrompts.name, mp.name)).get();
            if (!existing) {
                console.log(`Inserting system prompt: ${mp.name}`);
                const [inserted] = await db.insert(systemPrompts).values({
                    userId: adminUserId,
                    name: mp.name,
                    content: mp.content,
                }).returning();
                promptIdMap.set(mp.id, inserted.id);
            } else {
                console.log(`System prompt already exists: ${mp.name}`);
                promptIdMap.set(mp.id, existing.id);
            }
        }

        // --- SEED SYSTEM PROMPT SETS ---
        console.log("\n🌱 Seeding system prompt sets...")
        for (const ms of mockSets) {
            const existing = await db.select().from(systemPromptSets).where(eq(systemPromptSets.name, ms.name)).get();

            // Map mock IDs to real UUIDs
            const realIds = ms.systemPromptIds.map(id => promptIdMap.get(id)).filter(Boolean) as string[];

            if (!existing) {
                console.log(`Inserting system prompt set: ${ms.name}`);
                await db.insert(systemPromptSets).values({
                    userId: adminUserId,
                    name: ms.name,
                    description: ms.description,
                    systemPromptIds: JSON.stringify(realIds),
                });
            } else {
                console.log(`System prompt set already exists: ${ms.name}`);
            }
        }

        // --- SEED CONTEXT GROUPS ---
        console.log("\n🌱 Seeding context groups from mock data...")
        let cgCount = 0

        for (const tc of mockContexts) {
            const existing = await db
                .select()
                .from(contextGroups)
                .where(eq(contextGroups.name, tc.name))
                .get()

            const values = {
                userId: adminUserId,
                name: tc.name,
                description: `Category: ${tc.category} | Weight: ${tc.weight}`,
                category: tc.category,
                expectations: JSON.stringify(tc.expectations),
                weight: tc.weight,
                maxSentences: tc.maxSentences || null,
                systemContext: tc.systemContext || null,
                promptTemplate: tc.prompt,
                updatedAt: new Date(),
            }

            if (!existing) {
                console.log(`Inserting context group: ${tc.name}`)
                await db.insert(contextGroups).values(values)
                cgCount++
            } else {
                console.log(`Updating context group: ${tc.name} (already exists)`)
                await db.update(contextGroups)
                    .set(values)
                    .where(eq(contextGroups.id, existing.id))
                    .run();
            }
        }
        console.log(`✅ Context groups seeded! (${cgCount} new, ${mockContexts.length - cgCount} updated)`)

        console.log("\n✅ Seeding complete!")
        console.log(`   Admin Email: ${ADMIN_EMAIL}`)
        console.log(`   Admin Password: admin`)

    } catch (error) {
        console.error("❌ Seeding failed:", error)
        process.exit(1) // Exit with error code
    }
}

// Execute the seed function
seed()

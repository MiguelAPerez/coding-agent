import { db } from "./index"
import { permissions, users, userPermissions, contextGroups } from "./schema"
import { eq } from "drizzle-orm"
import bcryptjs from "bcryptjs"
import { testCases } from "../scripts/mock/test_cases.mjs"

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

        // --- SEED CONTEXT GROUPS ---
        console.log("\n🌱 Seeding context groups from mock data...")
        let cgCount = 0

        for (const tc of testCases) {
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
        console.log(`✅ Context groups seeded! (${cgCount} new, ${testCases.length - cgCount} updated)`)

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

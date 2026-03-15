import fs from "fs/promises";
import path from "path";

const DATA_BASE_DIR = path.join(process.cwd(), "data");
const SYSTEM_STATICS_DIR = path.join(process.cwd(), "system-statics");

export async function syncGlobalSystem() {
    const systemDir = path.join(DATA_BASE_DIR, "system");
    const skillsDir = path.join(DATA_BASE_DIR, "skills");
    
    await fs.mkdir(systemDir, { recursive: true });
    await fs.mkdir(skillsDir, { recursive: true });

    const masterPromptsDir = path.join(SYSTEM_STATICS_DIR, "system-prompts");

    async function syncFiles(src: string, dest: string) {
        try {
            const files = await fs.readdir(src);
            for (const file of files) {
                const destFile = path.join(dest, file);
                try {
                    await fs.access(destFile);
                } catch {
                    await fs.copyFile(path.join(src, file), destFile);
                }
            }
        } catch (e) {
            console.warn(`Failed to sync from ${src} to ${dest}`, e);
        }
    }

    await syncFiles(masterPromptsDir, systemDir);
}

export async function ensureUserScaffold(userId: string) {
    const userDir = path.join(DATA_BASE_DIR, userId);
    const subDirs = ["agents", "workspaces", "repos"];

    for (const dir of subDirs) {
        const fullPath = path.join(userDir, dir);
        await fs.mkdir(fullPath, { recursive: true });
    }

    // Still sync global system prompts for robustness
    await syncGlobalSystem();
}

export async function scaffoldAgent(userId: string, agentName: string, initialPersonality?: string) {
    const userAgentsDir = path.join(DATA_BASE_DIR, userId, "agents");
    // Slugify agent name for folder
    const slug = agentName.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const agentDir = path.join(userAgentsDir, slug);
    
    await fs.mkdir(agentDir, { recursive: true });

    const templatesSrc = path.join(SYSTEM_STATICS_DIR, "templates", "agent");
    try {
        const files = await fs.readdir(templatesSrc);
        for (const file of files) {
            const src = path.join(templatesSrc, file);
            const dest = path.join(agentDir, file);
            
            // If personality is provided and it's IDENTITY or WORKFLOW, and dest doesn't exist,
            // we might want to do something special. 
            // The user wanted: "should use the current 'set personality' when creating to 'from personaliy(optional) 
            // that would copy over on create. from there the agent will use the INENITY file instead of the peronsoaliy"
            
            try {
                await fs.access(dest);
                // Already exists, don't overwrite
            } catch {
                if (initialPersonality && (file === "IDENTITY.md" || file === "WORKFLOW.md")) {
                    // For now, let's put the whole personality in IDENTITY and a generic one in WORKFLOW
                    // Or maybe split it? Let's just put it in IDENTITY for now as requested.
                    if (file === "IDENTITY.md") {
                        await fs.writeFile(dest, initialPersonality);
                    } else {
                        await fs.copyFile(src, dest);
                    }
                } else {
                    await fs.copyFile(src, dest);
                }
            }
        }
    } catch (e) {
        console.warn(`Failed to scaffold agent ${agentName} for user ${userId}`, e);
    }
}

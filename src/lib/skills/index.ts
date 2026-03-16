import fs from "fs/promises";
import path from "path";
import { Skill } from "@/types/agent";

const SYSTEM_SKILLS_DIR = path.join(process.cwd(), "data", "system", "skills");
const USER_DATA_DIR = path.join(process.cwd(), "data");

async function getSkillFromDir(dirPath: string, id: string, isManaged: boolean, userId: string): Promise<Skill | null> {
    try {
        const skillMdPath = path.join(dirPath, "SKILL.md");
        const content = await fs.readFile(skillMdPath, "utf-8");
        
        // Simple metadata extraction
        const nameMatch = content.match(/^#\s+(.+)$/m);
        const name = nameMatch ? nameMatch[1].trim() : id;
        
        const descriptionMatch = content.match(/^##\s+Description\s*\n+([\s\S]+?)(?:\n+##|$)/m);
        const description = descriptionMatch ? descriptionMatch[1].trim() : "No description provided.";

        const files = await fs.readdir(dirPath);
        const scriptFile = files.find(f => f.startsWith("index.") && (f.endsWith(".py") || f.endsWith(".ts") || f.endsWith(".js") || f.endsWith(".php") || f.endsWith(".sh"))) || null;
        const requirementsFile = files.find(f => f === "env-requirements.txt" || f === "package.json") || null;

        const stats = await fs.stat(skillMdPath);

        let runtime: "local" | "docker" = "local";
        let envVars: Record<string, string> = {};
        try {
            const configPath = path.join(dirPath, "skill.json");
            const configData = JSON.parse(await fs.readFile(configPath, "utf-8"));
            if (configData.runtime) runtime = configData.runtime;
            if (configData.envVars) envVars = configData.envVars;
        } catch { /* ignore */ }

        let scriptContent: string | null = null;
        if (scriptFile) {
            try {
                scriptContent = await fs.readFile(path.join(dirPath, scriptFile), "utf-8");
            } catch { /* ignore */ }
        }

        let requirementsContent: string | null = null;
        if (requirementsFile) {
            try {
                requirementsContent = await fs.readFile(path.join(dirPath, requirementsFile), "utf-8");
            } catch { /* ignore */ }
        }

        return {
            id,
            userId,
            name,
            description,
            content,
            isManaged,
            runtime,
            envVars,
            scriptFile,
            scriptContent,
            requirementsFile,
            requirementsContent,
            updatedAt: stats.mtime,
        };
    } catch {
        // console.warn(`Failed to read skill from ${dirPath}`);
        return null;
    }
}

export async function loadAllSkills(userId: string): Promise<Skill[]> {
    const allSkills: Skill[] = [];

    // Load System Skills
    try {
        const systemSkillDirs = await fs.readdir(SYSTEM_SKILLS_DIR, { withFileTypes: true });
        for (const dirent of systemSkillDirs) {
            if (dirent.isDirectory()) {
                const skill = await getSkillFromDir(path.join(SYSTEM_SKILLS_DIR, dirent.name), dirent.name, true, "system");
                if (skill) allSkills.push(skill);
            }
        }
    } catch {
        // console.error("Failed to load system skills");
    }

    // Load User Skills
    const userSkillsDir = path.join(USER_DATA_DIR, userId, "skills");
    try {
        await fs.mkdir(userSkillsDir, { recursive: true });
        const userSkillDirs = await fs.readdir(userSkillsDir, { withFileTypes: true });
        for (const dirent of userSkillDirs) {
            if (dirent.isDirectory()) {
                const skill = await getSkillFromDir(path.join(userSkillsDir, dirent.name), dirent.name, false, userId);
                if (skill) allSkills.push(skill);
            }
        }
    } catch {
        // console.error("Failed to load user skills");
    }

    return allSkills;
}

export async function loadSkillById(id: string, userId: string): Promise<Skill | null> {
    // Try system first
    const systemSkill = await getSkillFromDir(path.join(SYSTEM_SKILLS_DIR, id), id, true, "system");
    if (systemSkill) return systemSkill;

    // Try user
    const userSkill = await getSkillFromDir(path.join(USER_DATA_DIR, userId, "skills", id), id, false, userId);
    return userSkill;
}

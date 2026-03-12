import fs from "fs";
import path from "path";
import { ContextGroup, SystemPrompt, SystemPromptSet } from "@/types/agent";

export async function loadRepoData(repoPath: string, feature?: string) {
    const fullPath = path.join(process.cwd(), "data", "repos", repoPath);
    
    if (!fs.existsSync(fullPath)) {
        throw new Error(`Repository path not found: ${fullPath}`);
    }

    // Determine the base path to look for files. Try feature directory first if provided.
    let searchPath = fullPath;
    if (feature) {
        const featurePath = path.join(fullPath, feature);
        if (fs.existsSync(featurePath)) {
            searchPath = featurePath;
        }
    }

    const contextsFile = path.join(searchPath, "contexts.json");
    const systemPromptsFile = path.join(searchPath, "systemPrompts.json");

    let contextGroups: ContextGroup[] = [];
    let systemPrompts: SystemPrompt[] = [];
    let systemPromptSets: SystemPromptSet[] = [];

    if (fs.existsSync(contextsFile)) {
        try {
            const rawContexts = JSON.parse(fs.readFileSync(contextsFile, "utf8"));
            
            interface RawContextGroup extends Omit<ContextGroup, "id" | "updatedAt" | "expectations"> {
                id?: string;
                expectations: unknown;
            }

            contextGroups = rawContexts.map((cg: RawContextGroup) => ({
                id: cg.id || crypto.randomUUID(),
                ...cg,
                expectations: JSON.stringify(cg.expectations),
                updatedAt: new Date(),
            }));
        } catch (e) {
            console.error(`Failed to parse contexts.json for ${repoPath}:`, e);
        }
    }

    if (fs.existsSync(systemPromptsFile)) {
        try {
            const rawPrompts = JSON.parse(fs.readFileSync(systemPromptsFile, "utf8"));
            if (rawPrompts.systemPrompts) {
                systemPrompts = rawPrompts.systemPrompts.map((sp: Omit<SystemPrompt, "id" | "updatedAt"> & { id?: string }) => ({
                    id: sp.id || crypto.randomUUID(),
                    ...sp,
                    updatedAt: new Date()
                }));
            }
            if (rawPrompts.systemPromptSets) {
                systemPromptSets = rawPrompts.systemPromptSets.map((sps: Omit<SystemPromptSet, "id" | "updatedAt" | "systemPromptIds"> & { id?: string, systemPromptIds: string[] }) => ({
                    id: sps.id || crypto.randomUUID(),
                    ...sps,
                    systemPromptIds: JSON.stringify(sps.systemPromptIds),
                    updatedAt: new Date()
                }));
            }
        } catch (e) {
            console.error(`Failed to parse systemPrompts.json for ${repoPath}:`, e);
        }
    }

    return {
        contextGroups,
        systemPrompts,
        systemPromptSets
    };
}

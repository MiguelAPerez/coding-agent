import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ContextGroup, SystemPrompt, SystemPromptSet, AgentConfig } from "@/types/agent";

function generateStableId(seed: string): string {
    return crypto.createHash("sha256").update(seed).digest("hex");
}
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

    const responseTestsFile = path.join(searchPath, "responseTests.json");
    const personasFile = path.join(searchPath, "personas.json");
    const agentsFile = path.join(searchPath, "agents.json");

    let responseTests: ContextGroup[] = [];
    let personas: SystemPrompt[] = [];
    let systemPromptSets: SystemPromptSet[] = [];
    let agents: AgentConfig[] = [];

    if (fs.existsSync(responseTestsFile)) {
        try {
            const rawContexts = JSON.parse(fs.readFileSync(responseTestsFile, "utf8"));
            
            interface RawContextGroup extends Omit<ContextGroup, "id" | "updatedAt" | "expectations" | "promptTemplate"> {
                id?: string;
                expectations: unknown;
                prompt?: string;
                promptTemplate?: string;
            }

            const testData = Array.isArray(rawContexts) ? rawContexts : (rawContexts.responseTests || rawContexts.contexts || []);
            responseTests = testData.map((cg: RawContextGroup) => {
                const promptTemplate = cg.promptTemplate || cg.prompt || "";
                const stableIdSource = `${cg.category || ""}:${cg.name}:${promptTemplate}`;
                return {
                    id: cg.id || generateStableId(stableIdSource),
                    ...cg,
                    promptTemplate,
                    expectations: JSON.stringify(cg.expectations),
                    updatedAt: new Date(),
                };
            });
        } catch (e) {
            console.error(`Failed to parse responseTests.json for ${repoPath}:`, e);
        }
    }

    if (fs.existsSync(personasFile)) {
        try {
            const rawPrompts = JSON.parse(fs.readFileSync(personasFile, "utf8"));
            const promptData = rawPrompts.personas || rawPrompts.systemPrompts || (Array.isArray(rawPrompts) ? rawPrompts : []);
            if (promptData) {
                personas = promptData.map((sp: Omit<SystemPrompt, "id" | "updatedAt"> & { id?: string }) => ({
                    id: sp.id || generateStableId(`${sp.name}:${sp.content}`),
                    ...sp,
                    updatedAt: new Date()
                }));
            }
            if (rawPrompts.systemPromptSets) {
                systemPromptSets = rawPrompts.systemPromptSets.map((sps: Omit<SystemPromptSet, "id" | "updatedAt" | "systemPromptIds"> & { id?: string, systemPromptIds: string[] }) => ({
                    id: sps.id || generateStableId(`${sps.name}:${JSON.stringify(sps.systemPromptIds)}`),
                    ...sps,
                    systemPromptIds: JSON.stringify(sps.systemPromptIds),
                    updatedAt: new Date()
                }));
            }
        } catch (e) {
            console.error(`Failed to parse personas.json for ${repoPath}:`, e);
        }
    }

    if (fs.existsSync(agentsFile)) {
        try {
            const rawAgents = JSON.parse(fs.readFileSync(agentsFile, "utf8"));
            const agentData = Array.isArray(rawAgents) ? rawAgents : (rawAgents.agents || []);
            agents = agentData.map((ag: Omit<AgentConfig, "id" | "updatedAt"> & { id?: string }) => ({
                id: ag.id || generateStableId(`${ag.name}:${ag.model}:${ag.systemPrompt}`),
                ...ag,
                updatedAt: new Date()
            }));
        } catch (e) {
            console.error(`Failed to parse agents.json for ${repoPath}:`, e);
        }
    }

    return {
        responseTests,
        personas,
        systemPromptSets,
        agents
    };
}

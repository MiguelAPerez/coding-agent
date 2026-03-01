"use client";

import React, { useState, useEffect } from "react";
import { saveAgentConfig } from "@/app/actions/agent";
import { getOllamaModels } from "@/app/actions/ollama";
import { AgentConfig } from "@/types/agent";

export const AgentConfigForm = ({ initialConfig }: { initialConfig: AgentConfig | null }) => {
    const [model, setModel] = useState(initialConfig?.model || "");
    const [systemPrompt, setSystemPrompt] = useState(initialConfig?.systemPrompt || "You are a helpful coding assistant.");
    const [temperature, setTemperature] = useState(initialConfig?.temperature || 70);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [ollamaModels, setOllamaModels] = useState<string[]>([]);

    useEffect(() => {
        async function loadOllamaModels() {
            try {
                const models = await getOllamaModels();
                setOllamaModels(models.map(m => m.name));
            } catch (err) {
                console.error("Failed to load Ollama models", err);
            }
        }
        loadOllamaModels();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage("");
        try {
            await saveAgentConfig({ model, systemPrompt, temperature });
            setMessage("Configuration saved successfully!");
        } catch {
            setMessage("Failed to save configuration.");
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl animate-in fade-in duration-500">
            <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/70">Model</label>
                <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
                >
                    <optgroup label="Cloud Models (Coming Soon)">
                        <option value="" disabled>Select a model...</option>
                    </optgroup>
                    {ollamaModels.length > 0 && (
                        <optgroup label="Local (Ollama)">
                            {ollamaModels.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </optgroup>
                    )}
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/70">System Prompt</label>
                <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={6}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                    placeholder="Enter system instructions..."
                />
            </div>

            <div className="space-y-2">
                <div className="flex justify-between">
                    <label className="text-sm font-medium text-foreground/70">Temperature</label>
                    <span className="text-sm text-primary font-mono">{(temperature / 100).toFixed(1)}</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="200"
                    step="10"
                    value={temperature}
                    onChange={(e) => setTemperature(parseInt(e.target.value))}
                    className="w-full accent-primary bg-foreground/10 h-2 rounded-lg appearance-none cursor-pointer"
                />
            </div>

            <div className="flex items-center gap-4 pt-4">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                    {isSaving ? "Saving..." : "Save Changes"}
                </button>
                {message && <p className={`text-sm ${message.includes("success") ? "text-green-500" : "text-red-500"} animate-in fade-in duration-300`}>{message}</p>}
            </div>
        </form>
    );
};

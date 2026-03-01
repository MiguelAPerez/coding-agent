"use client";

import React, { useState } from "react";
import { saveAgentConfig } from "@/app/actions/agent";
import { AgentConfig } from "@/types/agent";

export const AgentConfigForm = ({ initialConfig }: { initialConfig: AgentConfig | null }) => {
    const [model, setModel] = useState(initialConfig?.model || "gpt-4o");
    const [systemPrompt, setSystemPrompt] = useState(initialConfig?.systemPrompt || "You are a helpful coding assistant.");
    const [temperature, setTemperature] = useState(initialConfig?.temperature || 70);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState("");

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
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                    <option value="claude-3-opus">Claude 3 Opus</option>
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

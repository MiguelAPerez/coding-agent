"use client";

import React, { useState, useEffect } from "react";
import { getOllamaConfig, saveOllamaConfig, testOllamaConnection, syncOllamaModels, getOllamaModels } from "@/app/actions/ollama";

export default function OllamaConfiguration() {
    const [url, setUrl] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{
        success: boolean;
        modelCount?: number;
        error?: string;
    } | null>(null);
    const [syncedModels, setSyncedModels] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        async function loadConfig() {
            try {
                const config = await getOllamaConfig();
                if (config) {
                    setUrl(config.url);
                    if (config.updatedAt) {
                        setLastUpdated(new Date(config.updatedAt));
                    }
                }
                const models = await getOllamaModels();
                setSyncedModels(models);
            } catch (err) {
                console.error("Failed to load Ollama config", err);
            } finally {
                setIsLoading(false);
            }
        }
        loadConfig();
    }, []);

    const handleSaveAndSync = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        setTestResult(null);

        try {
            // 1. Test connection first
            const testResult = await testOllamaConnection(url);
            if (!testResult.success) {
                setError(testResult.error || "Connection test failed. Settings not saved.");
                setIsSaving(false);
                return;
            }

            // 2. If successful, save config and sync
            const result = await saveOllamaConfig(url);
            if (result.updatedAt) {
                setLastUpdated(new Date(result.updatedAt));
            }

            const models = await getOllamaModels();
            setSyncedModels(models);
        } catch (err) {
            console.error("Error during save process", err);
            setError("An error occurred while saving your configuration.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        setError(null);
        try {
            await syncOllamaModels();
            const models = await getOllamaModels();
            setSyncedModels(models);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to sync models");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleTestConnection = async () => {
        if (!url) {
            setError("Please provide an Instance URL to test connection.");
            return;
        }

        setIsTesting(true);
        setError(null);
        setTestResult(null);

        try {
            const result = await testOllamaConnection(url);
            setTestResult(result);
            if (!result.success) {
                setError(result.error || "Connection test failed.");
            }
        } catch (err) {
            console.error("Test connection failed", err);
            setError("An unexpected error occurred during connection test.");
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="p-6 rounded-xl bg-foreground/5 border border-border">
            <div className="flex justify-between items-start mb-2">
                <h2 className="text-lg font-semibold">Ollama Configuration</h2>
                {lastUpdated && (
                    <div className="text-[10px] uppercase tracking-wider font-bold text-foreground/40 bg-foreground/5 px-2 py-0.5 rounded-full border border-border/50">
                        Last saved: {lastUpdated.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                )}
            </div>
            <p className="text-sm text-foreground/60 mb-6">
                Configure your Ollama instance. This allows the application to use local models for benchmarks and generations.
            </p>

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {error}
                </div>
            )}

            {testResult?.success && !error && (
                <div className="mb-6 p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-emerald-500 font-semibold text-sm">Connection Successful</span>
                    </div>
                    <p className="text-xs text-foreground/60">
                        Found {testResult.modelCount} available models on your instance.
                    </p>
                </div>
            )}

            <form onSubmit={handleSaveAndSync} className="space-y-5">
                <div>
                    <label htmlFor="ollama-url" className="block text-sm font-medium mb-1.5">
                        Instance URL
                    </label>
                    <input
                        type="url"
                        id="ollama-url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="http://localhost:11434"
                        className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
                        required
                    />
                </div>

                {syncedModels.length > 0 && (
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-foreground/30">Synced Models ({syncedModels.length})</label>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-background/50 rounded-lg border border-border/50">
                            {syncedModels.map((model) => (
                                <span key={model.id} className="text-[10px] px-2 py-1 rounded bg-foreground/10 text-foreground/70 border border-border/50">
                                    {model.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="pt-4 border-t border-border flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isTesting || isLoading || !url}
                        className="px-4 py-2 bg-foreground/5 text-foreground/80 rounded-lg font-medium hover:bg-foreground/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm active:scale-[0.98]"
                    >
                        {isTesting ? "Testing..." : "Test Connection"}
                    </button>

                    <button
                        type="button"
                        onClick={handleSync}
                        disabled={isSyncing || isLoading || !url}
                        className="px-4 py-2 bg-foreground/5 text-foreground/80 rounded-lg font-medium hover:bg-foreground/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm active:scale-[0.98]"
                    >
                        {isSyncing ? "Syncing..." : "Sync Models"}
                    </button>

                    <button
                        type="submit"
                        disabled={isSaving || isLoading}
                        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px] shadow-sm active:scale-[0.98]"
                    >
                        {isSaving ? "Saving & Syncing..." : "Save & Sync Models"}
                    </button>
                </div>
            </form>
        </div>
    );
}

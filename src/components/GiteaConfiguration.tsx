"use client";

import React, { useState, useEffect } from "react";
import { getGiteaConfig, saveGiteaConfig, testGiteaConnection } from "@/app/actions/gitea";

export default function GiteaConfiguration() {
    const [url, setUrl] = useState("");
    const [username, setUsername] = useState("");
    const [token, setToken] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{
        success: boolean;
        user?: { username: string; email: string; avatarUrl: string };
        scopes?: string[];
        error?: string;
    } | null>(null);

    useEffect(() => {
        async function loadConfig() {
            try {
                const config = await getGiteaConfig();
                if (config) {
                    setUrl(config.url);
                    setUsername(config.username);
                    setToken(config.token);
                    if (config.updatedAt) {
                        setLastUpdated(new Date(config.updatedAt));
                    }
                }
            } catch (err) {
                console.error("Failed to load Gitea config", err);
            } finally {
                setIsLoading(false);
            }
        }
        loadConfig();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        setTestResult(null);

        try {
            // 1. Test connection first
            const testResult = await testGiteaConnection(url, token);
            setTestResult(testResult);

            if (!testResult.success) {
                setError(testResult.error || "Connection test failed. Settings not saved.");
                setIsSaving(false);
                return;
            }

            // 2. If successful, save config
            const result = await saveGiteaConfig({ url, username, token });
            if (result.updatedAt) {
                setLastUpdated(new Date(result.updatedAt));
            }
        } catch (err) {
            console.error("Error during save process", err);
            setError("An error occurred while saving your configuration.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestConnection = async () => {
        if (!url || !token) {
            setError("Please provide both Instance URL and Access Token to test connection.");
            return;
        }

        setIsTesting(true);
        setError(null);
        setTestResult(null);

        try {
            const result = await testGiteaConnection(url, token);
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
                <h2 className="text-lg font-semibold">Gitea Configuration</h2>
                {lastUpdated && (
                    <div className="text-[10px] uppercase tracking-wider font-bold text-foreground/40 bg-foreground/5 px-2 py-0.5 rounded-full border border-border/50">
                        Last saved: {lastUpdated.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                )}
            </div>
            <p className="text-sm text-foreground/60 mb-6">
                Configure your Gitea connection settings. This allows the application to interact with your repositories.
            </p>

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {error}
                </div>
            )}

            {testResult?.success && (
                <div className="mb-6 p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-emerald-500 font-semibold text-sm">Connection Successful</span>
                        <span className="text-foreground/40 text-xs px-2 py-0.5 bg-foreground/5 rounded-full border border-border/50 ml-auto">
                            Connected as {testResult.user?.username}
                        </span>
                    </div>

                    <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-foreground/40 mb-2">Granted Scopes</p>
                        <div className="flex flex-wrap gap-1.5">
                            {testResult.scopes?.map((scope) => (
                                <span
                                    key={scope}
                                    className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium"
                                >
                                    {scope}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-5">
                <div>
                    <label htmlFor="gitea-url" className="block text-sm font-medium mb-1.5">
                        Instance URL
                    </label>
                    <input
                        type="url"
                        id="gitea-url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://gitea.example.com"
                        className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="gitea-username" className="block text-sm font-medium mb-1.5">
                        Username
                    </label>
                    <input
                        type="text"
                        id="gitea-username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Your Gitea username"
                        className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="gitea-token" className="block text-sm font-medium mb-1.5">
                        Access Token
                    </label>
                    <input
                        type="password"
                        id="gitea-token"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Your personal access token"
                        className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
                        required
                    />
                </div>

                <div className="pt-4 border-t border-border flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isTesting || isLoading || !url || !token}
                        className="px-6 py-2 bg-foreground/5 text-foreground/80 rounded-lg font-medium hover:bg-foreground/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm active:scale-[0.98]"
                    >
                        {isTesting ? (
                            <div className="flex items-center space-x-2">
                                <div className="w-3.5 h-3.5 border-2 border-foreground/20 border-t-foreground/60 rounded-full animate-spin"></div>
                                <span>Testing...</span>
                            </div>
                        ) : (
                            "Test Connection"
                        )}
                    </button>

                    <button
                        type="submit"
                        disabled={isSaving || isLoading}
                        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px] shadow-sm active:scale-[0.98]"
                    >
                        {isSaving ? (
                            <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Saving...</span>
                            </div>
                        ) : (
                            "Save Configuration"
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

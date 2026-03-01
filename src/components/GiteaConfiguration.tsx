"use client";

import React, { useState, useEffect } from "react";
import { getGiteaConfig, saveGiteaConfig } from "@/app/actions/gitea";

export default function GiteaConfiguration() {
    const [url, setUrl] = useState("");
    const [username, setUsername] = useState("");
    const [token, setToken] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

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

        try {
            const result = await saveGiteaConfig({ url, username, token });
            if (result.updatedAt) {
                setLastUpdated(new Date(result.updatedAt));
            }
        } catch (err) {
            console.error("Error saving config", err);
            setError("Failed to save configuration. Please try again.");
        } finally {
            setIsSaving(false);
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
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {error}
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

                <div className="pt-4 border-t border-border flex justify-end">
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

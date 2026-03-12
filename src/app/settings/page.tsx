"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import GiteaConfiguration from "@/components/SystemSettings/GiteaConfiguration";
import OllamaConfiguration from "@/components/SystemSettings/OllamaConfiguration";
import GitHubConfiguration from "@/components/SystemSettings/GitHubConfiguration";
import RepositoriesConfiguration from "@/components/SystemSettings/RepositoriesConfiguration";

export default function SettingsPage() {
    const { theme, toggleTheme, mounted } = useTheme();

    // Match the SSR default to avoid hydration mismatch
    const displayTheme = mounted ? theme : "dark";

    return (
        <div className="max-w-6xl mx-auto px-4 py-20">
            <div className="glass p-8 rounded-2xl border border-border">
                <h1 className="text-3xl font-bold mb-4">Settings</h1>
                <p className="text-foreground/60">Manage your application preferences and account settings.</p>

                <div className="mt-8 space-y-6">
                    <div className="p-6 rounded-xl bg-foreground/5 border border-border">
                        <h2 className="text-lg font-semibold mb-4">Preferences</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-2">
                                <div>
                                    <p className="font-medium">Dark Mode</p>
                                    <p className="text-sm text-foreground/40">Use the dark theme for the interface.</p>
                                </div>
                                <button
                                    onClick={toggleTheme}
                                    disabled={!mounted}
                                    className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${displayTheme === "dark" ? "bg-primary" : "bg-foreground/10"} ${!mounted ? "opacity-50 cursor-wait" : ""}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${displayTheme === "dark" ? "right-1" : "left-1"}`}></div>
                                </button>
                            </div>
                            <div className="flex items-center justify-between py-2 border-t border-border">
                                <div>
                                    <p className="font-medium">Email Notifications</p>
                                    <p className="text-sm text-foreground/40">Receive updates via email.</p>
                                </div>
                                <div className="w-12 h-6 bg-foreground/10 rounded-full relative opacity-50 cursor-not-allowed">
                                    <div className="absolute left-1 top-1 w-4 h-4 bg-foreground/40 rounded-full shadow-sm"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 mt-6">
                        <RepositoriesConfiguration />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <GiteaConfiguration />
                        <GitHubConfiguration />
                        <OllamaConfiguration />
                    </div>
                </div>
            </div>
        </div>
    );
}

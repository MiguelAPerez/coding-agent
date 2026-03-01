"use client";

import React, { useState } from "react";
import { AgentConfig } from "@/types/agent";

export const EvaluationLab = ({ initialConfig }: { initialConfig: AgentConfig | null }) => {


    const [prompt, setPrompt] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);

    const handleRun = async () => {
        setIsRunning(true);
        // Mocking the AI call for now since no keys are present
        setTimeout(() => {
            setResult(`[MOCK RESPONSE based on model: ${initialConfig?.model || "Unknown"}]\n\nHello! I am your configured agent. I've received your prompt: "${prompt}".\n\nSince there are no API keys configured in the environment yet, I am providing this simulated response to demonstrate the Evaluation Lab interface.\n\nTemperature used: ${(initialConfig?.temperature || 70) / 100}`);
            setIsRunning(false);
        }, 1500);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="glass p-6 rounded-2xl border border-border/50 space-y-4">
                    <h2 className="text-xl font-semibold text-foreground/80">Test Prompt</h2>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Enter a prompt to test your agent configuration..."
                        rows={10}
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-1 focus:ring-primary transition-all font-sans text-sm"
                    />
                    <button
                        onClick={handleRun}
                        disabled={isRunning || !prompt}
                        className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                        {isRunning ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Evaluating...
                            </>
                        ) : (
                            "Run Evaluation"
                        )}
                    </button>
                </div>

                <div className="glass p-6 rounded-2xl border border-border/50 space-y-4">
                    <h3 className="font-medium text-foreground/60 text-sm uppercase tracking-wider">Active Configuration</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center py-2 border-b border-border/30">
                            <span className="text-foreground/50">Model</span>
                            <span className="font-mono text-primary font-bold">{initialConfig?.model || "None set"}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-border/30">
                            <span className="text-foreground/50">Temperature</span>
                            <span className="font-mono text-primary">{(initialConfig?.temperature || 70) / 100}</span>
                        </div>
                        <div className="pt-2">
                            <span className="text-foreground/50 block mb-1">System Prompt</span>
                            <p className="text-xs text-foreground/40 line-clamp-3 italic">
                                {initialConfig?.systemPrompt || "You are a helpful coding assistant."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-3 glass p-1 rounded-2xl border border-border/50 min-h-[500px] flex flex-col bg-background/20 overflow-hidden">
                <div className="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-background/40">
                    <h2 className="text-sm font-semibold text-foreground/60 uppercase tracking-widest">Inference Result</h2>
                    {result && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Success</span>}
                </div>
                <div className="p-8 flex-grow overflow-auto">
                    {result ? (
                        <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap animate-in fade-in slide-in-from-right-4 duration-700">
                            {result}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center">
                                <span className="text-2xl text-foreground/20">?</span>
                            </div>
                            <p className="text-foreground/20 italic max-w-xs">
                                Ready for testing. Enter a prompt on the left and click &quot;Run Evaluation&quot;.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

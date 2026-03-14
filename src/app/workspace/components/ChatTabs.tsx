import React from "react";
import { PendingSuggestion, TechnicalPlan } from "@/app/actions/chat";

interface ChatTabsProps {
    activeTab: "context" | "suggestions" | "plan" | null;
    onTabChange: (tab: "context" | "suggestions" | "plan" | null) => void;
    contextFiles: string[];
    onRemoveContext: (path: string) => void;
    pendingSuggestion: PendingSuggestion | null;
    onApproveSuggestion: () => void;
    onRejectSuggestion: () => void;
    technicalPlan: TechnicalPlan | null;
    onApprovePlan: () => void;
    onJumpToFile: (path: string) => void;
    isLoading: boolean;
}

export function ChatTabs({ 
    activeTab, 
    onTabChange, 
    contextFiles, 
    onRemoveContext, 
    pendingSuggestion, 
    onApproveSuggestion, 
    onRejectSuggestion, 
    technicalPlan, 
    onApprovePlan, 
    onJumpToFile,
    isLoading
}: ChatTabsProps) {
    if (contextFiles.length === 0 && !pendingSuggestion && !technicalPlan) return null;

    return (
        <div className="border-t border-border flex flex-col bg-foreground/[0.02]">
            <div className="flex border-b border-border/50">
                <button 
                    onClick={() => onTabChange(activeTab === "context" ? null : "context")}
                    className={`flex-1 py-1.5 flex items-center justify-center gap-2 transition-colors ${activeTab === 'context' ? 'bg-foreground/5 border-b-2 border-primary text-primary' : 'text-foreground/40 hover:text-foreground/60'}`}
                    title={activeTab === 'context' ? "Collapse Context" : "View Context"}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>
                    {contextFiles.length > 0 && <span className="text-[10px] bg-foreground/10 px-1 rounded-full text-foreground/60">{contextFiles.length}</span>}
                </button>
                <button 
                    onClick={() => onTabChange(activeTab === "suggestions" ? null : "suggestions")}
                    className={`flex-1 py-1.5 flex items-center justify-center gap-2 transition-colors ${activeTab === 'suggestions' ? 'bg-foreground/5 border-b-2 border-blue-500 text-blue-500' : 'text-foreground/40 hover:text-foreground/60'} ${!pendingSuggestion ? 'opacity-30 cursor-not-allowed' : ''}`}
                    disabled={!pendingSuggestion}
                    title={activeTab === 'suggestions' ? "Collapse Suggestions" : "View AI Suggestions"}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4M3 5h4M5 17v4M3 19h4M19 17v4M17 19h4"/></svg>
                    {pendingSuggestion && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>}
                </button>
                <button 
                    onClick={() => onTabChange(activeTab === "plan" ? null : "plan")}
                    className={`flex-1 py-1.5 flex items-center justify-center gap-2 transition-colors ${activeTab === 'plan' ? 'bg-foreground/5 border-b-2 border-orange-500 text-orange-500' : 'text-foreground/40 hover:text-foreground/60'} ${!technicalPlan ? 'opacity-30 cursor-not-allowed' : ''}`}
                    disabled={!technicalPlan}
                    title={activeTab === 'plan' ? "Collapse Plan" : "View Technical Plan"}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                    {technicalPlan && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>}
                </button>
            </div>

            {activeTab && (
                <div className="p-3">
                {activeTab === "context" ? (
                    <div className="flex gap-2 flex-wrap max-h-40 overflow-y-auto">
                        {contextFiles.map(filePath => (
                            <div 
                                key={filePath} 
                                className="group flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md bg-foreground/5 border border-border/50 hover:border-border transition-colors"
                                title={filePath}
                            >
                                <span className="text-xs text-foreground/80 truncate max-w-[150px]">
                                    {filePath.split("/").pop()}
                                </span>
                                <button 
                                    onClick={() => onRemoveContext(filePath)}
                                    className="w-4 h-4 rounded flex items-center justify-center opacity-40 hover:opacity-100 hover:bg-foreground/10 text-xs transition-colors"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                        {contextFiles.length === 0 && (
                            <div className="text-[11px] text-foreground/30 italic py-2">No files in search context</div>
                        )}
                    </div>
                ) : activeTab === "suggestions" ? (
                    <div className="flex flex-col gap-3">
                        <div className="max-h-40 overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
                            {pendingSuggestion && Object.keys(pendingSuggestion.filesChanged).map(path => (
                                <button
                                    key={path}
                                    onClick={() => onJumpToFile(path)}
                                    className="text-left px-2 py-1.5 rounded-md hover:bg-foreground/5 transition-colors group flex items-center justify-between gap-3 border border-transparent hover:border-border/50"
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <svg className="shrink-0 text-foreground/40" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                                            <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                                        </svg>
                                        <span className="text-xs text-foreground/80 truncate font-medium">{path.split("/").pop()}</span>
                                    </div>
                                    <svg className="shrink-0 text-foreground/20 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 border-t border-border/50 pt-2">
                            <button 
                                className="flex-1 py-1.5 text-xs font-medium bg-foreground/5 border border-border hover:bg-foreground/10 rounded-md text-foreground transition-colors"
                                onClick={onRejectSuggestion}
                            >
                                Discard
                            </button>
                            <button 
                                className="flex-1 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 rounded-md text-white transition-colors"
                                onClick={onApproveSuggestion}
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        <div className="max-h-60 overflow-y-auto flex flex-col gap-2 pr-1 custom-scrollbar">
                            {technicalPlan?.steps.map((step, idx) => (
                                <div key={idx} className="flex flex-col gap-1 p-2 rounded-md bg-foreground/5 border border-border/50">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                                step.action === 'new' ? 'bg-green-500/10 text-green-500' :
                                                step.action === 'delete' ? 'bg-red-500/10 text-red-500' :
                                                'bg-blue-500/10 text-blue-500'
                                            }`}>
                                                {step.action}
                                            </span>
                                            <span className="text-xs text-foreground/80 truncate font-medium">{step.file.split("/").pop()}</span>
                                        </div>
                                        <div className="shrink-0">
                                            {step.status === 'completed' && <span className="text-green-500 text-xs">✓</span>}
                                            {step.status === 'in-progress' && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>}
                                            {step.status === 'failed' && <span className="text-red-500 text-xs">⚠</span>}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-foreground/50 leading-tight">{step.rationale}</p>
                                </div>
                            ))}
                        </div>
                        <button 
                            className="w-full py-2 text-xs font-bold bg-orange-600 hover:bg-orange-700 rounded-md text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={onApprovePlan}
                            disabled={isLoading || technicalPlan?.steps.some(s => s.status === 'in-progress' || s.status === 'completed')}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            Approve & Execute Plan
                        </button>
                    </div>
                )}
                </div>
            )}
        </div>
    );
}

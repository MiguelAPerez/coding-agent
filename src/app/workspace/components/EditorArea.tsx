"use client";

import React, { useRef, useEffect } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { Tab } from "../WorkspaceClient";

interface EditorAreaProps {
    tabs: Tab[];
    activeTabPath: string | null;
    onTabSelect: (path: string) => void;
    onTabClose: (path: string) => void;
    onContentChange: (path: string, content: string) => void;
    onSaveFile: (path: string) => void;
}

export default function EditorArea({
    tabs,
    activeTabPath,
    onTabSelect,
    onTabClose,
    onContentChange,
    onSaveFile
}: EditorAreaProps) {
    const activeTab = tabs.find(t => t.path === activeTabPath);
    const monaco = useMonaco();

    // Setup global keyboard shortcut for Save
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                if (activeTabPath) onSaveFile(activeTabPath);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeTabPath, onSaveFile]);

    if (tabs.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-foreground/30 bg-background">
                <div className="text-center">
                    <p className="text-xl mb-2">Editor</p>
                    <p className="text-sm">Select a file from the explorer to open it.</p>
                </div>
            </div>
        );
    }

    const getLanguageFromPath = (path: string) => {
        const ext = path.split(".").pop()?.toLowerCase();
        switch (ext) {
            case "ts": case "tsx": return "typescript";
            case "js": case "jsx": return "javascript";
            case "json": return "json";
            case "md": case "mdx": return "markdown";
            case "css": return "css";
            case "html": return "html";
            case "py": return "python";
            case "go": return "go";
            case "rs": return "rust";
            default: return "plaintext";
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e]">
            {/* Tabs Header */}
            <div className="flex overflow-x-auto bg-[#252526] scrollbar-hide border-b border-[#3c3c3c] flex-shrink-0 relative z-10">
                {tabs.map(tab => {
                    const isActive = tab.path === activeTabPath;
                    const fileName = tab.path.split("/").pop() || tab.path;
                    return (
                        <div
                            key={tab.path}
                            className={`group flex items-center gap-2 px-3 py-1.5 min-w-[100px] max-w-[200px] border-r border-[#3c3c3c] cursor-pointer text-sm
                                ${isActive ? "bg-[#1e1e1e] text-[#cccccc]" : "bg-[#2d2d2d] text-[#858585]"}
                                hover:bg-[#1e1e1e] transition-colors`}
                            onClick={() => onTabSelect(tab.path)}
                        >
                            <span className="truncate flex-1 select-none flex items-center gap-1.5" title={tab.path}>
                                {tab.isDirty && <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>}
                                {fileName}
                            </span>
                            <button
                                className={`w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity text-[#cccccc]`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTabClose(tab.path);
                                }}
                            >
                                ×
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 relative">
                {activeTab ? (
                    <Editor
                        key={activeTab.path} // Force re-mount on tab switch for simplicity, or handle model swapping if necessary
                        path={activeTab.path}
                        language={getLanguageFromPath(activeTab.path)}
                        value={activeTab.content}
                        theme="vs-dark"
                        onChange={(val) => onContentChange(activeTab.path, val || "")}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            wordWrap: "on",
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            padding: { top: 16 }
                        }}
                    />
                ) : null}
            </div>
        </div>
    );
}

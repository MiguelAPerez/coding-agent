"use client";

import React, { useEffect, useRef, useState } from "react";
import Editor, { Monaco } from "@monaco-editor/react";
import { diffLines } from "diff";
import { Tab } from "../WorkspaceClient";
import RevertPrompt, { DiffBlock } from "./RevertPrompt";
import { PendingSuggestion } from "@/app/actions/chat";

interface EditorAreaProps {
    tabs: Tab[];
    activeTabPath: string | null;
    onTabSelect: (path: string) => void;
    onTabClose: (path: string) => void;
    onContentChange: (path: string, content: string) => void;
    onSaveFile: (path: string) => void;
    pendingSuggestion?: PendingSuggestion | null;
}

export default function EditorArea({
    tabs,
    activeTabPath,
    onTabSelect,
    onTabClose,
    onContentChange,
    onSaveFile,
    pendingSuggestion
}: EditorAreaProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const decorationsRef = useRef<string[]>([]);
    const diffBlocksRef = useRef<DiffBlock[]>([]);

    const [editorMountCount, setEditorMountCount] = useState(0);
    const [revertPrompt, setRevertPrompt] = useState<DiffBlock | null>(null);

    const activeTab = tabs.find(t => t.path === activeTabPath);
    // Setup global keyboard shortcut for Save and Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                if (activeTabPath) onSaveFile(activeTabPath);
            }
            if (e.key === "Escape" && revertPrompt) {
                setRevertPrompt(null);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeTabPath, onSaveFile, revertPrompt]);

    // Update diff decorations when content or git content changes
    useEffect(() => {
        if (!editorRef.current || !monacoRef.current || !activeTab) return;

        const editor = editorRef.current;
        const monaco = monacoRef.current;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const decorations: any[] = [];
        const newBlocks: DiffBlock[] = [];

        if (activeTab.gitIndexContent !== null) {
            const diffs = diffLines(activeTab.gitIndexContent, activeTab.content || "");
            let currentLine = 1;

            for (let i = 0; i < diffs.length; i++) {
                const part = diffs[i];

                if (part.removed) {
                    if (i + 1 < diffs.length && diffs[i + 1].added) {
                        const addedPart = diffs[i + 1];
                        const start = currentLine;
                        const end = currentLine + addedPart.count! - 1;

                        newBlocks.push({ type: 'modified', currStart: start, currEnd: end, origValue: part.value });

                        decorations.push({
                            range: new monaco.Range(start, 1, end, 1),
                            options: {
                                isWholeLine: false,
                                linesDecorationsClassName: "git-diff-modified cursor-pointer hover:opacity-80",
                                marginClassName: "git-diff-modified-margin cursor-pointer hover:opacity-80"
                            }
                        });
                        currentLine += addedPart.count!;
                        i++; // skip next added part
                    } else {
                        const lineToMark = Math.max(1, currentLine - 1);
                        newBlocks.push({ type: 'removed', currStart: lineToMark, currEnd: lineToMark, origValue: part.value });

                        decorations.push({
                            range: new monaco.Range(lineToMark, 1, lineToMark, 1),
                            options: {
                                isWholeLine: false,
                                linesDecorationsClassName: "git-diff-removed cursor-pointer hover:opacity-80",
                                marginClassName: "git-diff-removed-margin cursor-pointer hover:opacity-80"
                            }
                        });
                    }
                } else if (part.added) {
                    const start = currentLine;
                    const end = currentLine + part.count! - 1;

                    newBlocks.push({ type: 'added', currStart: start, currEnd: end, origValue: '' });

                    decorations.push({
                        range: new monaco.Range(start, 1, end, 1),
                        options: {
                            isWholeLine: false,
                            linesDecorationsClassName: "git-diff-added cursor-pointer hover:opacity-80",
                            marginClassName: "git-diff-added-margin cursor-pointer hover:opacity-80"
                        }
                    });
                    currentLine += part.count!;
                } else {
                    currentLine += part.count!;
                }
            }
        }

        if (pendingSuggestion && pendingSuggestion.filesChanged[activeTab.path]) {
            const fileChange = pendingSuggestion.filesChanged[activeTab.path];
            const diffs = diffLines(fileChange.originalContent, fileChange.suggestedContent);
            let currentLine = 1;
            for (let i = 0; i < diffs.length; i++) {
                const part = diffs[i];
                if (part.added) {
                    const start = currentLine;
                    const end = currentLine + part.count! - 1;
                    
                    decorations.push({
                        range: new monaco.Range(start, 1, end, 1),
                        options: {
                            isWholeLine: true,
                            className: "pending-suggestion-line",
                            marginClassName: "pending-suggestion-margin"
                        }
                    });
                    currentLine += part.count!;
                } else if (!part.removed) {
                    currentLine += part.count!;
                }
            }
        }

        diffBlocksRef.current = newBlocks;
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);

    }, [activeTab, activeTab?.content, activeTab?.gitHeadContent, activeTab?.path, editorMountCount, pendingSuggestion]);

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
            case "css": case "scss": return "css";
            case "html": case "htm": return "html";
            case "py": return "python";
            case "go": return "go";
            case "rs": return "rust";
            case "java": return "java";
            case "c": case "cpp": case "h": case "hpp": return "cpp";
            case "sh": case "bash": return "shell";
            case "yml": case "yaml": return "yaml";
            case "sql": return "sql";
            case "xml": return "xml";
            case "php": return "php";
            default:
                if (path.toLowerCase().includes("dockerfile")) return "dockerfile";
                return "plaintext";
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const revertBlock = (editor: any, block: DiffBlock) => {
        const model = editor.getModel();
        if (!model || !monacoRef.current) return;

        let range;
        let text = block.origValue;

        if (block.type === 'removed') {
            const maxCol = model.getLineMaxColumn(block.currEnd);
            range = new monacoRef.current.Range(block.currEnd, maxCol, block.currEnd, maxCol);
            text = '\n' + text.replace(/\n$/, '');
        } else if (block.type === 'added') {
            if (block.currStart > 1) {
                const prevMax = model.getLineMaxColumn(block.currStart - 1);
                const maxCol = model.getLineMaxColumn(block.currEnd);
                range = new monacoRef.current.Range(block.currStart - 1, prevMax, block.currEnd, maxCol);
            } else {
                const lineCount = model.getLineCount();
                if (block.currEnd < lineCount) {
                    range = new monacoRef.current.Range(block.currStart, 1, block.currEnd + 1, 1);
                } else {
                    const maxCol = model.getLineMaxColumn(block.currEnd);
                    range = new monacoRef.current.Range(block.currStart, 1, block.currEnd, maxCol);
                }
            }
            text = "";
        } else {
            const maxCol = model.getLineMaxColumn(block.currEnd);
            range = new monacoRef.current.Range(block.currStart, 1, block.currEnd, maxCol);
            text = text.replace(/\n$/, '');
        }

        editor.executeEdits('revert-git-change', [{
            range: range,
            text: text,
            forceMoveMarkers: true
        }]);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEditorMount = (editor: any, monaco: Monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        setEditorMountCount(c => c + 1);

        // Add Save shortcut
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            if (activeTabPath) onSaveFile(activeTabPath);
        });

        // Add Clear Terminal shortcut (if needed, but usually cmd+k is for terminal)
        // Actually, we'll implement cmd+k in the Terminal component, 
        // but adding it here prevents the default browser search/action if desired.

        editor.addAction({
            id: 'revert-git-change',
            label: 'Revert Git Change',
            contextMenuGroupId: 'navigation',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            run: (ed: any) => {
                const pos = ed.getPosition();
                if (!pos) return;
                const block = diffBlocksRef.current.find(b => pos.lineNumber >= b.currStart && pos.lineNumber <= b.currEnd);
                if (block) setRevertPrompt(block);
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editor.onMouseDown((e: any) => {
            // Target types: 2 (GUTTER_GLYPH_MARGIN), 3 (GUTTER_LINE_NUMBERS), 4 (GUTTER_LINE_DECORATIONS)
            if (e.target.type === 2 || e.target.type === 3 || e.target.type === 4 || e.target.type === 6) {
                const pos = e.target.position;
                if (!pos) return;
                const block = diffBlocksRef.current.find(b => pos.lineNumber >= b.currStart && pos.lineNumber <= b.currEnd);
                if (block) {
                    setRevertPrompt(block);
                }
            }
        });
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden">
            <style>{`
                .git-diff-added-margin {
                    border-left: 3px solid #2ea043;
                    margin-left: 5px;
                }
                .git-diff-removed-margin {
                    border-left: 3px solid #f85149;
                    margin-left: 5px;
                }
                .git-diff-modified-margin {
                    border-left: 3px solid #f59e0b;
                    margin-left: 5px;
                }
                .pending-suggestion-line {
                    background-color: rgba(59, 130, 246, 0.15);
                }
                .pending-suggestion-margin {
                    border-left: 3px solid #3b82f6;
                    margin-left: 5px;
                }
            `}</style>
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
                        beforeMount={(monaco) => {
                            // Disable semantic validation (e.g. "Cannot find module")
                            // since the editor runs in the browser without node_modules context
                            monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                                noSemanticValidation: true,
                                noSyntaxValidation: false,
                            });
                            monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                                noSemanticValidation: true,
                                noSyntaxValidation: false,
                            });
                        }}
                        onMount={handleEditorMount}
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

                {/* Revert Confirmation Popup */}
                <RevertPrompt 
                    prompt={revertPrompt} 
                    onCancel={() => setRevertPrompt(null)} 
                    onConfirm={(block) => {
                        if (editorRef.current) {
                            revertBlock(editorRef.current, block);
                        }
                        setRevertPrompt(null);
                    }} 
                />
            </div>
        </div>
    );
}

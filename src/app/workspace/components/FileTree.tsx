"use client";

import React, { useState } from "react";
import { FileNode } from "../WorkspaceClient";

interface FileTreeProps {
    tree: FileNode[];
    changedFiles?: {path: string, status: string}[];
    onSelectFile: (path: string) => void;
}

export default function FileTree({ tree, changedFiles = [], onSelectFile }: FileTreeProps) {
    if (!tree || tree.length === 0) {
        return <div className="p-4 text-sm text-foreground/50 italic">No files found.</div>;
    }

    return (
        <div className="h-full flex flex-col">
            {changedFiles.length > 0 && (
                <div className="p-2 border-b border-border/50 flex-shrink-0">
                    <div className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 px-2">Local Changes</div>
                    <div className="max-h-40 overflow-y-auto">
                        {changedFiles.map(file => (
                            <div 
                                key={file.path} 
                                className="flex items-center gap-1.5 px-2 py-1 hover:bg-foreground/5 cursor-pointer rounded text-sm text-foreground/80"
                                onClick={() => onSelectFile(file.path)}
                                title={file.path}
                            >
                                <span className={`text-xs font-bold leading-none w-3 text-center
                                    ${file.status.includes('M') ? 'text-blue-500' : 'text-green-500'}
                                `}>
                                    {file.status.trim().charAt(0)}
                                </span>
                                <span className="truncate">{file.path.split("/").pop()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-2">
                <div className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 px-2">Explorer</div>
                {tree.map(node => (
                    <TreeNode key={node.path} node={node} level={0} onSelectFile={onSelectFile} changedFiles={changedFiles} />
                ))}
            </div>
        </div>
    );
}

function TreeNode({ node, level, onSelectFile, changedFiles }: { node: FileNode; level: number; onSelectFile: (path: string) => void; changedFiles: {path: string, status: string}[] }) {
    const [isOpen, setIsOpen] = useState(false);

    const isDir = node.type === "directory";
    const changedStatus = changedFiles?.find(f => f.path === node.path)?.status;

    const handleClick = () => {
        if (isDir) {
            setIsOpen(!isOpen);
        } else {
            onSelectFile(node.path);
        }
    };

    return (
        <div>
            <div 
                className={`flex items-center justify-between py-1 px-2 hover:bg-foreground/5 cursor-pointer rounded text-sm text-foreground/80`}
                style={{ paddingLeft: `${ level * 12 + 8 }px` }}
                onClick={handleClick}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className="opacity-70 flex items-center justify-center w-4 h-4 mr-1 flex-shrink-0">
                        {isDir ? (
                            isOpen ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"></path></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path></svg>
                            )
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path></svg>
                        )}
                    </span>
                    <span className="truncate">{node.name}</span>
                </div>
                {changedStatus && (
                    <span className={`text-xs font-bold flex-shrink-0 leading-none w-3 text-center ${changedStatus.includes('M') ? 'text-blue-500' : 'text-green-500'}`}>
                        {changedStatus.trim().charAt(0)}
                    </span>
                )}
            </div>
            {isDir && isOpen && node.children && (
                <div>
                    {node.children.map(child => (
                        <TreeNode key={child.path} node={child} level={level + 1} onSelectFile={onSelectFile} changedFiles={changedFiles} />
                    ))}
                </div>
            )}
        </div>
    );
}

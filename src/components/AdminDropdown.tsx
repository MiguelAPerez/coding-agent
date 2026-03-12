"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDownIcon } from "./icons";

export const AdminDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    const adminRoutes = ["/agent", "/admin/jobs", "/repositories", "/evaluation-lab"];
    const isAnyAdminRouteActive = adminRoutes.some(route => pathname.startsWith(route));

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors rounded-lg hover:bg-foreground/5 relative ${
                    isAnyAdminRouteActive 
                        ? "text-foreground" 
                        : "text-foreground/60 hover:text-foreground"
                }`}
            >
                <span>Admin Configurations</span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                {isAnyAdminRouteActive && (
                    <span className="absolute inset-x-3 -bottom-1 h-0.5 bg-primary rounded-full animate-in fade-in zoom-in duration-300" />
                )}
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-background/95 backdrop-blur-xl border border-border shadow-lg rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-1.5 flex flex-col gap-0.5">

                        <Link
                            href="/agent"
                            onClick={() => setIsOpen(false)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                                pathname.startsWith("/agent")
                                    ? "text-foreground bg-foreground/5"
                                    : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                            }`}
                        >
                            Agents
                        </Link>

                        <Link
                            href="/admin/jobs"
                            onClick={() => setIsOpen(false)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                                pathname.startsWith("/admin/jobs")
                                    ? "text-foreground bg-foreground/5"
                                    : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                            }`}
                        >
                            Jobs
                        </Link>

                        <Link
                            href="/repositories"
                            onClick={() => setIsOpen(false)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                                pathname.startsWith("/repositories")
                                    ? "text-foreground bg-foreground/5"
                                    : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                            }`}
                        >
                            Repositories
                        </Link>

                        <Link
                            href="/evaluation-lab"
                            onClick={() => setIsOpen(false)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                                pathname.startsWith("/evaluation-lab")
                                    ? "text-foreground bg-foreground/5"
                                    : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                            }`}
                        >
                            Evaluation Lab
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

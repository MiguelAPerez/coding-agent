"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { UserIcon, SettingsIcon, LogoutIcon, ChevronDownIcon } from "./icons";
import { signOut } from "next-auth/react";

interface UserProfileDropdownProps {
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
}

export const UserProfileDropdown = ({ user }: UserProfileDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    const nameToDisplay = user.name || "User";

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-foreground/5 transition-colors border border-transparent hover:border-foreground/10"
            >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 overflow-hidden">
                    {user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.image} alt={nameToDisplay} className="w-full h-full object-cover" />
                    ) : (
                        <UserIcon className="w-5 h-5 text-primary" />
                    )}
                </div>
                <span className="hidden sm:inline text-sm font-medium text-foreground/80">{nameToDisplay}</span>
                <ChevronDownIcon className={`w-4 h-4 text-foreground/40 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-background/95 backdrop-blur-xl border border-border shadow-2xl rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-border bg-foreground/[0.02]">
                        <p className="text-sm font-medium">{nameToDisplay}</p>
                        <p className="text-xs text-foreground/50 truncate">{user.email || ""}</p>
                    </div>

                    <div className="p-1.5">
                        <Link
                            href="/profile"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-foreground/70 hover:text-foreground hover:bg-foreground/5 rounded-lg transition-all group"
                        >
                            <UserIcon className="w-4 h-4 text-foreground/40 group-hover:text-primary transition-colors" />
                            <span>Profile</span>
                        </Link>

                        <Link
                            href="/settings"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-foreground/70 hover:text-foreground hover:bg-foreground/5 rounded-lg transition-all group"
                        >
                            <SettingsIcon className="w-4 h-4 text-foreground/40 group-hover:text-primary transition-colors" />
                            <span>Settings</span>
                        </Link>
                    </div>

                    <div className="p-1.5 border-t border-border">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                signOut({ callbackUrl: "/" });
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all group"
                        >
                            <LogoutIcon className="w-4 h-4" />
                            <span>Log out</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

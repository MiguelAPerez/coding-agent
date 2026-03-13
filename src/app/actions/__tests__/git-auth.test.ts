import { setupGitAuth } from "../git";
import { db } from "@/../db";
import { getServerSession } from "next-auth/next";
import { getAuthenticatedCloneUrl } from "@/lib/git-auth";
import { executeSandboxCommand } from "../docker-sandboxes";

// Mock dependencies
jest.mock("@/../db", () => ({
    db: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        get: jest.fn()
    }
}));

jest.mock("next-auth/next", () => ({
    getServerSession: jest.fn()
}));

jest.mock("@/auth", () => ({
    authOptions: {}
}));

jest.mock("@/lib/git-auth", () => ({
    getAuthenticatedCloneUrl: jest.fn()
}));

jest.mock("../docker-sandboxes", () => ({
    executeSandboxCommand: jest.fn(),
    listSandboxes: jest.fn()
}));

jest.mock("child_process", () => ({
    exec: jest.fn((cmd, cb) => cb(null, { stdout: "", stderr: "" }))
}));

describe("setupGitAuth", () => {
    const mockUser = { id: "user-123", name: "Test User" };
    const mockRepo = { 
        id: "repo-123", 
        name: "test-repo", 
        fullName: "org/test-repo", 
        url: "https://github.com/org/test-repo",
        source: "github",
        githubConfigurationId: "config-123"
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getServerSession as jest.Mock).mockResolvedValue({ user: mockUser });
        (db.get as jest.Mock).mockReturnValue(mockRepo);
        (getAuthenticatedCloneUrl as jest.Mock).mockResolvedValue("https://x-access-token:token@github.com/org/test-repo");
    });

    it("should setup git auth in sandbox when sandboxId is provided", async () => {
        (executeSandboxCommand as jest.Mock).mockResolvedValue({ success: true });

        const result = await setupGitAuth("repo-123", "sandbox-123");

        expect(result.success).toBe(true);
        expect(executeSandboxCommand).toHaveBeenCalledWith(
            "sandbox-123",
            expect.stringContaining("git config --global user.email"),
            "test-repo"
        );
        expect(executeSandboxCommand).toHaveBeenCalledWith(
            "sandbox-123",
            expect.stringContaining("git remote set-url origin"),
            "test-repo"
        );
    });

    it("should return success false if sandbox setup fails", async () => {
        (executeSandboxCommand as jest.Mock).mockResolvedValue({ success: false, stderr: "Error setup" });
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const result = await setupGitAuth("repo-123", "sandbox-123");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Error setup");
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});

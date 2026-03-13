import { getRepoFileContentInternal } from "../repo-utils";
import fs from "fs/promises";
import { db } from "@/../db";

// Mocking dependencies
jest.mock("fs/promises", () => ({
    readFile: jest.fn(),
}));

jest.mock("@/../db", () => ({
    db: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        get: jest.fn(),
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
}));

jest.mock("@/lib/constants", () => ({
    isPathBlocked: jest.fn((path: string) => path.includes("blocked")),
}));

describe("repo-utils", () => {
    const mockDb = db as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("getRepoFileContentInternal", () => {
        it("should throw error if path is blocked", async () => {
            await expect(getRepoFileContentInternal("r1", "blocked.txt", "u1"))
                .rejects.toThrow("Access denied: file is in blocklist.");
        });

        it("should throw error if path is invalid (traversal)", async () => {
            mockDb.get.mockReturnValue({ id: "r1", userId: "u1", fullName: "owner/repo" });
            await expect(getRepoFileContentInternal("r1", "../secret.txt", "u1"))
                .rejects.toThrow("Invalid file path");
            await expect(getRepoFileContentInternal("r1", "/etc/passwd", "u1"))
                .rejects.toThrow("Invalid file path");
        });

        it("should throw error if repository not found", async () => {
            mockDb.get.mockReturnValue(null);
            await expect(getRepoFileContentInternal("r1", "file.ts", "u1"))
                .rejects.toThrow("Repository not found");
        });

        it("should throw error if forbidden (wrong user)", async () => {
            mockDb.get.mockReturnValue({ id: "r1", userId: "u2", fullName: "owner/repo" });
            await expect(getRepoFileContentInternal("r1", "file.ts", "u1"))
                .rejects.toThrow("Forbidden");
        });

        it("should return content on success", async () => {
            mockDb.get.mockReturnValue({ id: "r1", userId: "u1", fullName: "owner/repo" });
            (fs.readFile as jest.Mock).mockResolvedValue("file content");

            const result = await getRepoFileContentInternal("r1", "file.ts", "u1");
            
            expect(result).toBe("file content");
            expect(fs.readFile).toHaveBeenCalled();
        });
    });
});

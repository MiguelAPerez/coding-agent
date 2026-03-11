import {
    initWorkspace,
    getRepoBranches,
    checkoutBranch,
    getWorkspaceFileContent,
    saveWorkspaceFile,
    getWorkspaceChangedFiles,
    getRepoFileTree,
    getGitFileContent,
    revertWorkspaceFile
} from "../workspace";


// Mock external dependencies
jest.mock("next-auth/next", () => ({
    getServerSession: jest.fn().mockResolvedValue({ user: { id: "test-user-id", name: "Test User" } })
}));

jest.mock("@/auth", () => ({
    authOptions: {}
}));

jest.mock("../files", () => ({
    cloneOrUpdateRepository: jest.fn().mockResolvedValue({ success: true, path: "/mock/path" })
}));

jest.mock("@/../db", () => ({
    db: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnValue({
            get: jest.fn().mockReturnValue({
                id: "repo-1",
                userId: "test-user-id",
                fullName: "test/repo",
                source: "github"
            })
        })
    }
}));

jest.mock("drizzle-orm", () => ({
    eq: jest.fn(),
    and: jest.fn()
}));

jest.mock("util", () => {
    const mockExecAsync = jest.fn();
    return {
        promisify: () => mockExecAsync,
        _mockExecAsync: mockExecAsync
    };
});
const mockExecAsync = (jest.requireMock("util") as { _mockExecAsync: jest.Mock })._mockExecAsync;

jest.mock("fs/promises", () => {
    const access = jest.fn();
    const readdir = jest.fn();
    const readFile = jest.fn();
    const writeFile = jest.fn();
    const mkdir = jest.fn();
    const unlink = jest.fn();
    return {
        access,
        readdir,
        readFile,
        writeFile,
        mkdir,
        unlink,
        _mocks: { mockAccess: access, mockReaddir: readdir, mockReadFile: readFile, mockWriteFile: writeFile, mockMkdir: mkdir, mockUnlink: unlink }
    };
});
const { mockAccess, mockReadFile, mockWriteFile, mockMkdir, mockReaddir, mockUnlink } = (jest.requireMock("fs/promises") as { _mocks: Record<string, jest.Mock> })._mocks;

describe("Workspace Actions", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("initWorkspace", () => {
        it("should clone repo if workspace does not exist", async () => {
            mockAccess
                .mockResolvedValueOnce(undefined) // source exists
                .mockRejectedValueOnce(new Error("Not found")); // workspace does not exist

            const res = await initWorkspace("repo-1");
            expect(res.success).toBe(true);

            // Check that it calls git clone
            expect(mockExecAsync).toHaveBeenCalledWith(
                expect.stringContaining("git clone")
            );
        });

        it("should fetch origin if workspace exists", async () => {
            mockAccess
                .mockResolvedValueOnce(undefined) // source exists
                .mockResolvedValueOnce(undefined); // workspace exists

            const res = await initWorkspace("repo-1");
            expect(res.success).toBe(true);

            expect(mockExecAsync).toHaveBeenCalledWith(
                expect.stringContaining("fetch origin")
            );
        });
    });

    describe("getRepoBranches", () => {
        it("should parse branches correctly and remove remote prefix", async () => {
            mockExecAsync.mockResolvedValue({
                stdout: "  main\n* feat-branch\n  remotes/origin/test\n"
            });

            const branches = await getRepoBranches("repo-1");
            expect(branches).toEqual(["main", "feat-branch", "test"]);
        });
    });

    describe("checkoutBranch", () => {
        it("should try local checkout first, then fetch/checkout if it fails", async () => {
            mockExecAsync
                .mockRejectedValueOnce(new Error("Local branch not found"))
                .mockResolvedValueOnce({}) // fetch
                .mockResolvedValueOnce({}); // remote checkout

            await checkoutBranch("repo-1", "feature");

            expect(mockExecAsync).toHaveBeenCalledTimes(3);
            expect(mockExecAsync).toHaveBeenNthCalledWith(1, expect.stringContaining('checkout "feature"'));
            expect(mockExecAsync).toHaveBeenNthCalledWith(2, expect.stringContaining('fetch origin'));
            expect(mockExecAsync).toHaveBeenNthCalledWith(3, expect.stringContaining('checkout -b "feature" "origin/feature"'));
        });
    });

    describe("File operations", () => {
        it("should read workspace file content successfully", async () => {
            mockReadFile.mockResolvedValue("file content");
            const res = await getWorkspaceFileContent("repo-1", "src/index.ts");
            expect(res).toBe("file content");
        });

        it("should throw error if access is blocked", async () => {
            await expect(getWorkspaceFileContent("repo-1", ".git/config")).rejects.toThrow("Access denied");
        });

        it("should save file and create necessary directories", async () => {
            mockWriteFile.mockResolvedValue(true);
            const res = await saveWorkspaceFile("repo-1", "src/newFile.ts", "Hello");
            expect(res.success).toBe(true);
            expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining("src"), { recursive: true });
        });
    });

    describe("getWorkspaceChangedFiles", () => {
        it("should parse git status porcelain output", async () => {
            mockExecAsync.mockResolvedValue({
                stdout: " M src/index.ts\n?? new-file.txt\n"
            });
            const changes = await getWorkspaceChangedFiles("repo-1");
            expect(changes).toEqual([
                { status: "M", path: "src/index.ts" },
                { status: "??", path: "new-file.txt" }
            ]);
        });
    });

    describe("getRepoFileTree", () => {
        it("should return a recursive file tree", async () => {
            mockReaddir
                .mockResolvedValueOnce([
                    { name: "src", isDirectory: () => true },
                    { name: "package.json", isDirectory: () => false }
                ])
                .mockResolvedValueOnce([
                    { name: "app.ts", isDirectory: () => false }
                ]);

            const tree = await getRepoFileTree("repo-1");
            expect(tree).toEqual([
                {
                    name: "src",
                    path: "src",
                    type: "directory",
                    children: [
                        { name: "app.ts", path: "src/app.ts", type: "file" }
                    ]
                },
                { name: "package.json", path: "package.json", type: "file" }
            ]);
        });

        it("should skip blocked paths", async () => {
            mockReaddir.mockResolvedValueOnce([
                { name: ".git", isDirectory: () => true },
                { name: "index.ts", isDirectory: () => false }
            ]);

            const tree = await getRepoFileTree("repo-1");
            expect(tree).toEqual([
                { name: "index.ts", path: "index.ts", type: "file" }
            ]);
            expect(mockReaddir).toHaveBeenCalledTimes(1); // Should not walk into .git
        });
    });

    describe("getGitFileContent", () => {
        it("should return file content from git HEAD", async () => {
            mockExecAsync.mockResolvedValue({ stdout: "git content" });
            const res = await getGitFileContent("repo-1", "src/index.ts");
            expect(res).toBe("git content");
            expect(mockExecAsync).toHaveBeenCalledWith(expect.stringContaining('show "HEAD:src/index.ts"'), expect.any(Object));
        });

        it("should return null if file is not in HEAD", async () => {
            mockExecAsync.mockRejectedValue(new Error("Git error"));
            const res = await getGitFileContent("repo-1", "new-file.ts");
            expect(res).toBeNull();
        });
    });

    describe("revertWorkspaceFile", () => {
        it("should checkout file from HEAD if it exists in HEAD", async () => {
            mockExecAsync
                .mockResolvedValueOnce({}) // cat-file succeeds
                .mockResolvedValueOnce({}); // checkout succeeds

            const res = await revertWorkspaceFile("repo-1", "src/index.ts");
            expect(res).toEqual({ success: true, action: "restored" });
            expect(mockExecAsync).toHaveBeenCalledWith(expect.stringContaining('checkout HEAD -- "src/index.ts"'));
        });

        it("should delete file if it does not exist in HEAD (untracked)", async () => {
            mockExecAsync.mockRejectedValueOnce(new Error("Not in HEAD"));
            mockUnlink.mockResolvedValueOnce(undefined);

            const res = await revertWorkspaceFile("repo-1", "new-file.ts");
            expect(res).toEqual({ success: true, action: "deleted" });
            expect(mockUnlink).toHaveBeenCalled();
        });

        it("should throw error if path is blocked", async () => {
            await expect(revertWorkspaceFile("repo-1", ".git/config")).rejects.toThrow("Access denied");
        });
    });
});

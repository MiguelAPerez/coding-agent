import { getAuthenticatedCloneUrl } from "../git-auth";
import { db } from "@/../db";
import { App } from "octokit";

// Mocking dependencies
jest.mock("@/../db", () => ({
    db: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        get: jest.fn(),
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
}));

jest.mock("octokit", () => {
    return {
        App: jest.fn().mockImplementation(() => ({
            octokit: {
                request: jest.fn(),
            },
            getInstallationOctokit: jest.fn().mockResolvedValue({
                request: jest.fn().mockResolvedValue({ data: { token: "gh-token" } }),
            }),
        })),
    };
});

describe("git-auth", () => {
    const mockDb = db as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should return Gitea authenticated URL", async () => {
        const repo = { url: "http://gitea.com/repo", source: "gitea", userId: "u1", fullName: "user/repo" };
        mockDb.get.mockReturnValue({ token: "gitea-token" });

        const result = await getAuthenticatedCloneUrl(repo);
        
        expect(result).toBe("http://gitea-token@gitea.com/repo");
    });

    it("should return GitHub authenticated URL using existing installationId", async () => {
        const repo = { url: "https://github.com/repo", source: "github", userId: "u1", fullName: "user/repo", githubConfigurationId: "c1" };
        mockDb.get.mockReturnValue({ appId: "123", privateKey: "key", installationId: "inst1" });

        const result = await getAuthenticatedCloneUrl(repo);
        
        expect(result).toBe("https://x-access-token:gh-token@github.com/repo");
        expect(App).toHaveBeenCalledWith({ appId: "123", privateKey: "key" });
    });

    it("should return GitHub authenticated URL by looking up installationId if missing", async () => {
        const repo = { url: "https://github.com/repo", source: "github", userId: "u1", fullName: "user/repo" };
        mockDb.get.mockReturnValue({ appId: "123", privateKey: "key", installationId: null });
        
        const mockApp = new App({ appId: "123", privateKey: "key" } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        (mockApp.octokit.request as jest.Mock).mockResolvedValue({ 
            data: [{ id: 12345, account: { login: "user" } }] 
        });
        (App as unknown as jest.Mock).mockReturnValue(mockApp);

        const result = await getAuthenticatedCloneUrl(repo);
        
        expect(result).toBe("https://x-access-token:gh-token@github.com/repo");
        expect(mockApp.octokit.request).toHaveBeenCalledWith("GET /app/installations");
    });

    it("should return original URL if source is not recognized", async () => {
        const repo = { url: "http://other.com", source: "other", userId: "u1", fullName: "name" };
        const result = await getAuthenticatedCloneUrl(repo);
        expect(result).toBe("http://other.com");
    });

    it("should return original URL on error and log it", async () => {
        const repo = { url: "http://gitea.com/repo", source: "gitea", userId: "u1", fullName: "user/repo" };
        mockDb.get.mockImplementation(() => { throw new Error("db failure"); });

        const result = await getAuthenticatedCloneUrl(repo);
        
        expect(result).toBe("http://gitea.com/repo");
        expect(console.error).toHaveBeenCalled();
    });
});

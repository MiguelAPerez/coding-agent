import { getDockerStatus, buildGitDockerImage } from "../docker-mgmt";
import { checkGitDockerStatus } from "@/lib/docker-git";
import { exec } from "child_process";
import { revalidatePath } from "next/cache";

// Mocking dependencies
jest.mock("@/lib/docker-git", () => ({
    checkGitDockerStatus: jest.fn(),
}));

jest.mock("child_process", () => ({
    exec: jest.fn(),
}));

jest.mock("util", () => ({
    promisify: (fn: unknown) => fn,
}));

jest.mock("next/cache", () => ({
    revalidatePath: jest.fn(),
}));

describe("docker-mgmt actions", () => {
    const mockExec = exec as unknown as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "log").mockImplementation(() => {});
        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("getDockerStatus", () => {
        it("should call checkGitDockerStatus", async () => {
            (checkGitDockerStatus as jest.Mock).mockResolvedValue({ status: "running" });
            const result = await getDockerStatus();
            expect(result).toEqual({ status: "running" });
            expect(checkGitDockerStatus).toHaveBeenCalled();
        });
    });

    describe("buildGitDockerImage", () => {
        it("should return success when bash script succeeds", async () => {
            mockExec.mockResolvedValueOnce({ stdout: "build success", stderr: "" });
            
            const result = await buildGitDockerImage();
            
            expect(result.success).toBe(true);
            expect(result.output).toBe("build success");
            expect(revalidatePath).toHaveBeenCalledWith("/settings");
        });

        it("should return success even if stderr has content (warning case)", async () => {
            mockExec.mockResolvedValueOnce({ stdout: "build success", stderr: "some warning" });
            
            const result = await buildGitDockerImage();
            
            expect(result.success).toBe(true);
            expect(result.output).toBe("build success");
            expect(console.error).toHaveBeenCalledWith("Docker Build Error:", "some warning");
        });

        it("should return failure when exec throws", async () => {
            mockExec.mockRejectedValueOnce(new Error("build failed"));
            
            const result = await buildGitDockerImage();
            
            expect(result.success).toBe(false);
            expect(result.error).toBe("build failed");
            expect(console.error).toHaveBeenCalledWith("Failed to build Docker image:", expect.any(Error));
        });
    });
});

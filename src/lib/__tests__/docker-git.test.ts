import { runGitInDocker, checkGitDockerStatus } from "../docker-git";
import { exec } from "child_process";

// Mocking dependencies
jest.mock("child_process", () => ({
    exec: jest.fn(),
}));

jest.mock("util", () => ({
    promisify: (fn: any) => fn, // eslint-disable-line @typescript-eslint/no-explicit-any
}));

describe("docker-git", () => {
    const mockExec = exec as unknown as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("runGitInDocker", () => {
        it("should run successfully and return result", async () => {
            mockExec.mockResolvedValue({ stdout: "git success", stderr: "" });
            
            const result = await runGitInDocker("/local/path", ["status"], { ENV_VAR: "value" });
            
            expect(result).toEqual({
                stdout: "git success",
                stderr: "",
                exitCode: 0
            });
            expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('docker run --rm -v "/local/path:/workspace" -e ENV_VAR="value" coding-agent-git sh -c \'git status\''));
        });

        it("should include git config for commit command", async () => {
            mockExec.mockResolvedValue({ stdout: "", stderr: "" });
            await runGitInDocker("/path", ["commit", "-m", "msg"]);
            expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('git config --global user.email'));
        });

        it("should handle execution errors", async () => {
            const error = new Error("docker failure");
            (error as any).stdout = "out"; // eslint-disable-line @typescript-eslint/no-explicit-any
            (error as any).stderr = "error output"; // eslint-disable-line @typescript-eslint/no-explicit-any
            (error as any).code = 127; // eslint-disable-line @typescript-eslint/no-explicit-any
            mockExec.mockRejectedValue(error);

            const result = await runGitInDocker("/path", ["status"]);
            
            expect(result).toEqual({
                stdout: "out",
                stderr: "error output",
                exitCode: 127
            });
        });
    });

    describe("checkGitDockerStatus", () => {
        it("should return running and built if both checks pass", async () => {
            mockExec.mockResolvedValueOnce({ stdout: "info", stderr: "" }); // docker info
            mockExec.mockResolvedValueOnce({ stdout: "aaaaaa\n", stderr: "" }); // docker images
            
            const status = await checkGitDockerStatus();
            expect(status).toEqual({ dockerRunning: true, imageBuilt: true });
        });

        it("should return imageBuilt false if no image ID found", async () => {
            mockExec.mockResolvedValueOnce({ stdout: "info", stderr: "" });
            mockExec.mockResolvedValueOnce({ stdout: "", stderr: "" }); // empty result
            
            const status = await checkGitDockerStatus();
            expect(status).toEqual({ dockerRunning: true, imageBuilt: false });
        });

        it("should return false for both if docker is not running", async () => {
            mockExec.mockRejectedValue(new Error("daemon not running"));
            
            const status = await checkGitDockerStatus();
            expect(status).toEqual({ dockerRunning: false, imageBuilt: false });
        });
    });
});

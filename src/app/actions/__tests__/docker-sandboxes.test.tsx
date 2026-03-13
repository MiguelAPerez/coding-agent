import { listSandboxes, createSandbox, stopSandbox, executeSandboxCommand } from "../docker-sandboxes";
import { exec } from "child_process";
import { getServerSession } from "next-auth/next";
import { db } from "@/../db";
import { revalidatePath } from "next/cache";

// Mocking dependencies
jest.mock("util", () => ({
  promisify: (fn: unknown) => fn,
}));

jest.mock("child_process", () => ({
  exec: jest.fn(),
}));

jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/auth", () => ({
  authOptions: {
    adapter: {},
    session: { strategy: "jwt" },
    providers: [],
  },
}));

jest.mock("@/../db", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    all: jest.fn(),
  },
}));

describe("Sandbox Actions", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockExec = exec as jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("listSandboxes", () => {
    it("should list and parse sandboxes", async () => {
        mockExec.mockResolvedValueOnce({
          stdout: "id1|name1|Up|2026|img|mnt|sandbox-repos=r1;r2,sandbox-name=custom\n",
          stderr: "",
        } as unknown as { stdout: string; stderr: string });

      const result = await listSandboxes();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("custom");
      expect(result[0].repoIds).toEqual(["r1", "r2"]);
    });

    it("should return empty array on failure", async () => {
        mockExec.mockRejectedValueOnce(new Error("failure"));
        const result = await listSandboxes();
        expect(result).toEqual([]);
    });
  });

  describe("createSandbox", () => {
      it("should create a sandbox", async () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          jest.mocked(getServerSession).mockResolvedValueOnce({ user: { id: "u1" } } as unknown as any);
          (db.all as jest.Mock).mockReturnValueOnce([{ id: "repo1", name: "test", fullName: "org/test" }]);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mockExec.mockResolvedValueOnce({ stdout: "id", stderr: "" } as unknown as any);

          const res = await createSandbox("test", ["repo1"]);
          expect(res.success).toBe(true);
          expect(revalidatePath).toHaveBeenCalled();
      });
  });

  describe("stopSandbox", () => {
      it("should stop a sandbox", async () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mockExec.mockResolvedValueOnce({ stdout: "ok", stderr: "" } as unknown as any);
          const res = await stopSandbox("id1");
          expect(res.success).toBe(true);
          expect(mockExec).toHaveBeenCalledWith(expect.stringContaining("rm -f id1"));
      });
  });

  describe("executeSandboxCommand", () => {
      it("should execute command", async () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mockExec.mockResolvedValueOnce({ stdout: "output", stderr: "" } as unknown as any);
          const res = await executeSandboxCommand("id1", "ls");
          expect(res.success).toBe(true);
          expect(res.stdout).toBe("output");
      });

      it("should handle execution errors", async () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mockExec.mockRejectedValueOnce({ stdout: "err_out", stderr: "err_msg", code: 1 } as unknown as any);
          const res = await executeSandboxCommand("id1", "ls");
          expect(res.success).toBe(false);
          expect(res.stderr).toContain("err_msg");
          expect(res.exitCode).toBe(1);
      });
  });
});

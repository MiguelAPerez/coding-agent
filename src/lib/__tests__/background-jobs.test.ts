import { runBackgroundJob } from "../background-jobs";
import { db } from "@/../db";
import { backgroundJobs } from "@/../db/schema";

// Mocking dependencies
jest.mock("@/../db", () => ({
    db: {
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        run: jest.fn(),
        values: jest.fn().mockReturnThis(),
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
}));

describe("background-jobs", () => {
    const mockDb = db as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should run task and mark as completed", async () => {
        const task = jest.fn().mockResolvedValue("task success result");
        const result = await runBackgroundJob("Test Job", task);

        expect(result).toBe("task success result");
        expect(mockDb.insert).toHaveBeenCalledWith(backgroundJobs);
        expect(mockDb.update).toHaveBeenCalledWith(backgroundJobs);
        expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
            status: "completed",
            details: "task success result"
        }));
    });

    it("should handle task failure and mark as failed", async () => {
        const task = jest.fn().mockRejectedValue(new Error("task failure"));
        
        await expect(runBackgroundJob("Failed Job", task)).rejects.toThrow("task failure");

        expect(mockDb.update).toHaveBeenCalledWith(backgroundJobs);
        expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
            status: "failed",
            error: "task failure"
        }));
        expect(console.error).toHaveBeenCalled();
    });

    it("should handle non-object results as string details", async () => {
        const task = jest.fn().mockResolvedValue("plain string");
        await runBackgroundJob("String Job", task);

        expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
            details: "plain string"
        }));
    });
});

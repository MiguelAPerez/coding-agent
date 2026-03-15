/* eslint-disable @typescript-eslint/no-explicit-any */
import { cleanupOldExternalChats } from "../chat-cleanup";
import { db } from "@/../db";

// Mock the db
jest.mock("@/../db", () => ({
    db: {
        select: jest.fn(),
        delete: jest.fn(),
    },
}));

describe("cleanupOldExternalChats", () => {
    let mockSelect: any;
    let mockDelete: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSelect = {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            all: jest.fn(),
        };

        mockDelete = {
            where: jest.fn().mockReturnThis(),
            run: jest.fn(),
        };

        (db.select as jest.Mock).mockReturnValue(mockSelect);
        (db.delete as jest.Mock).mockReturnValue(mockDelete);

        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        (console.log as jest.Mock).mockRestore();
        (console.error as jest.Mock).mockRestore();
    });

    test("successfully cleans up old discord chats", async () => {
        const oldChats = [
            { id: "1", type: "discord" },
            { id: "2", type: "discord" },
        ];

        mockSelect.all.mockResolvedValue(oldChats);
        mockDelete.run.mockResolvedValue({ changes: 1 });

        const result = await cleanupOldExternalChats();

        expect(db.select).toHaveBeenCalled();
        expect(mockSelect.all).toHaveBeenCalled();
        expect(db.delete).toHaveBeenCalledTimes(2);
        expect(result.deletedCount).toBe(2);
        expect(result.processedCount).toBe(2);
    });

    test("handles no chats to cleanup", async () => {
        mockSelect.all.mockResolvedValue([]);

        const result = await cleanupOldExternalChats();

        expect(mockSelect.all).toHaveBeenCalled();
        expect(db.delete).not.toHaveBeenCalled();
        expect(result.deletedCount).toBe(0);
        expect(result.processedCount).toBe(0);
    });

    test("continues if one deletion fails", async () => {
        const oldChats = [
            { id: "1", type: "discord" },
            { id: "2", type: "discord" },
        ];

        mockSelect.all.mockResolvedValue(oldChats);
        mockDelete.run
            .mockRejectedValueOnce(new Error("DB Error"))
            .mockResolvedValueOnce({ changes: 1 });

        const result = await cleanupOldExternalChats();

        expect(db.delete).toHaveBeenCalledTimes(2);
        expect(result.deletedCount).toBe(1);
        expect(result.processedCount).toBe(2);
    });
});

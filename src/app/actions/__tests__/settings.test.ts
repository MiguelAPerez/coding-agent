import { getBranchProtection, updateBranchProtection } from "../settings";
import { db } from "@/../db";
import { users } from "@/../db/schema";
import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";

// Mocking dependencies
jest.mock("@/../db", () => ({
    db: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        get: jest.fn(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        run: jest.fn(),
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
}));

jest.mock("next-auth/next", () => ({
    getServerSession: jest.fn(),
}));

jest.mock("@/auth", () => ({
    authOptions: {},
}));

jest.mock("next/cache", () => ({
    revalidatePath: jest.fn(),
}));

const mockDb = db as any; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("settings actions", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("getBranchProtection", () => {
        it("should return protection status for user", async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
            (db.get as jest.Mock).mockReturnValue({ mainBranchProtected: false });

            const result = await getBranchProtection();
            
            expect(result).toBe(false);
            expect(db.select).toHaveBeenCalledWith({ mainBranchProtected: users.mainBranchProtected });
        });

        it("should default to true if user preference not found", async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
            (db.get as jest.Mock).mockReturnValue(undefined);

            const result = await getBranchProtection();
            
            expect(result).toBe(true);
        });

        it("should throw error if unauthorized", async () => {
            (getServerSession as jest.Mock).mockResolvedValue(null);
            await expect(getBranchProtection()).rejects.toThrow("Unauthorized");
        });
    });

    describe("updateBranchProtection", () => {
        it("should update protection status", async () => {
            (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });

            const result = await updateBranchProtection(false);
            
            expect(result).toEqual({ success: true });
            expect(mockDb.update).toHaveBeenCalledWith(users);
            expect(mockDb.set).toHaveBeenCalledWith({ mainBranchProtected: false });
            expect(revalidatePath).toHaveBeenCalledWith("/settings");
        });

        it("should throw error if unauthorized", async () => {
            (getServerSession as jest.Mock).mockResolvedValue(null);
            await expect(updateBranchProtection(true)).rejects.toThrow("Unauthorized");
        });
    });
});

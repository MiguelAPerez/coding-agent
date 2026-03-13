import { 
    getSystemPrompts, 
    saveSystemPrompt, 
    deleteSystemPrompt, 
    getSystemPromptSets, 
    saveSystemPromptSet, 
    deleteSystemPromptSet, 
    syncManagedPersonas 
} from "../prompts";
import { db } from "@/../db";
import { systemPrompts, systemPromptSets } from "@/../db/schema";
import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";

// Mocking dependencies
jest.mock("@/../db", () => ({
    db: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        all: jest.fn(),
        get: jest.fn(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        run: jest.fn(),
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
}));

const mockDb = db as any; // eslint-disable-line @typescript-eslint/no-explicit-any

jest.mock("next-auth/next", () => ({
    getServerSession: jest.fn(),
}));

jest.mock("@/auth", () => ({
    authOptions: {},
}));

jest.mock("next/cache", () => ({
    revalidatePath: jest.fn(),
}));

describe("prompts actions", () => {
    const mockSession = { user: { id: "u1" } };

    beforeEach(() => {
        jest.clearAllMocks();
        (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    });

    describe("getSystemPrompts", () => {
        it("should return prompts for user", async () => {
            const mockData = [{ id: "p1", name: "Test" }];
            (db.all as jest.Mock).mockReturnValue(mockData);

            const result = await getSystemPrompts();
            
            expect(result).toEqual(mockData);
            expect(mockDb.from).toHaveBeenCalledWith(systemPrompts);
        });

        it("should return empty array if no session", async () => {
            (getServerSession as jest.Mock).mockResolvedValue(null);
            const result = await getSystemPrompts();
            expect(result).toEqual([]);
        });
    });

    describe("saveSystemPrompt", () => {
        it("should update existing prompt", async () => {
            await saveSystemPrompt({ id: "p1", name: "Updated", content: "Content" });
            
            expect(mockDb.update).toHaveBeenCalledWith(systemPrompts);
            expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ name: "Updated" }));
            expect(revalidatePath).toHaveBeenCalledWith("/evaluation-lab");
        });

        it("should insert new prompt", async () => {
            await saveSystemPrompt({ name: "New", content: "New Content" });
            
            expect(mockDb.insert).toHaveBeenCalledWith(systemPrompts);
            expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({ name: "New", userId: "u1" }));
        });
    });

    describe("deleteSystemPrompt", () => {
        it("should delete prompt", async () => {
            await deleteSystemPrompt("p1");
            expect(mockDb.delete).toHaveBeenCalledWith(systemPrompts);
            expect(revalidatePath).toHaveBeenCalledWith("/evaluation-lab");
        });
    });

    describe("deleteSystemPromptSet", () => {
        it("should delete prompt set", async () => {
            await deleteSystemPromptSet("s1");
            expect(mockDb.delete).toHaveBeenCalledWith(systemPromptSets);
            expect(revalidatePath).toHaveBeenCalledWith("/evaluation-lab");
        });
    });

    describe("getSystemPromptSets", () => {
        it("should return sets for user", async () => {
            const mockData = [{ id: "s1", name: "Set" }];
            (db.all as jest.Mock).mockReturnValue(mockData);

            const result = await getSystemPromptSets();
            
            expect(result).toEqual(mockData);
            expect(mockDb.from).toHaveBeenCalledWith(systemPromptSets);
        });
    });

    describe("saveSystemPromptSet", () => {
        it("should update existing set", async () => {
            await saveSystemPromptSet({ id: "s1", name: "Updated Set", systemPromptIds: ["p1"] });
            expect(mockDb.update).toHaveBeenCalledWith(systemPromptSets);
            expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ name: "Updated Set" }));
        });

        it("should insert new set", async () => {
            await saveSystemPromptSet({ name: "New Set", systemPromptIds: ["p1"] });
            expect(mockDb.insert).toHaveBeenCalledWith(systemPromptSets);
            expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({ name: "New Set", userId: "u1" }));
        });
    });

    describe("syncManagedPersonas", () => {
        it("should delete and upsert personas", async () => {
            const personas = [{ id: "p1", name: "P1", content: "C1" }] as any; // eslint-disable-line @typescript-eslint/no-explicit-any
            (db.get as jest.Mock).mockReturnValue(null); // Not existing

            await syncManagedPersonas(personas);
            
            expect(mockDb.delete).toHaveBeenCalledWith(systemPrompts);
            expect(mockDb.insert).toHaveBeenCalledWith(systemPrompts);
            expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({ id: "p1", isManaged: true }));
        });

        it("should update existing personas", async () => {
            const personas = [{ id: "p1", name: "P1", content: "C1" }] as any; // eslint-disable-line @typescript-eslint/no-explicit-any
            (db.get as jest.Mock).mockReturnValue({ id: "p1" }); // Existing

            await syncManagedPersonas(personas);
            
            expect(mockDb.update).toHaveBeenCalledWith(systemPrompts);
            expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ isManaged: true }));
        });
    });
});

import { renderHook, act } from "@testing-library/react";
import { useContextGroupForm } from "../useContextGroupForm";
import { saveContextGroup } from "@/app/actions/benchmarks";
import { ContextGroup } from "@/types/agent";

// Mock the saveContextGroup action
jest.mock("@/app/actions/benchmarks", () => ({
    saveContextGroup: jest.fn(),
    deleteContextGroup: jest.fn(),
}));

describe("useContextGroupForm", () => {
    const onSuccess = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should initialize with default empty form", () => {
        const { result } = renderHook(() => useContextGroupForm(onSuccess));

        expect(result.current.isEditing).toBeNull();
        expect(result.current.editForm.name).toBe("");
        expect(result.current.editForm.category).toBe("Technical");
        expect(result.current.editForm.weight).toBe(1);
    });

    it("should start a new group", () => {
        const { result } = renderHook(() => useContextGroupForm(onSuccess));

        act(() => {
            result.current.startNew();
        });

        expect(result.current.isEditing).toBe("");
        expect(result.current.editForm.name).toBe("");
    });

    it("should start editing an existing group", () => {
        const { result } = renderHook(() => useContextGroupForm(onSuccess));
        const mockGroup: ContextGroup = {
            id: "123",
            userId: "user1",
            name: "Test Group",
            description: "Test Desc",
            category: "Logic",
            weight: 2,
            expectations: JSON.stringify([{ type: "contains", value: "test" }]),
            maxSentences: 5,
            systemContext: "system context",
            promptTemplate: "template",
            skillIds: JSON.stringify(["skill1"]),
            toolIds: null,
            systemPromptIds: JSON.stringify(["p1"]),
            systemPromptSetIds: JSON.stringify(["s1"]),
            systemPromptVariations: JSON.stringify([{ id: "v1", name: "vname", systemPrompt: "vprompt" }]),
            updatedAt: new Date(),
        };

        act(() => {
            result.current.startEdit(mockGroup);
        });

        expect(result.current.isEditing).toBe("123");
        expect(result.current.editForm.name).toBe("Test Group");
        expect(result.current.editForm.weight).toBe(2);
        expect(result.current.editForm.expectations).toHaveLength(1);
        expect(result.current.editForm.skillIds).toContain("skill1");
    });

    it("should update field values", () => {
        const { result } = renderHook(() => useContextGroupForm(onSuccess));

        act(() => {
            result.current.onFieldChange("name", "New Name");
        });

        expect(result.current.editForm.name).toBe("New Name");
    });

    it("should toggle skills", () => {
        const { result } = renderHook(() => useContextGroupForm(onSuccess));

        act(() => {
            result.current.toggleSkill("skill1");
        });
        expect(result.current.editForm.skillIds).toContain("skill1");

        act(() => {
            result.current.toggleSkill("skill1");
        });
        expect(result.current.editForm.skillIds).not.toContain("skill1");
    });

    it("should handle expectations", () => {
        const { result } = renderHook(() => useContextGroupForm(onSuccess));

        act(() => {
            result.current.addExpectation();
        });
        expect(result.current.editForm.expectations).toHaveLength(1);

        act(() => {
            result.current.updateExpectation(0, "value", "expected value");
        });
        expect(result.current.editForm.expectations[0].value).toBe("expected value");

        act(() => {
            result.current.removeExpectation(0);
        });
        expect(result.current.editForm.expectations).toHaveLength(0);
    });

    it("should handle variations", () => {
        const { result } = renderHook(() => useContextGroupForm(onSuccess));

        act(() => {
            result.current.addVariation();
        });
        expect(result.current.editForm.systemPromptVariations).toHaveLength(1);
        const variationId = result.current.editForm.systemPromptVariations[0].id;

        act(() => {
            result.current.updateVariation(variationId, "name", "variation name");
        });
        expect(result.current.editForm.systemPromptVariations[0].name).toBe("variation name");

        act(() => {
            result.current.removeVariation(variationId);
        });
        expect(result.current.editForm.systemPromptVariations).toHaveLength(0);
    });

    it("should handle prompt and set references", () => {
        const { result } = renderHook(() => useContextGroupForm(onSuccess));

        act(() => {
            result.current.addFromLibrary("p1");
            result.current.addFromSet("s1");
        });
        expect(result.current.editForm.systemPromptIds).toContain("p1");
        expect(result.current.editForm.systemPromptSetIds).toContain("s1");

        act(() => {
            result.current.removeReference("p1", "prompt");
            result.current.removeReference("s1", "set");
        });
        expect(result.current.editForm.systemPromptIds).not.toContain("p1");
        expect(result.current.editForm.systemPromptSetIds).not.toContain("s1");
    });

    it("should call saveContextGroup on handleSave", async () => {
        (saveContextGroup as jest.Mock).mockResolvedValue({ success: true });
        const { result } = renderHook(() => useContextGroupForm(onSuccess));

        const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

        await act(async () => {
            await result.current.handleSave(mockEvent);
        });

        expect(saveContextGroup).toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalled();
    });

    it("should show alert on save failure", async () => {
        const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
        (saveContextGroup as jest.Mock).mockRejectedValue(new Error("error"));
        const { result } = renderHook(() => useContextGroupForm(onSuccess));

        const mockEvent = { preventDefault: jest.fn() } as unknown as React.FormEvent;

        await act(async () => {
            await result.current.handleSave(mockEvent);
        });

        expect(alertSpy).toHaveBeenCalledWith("Failed to save context group.");
        alertSpy.mockRestore();
    });

    it("should cancel edit", () => {
        const { result } = renderHook(() => useContextGroupForm(onSuccess));

        act(() => {
            result.current.startNew();
        });
        expect(result.current.isEditing).not.toBeNull();

        act(() => {
            result.current.cancelEdit();
        });
        expect(result.current.isEditing).toBeNull();
    });
});

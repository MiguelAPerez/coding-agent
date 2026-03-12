import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SkillSelector } from "../SkillSelector";

describe("SkillSelector", () => {
    const skills = [
        { id: "s1", name: "Skill 1", description: "desc", content: "content", isEnabled: true, userId: "u1", agentId: null, updatedAt: new Date() },
        { id: "s2", name: "Skill 2", description: "desc2", content: "content2", isEnabled: true, userId: "u1", agentId: null, updatedAt: new Date() },
    ];
    const onToggle = jest.fn();

    it("renders all skills", () => {
        render(
            <SkillSelector
                skills={skills}
                selectedSkillIds={["s1"]}
                onToggle={onToggle}
            />
        );

        expect(screen.getByText("Skill 1")).toBeInTheDocument();
        expect(screen.getByText("Skill 2")).toBeInTheDocument();
    });

    it("highlights selected skills", () => {
        render(
            <SkillSelector
                skills={skills}
                selectedSkillIds={["s1"]}
                onToggle={onToggle}
            />
        );

        // Check for specific style or class indicating selection
        // In this case, "bg-primary/10" class for the parent div of "Skill 1"
        const skill1Parent = screen.getByText("Skill 1").closest("div");
        expect(skill1Parent).toHaveClass("bg-primary/10");

        const skill2Parent = screen.getByText("Skill 2").closest("div");
        expect(skill2Parent).not.toHaveClass("bg-primary/10");
    });

    it("calls onToggle when a skill is clicked", () => {
        render(
            <SkillSelector
                skills={skills}
                selectedSkillIds={[]}
                onToggle={onToggle}
            />
        );

        fireEvent.click(screen.getByText("Skill 1"));
        expect(onToggle).toHaveBeenCalledWith("s1");
    });
});

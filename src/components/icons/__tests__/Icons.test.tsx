import React from "react";
import { render } from "@testing-library/react";
import { 
    UserIcon, 
    SettingsIcon, 
    LogoutIcon, 
    ChevronDownIcon 
} from "../index";

describe("Icons", () => {
    const testCases = [
        { name: "UserIcon", Component: UserIcon },
        { name: "SettingsIcon", Component: SettingsIcon },
        { name: "LogoutIcon", Component: LogoutIcon },
        { name: "ChevronDownIcon", Component: ChevronDownIcon },
    ];

    testCases.forEach(({ name, Component }) => {
        describe(name, () => {
            it("renders an SVG element", () => {
                const { container } = render(<Component />);
                const svg = container.querySelector("svg");
                expect(svg).toBeInTheDocument();
            });

            it("applies custom className", () => {
                const customClass = "custom-class";
                const { container } = render(<Component className={customClass} />);
                const svg = container.querySelector("svg");
                expect(svg).toHaveClass(customClass);
            });

            it("has default accessibility attributes or xmlns", () => {
                const { container } = render(<Component />);
                const svg = container.querySelector("svg");
                expect(svg).toHaveAttribute("xmlns", "http://www.w3.org/2000/svg");
                expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
            });
        });
    });
});

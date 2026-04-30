import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Home from "./page";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/components/SessionBanner", () => ({
  default: () => <div data-testid="session-banner" />,
}));

describe("Home page", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("disables start button when no topic is selected", () => {
    render(<Home />);

    expect(
      screen.getByRole("button", { name: "Start Practice" })
    ).toBeDisabled();
  });

  it("enables start when selecting from the list and navigates to slug route", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const button = screen.getByRole("button", { name: "Start Practice" });
    const select = screen.getByLabelText("Select from list");

    await user.selectOptions(select, "Design a URL Shortener");
    expect(button).toBeEnabled();

    await user.click(button);
    expect(pushMock).toHaveBeenCalledWith("/requirements/design-a-url-shortener");
  });

  it("custom topic clears selected topic and custom topic takes precedence", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const select = screen.getByLabelText("Select from list");
    const customInput = screen.getByLabelText("Custom topic");
    const button = screen.getByRole("button", { name: "Start Practice" });

    await user.selectOptions(select, "Design a URL Shortener");
    await user.type(customInput, "Design   Chat   App");

    expect((select as HTMLSelectElement).value).toBe("");
    await user.click(button);
    expect(pushMock).toHaveBeenCalledWith("/requirements/design-chat-app");
  });
});

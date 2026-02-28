/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { OtpSixInput } from "./otp-six-input";

function ControlledOtp({
  onChange,
  initialValue = "",
}: {
  onChange?: (code: string) => void;
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const handleChange = (code: string) => {
    setValue(code);
    onChange?.(code);
  };
  return <OtpSixInput value={value} onChange={handleChange} />;
}

describe("OtpSixInput", () => {
  it("each cell accepts max one digit", async () => {
    const user = userEvent.setup({ document });
    const onChange = vi.fn();
    render(<ControlledOtp onChange={onChange} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(6);
    await user.type(inputs[0], "12");
    expect(onChange).toHaveBeenLastCalledWith("12");
    expect(inputs[0]).toHaveValue("1");
    expect(inputs[1]).toHaveValue("2");
  });

  it("typing auto-advances focus", async () => {
    const user = userEvent.setup({ document });
    render(<ControlledOtp />);
    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "1");
    await waitFor(() => {
      expect(document.activeElement).toBe(inputs[1]);
    });
  });

  it("backspace on empty cell moves focus backward", async () => {
    const user = userEvent.setup({ document });
    render(<ControlledOtp initialValue="12" />);
    const inputs = screen.getAllByRole("textbox");
    inputs[2].focus();
    await user.keyboard("{Backspace}");
    await waitFor(() => {
      expect(document.activeElement).toBe(inputs[1]);
    });
  });

  it("paste 123456 into any cell fills all 6 in order", async () => {
    const user = userEvent.setup({ document });
    const onChange = vi.fn();
    render(<ControlledOtp onChange={onChange} />);
    const inputs = screen.getAllByRole("textbox");
    inputs[2].focus();
    await user.paste("123456");
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith("123456");
    });
  });

  it("non-digits are ignored during paste and input", async () => {
    const user = userEvent.setup({ document });
    const onChange = vi.fn();
    render(<ControlledOtp onChange={onChange} />);
    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "a1b2");
    expect(onChange).toHaveBeenLastCalledWith("12");
    onChange.mockClear();
    inputs[0].focus();
    await user.paste("12a34b56");
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith("123456");
    });
  });
});

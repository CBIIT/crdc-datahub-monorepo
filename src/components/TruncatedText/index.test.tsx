import React from "react";
import { render, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import userEvent from "@testing-library/user-event";
import TruncatedText from ".";

describe("Accessibility", () => {
  it("should have no violations", async () => {
    const { container } = render(<TruncatedText text="Accessible text" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("Basic Functionality", () => {
  it("renders without crashing", () => {
    const { getByTestId } = render(<TruncatedText text="Sample" />);
    expect(getByTestId("truncated-text-label")).toBeInTheDocument();
    expect(getByTestId("truncated-text-label")).toHaveTextContent("Sample");
  });

  it("does not truncate text shorter than maxCharacters", () => {
    const { getByTestId } = render(<TruncatedText text="Short" maxCharacters={10} />);
    expect(getByTestId("truncated-text-label")).toHaveTextContent("Short");
  });

  it("truncates text longer than maxCharacters", () => {
    const { getByTestId } = render(
      <TruncatedText text="This text is definitely too long" maxCharacters={10} />
    );
    expect(getByTestId("truncated-text-label")).toHaveTextContent("This text...");
  });

  it("shows an ellipsis when ellipsis prop is true", () => {
    const { getByTestId } = render(
      <TruncatedText text="Long text to be truncated" maxCharacters={5} ellipsis />
    );
    expect(getByTestId("truncated-text-label")).toHaveTextContent("Long...");
  });

  it("does not show an ellipsis when ellipsis prop is false", () => {
    const { getByTestId } = render(
      <TruncatedText text="Long text to be truncated" maxCharacters={5} ellipsis={false} />
    );
    expect(getByTestId("truncated-text-label")).toHaveTextContent("Long");
  });

  it("displays underline when underline prop is true and text is truncated", () => {
    const { getByTestId } = render(
      <TruncatedText text="Long text to be underlined" maxCharacters={5} underline />
    );
    const textWrapper = getByTestId("truncated-text-wrapper");
    expect(textWrapper).toHaveStyle("text-decoration: underline");
  });

  it("does not display underline when underline prop is false", () => {
    const { getByTestId } = render(
      <TruncatedText text="Long text not underlined" maxCharacters={5} underline={false} />
    );
    const textWrapper = getByTestId("truncated-text-wrapper");
    expect(textWrapper).not.toHaveStyle("text-decoration: underline");
  });

  it("uses custom tooltipText when provided", async () => {
    const { getByTestId, findByRole } = render(
      <TruncatedText text="Some really long text" maxCharacters={5} tooltipText="Custom Tooltip" />
    );
    const textLabel = getByTestId("truncated-text-label");
    userEvent.hover(textLabel);

    const tooltip = await findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Custom Tooltip");
  });

  it("displays tooltip with full text when text is truncated", async () => {
    const fullText = "This is a very long text that needs truncation";
    const { getByTestId, findByRole } = render(
      <TruncatedText text={fullText} maxCharacters={10} />
    );
    const textLabel = getByTestId("truncated-text-label");
    userEvent.hover(textLabel);

    const tooltip = await findByRole("tooltip");
    expect(tooltip).toHaveTextContent(fullText);
  });

  it("does not display tooltip when text is not truncated", async () => {
    const { getByTestId, queryByRole } = render(
      <TruncatedText text="Short text" maxCharacters={10} />
    );
    const textLabel = getByTestId("truncated-text-label");
    userEvent.hover(textLabel);

    await waitFor(() => {
      expect(queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  it("handles empty text gracefully", () => {
    const { getByTestId } = render(<TruncatedText text="" />);
    expect(getByTestId("truncated-text-label")).toHaveTextContent("");
  });

  it("handles null text gracefully", () => {
    const { getByTestId } = render(<TruncatedText text={null} />);
    expect(getByTestId("truncated-text-label")).toHaveTextContent("");
  });

  it("does not truncate text equal to maxCharacters", () => {
    const { getByTestId } = render(<TruncatedText text="ExactLength" maxCharacters={11} />);
    expect(getByTestId("truncated-text-label")).toHaveTextContent("ExactLength");
  });

  it("truncates text exceeding maxCharacters by one", () => {
    const { getByTestId } = render(<TruncatedText text="ExceedsLength" maxCharacters={10} />);
    expect(getByTestId("truncated-text-label")).toHaveTextContent("ExceedsLen...");
  });

  it("trims whitespace before adding ellipsis", () => {
    const { getByTestId } = render(<TruncatedText text="  Whitespace text  " maxCharacters={10} />);
    expect(getByTestId("truncated-text-label")).toHaveTextContent("Whitespace...");
  });

  it("disables tooltip when text is not truncated", async () => {
    const { getByTestId, queryByRole } = render(
      <TruncatedText text="Short text" maxCharacters={20} />
    );
    const textLabel = getByTestId("truncated-text-label");
    userEvent.hover(textLabel);

    await waitFor(() => {
      expect(queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  it("should forward the wrapperSx prop to the text wrapper element", () => {
    const { getByTestId } = render(
      <TruncatedText text="Styled text" wrapperSx={{ color: "red", marginTop: "90px" }} />
    );

    const textWrapper = getByTestId("truncated-text-wrapper");

    expect(textWrapper).toHaveStyle("color: red");
    expect(textWrapper).toHaveStyle("margin-top: 90px");
  });

  it("should forward the labelSx prop to the text label element", () => {
    const { getByTestId } = render(
      <TruncatedText text="Styled text" labelSx={{ color: "red", marginTop: "90px" }} />
    );

    const textLabel = getByTestId("truncated-text-label");

    expect(textLabel).toHaveStyle("color: red");
    expect(textLabel).toHaveStyle("margin-top: 90px");
  });
});

// NOTE: This is just a high level implementation test for the data types.
// Refer to the underlying coerceToString utility for more comprehensive tests.
describe("Data Types", () => {
  it.each<string>(["mock string 123", "lorem ipsum dolor sit amet", "test"])(
    "handles the string input '%s'",
    (text) => {
      const { getByTestId } = render(<TruncatedText text={text} maxCharacters={text.length + 1} />);

      expect(getByTestId("truncated-text-label")).toHaveTextContent(text);
    }
  );

  it.each<[boolean, string]>([
    [true, "true"],
    [false, "false"],
  ])("handles truncating the boolean input '%s'", (text, expected) => {
    const { getByTestId } = render(<TruncatedText text={text} maxCharacters={6} />);

    expect(getByTestId("truncated-text-label")).toHaveTextContent(expected);
  });

  it.each<[boolean, string]>([
    [true, "tru..."],
    [false, "fal..."],
  ])("handles truncating the boolean input '%s'", (input, expected) => {
    const { getByTestId } = render(<TruncatedText text={input} maxCharacters={3} />);

    expect(getByTestId("truncated-text-label")).toHaveTextContent(expected);
  });

  it.each<[number, string]>([
    [123, "123"],
    [456.789, "456.789"],
    [0, "0"],
    [-123, "-123"],
    [NaN, "NaN"],
    [Infinity, "Infinity"],
  ])("handles the number input '%s'", (text, expected) => {
    const { getByTestId } = render(<TruncatedText text={text} maxCharacters={11} />);

    expect(getByTestId("truncated-text-label")).toHaveTextContent(expected);
  });

  it.each<[number, string]>([
    [123, "123"],
    [456.789, "456"],
    [0, "0"],
    [-123, "-123"],
    [NaN, "NaN"],
    [Infinity, "Infi..."],
  ])("handles truncating the number input '%s'", (input, expected) => {
    const { getByTestId } = render(<TruncatedText text={input} maxCharacters={4} />);

    expect(getByTestId("truncated-text-label")).toHaveTextContent(expected);
  });

  it.each<[object, string]>([
    [{ key: "value" }, '{"key":"value"}'],
    [{ a: 1, b: 2 }, '{"a":1,"b":2}'],
    [[], "[]"],
    [[1, 2, 3], "[1,2,3]"],
    [[{ key: "value" }], '[{"key":"value"}]'],
    [{ key: [1, 2, 3] }, '{"key":[1,2,3]}'],
  ])("handles the object input '%s'", (text, expected) => {
    const { getByTestId } = render(<TruncatedText text={text} maxCharacters={50} />);

    expect(getByTestId("truncated-text-label")).toHaveTextContent(expected);
  });

  it.each<[object, string]>([
    [{ key: "value" }, '{"ke...'],
    [{ a: 1, b: 2 }, '{"a"...'],
    [[], "[]"],
    [[1, 2, 3], "[1,2..."],
    [[{ key: "value" }], '[{"k...'],
    [{ key: [1, 2, 3] }, '{"ke...'],
  ])("handles truncating the object input '%s'", (input, expected) => {
    const { getByTestId } = render(<TruncatedText text={input} maxCharacters={4} />);

    expect(getByTestId("truncated-text-label")).toHaveTextContent(expected);
  });

  it("handles 'null' input gracefully", () => {
    const { getByTestId } = render(<TruncatedText text={null} />);
    expect(getByTestId("truncated-text-label")).toHaveTextContent("");
  });

  it("handles 'undefined' input gracefully", () => {
    const { getByTestId } = render(<TruncatedText text={undefined} />);
    expect(getByTestId("truncated-text-label")).toHaveTextContent("");
  });

  it.each<unknown>([Symbol("XXXX"), () => {}])("handles unsupported types gracefully", (text) => {
    const { getByTestId } = render(<TruncatedText text={text} maxCharacters={50} />);
    expect(getByTestId("truncated-text-label")).toHaveTextContent("");
  });
});

describe("Edge Cases", () => {
  it("handles text with only whitespace", () => {
    const { getByTestId } = render(<TruncatedText text="     " />);
    expect(getByTestId("truncated-text-label")).toHaveTextContent("");
  });

  it("handles special characters in text", () => {
    const { getByTestId } = render(<TruncatedText text="!@#$%^&*()" maxCharacters={5} />);
    expect(getByTestId("truncated-text-label")).toHaveTextContent("!@#$%...");
  });

  it("handles negative maxCharacters value", () => {
    const { getByTestId } = render(
      <TruncatedText text="Negative maxCharacters" maxCharacters={-5} />
    );
    expect(getByTestId("truncated-text-label")).toHaveTextContent("...");
  });

  it("handles zero maxCharacters value", () => {
    const { getByTestId } = render(<TruncatedText text="Zero maxCharacters" maxCharacters={0} />);
    expect(getByTestId("truncated-text-label")).toHaveTextContent("...");
  });

  it("handles undefined maxCharacters value", () => {
    const { getByTestId } = render(<TruncatedText text="Default maxCharacters" />);
    expect(getByTestId("truncated-text-label")).toHaveTextContent("Default ma...");
  });

  it("handles maxCharacters larger than text length", () => {
    const { getByTestId } = render(<TruncatedText text="Short text" maxCharacters={100} />);
    expect(getByTestId("truncated-text-label")).toHaveTextContent("Short text");
  });
});

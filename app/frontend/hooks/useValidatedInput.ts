import { useState, useMemo } from "react";

// FIXME: contribute back to @bentley/react-hooks
export type Options<T> = {
  /** default to just returning the string */
  parse?: (input: string) => { value: T | null; status?: string };
} & ({
  pattern?: {
    regex: RegExp;
    /** status message if the `regex` doesn't match  */
    mismatchMessage?: string;
  }
} | {
  // TODO: allow return type of just boolean
  /** optional postparse value tester */
  validate: (value: T) => { valid: boolean; status?: string };
});

// TODO: add scientific notation support i.e. 1.23E+21
const isNumberPattern = /^-?(0|[1-9]\d*)(\.\d+)?$/i;

const parseFloatNullInsteadOfNaN: ValueParserWithStatus<number> = (text) => {
  const result = parseFloat(text);
  if (Number.isNaN(result)) return { value: null, status: "invalid number" };
  else return { value: result };
};

export const floatParseOpts: Options<number> = {
  parse: parseFloatNullInsteadOfNaN,
  pattern: {
    regex: isNumberPattern,
    mismatchMessage: "invalid number",
  },
};

export const stringParseOpts: Options<string> = {};

/**
 * Manages a string input, abstracting any parsing or validation for the intended value type.
 * By default (with no generic type parameter specified) assumes a number is being parsed and uses parseFloat for
 * parsing if no `parse` option is supplied.
 * if you are using any type but `number` you must pass a custom parse function
 */
export function useValidatedInput(
  initial?: string,
  opts?: Options<number>
): UseRegexValidatedInputResult<number>;
export function useValidatedInput<T extends any>(
  initial?: string,
  opts?: Options<T>
): UseRegexValidatedInputResult<T>;
export function useValidatedInput<T extends any = number>(
  initial?: string,
  opts: Options<T> = floatParseOpts as Options<T>,
): UseRegexValidatedInputResult<T> {
  const [input, setInput] = useState<string>(initial ?? "");

  const [value, statusReason] = useMemo(() => {
    if (opts && "pattern" in opts && opts.pattern && !opts.pattern.regex.test(input))
      return [null, opts.pattern.mismatchMessage];
    const identityParse = (t: string) => ({ value: t, status: undefined });
    const result = (opts.parse ?? identityParse)(input) as { value: T | null, status?: string };
    if (opts && "validate" in opts && result.value !== null) {
      const test = opts.validate(result.value);
      if (!test.valid) return [null, test.status];
    }
    return [result.value, result.status];
  }, [
    input,
    opts?.parse,
    "pattern" in opts && opts?.pattern?.regex.source,
    "pattern" in opts && opts?.pattern?.mismatchMessage,
    "validate" in opts && opts?.validate
  ]);

  const status = value !== null ? InputStatus.Success : InputStatus.Error;

  return [value, input, setInput, status, statusReason];
}

export enum InputStatus {
  Success = "success",
  Warning = "warning",
  Error = "error",
}

export type UseRegexValidatedInputResult<T> = [
  T | null,
  string,
  React.Dispatch<React.SetStateAction<string>>,
  InputStatus | undefined,
  string | undefined
];

type ValueParserWithStatus<T> = (
  text: string
) => { value: T | null; status?: string };

export default useValidatedInput;

import React, { useEffect } from "react";
import useValidatedInput, { InputStatus } from "../hooks/useValidatedInput";
import { classNames } from "js-utils/lib/react-utils";

export namespace UniqueInput {
  export interface Props extends Omit<React.HTMLProps<HTMLDivElement>, "onChange"> {
    initialValue?: string;
    valueLabel?: string;
    takenSet: string[];
    onChange?: (s: string) => void;
    inputClassName?: string;
  }
}

const noEmptyMessage =  "Can't be empty";

/**
 * owns an input component, and given a set of taken inputs, handles warning users
 * upon attempts to insert conflicts into the set
 */
export const UniqueInput = React.forwardRef<HTMLInputElement, UniqueInput.Props>((props, ref) => {
  const { initialValue, valueLabel, takenSet, onChange, inputClassName, ...divProps } = props;

  const [name, input, setInput, status, message] = useValidatedInput<string>(initialValue, {
    parse: (x) => ({ value: x }),
    validate(x) {
      if (x === "")
        return { valid: false, status: noEmptyMessage };
      if (takenSet.includes(x))
        return { valid: false, status: `The ${valueLabel ?? "value"} '${x}' already exists`};
      return { valid: true };
    }
  });

  useEffect(() => {
    if (name !== null) {
      onChange?.(name)
    }
  }, [name]);

  const hasError = status !== InputStatus.Success && message !== noEmptyMessage;

  return (
    <div {...divProps}>
      <div
        {...classNames(hasError && "alternis__invalidInputMessage")}
      >
        {hasError && message}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.currentTarget.value)}
        {...classNames(hasError && "alternis__invalidInput", inputClassName)}
        style={{ width: "100%" }}
        ref={ref}
      />
    </div>
  );
});

export default UniqueInput;

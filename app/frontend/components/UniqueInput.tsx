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

/**
 * owns an input component, and given a set of taken inputs, handles warning users
 * upon attempts to insert conflicts into the set
 */
export const UniqueInput = React.forwardRef<HTMLInputElement, UniqueInput.Props>((props, ref) => {
  const { initialValue, valueLabel, takenSet, onChange, inputClassName, ...divProps } = props;

  const [name, input, setInput, status, message] = useValidatedInput<string>(initialValue ?? "", {
    parse: (x) => ({ value: x }),
    validate(x) {
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

  return (
    <div {...divProps}>
      <div
        {...classNames(status !== InputStatus.Success && "alternis__invalidInputMessage")}
      >
        {message}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.currentTarget.value)}
        {...classNames(status !== InputStatus.Success && "alternis__invalidInput", inputClassName)}
        style={{ width: "100%" }}
        ref={ref}
      />
    </div>
  );
});

export default UniqueInput;

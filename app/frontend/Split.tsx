import React from "react";
import { classNames } from "js-utils/lib/react-utils";

export function Split(props: Split.Props) {
  const { left, right, ...divProps } = props;
  return <div {...divProps} {...classNames("alternis__split", divProps.className)}>
    <div>
      {left}
    </div>
    <div>
      {right}
    </div>
  </div>
}

export namespace Split {
  export interface Props extends React.HTMLProps<HTMLDivElement> {
    left?: React.ReactNode;
    right?: React.ReactNode;
  }
}

import React from "react";
import { classNames } from "./react-utils";

export function Split(props: Split.Props) {
  return <div {...props} {...classNames("split", ...props.className ?? [])}>
    <div>
      {props.left}
    </div>
    <div>
      {props.right}
    </div>
  </div>
}

export namespace Split {
  export interface Props extends React.HTMLProps<HTMLDivElement> {
    left?: React.ReactNode;
    right?: React.ReactNode;
  }
}

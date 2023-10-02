// FIXME: move to components

import React from "react";
import "./shared.global.css";

export const Center = React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>((props, ref) =>
  <div className="center" ref={ref} {...props} />
);

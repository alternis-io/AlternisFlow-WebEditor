import React from "react";
import "./shared.global.css";

export function Center(props: React.HTMLProps<HTMLDivElement>) {
  return (
    <div className="centered" {...props} />
  );
}

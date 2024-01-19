import { classNames } from "js-utils/lib/react-utils";
import React from "react";
import styles from "./TransparentInput.module.css";

export const TransparentInput = (props: React.HTMLProps<HTMLInputElement>) => {
  return <input {...props} {...classNames(styles.elem, props.className)} />;
};


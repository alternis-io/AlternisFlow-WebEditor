import { classNames } from "js-utils/lib/react-utils";
import React from "react";
import styles from "./TransparentSelect.module.css";

export const TransparentSelect = (props: React.HTMLProps<HTMLSelectElement>) => {
  return <select {...props} {...classNames(styles.select, props.className)} />;
};


import React from "react";
import { Handle, HandleProps } from "reactflow";
import styles from '../TestGraphEditor.module.css'
import { classNames } from "js-utils/lib/react-utils";

// FIXME: clean up/remove exprimental easy grab handle
export function NodeHandle(
  props: HandleProps
    & Omit<React.HTMLAttributes<HTMLDivElement>, "id">
    & {
      index: number;
      nodeId: string;
    }
) {
  const { nodeId, index, ...divProps } = props;
  //const graph = useReactFlow();
  //const radius = 12;
  return <Handle
    id={`${nodeId}_${props.type}_${index}`}
    {...divProps}
    {...classNames(styles.handle, props.className)}
    style={{
      ...props.style,
      //left: props.style?.position === "relative"
        //? undefined
        //: `calc(${props.type === "source" ? 100 : 0}% - ${radius}px)`,
      // FIXME: scale with zoom?
      //width: 2 * radius,
      //height: 2 * radius,
      //borderRadius: "50%",
      //border: `${radius}px solid transparent`,
      //backgroundColor: "transparent",
    }}
  >
    {/*
    <Center>
      <div
        style={{
          height: "100%",
          width: "100%",
          borderRadius: "50%",
          backgroundColor: "#888888",
          pointerEvents: "none",
          transform: "scale(0.5, 0.5)",
        }}
      />
    </Center>
    */}
  </Handle>;
}

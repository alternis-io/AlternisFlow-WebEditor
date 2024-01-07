import React from "react";
import styles from "./RespGrid.module.css";
import genericEditorStyles from "../GenericEditor.module.css";
import { ContextMenuOptions } from "../components/ContextMenu";
import { IconSizes, useAppState } from "../AppState";
import "../shared.global.css";
import { classNames } from "js-utils/lib/react-utils";
import { Center } from "../Center";

export type GridSizes = "small" | "medium" | "large";

export const gridSizes: Record<GridSizes, { label: string }> = {
  small: {
    label: "small",
  },
  medium: {
    label: "medium",
  },
  large: {
    label: "large",
  },
} as const;

export function RespGrid(props: RespGrid.Props) {
  return (
    <div
      className={styles.selectionGrid}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(${
          props.size === "small"
          ? "40px"
          : props.size === "large"
          ? "150px"
          : "80px"
        }, 0.5fr))`,
        gridAutoRows: `fit-content`,
      }}
    >
      <ContextMenuOptions options={Object.entries(gridSizes)
        .map(([name, size]) =>
          ({
            id: name,
            "label": `Make icons ${size.label}`,
            onSelect: () => setIconSize(name as GridSizes)
          }))
        }
      />
      {props.cells.map((cell) =>
        <div
          key={cell.key}
          // FIXME: note that center's display:flex breaks text-overflow
          {...classNames(styles.cell, "alternis__center")}
        >
          {cell.content}
        </div>
      )}
    </div>
  );
}

export namespace RespGrid {
  export interface CellContent {
    key: React.Key;
    content: React.ReactNode;
  }

  export interface Props {
    size?: GridSizes;
    cells: CellContent[];
  }
}


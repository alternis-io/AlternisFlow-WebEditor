import React, { useEffect, useState } from "react";
import styles from "./Tutorial.module.css";
import { assert } from "js-utils/lib/browser-utils";
import { Center } from "../Center";
import { classNames } from "js-utils/lib/react-utils";

export interface TutorialStep {
  body: React.ReactNode;
  /** a list of ids corresponding to `data-tut-id` attributes on elements,
   * those elements will be highlighted during this step */
  highlightedTutIds?: string[];
  corner?: "bottom-right" | "bottom-left";
  showEarlyCloseButton?: boolean;
}

export interface TutorialData {
  name: string;
  steps: TutorialStep[];
}

export namespace Tutorial {
  export interface Props {
    /** NOTE: must be memoized */
    data: TutorialData;
    highlightClass?: string;
    onClose?(): void;
  }
}

export function Tutorial(props: Tutorial.Props) {
  assert(props.data.steps.length >= 2, "tutorials must have at least two steps!");

  const highlightClass = props.highlightClass ?? "tutorial-highlighted";

  const [open, setOpen] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const step = props.data.steps[stepIndex];

  useEffect(() => {
    if (open && step.highlightedTutIds) {
      const highlightElemGroups = step.highlightedTutIds
        .map(id => document.querySelectorAll(`[data-tut-id="${id}"]`));

      for (const highlightElems of highlightElemGroups) {
        for (const highlightElem of highlightElems) {
          highlightElem.classList.add(highlightClass);
        }
      }

      return () => {
        for (const highlightElems of highlightElemGroups) {
          for (const highlightElem of highlightElems) {
            highlightElem.classList.remove(highlightClass);
          }
        }
      }
    }
  }, [stepIndex, open]);
  
  const onCloseStep = stepIndex === props.data.steps.length - 1;

  return (
    <div {...classNames(styles.root, "center")}>
      <dialog className={styles.dialog} open={open}>
        {stepIndex === 0 && <Center><h3>{props.data.name}</h3></Center>}
        <Center>{step.body}</Center>
        {stepIndex !== 0 && (
          <button className={styles.prev} onClick={() => setStepIndex(prev => prev - 1)}>
            previous
          </button>
        )}
        {step.showEarlyCloseButton && (
          <button className={styles.earlyExitBtn} onClick={() => setOpen(false)}>
            exit tutorial
          </button>
        )}
        <button
          className={styles.next}
          onClick={() => onCloseStep ? setOpen(false) : setStepIndex(prev => prev + 1)}
        >
          {onCloseStep ? "close" : "next"}
        </button>
      </dialog>
    </div>
  );
}

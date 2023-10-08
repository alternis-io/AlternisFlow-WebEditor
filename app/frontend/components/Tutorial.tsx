import React, { useEffect, useRef, useState } from "react";
import styles from "./Tutorial.module.css";
import { assert } from "js-utils/lib/browser-utils";
import { Center } from "../Center";
import { classNames } from "js-utils/lib/react-utils";

export interface TutorialStep {
  body: React.ReactNode;
  /** run any necessary state changes here, e.g. to the UI */
  onReached?(): void;
  /** a list of ids corresponding to `data-tut-id` attributes on elements,
   * those elements will be highlighted during this step */
  highlightedTutIds?: string[];
  corner?: "bottom-right" | "bottom-left";
  noCloseButton?: boolean;
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

  const onLastStep = stepIndex === props.data.steps.length - 1;

  useEffect(() => {
    if (!open)
      return;

    // need to await this or something, it might queue updates!
    step?.onReached?.();

    let highlightElemGroups: NodeListOf<Element>[] | undefined;

    // FIXME: horrible; wait for queued state to flush, these elements might not exist yet!
    const timeout = setTimeout(() => {
      highlightElemGroups = step.highlightedTutIds
        ?.map(id => document.querySelectorAll(`[data-tut-id="${id}"]`));

      for (const highlightElems of highlightElemGroups ?? []) {
        for (const highlightElem of highlightElems) {
          highlightElem.classList.add(highlightClass);
        }
      }
    }, 10);

    return () => {
      clearTimeout(timeout);
      for (const highlightElems of highlightElemGroups ?? []) {
        for (const highlightElem of highlightElems) {
          highlightElem.classList.remove(highlightClass);
        }
      }
    }
  }, [stepIndex, step, open]);
  
  const onCloseStep = stepIndex === props.data.steps.length - 1;

  const onClose = () => {
    setOpen(false);
    props.onClose?.();
  }

  const nextButton = useRef<HTMLButtonElement>(null);

  return (
    <div {...classNames(styles.root, "center")}>
      {/* FIXME: can reactflow Panel component */}
      <dialog className={styles.dialog} open={open}>
        {stepIndex === 0 && <Center><h3>{props.data.name}</h3></Center>}
        <Center>{step.body}</Center>
        {stepIndex !== 0 && (
          <button className={styles.prev} onClick={() => setStepIndex(prev => prev - 1)}>
            previous
          </button>
        )}
        {!step.noCloseButton && !onLastStep && (
          <button
            className={styles.earlyExitBtn}
            onClick={onClose}
          >
            exit tutorial
          </button>
        )}
        <button
          className={styles.next}
          onClick={() => {
            if (onCloseStep) {
              onClose();
            } else {
              setStepIndex(prev => prev + 1);
              nextButton.current?.focus();
            }
          }}
        >
          {onCloseStep ? "exit tutorial" : "next"}
        </button>
      </dialog>
    </div>
  );
}

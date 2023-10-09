import React, { useMemo, useRef, useState } from "react";
import styles from "./DialogueViewer.module.css"; // FIXME: use separate file
import { useAppState } from "./AppState";
// FIXME: import /worker
import { DialogueContext } from "alternis-js";
import { WorkerDialogueContext, makeDialogueContext } from "alternis-js/dist/worker-api";
//import { WorkerDialogueContext, makeDialogueContext } from "alternis-js/worker";
import { exportToJson } from "./export";
import { useAsyncEffect } from "@bentley/react-hooks";
import { useWithPrevDepsEffect } from "./hooks/usePrevValue";
import debounce from "lodash.debounce";
import { classNames } from "js-utils/lib/react-utils";

function useDialogueContext(json: string) {
  const [dialogueCtx, setDialogueCtx] = useState<WorkerDialogueContext>();

  // FIXME: debounce this because of typing
  useAsyncEffect(async ({ isStale }) => {
    // FIXME: useAsyncEffect has not effective cleanup!
    const ctx = await makeDialogueContext(json);
    if (!isStale())
      setDialogueCtx(ctx);
  }, [json]);

  useWithPrevDepsEffect(([prevCtx]) => {
    if (prevCtx !== undefined) {
      prevCtx.dispose();
    }
  }, [dialogueCtx])

  return dialogueCtx;
}

export function DialogueViewer(props: DialogueViewer.Props) {
  const doc = useAppState(s => s.document);

  // FIXME: it would be much more efficient to expose an API for dynamically modifying stuff...
  // FIXME: avoid running this expensive calculation on simple state changes like node movement
  const json = useMemo(() => JSON.stringify(exportToJson(doc)), [doc]);

  const dialogueCtx = useDialogueContext(json);

  const [currentStep, setCurrentStep] = useState<DialogueContext.StepResult>();

  const divProps = props;

  return (
    <div {...divProps} {...classNames(styles.dialogueViewer, divProps.className)}>
      {currentStep && "options" in currentStep ? (
        <div>
          {currentStep.options.map((o, i) => (
            <div className={styles.options}>
              <button
                key={i}
                onClick={async () => {
                  if (!dialogueCtx) return;
                  await dialogueCtx.reply(i);
                  setCurrentStep(await dialogueCtx.step());
                }}
                className={styles.dialogueButton}
              >
                {o.text}
              </button>
            </div>
          ))}
        </div>
      ) : currentStep && "none" in currentStep  ? (
        <div>dialogue ended</div>
      ) : (
        <div className={styles.dialogueContainer}>
          {currentStep && "line" in currentStep ? (
            <div className={styles.line}>
              <h4 className={styles.speaker}>{currentStep.line.speaker}</h4>
              <div><span>{currentStep.line.text}</span></div>
            </div>
          ) : (
            <div className={styles.line}>
              Dialogue not started
            </div>
          )}
          <button
            {...classNames(styles.dialogueButton, styles.nextButton)}
            onClick={async () => {
              if (dialogueCtx)
                setCurrentStep(await dialogueCtx.step());
            }}
          >
            next
          </button>
        </div>
      )}
    </div>
  );
}

export namespace DialogueViewer {
  export interface Props extends React.HTMLProps<HTMLDivElement> {}
}

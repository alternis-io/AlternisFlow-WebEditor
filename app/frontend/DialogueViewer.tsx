import React, { useMemo, useRef, useState } from "react";
import styles from "./Ide.module.css"; // FIXME: use separate file
import { useAppState } from "./AppState";
// FIXME: import /worker
import { DialogueContext } from "alternis-js";
import { WorkerDialogueContext, makeDialogueContext } from "alternis-js/dist/worker-api";
//import { WorkerDialogueContext, makeDialogueContext } from "alternis-js/worker";
import { exportToJson } from "./export";
import { useAsyncEffect } from "@bentley/react-hooks";
import { useWithPrevDepsEffect } from "./hooks/usePrevValue";
import debounce from "lodash.debounce";

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

export function DialogueViewer(_props: DialogueViewer.Props) {
  const doc = useAppState(s => s.document);

  // FIXME: it would be much more efficient to expose an API for dynamically modifying stuff...
  // FIXME: avoid running this expensive calculation on simple state changes like node movement
  const json = useMemo(() => JSON.stringify(exportToJson(doc)), [doc]);

  const dialogueCtx = useDialogueContext(json);

  const [currentStep, setCurrentStep] = useState<DialogueContext.StepResult>();

  return (
    <div className={styles.textEditor}>
      {currentStep && "options" in currentStep ? (
        <div>
          {currentStep.options.map((o, i) => (
            <button key={i} onClick={async () => {
              if (!dialogueCtx) return;
              await dialogueCtx.reply(i);
              setCurrentStep(await dialogueCtx.step());
            }}>
              {o.text}
            </button>
          ))}
        </div>
      ) : currentStep && "none" in currentStep  ? (
        <div>dialogue ended</div>
      ) : (
        <div>
          { currentStep && "line" in currentStep ? (
            <div>
              <div>speaker: <span>{currentStep.line.speaker}</span></div>
              <div>text: <span>{currentStep.line.text}</span></div>
            </div>
          ) : (
            <div>
              Dialogue not started
            </div>
          )}
          <button onClick={async () => {
            if (dialogueCtx)
              setCurrentStep(await dialogueCtx.step());
          }}>
            step
          </button>
        </div>
      )}
    </div>
  );
}

export namespace DialogueViewer {
  export interface Props {}
}

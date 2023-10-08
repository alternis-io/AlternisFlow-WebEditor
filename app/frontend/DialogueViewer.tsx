import React, { useMemo, useState } from "react";
import styles from "./Ide.module.css"; // FIXME: use separate file
import { useAppState } from "./AppState";
import { DialogueContext, makeDialogueContext } from "alternis-js";
import { exportToJson } from "./export";
import { useAsyncEffect } from "@bentley/react-hooks";
import { useWithPrevDepsEffect } from "./hooks/usePrevValue";

export function DialogueViewer(props: DialogueViewer.Props) {
  const doc = useAppState(s => s.document);

  const [dialogueCtx, setDialogueCtx] = useState<DialogueContext>();

  // FIXME: it would be much more efficient to expose an API for dynamically modifying stuff...
  // FIXME: avoid running this expensive calculation on simple state changes like node movement
  const json = useMemo(() => JSON.stringify(exportToJson(doc)), [doc]);

  useAsyncEffect(async ({ isStale }) => {
    const ctx = await makeDialogueContext(json);
    if (!isStale())
      setDialogueCtx(ctx);
  }, [json]);

  // FIXME: workaround useAsyncEffect not having cleanup
  useWithPrevDepsEffect(([prevCtx]) => {
    if (prevCtx !== undefined) {
      prevCtx.dispose();
    }
  }, [dialogueCtx])

  const [currentStep, setCurrentStep] = useState<DialogueContext.StepResult>();

  return (
    <div className={styles.textEditor}>
      {currentStep && "line" in currentStep ? (
        <div>
          <div>speaker: <span>{currentStep.line.speaker}</span></div>
          <div>text: <span>{currentStep.line.text}</span></div>
        </div>
      ) : currentStep && "options" in currentStep ? (
        <div>
          {currentStep.options.map((o, i) => (
            <button key={i} onClick={() => dialogueCtx?.reply(i)}>
              {o.text}
            </button>
          ))}
        </div>
      ) : currentStep && "none" in currentStep ? (
        <div>dialogue ended</div>
      ) : (
        <div>
          dialogue not started
          <button onClick={() => dialogueCtx?.step()}>
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

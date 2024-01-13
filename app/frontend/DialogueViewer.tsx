import React, { useMemo, useRef, useState } from "react";
import styles from "./DialogueViewer.module.css"; // FIXME: use separate file
import { useAppState, useCurrentDialogue } from "./AppState";
// FIXME: import /worker
import { DialogueContext } from "alternis-js";
import { WorkerDialogueContext, makeDialogueContext } from "alternis-js/dist/worker-api";
//import { WorkerDialogueContext, makeDialogueContext } from "alternis-js/worker";
import { exportDialogueToJson } from "./export";
import { useAsyncEffect } from "@bentley/react-hooks";
import { useWithPrevDepsEffect } from "./hooks/usePrevValue";
import debounce from "lodash.debounce";
import { classNames } from "js-utils/lib/react-utils";
import { assert } from "js-utils/lib/browser-utils";

function useDialogueContext(json: string | undefined) {
  const [dialogueCtx, setDialogueCtx] = useState<WorkerDialogueContext>();

  // FIXME: debounce this because of typing
  useAsyncEffect(async ({ isStale }) => {
    // FIXME: useAsyncEffect has no effective cleanup!
    const ctx = json !== undefined ? await makeDialogueContext(json) : undefined;
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
  const currentDialogue = useCurrentDialogue();

  // FIXME: it would be much more efficient to expose an API for dynamically modifying stuff...
  // FIXME: avoid running this expensive calculation on simple state changes like node movement
  const json = useMemo(
    () => currentDialogue && JSON.stringify(exportDialogueToJson(doc, currentDialogue)),
    [doc, currentDialogue],
  );

  const dialogueCtx = useDialogueContext(json);

  const [currentStep, setCurrentStep] = useState<DialogueContext.StepResult>();

  const divProps = props;

  return (
    <div
      data-tut-id="dialogue-playback"
      {...divProps}
      {...classNames(styles.dialogueViewer, divProps.className)}
    >
      {!currentStep ? (
        <div title="Start dialogue"
          onClick={async () => {
            if (dialogueCtx)
            setCurrentStep(await dialogueCtx.step());
          }}
        >
          <svg height="30px" width="30px" viewBox="-3 -3 16 16">
            <path {...classNames(styles.playButton, "alternis__hover")}
              d="M0 0 l0 10 l10 -5 l-10 -5" />
          </svg>
        </div>
      ) : (
          <>
            <div title="Stop dialogue"
              onClick={async () => {
                if (dialogueCtx)
                await dialogueCtx.reset();
                setCurrentStep(undefined)
              }}
            >
              <svg height="30px" width="30px" viewBox="0 0 10 10">
                <rect {...classNames(styles.stopButton)}
                  x={0} y={0} width={10} height={10} rx={2} />
              </svg>
            </div>
            {"line" in currentStep ? (
              <>
                <div className={styles.line}>
                  <h4 className={styles.speaker}>{currentStep.line.speaker}</h4>
                  <div><span>{currentStep.line.text}</span></div>
                </div>
                <button
                  {...classNames(styles.dialogueButton, styles.nextButton)}
                  onClick={async () => {
                    if (dialogueCtx)
                    setCurrentStep(await dialogueCtx.step());
                  }}
                >
                  next
                </button>
              </>
            ) : "options" in currentStep ? (
                <div className={styles.options}>
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
              ) : "done" in currentStep ? (
                  <svg height="50px" width="50px" viewBox="-3 -3 16 16">
                    <path {...classNames(styles.playButton, "alternis__hover")} d="M0 0 l0 10 l10 -5 l-10 -5" />
                    <circle rx={5} ry={5} cx={5} cy={5} />
                  </svg>
              ) : assert(false, "unreachable, unknown dialogue state") as never}
            </>
        )}
    </div>
  );
}

export namespace DialogueViewer {
  export interface Props extends React.HTMLProps<HTMLDivElement> {}
}

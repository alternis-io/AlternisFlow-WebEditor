import React, { useMemo, useState } from "react";
import styles from "./DialogueViewer.module.css"; // FIXME: use separate file
import { useAppState } from "./AppState";
// FIXME: import /worker
import { DialogueContext } from "alternis-js";
import { WorkerDialogueContext, makeDialogueContext } from "alternis-js/dist/worker-api";
import { exportDocumentToJson } from "./export";
import { useAsyncEffect } from "@bentley/react-hooks";
import debounce from "lodash.debounce";
import { classNames } from "js-utils/lib/react-utils";
import { assert } from "js-utils/lib/browser-utils";
import { create } from "zustand";

export interface DialogueStoreState {
  dialogueCtx: WorkerDialogueContext | undefined;
  setDialogueCtx: typeof debouncedUpdateDialogue;
}

const debouncedUpdateDialogue = debounce(
  async (json: string | undefined) => {
    const prevCtx = useDialogueStore.getState().dialogueCtx;

    const newCtx = json !== undefined ? await makeDialogueContext(json) : undefined;

    if (prevCtx !== undefined)
      prevCtx.dispose();

    useDialogueStore.setState(s => ({ ...s, dialogueCtx: newCtx }));
  },
  400,
);

const useDialogueStore = create<DialogueStoreState>()((set) => ({
  dialogueCtx: undefined,
  setDialogueCtx: debouncedUpdateDialogue,
}));


export function useDialogueContext(json?: string) {
  const setCtx = useDialogueStore(p => p.setDialogueCtx);
  if (json !== undefined)
    void setCtx(json);
  return useDialogueStore(p => p.dialogueCtx);
}

export function DialogueViewer(props: DialogueViewer.Props) {
  const doc = useAppState(s => s.document);
  const currentDialogueId = useAppState(s => s.currentDialogueId);
  const dialogues = useAppState(s => s.document.dialogues);
  const dialogueIndex = Object.keys(dialogues).findIndex(d => d === currentDialogueId);
  assert(dialogueIndex !== undefined);

  // FIXME: it would be much more efficient to expose an API for dynamically modifying stuff...
  // FIXME: avoid running this expensive calculation on simple state changes like node movement
  const json = useMemo(
    () => JSON.stringify(exportDocumentToJson(doc)),
    [doc],
  );

  const dialogueCtx = useDialogueContext(json);

  const [currentStep, setCurrentStep] = useState<DialogueContext.StepResult>();

  const divProps = props;

  if (dialogueCtx === undefined)
    return <em>playback error</em>

  return (
    <div
      data-tut-id="dialogue-playback"
      {...divProps}
      {...classNames(styles.dialogueViewer, divProps.className)}
    >
      {!currentStep ? (
        <div
          title="Start dialogue"
          onClick={async () => {
            if (dialogueCtx)
              setCurrentStep(await dialogueCtx.step(dialogueIndex));
          }}
        >
          <svg height="30px" width="30px" viewBox="-3 -3 16 16">
            <path {...classNames(styles.playButton, "alternis__hover")}
              d="M0 0 l0 10 l10 -5 l-10 -5" />
          </svg>
        </div>
      ) : (
          <>
            <div
              title="Stop dialogue"
              onClick={async () => {
                if (dialogueCtx)
                  await dialogueCtx.reset(dialogueIndex, 0);
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
                      setCurrentStep(await dialogueCtx.step(dialogueIndex));
                  }}
                >
                  next
                </button>
              </>
            ) : "options" in currentStep ? (
                <div className={styles.options}>
                  {currentStep.options.map((o, i) => (
                    <div key={o.id} className={styles.options}>
                      <button
                        onClick={async () => {
                          if (!dialogueCtx) return;
                          await dialogueCtx.reply(dialogueIndex, i);
                          setCurrentStep(await dialogueCtx.step(dialogueIndex));
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

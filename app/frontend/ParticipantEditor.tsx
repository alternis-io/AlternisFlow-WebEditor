import React, { useCallback, useEffect } from "react";
import styles from "./ParticipantEditor.module.css";
import genericEditorStyles from "./GenericEditor.module.css";
import { ContextMenu } from "./components/ContextMenu";
import { IconSizes, useAppState } from "./AppState";
import { useValidatedInput } from "./hooks/useValidatedInput";
import { uploadFile } from "./localFileManip";
import "./shared.global.css";
import { classNames } from "./react-utils";
import { Center } from "./Center";
import { Participant } from "../common/data-types/participant";
import defaultParticipantIconUrl from "./resources/participant-icon.svg";

export const iconSizes: Record<IconSizes, { label: string }> = {
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

export function ParticipantEditor() {
  const participants = useAppState((s) => s.document.participants);
  const editorPrefs = useAppState((s) => s.preferences.participantEditor);
  const set = useAppState((s) => s.set);

  const setIconSize = (val: IconSizes) => set((s) => ({
    preferences: {
      ...s.preferences,
      participantEditor: {
        ...s.preferences.participantEditor,
        iconSize: val
      },
    },
  }));

  // FIXME: consolidate
  const selectedName = editorPrefs.lastSelected;
  const selectedIndex = selectedName !== undefined ? participants.findIndex(p => p?.name === selectedName) : -1;
  const selected = selectedIndex !== -1 ? participants[selectedIndex] : undefined;

  const [name, nameInput, setNameInput, nameStatus, nameStatusMessage] = useValidatedInput(selected?.name ?? "", {
    validate: useCallback((text: string) => {
      if (text === selectedName)
        return { valid: true };
      if (!text)
        return { valid: false, status: "Participant can't have an empty name"}
      if (participants.some(p => p?.name === text))
        return { valid: false, status: "A participant with that name already exists" };
      return { valid: true };
    }, [participants, selectedName]),
  });

  const newParticipantPrefix = "New participant";

  const getAvailableNewParticipantName = useCallback(() => {
    const [currentMax] = participants
      .map(participant => {
        const match = new RegExp(`^New participant (?<num>\\d+)`).exec(participant.name);
        return {
          participant,
          num: match?.groups?.num ? +match.groups.num : undefined,
        };
      })
      .filter(p => p.num !== undefined)
      // descending sort (highest is first)
      .sort((a, b) => b.num! - a.num!)

    const nextNum = (currentMax?.num ?? 0) + 1;
    return `${newParticipantPrefix} ${nextNum}`;
  }, [participants]);

  useEffect(() => {
    if (name === null || !selectedName || selectedName === name)
      return;

    const prevName = selectedName;
    set(s => {
      return {
        preferences: {
          ...s.preferences,
          participantEditor: {
            ...s.preferences.participantEditor,
            lastSelected: name,
          },
        },
        document: {
          ...s.document,
          participants: s.document.participants.map(p =>
            p.name === prevName
            ? { ...p, name }
            : p
          ),
        },
      };
    }
  );

  }, [name, selectedName]);

  const setSelectedName = (val: string) => {
    set((s) => ({
      preferences: {
        ...s.preferences,
        participantEditor: {
          ...s.preferences.participantEditor,
          lastSelected: val,
        },
      },
    }));
    setNameInput(val);
  };

  const setSelectedPortrait = (participantName: string, portraitUrl: string) => {
    set((s) => ({
      document: {
        ...s.document,
        participants: s.document.participants.map(p =>
          p.name === participantName
          ? { ...p, portraitUrl }
          : p
        ),
      },
    }));
  };

  const details = (
    <div className={styles.details} style={{ width: "100%" }}>
      <h1> Details </h1>
      {selectedName && selected ? <>
        <label style={{ width: "100%" }}>
          Participant name&nbsp;
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.currentTarget.value)}
          />
        </label>
        <label style={{ width: "100%" }}>
          Portrait
          &nbsp;
          <button onClick={async () => {
            const file = await uploadFile({ type: 'dataurl' })
            setSelectedPortrait(selectedName, file.content);
          }}>
            Upload new portrait
          </button>
          &nbsp;
          <img className={styles.bigPortrait} src={selected.portraitUrl} alt={selected.name} />
        </label>
        <div style={{color: "#f00"}}> { nameStatus !== "success" && nameStatusMessage } </div>
        </> : <>
          Select a participant to see and edit them
        </>
      }
    </div>
  );

  return (
    <div>
      <div
        className={styles.selectionGrid}
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(${
            editorPrefs.iconSize === "small"
            ? "40px"
            : editorPrefs.iconSize === "large" 
            ? "150px"
            : "80px"
          }, 1fr))`,
          gridAutoRows: `fit-content`,
        }}
      >
        <ContextMenu>
          <div style={{ backgroundColor: "white", color: "black" }}>
            {Object.entries(iconSizes).map(([name, iconSize]) => 
              <div key={name} onClick={() => setIconSize(name as IconSizes)}>
                Make icons {iconSize.label}
              </div>
            )}
          </div>
        </ContextMenu>
        {participants.map((p, i) =>
          <div
            key={p.name}
            {...classNames(styles.portraitImage, "hoverable", "draggable")}
            onClick={() => setSelectedName(p.name)}
            title={"Click to edit, drag to drop"}
            onContextMenu={(e) => {
              // FIXME: add a delete option here
            }}
          >
            <img
              src={p.portraitUrl}
              alt={p.name}
              onDragStart={(event) => {
                event.dataTransfer.setData("application/dialogical-participant", JSON.stringify({ participant: p, index: i }));
                event.dataTransfer.effectAllowed = "move";
              }}
            />
          </div>
        )}
        <div
          title={`Add a new participant`}
          {...classNames(genericEditorStyles.newButton, "hoverable")}
          onClick={() => {
            const newPartipant: Participant = {
              name: getAvailableNewParticipantName(),
              portraitUrl: defaultParticipantIconUrl,
            };

            useAppState.setState((s) => ({
              document: {
                ...s.document,
                participants: s.document.participants.concat(newPartipant),
              },
            }));

            setSelectedName(newPartipant.name);
          }}
        >
          <Center>+</Center>
        </div>

      </div>

      {details}
    </div>
  );
}


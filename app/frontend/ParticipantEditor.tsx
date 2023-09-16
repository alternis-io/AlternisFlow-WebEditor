import React, { useCallback, useEffect } from "react";
import styles from "./ParticipantEditor.module.css";
import { ContextMenu } from "./components/ContextMenu";
import { IconSizes, useAppState } from "./AppState";
import { useValidatedInput } from "./hooks/useValidatedInput";
import { uploadFile } from "./localFileManip";

export namespace ProjectDataEditor {
  export interface Props {}
}

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
      <h1> Participants </h1>
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
            className={styles.portraitImage}
            onClick={() => setSelectedName(p.name)}
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
      </div>

      {details}
    </div>
  );
}


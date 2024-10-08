import React, { useCallback, useEffect } from "react";
import styles from "./ParticipantEditor.module.css";
import genericEditorStyles from "./GenericEditor.module.css";
import { ContextMenuOptions } from "./components/ContextMenu";
import { IconSizes, useAppState, useCurrentDocument } from "./AppState";
import { useValidatedInput } from "./hooks/useValidatedInput";
import { uploadFile } from "./localFileManip";
import "./shared.global.css";
import { classNames } from "js-utils/lib/react-utils";
import { Center } from "./Center";
import { Participant } from "../common/data-types/participant";
import defaultParticipantIconUrl from "./images/participant-icon.svg";
import { docs } from "./api/usePouchDbApi";
import { useAsyncEffect } from "@bentley/react-hooks";

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
  const participants = useCurrentDocument((d) => d.participants);
  const editorPrefs = useAppState((s) => s.preferences.participantEditor);

  const setIconSize = (val: IconSizes) => useAppState.setState((s) => ({
    preferences: {
      ...s.preferences,
      participantEditor: {
        ...s.preferences.participantEditor,
        iconSize: val
      },
    },
  }));

  // FIXME: consolidate state
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

  useAsyncEffect(async () => {
    if (name === null || !selectedName || selectedName === name)
      return;

    const prevName = selectedName;

    useAppState.setState(s => {
      return {
        preferences: {
          ...s.preferences,
          participantEditor: {
            ...s.preferences.participantEditor,
            lastSelected: name,
          },
        },
      };
    });

    const docId = useAppState.getState().projectId;
    if (docId === undefined) throw Error("projectId cannot be undefined in the editor");
    const doc = await docs.get(docId);

    await docs.put({
      ...doc,
      participants: doc.participants.map(p =>
        p.name === prevName
        ? { ...p, name }
        : p
      ),
    });

  }, [name, selectedName]);

  const setSelectedName = (val: string) => {
    useAppState.setState((s) => ({
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

  const setSelectedPortrait = async (participantName: string, portraitUrl: string) => {
    const docId = useAppState.getState().projectId;
    if (docId === undefined) throw Error("projectId cannot be undefined in the editor");
    const doc = await docs.get(docId);

    await docs.put({
      ...doc,
      participants: doc.participants.map(p =>
        p.name === participantName
        ? { ...p, portraitUrl }
        : p
      ),
    });
  };

  const details = (
    <div className={styles.details} style={{ width: "100%" }}>
      <h1> Details </h1>
      {selectedName && selected ? (
        <>
          <label style={{ width: "100%" }}>
            Participant name&nbsp;
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.currentTarget.value)}
            />
          </label>
          <button
            title="Delete this participant"
            onClick={async () => {
              const docId = useAppState.getState().projectId;
              if (docId === undefined) throw Error("projectId cannot be undefined in the editor");
              const doc = await docs.get(docId);

              await docs.put({
                ...doc,
                participants: doc.participants.filter((p) => p !== selected)
              });
            }}
          >
            Delete participant
          </button>
          <label style={{ width: "100%" }}>
            Portrait
            &nbsp;
            <button onClick={async () => {
              const file = await uploadFile({ type: 'dataurl' })
              await setSelectedPortrait(selectedName, file.content);
            }}>
              Upload new portrait
            </button>
          </label>
          <img className={styles.bigPortrait} src={selected.portraitUrl} alt={selected.name} />
          <div style={{ color: "#f00" }}>{nameStatus !== "success" && nameStatusMessage}</div>
        </>
      ) : (
        <>
          {participants.length > 0
            ? "Select a participant to see and edit them"
            : "Add a participant above to see and edit them"}
        </>
      )}
    </div>
  );

  return (
    <div>
      {/* FIXME: consolidate with RespGrid */}
      <div
        className={styles.selectionGrid}
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(${
            editorPrefs.iconSize === "small"
            ? "40px"
            : editorPrefs.iconSize === "large"
            ? "150px"
            : "80px"
          }, 0.5fr))`,
          gridAutoRows: `fit-content`,
        }}
      >
        <ContextMenuOptions options={Object.entries(iconSizes)
          .map(([name, iconSize]) =>
            ({
              id: name,
              "label": `Make icons ${iconSize.label}`,
              onSelect: () => setIconSize(name as IconSizes)
            }))
          }
        />
        {participants.map((p, i) =>
          <div
            key={p.name}
            // FIXME: note that center's display:flex breaks text-overflow
            {...classNames(styles.portraitImage, "alternis__hoverable", "alternis__draggable", "alternis__center")}
            onClick={() => setSelectedName(p.name)}
            title={p.name + `\nClick to edit. Drag and drop into the graph to add a line node`}
          >
            <img
              src={p.portraitUrl}
              alt={p.name}
              onDragStart={(e) => {
                e.dataTransfer.setData("application/alternis-project-data-item", JSON.stringify({
                  type: "participants",
                  data: p,
                  id: String(i),
                }));
                e.dataTransfer.effectAllowed = "move";
              }}
            />
          </div>
        )}
        <div
          title={`Add a new participant`}
          data-tut-id="participant-add-button"
          data-tut-inset
          {...classNames(genericEditorStyles.newButton, "alternis__hoverable")}
          style={{ height: "100%" }}
          onClick={async () => {
            const newPartipant: Participant = {
              name: getAvailableNewParticipantName(),
              portraitUrl: defaultParticipantIconUrl,
            };

            const docId = useAppState.getState().projectId;
            if (docId === undefined) throw Error("projectId cannot be undefined in the editor");

            const doc = await docs.get(docId);
            await docs.put({
              ...doc,
              participants: doc.participants.concat(newPartipant),
            });

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


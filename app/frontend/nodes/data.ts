export interface BaseNodeData {
  // FIXME: make this a required, auto-generated id
  label?: string;
  customData?: [string, string][];
}

// FIXME: move to common/
export interface DialogueEntry extends BaseNodeData {
  speakerIndex: number;
  specificPortraitUrl?: string;
  title?: string;
  text: string;
}

export interface Lock extends BaseNodeData {
  variable: string;
  action: "lock" | "unlock";
}

// FIXME: rename to function call?
export interface Emit extends BaseNodeData {
  function: string;
}

export interface RandomSwitch extends BaseNodeData {
  proportions: number[];
}

export const defaultRandomSwitchProps = {
  proportions: [1, 1],
};

export interface PlayerReply {
  text: string;
  lockVariable: string | undefined;
  // FIXME: replace with "lock negation"... this is not an action, it's whether the gate must
  // be "locked" or "unlocked" for this reply to be locked or unlocked
  condition: "none" | "locked" | "unlocked";
}

export interface PlayerReplies extends BaseNodeData {
  // FIXME: maybe shouldn't be allowed to be undefined?
  speaker: number | undefined;
  replies: PlayerReply[];
}

export const defaultPlayerRepliesProps: PlayerReplies = {
  speaker: undefined,
  replies: [
    {
      text: "",
      // FIXME: note, people may want compound boolean checks...
      lockVariable: undefined,
      condition: "none",
    },
  ],
};

export interface Goto extends BaseNodeData {
  target: string;
}

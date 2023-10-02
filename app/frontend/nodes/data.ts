export interface BaseNodeData {
  label: string | undefined;
}

// FIXME: move to common/
export interface DialogueEntry {
  speakerIndex: number;
  specificPortraitUrl?: string;
  title?: string;
  text: string;
  customData?: any;
}

export interface Lock {
  variable: string;
  action: "lock" | "unlock";
}

// FIXME: rename to function call?
export interface Emit {
  function: string;
}

export interface RandomSwitch {
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
  lockAction: "none" | "lock" | "unlock";
}

export interface PlayerReplies {
  replies: PlayerReply[];
}

export const defaultPlayerRepliesProps: PlayerReplies = {
  replies: [
    {
      text: "",
      // FIXME: note, people may want compound boolean checks...
      lockVariable: undefined,
      lockAction: "none",
    },
  ],
};


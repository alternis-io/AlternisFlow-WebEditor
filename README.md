# Alternis

Alternis is a tool/app and library for designing and then playing interactive
dialogue in various application frameworks such as game engines and the web.

It consumes the [library repository](/FIXME) via a submodule.

The web app is built using [Vite](/FIXME), React, [react-flow](/FIXME),
and [PouchDB](/FIXME). It imports the web assembly version of the
alternis library to play back dialogues in the editor. It is designed to be
local-first (and today is actually local-only).

## Contributing

Please submit an issue or PR with feature requests.

## TODO

- There is a need for compound boolean conditions when gating replies.
  Either gate nodes should be introduced with boolean operation nodes, or
  a separate editor for conditions may need to be introduced which opens when
  editing a gate.
- better data management like exporting all projects at once

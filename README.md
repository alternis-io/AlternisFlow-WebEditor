
## Organization

### Dialogue Engine

#### persistence format

To start, a JSON file for maximum readability

#### C API

We probably need a function prefix

- `set_allocators(malloc, free, realloc)`

- `dialogue_create_ctx_builder_from_json(json: string) DialogueContext | Error`
  loads a json dialogue file to create an incomplete dialogue context that must be "completed"

- `dialogue_ctx_builder_set_callback(DialogueContext, name: string, callback: () => void) DialogueContextBuilder | Error`
  set a callback in a dialogue context builder

- `dialogue_ctx_builder_complete() DialogueContext | Error`
  create a dialogue context from the builder, error if it wasn't properly set up (e.g. callbacks not set)

- `dialogue_ctx_character_id_by_name(ctx: DialogueContext, name: string) u32`
  get the id of a character from their name

- `try_enter_dialogue(ctx: DialogueContext, Character: u32) ?DialogueStep`
  tries to open a dialogue with a character, possibly returning the resulting dialogue
  response and continuation options

- ... we also need optional debug inspection APIs to support a debugger

#### Game Engine Plugins

##### Unreal Engine

- create Unreal Engine plugin, publish in unreal engine marketplace

##### Unity

- idk, publish in unity marketplace

##### Godot

- use GDNative

### App

#### Frontend

- react
- react-flow
- vite

##### Mike's pipe dream

- imgui + imgui nodes

#### Backend

- postgreSQL
- SQLite for local no-hassle development
- Vagrant/Docker for local debugging of production environment?
- express.js REST API prototype

##### Mike's pipe dream

- use IMGUI in the browser, and its nodes extension

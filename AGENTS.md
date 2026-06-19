# Agent Instructions

## Run a project

**When the user message contains `run <project-name> with prompt`, follow this workflow first — before writing any code.**

### Trigger format

```
run <project-name> with prompt <prompt-path> using <model-slug>
```

**`<model-slug>` is required.** If omitted, ask before starting.

Example:
```
run football-simulation with prompt projects/football-simulation/prompts/p01-baseline.md using composer2.5
```

### Model slugs (use exactly)

| Model | Slug |
|-------|------|
| GPT 5.5 | `GPT5.5` |
| GPT 5.3 Codex | `GPT5.3Codex` |
| Composer 2.5 | `composer2.5` |
| Claude 4.5 Sonnet | `claude4.5sonnet` |
| Claude 4.6 Sonnet | `claude4.6sonnet` |
| Claude Opus 4.8 | `claudeopus4.8` |
| Gemini 3 Flash | `gemini3flash` |
| Gemini 3.1 Pro | `gemini3.1pro` |

If the model is not listed, ask the user for a slug before proceeding.

### 1. Resolve paths

- Project: `projects/<project-name>/`
- Prompt file: path given by user
- Prompt slug: filename without `.md` (e.g. `p01-baseline`)
- Model slug: from trigger or table above
- Runs dir: `projects/<project-name>/runs/` — create if missing

### 2. Create run folder

**Name:** `dd-mm-yyyy-r##-<prompt-slug>[<model-slug>]`

| Part | Rule |
|------|------|
| `dd-mm-yyyy` | Today's date. Always `DD-MM-YYYY` with zero-padded day/month (e.g. `19-06-2026`). Never ISO or US format. |
| `r##` | Next run number for this prompt + model. List `runs/`, match `*-r??-<prompt-slug>[<model-slug>]`, take highest `r##`, add 1. First = `r01`. |
| `<prompt-slug>` | Exact prompt filename, no extension |
| `[<model-slug>]` | From trigger — exact match to table above |

Examples:
- `19-06-2026-r01-p01-baseline[GPT5.5]`
- `19-06-2026-r01-p01-baseline[composer2.5]`
- `19-06-2026-r02-p01-baseline[composer2.5]` (second run, same model + prompt)

### 3. Populate run folder

Create `projects/<project-name>/runs/<run-folder>/`:

```
<run-folder>/
├── prompt.md      # verbatim copy of source prompt
├── issues.md      # problems, failures, blockers
├── notes.md       # observations, decisions, trade-offs
└── output/        # all generated code and assets
```

### 4. Output rules

- **All deliverables go in `output/`** — nothing in project root or prompt dirs.
- **`output/index.html` must exist** and open in a browser without a build step.
- JS/CSS/assets stay under `output/` (subfolders OK).
- Relative paths only — no absolute paths or external build commands required.

### 5. Execute

1. Read `projects/<project-name>/project-brief.md` and the source prompt.
2. Create run folder and copy prompt → `prompt.md`.
3. Init `issues.md` and `notes.md` (header line is fine).
4. Build the deliverable into `output/`.
5. Log failures → `issues.md`. Log anything worth comparing → `notes.md`.

### 6. Do not

- Write code before creating the run folder.
- Put artifacts outside the run folder.
- Edit the source prompt file.
- Guess the model slug — use the table or ask.
- Skip `output/index.html` for web projects.

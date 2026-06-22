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
| GLM 5.2 | `GLM5.2` |
| GPT 5.5 | `GPT5.5` |
| Composer 2.5 | `composer2.5` |
| Claude Opus 4.8 | `claudeopus4.8` |

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
├── prompt.md      # always — verbatim copy of source prompt
├── output/        # always — all generated code and assets
├── issues.md      # only if there are problems, failures, or blockers
└── notes.md       # only if there are observations worth recording
```

### 4. Output rules

- **All deliverables go in `output/`** — nothing in project root or prompt dirs.
- **`output/index.html` must exist** and open in a browser without a build step.
- JS/CSS/assets stay under `output/` (subfolders OK).
- Relative paths only — no absolute paths or external build commands required.

### 5. Execute

1. Read `projects/<project-name>/project-brief.md` and the source prompt.
2. Create run folder, copy prompt → `prompt.md`, create `output/`.
3. Build the deliverable into `output/` **from scratch** — see [Benchmark isolation](#benchmark-isolation).
4. Create `issues.md` only if something failed or needs follow-up.
5. Create `notes.md` only if there is something worth comparing across runs.

### Benchmark isolation

Each run must be an independent implementation. Prior runs exist only for numbering and comparison — not as reference code.

**Allowed inputs (read these only):**

- `projects/<project-name>/project-brief.md`
- The source prompt file (then copy verbatim to this run's `prompt.md`)
- Assets explicitly linked in the prompt (e.g. `reference-images/`)

**When listing `runs/` for the next `r##`:** read directory names only. Do not open, search, grep, or read any file inside existing run folders.

**Forbidden during execution:**

- Reading or searching under `projects/<project-name>/runs/` except directory listing for run numbering
- Copying, adapting, or taking inspiration from any prior run's `output/`, `issues.md`, or `notes.md`
- Codebase search or semantic search scoped to `runs/` or that surfaces prior run code

Write all code only into the current run's `output/`. After the run folder exists, you may read files you created in **this** run's `output/` to fix or iterate — never sibling runs.

### 6. Do not

- Write code before creating the run folder.
- Put artifacts outside the run folder.
- Edit the source prompt file.
- Guess the model slug — use the table or ask.
- Skip `output/index.html` for web projects.
- Create empty `issues.md` or `notes.md`.
- Read or reuse code from any other run folder (see [Benchmark isolation](#benchmark-isolation)).

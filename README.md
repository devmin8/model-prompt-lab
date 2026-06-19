# Model Prompt Lab

Test prompts across AI models and compare outputs side by side.

## Structure

```
model-prompt-lab/
├── AGENTS.md                          # agent workflow (read by Cursor agents)
└── projects/
    └── <project-name>/
        ├── project-brief.md           # what the project is
        ├── prompts/                   # prompt variants (p01-baseline.md, …)
        ├── reference-images/          # optional assets for prompts
        └── runs/                      # generated per execution
            └── DD-MM-YYYY-r##-<prompt>[<model>]/
                ├── prompt.md          # copy of prompt used
                ├── output/            # model's code (index.html for web)
                ├── issues.md          # only if problems occurred
                └── notes.md           # only if worth recording
```

## Run a project

Tell any agent:

```
run <project-name> with prompt <prompt-path> using <model-slug>
```

Example:

```
run football-simulation with prompt projects/football-simulation/prompts/p01-baseline.md using composer2.5
```

Creates: `projects/football-simulation/runs/19-06-2026-r01-p01-baseline[composer2.5]/`

Run the same command with different `using <model-slug>` values to compare models. Re-run the same model + prompt to increment `r01` → `r02`.

Model slugs: see [AGENTS.md](AGENTS.md).

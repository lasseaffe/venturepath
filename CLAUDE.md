@APPLE_COMPLIANCE.md

## MANDATORY: Task Logging

**This rule is non-negotiable and must never be skipped.**

After EVERY successfully completed task — no exceptions — append an entry to:
`C:\Users\lasse\Desktop\venturepath\logs\`

Rules:
- One log file per session, named `YYYY-MM-DD.md` (use today's date)
- Append (never overwrite) — multiple tasks in one day go in the same file
- Write the entry BEFORE reporting the task as done to the user
- If the logs folder does not exist, create it first
- A task is "complete" when code is written, a bug is fixed, a feature is added, a file is changed — any meaningful work

Entry format:
```
## [HH:MM] <short task title>
- What was done (bullet points)
- Files changed
```

**Failure to log is a critical error. Do not skip this step under any circumstances.**

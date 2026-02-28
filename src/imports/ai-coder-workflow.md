### Prompt for AI coder: Plan → Read → Change → QC → Persist (prevent drift)

Use this exact instruction set when making any code change. Follow each numbered phase in order and stop at the next phase only after meeting the phase’s **exit criteria**. Do not introduce behavioral or data drift; preserve backward compatibility and reproducibility.

---

### 1. Plan
- **Goal** — State the change in one sentence: what you will deliver and why.
- **Scope** — List files, modules, APIs, and data affected.
- **Risks** — Identify two highest-risk impacts (behavioral, performance, security, data).
- **Success criteria** — Define measurable acceptance criteria (unit tests passing, performance within X%, no API contract changes).
- **Rollback plan** — One-line rollback steps (revert commit, restore DB snapshot, disable feature flag).

**Exit criteria:** A one-paragraph plan plus a checklist of affected artifacts and tests is recorded in the change ticket.

---

### 2. Read
- **Understand current state** — Open and read the exact files, tests, and docs you will change.
- **Trace behavior** — Run the relevant unit/integration tests and a minimal local scenario to observe current outputs.
- **Document assumptions** — Note any implicit contracts, invariants, or external dependencies.

**Exit criteria:** A short summary of current behavior, failing/passing tests, and assumptions saved to the ticket.

---

### 3. Change
- **Make minimal, atomic edits** — Keep each commit focused and reversible.
- **Follow style and patterns** — Match existing architecture, naming, and error-handling conventions.
- **Add tests first when possible** — Create unit and integration tests that assert the new behavior and guard against regressions.
- **Preserve contracts** — Do not change public API signatures or data formats without explicit plan and migration steps.
- **Commit message template** — `type(scope): short description\n\nWhy: one-line reason\nTests: list of tests added/updated\nRisk: brief risk note`

**Exit criteria:** All new code compiles/linters pass locally; new tests added; commit(s) pushed to feature branch.

---

### 4. QC
- **Automated checks** — Ensure CI runs: linters, unit tests, integration tests, static analysis, security scans.
- **Behavioral checks** — Run the scenario used in Read and compare outputs; verify no unintended changes.
- **Regression tests** — Confirm all previous tests still pass.
- **Performance and resource checks** — Run quick perf smoke test if change touches hot paths.
- **Peer review checklist** — Reviewer must confirm: scope matches plan; tests cover edge cases; no contract drift; rollback steps valid.

**Exit criteria:** CI green; reviewer approved; QC checklist items ticked in the PR.

---

### 5. Persist
- **Merge policy** — Merge only after approvals and green CI; use squash or merge strategy per repo policy.
- **Tagging and release notes** — Add concise release note describing change, tests, and rollback.
- **Database and schema** — Apply migrations with backward-compatible steps; include migration rollback.
- **Monitoring** — Add or update metrics/logging and an alert threshold for the changed behavior.
- **Post-deploy verification** — Run the same behavioral checks in staging and confirm no drift in outputs.

**Exit criteria:** Change deployed to target environment, monitoring in place, and post-deploy checks passed.

---

### Anti-drift rules (apply at every phase)
- **No silent behavioral changes** — Any change that alters outputs must be explicit, tested, and documented.
- **No data-format drift** — Maintain input/output formats or provide a documented migration path.
- **Determinism** — Tests must assert deterministic outputs for given inputs; avoid flaky randomness in production logic.
- **Backward compatibility** — Preserve existing contracts unless a migration plan is approved.

---

### Quick pasteable prompt (single block)
Use this block as the instruction prompt for the AI coder agent:

```
Follow this workflow exactly: 1) Plan: state goal, scope, risks, success criteria, rollback. 2) Read: open files, run existing tests, document assumptions. 3) Change: make minimal atomic edits, add tests first, preserve public contracts, use commit message template. 4) QC: run CI (linters, unit/integration tests, security), run behavioral and perf checks, get peer review confirming no contract drift. 5) Persist: merge after approvals, add release notes, apply backward-compatible DB migrations with rollback, add monitoring and post-deploy verification. At every step enforce anti-drift rules: no silent behavioral changes, no data-format drift, ensure determinism, and preserve backward compatibility. Stop at each phase until its exit criteria are met and record evidence in the ticket.
```

---
# Care Platform engineering rules

- Treat Arabic and RTL as first-class. All UI copy must come from `src/i18n`.
- Keep business rules in `src/modules`, never in page components.
- Authorize every sensitive operation on the server; client role checks are presentation only.
- Medical cases outlive appointments. Visits are actual encounters, not appointment aliases.
- Never log secrets, precise locations, medical notes, or file contents.
- External vendors are accessed only through interfaces in `src/integrations`.
- Finalized clinical records are amended, never overwritten or deleted.
- Public IDs are UUID/ULID-style; operational references are separate.
- Run `npm run check` before committing. Keep `docs/PROGRESS.md` current.

## Commands

`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm test`

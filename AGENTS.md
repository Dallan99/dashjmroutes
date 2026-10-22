<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Weekly operational import deletion uses the security-invoker `delete_weekly_import_safely` RPC with confirmed metadata/counts; keep deletion and same-week version promotion atomic so RLS failures never leave partially deleted imports.
- Keep deletion confirmation separate from dashboard filters and accessible through weekly import history, including when no current version exists, so users can choose a specific saved version.
- Validate deletion SQL in isolated PGlite fixtures using the dedicated Vitest configuration, so rollback and version rules can be tested without deleting operational records.

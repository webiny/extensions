# Generate AI summary — Headless CMS bulk action

Adds a "Generate AI summary" bulk action to the Products content-entry list. Selecting
products and running it generates a short marketing summary for each — in a **background
task** — by delegating to AI Power Ups.

Requires Webiny **6.5.0** or newer, and the **AI Power Ups** extension with a provider
configured in its settings.

## Why via AI Power Ups (not a raw AI call)

`processData` calls `CmsGenerateEntryContentUseCase` (from `webiny/api/ai-powerups`). That
use case uses the provider the user configured, and applies an optional Project / Writer
Persona / Reader Persona — the user's own instructions, configured once — so this
extension never picks models, handles API keys, or hardcodes prompts.

The Admin button is a dropdown of those configured contexts (fetched via
`GetSettingsFeature` from `webiny/admin/ai-powerups`): pick a Project, a Writer Persona, a
Reader Persona, or "Default". The chosen id is forwarded through the action `data`.

## Convergence with re-runs

The tasks engine re-calls `loadData` until it returns zero entries. Instead of a permanent
"done" flag (which would block re-running), this uses a per-run token: each click makes a
fresh `runId`, the Admin action nests `values: { aiSummarizedRun_not: <runId> }` in
`where` (custom-field filters go under `values` in the GraphQL input; `loadData` flattens
them to the storage form), and `processData` stamps the entry with it. So a run ends once every targeted entry is
stamped — but the next click uses a new token, so the same entries can be summarized
again, no manual reset.

## Real-time toasts

`processData` emits a `cms.product.aiSummaryGenerated` websocket message per entry;
`admin/AiSummaryGeneratedEventHandler.ts` toasts on receipt.

## Files

- `ProductModel.ts` — demo Product model (`aiSummary`, `aiSummarizedRun`).
- `api/GenerateAiSummaryBulkAction.ts` — the bulk action (the background task body).
- `admin/GenerateAiSummaryAction.tsx` — the bulk-action button (context dropdown).
- `admin/AiSummaryGeneratedEventHandler.ts` — websocket listener (toast).
- `admin/Extension.tsx` — registers the button + listener.
- `GenerateAiSummaryBulkActionExtension.tsx` — extension entry point.

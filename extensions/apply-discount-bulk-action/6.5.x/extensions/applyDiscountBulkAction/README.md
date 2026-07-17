# Apply Discount — Headless CMS bulk action

Adds an "Apply -10%" bulk action to the Products content-entry list. Selecting products
and running it reduces each one's price by 10% in a **background task**.

Requires Webiny **6.5.0** or newer.

## How it works

A bulk action is a custom `EntriesBulkAction` — just two methods:

- `loadData` — which entries to process (the tasks engine paginates this).
- `processData` — what to do to each one (runs server-side, in batches).

For every registered `EntriesBulkAction`, Webiny automatically generates the background
task (a list task + a process task) and a GraphQL mutation to trigger it. You describe
*what* to do; the tasks system handles batching, retries, and resuming near the Lambda
timeout.

The Admin button (`admin/ApplyDiscountAction.tsx`) hands the selection to the API via
`BulkActionUseCase` — the browser never loops over entries; the work runs in the
background, so you can navigate away.

## Notable details

- **Convergence.** The engine re-calls `loadData` until it returns zero entries, so the
  filter must exclude already-processed ones — otherwise the task never finishes. Here
  `loadData` filters `values.onSale_not: true` and `processData` sets `onSale: true`. Turn
  a product's **On sale** switch back off to discount it again.
- **Storage where paths.** In the bulk-action list path, custom fields are namespaced
  under `values.` (`values.onSale_not`), while system fields (`id`, `status`) are
  top-level. A bare `onSale_not` throws "There is no field with the fieldId onSale".
- **Real-time toasts.** `processData` emits a `cms.product.discountApplied` websocket
  message per entry; `admin/DiscountAppliedEventHandler.ts` toasts on receipt.

## Files

- `ProductModel.ts` — demo Product model (`price`, `onSale`).
- `api/ApplyDiscountBulkAction.ts` — the bulk action (the background task body).
- `admin/ApplyDiscountAction.tsx` — the bulk-action button.
- `admin/DiscountAppliedEventHandler.ts` — websocket listener (toast).
- `admin/Extension.tsx` — registers the button + listener.
- `ApplyDiscountBulkActionExtension.tsx` — extension entry point.

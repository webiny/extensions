import React from "react";
import { Admin, Api } from "webiny/extensions";

/**
 * "Generate AI summary" bulk action on Products.
 *
 * A Headless CMS bulk action that runs as a background task and delegates generation to
 * AI Power Ups (the provider + Project / Writer Persona / Reader Persona the user
 * configured). Registers the API-side bulk action, the Admin-side button (with a context
 * dropdown + a websocket listener that toasts per entry), and a demo Product model.
 *
 * Requires the AI Power Ups extension with a provider configured in its settings.
 */
export const GenerateAiSummaryBulkActionExtension = () => {
    return (
        <>
            <Api.Extension
                src={"/extensions/generateAiSummaryBulkAction/api/GenerateAiSummaryBulkAction.ts"}
            />
            <Admin.Extension src={"/extensions/generateAiSummaryBulkAction/admin/Extension.tsx"} />

            {/* This model is registered just for demo purposes. */}
            <Api.Extension src={"/extensions/generateAiSummaryBulkAction/ProductModel.ts"} />
        </>
    );
};

import React from "react";
import { Admin, Api } from "webiny/extensions";

/**
 * "Apply Discount" bulk action on Products.
 *
 * A Headless CMS bulk action is just two methods (loadData + processData); Webiny runs it
 * as a background task. This extension registers the API-side bulk action, the Admin-side
 * button (+ a websocket listener that toasts per processed entry), and a demo Product model.
 */
export const ApplyDiscountBulkActionExtension = () => {
    return (
        <>
            {/* Backend: the bulk action (Webiny generates the background task from it). */}
            <Api.Extension
                src={"/extensions/applyDiscountBulkAction/api/ApplyDiscountBulkAction.ts"}
            />

            {/* Admin: the bulk-action button + websocket listener. */}
            <Admin.Extension src={"/extensions/applyDiscountBulkAction/admin/Extension.tsx"} />

            {/* This model is registered just for demo purposes. */}
            <Api.Extension src={"/extensions/applyDiscountBulkAction/ProductModel.ts"} />
        </>
    );
};

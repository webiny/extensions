import React from "react";
import { Api, Admin } from "webiny/extensions";

export const ProductEntryListColumnsExtension = () => {
    return (
        <>
            <Admin.Extension
                src={"/extensions/productEntryListColumns/ProductEntryListColumns.tsx"}
            />

            {/* This model is registered just for demo purposes. */}
            <Api.Extension src={"/extensions/productEntryListColumns/ProductModel.ts"} />
        </>
    );
};

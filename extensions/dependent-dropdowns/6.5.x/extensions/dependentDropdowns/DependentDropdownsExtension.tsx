import React from "react";
import { Admin, Api } from "webiny/extensions";

/**
 * One dropdown populated from another, in a Headless CMS entry form.
 *
 * A code-defined model can't express "the options of this field depend on the value of
 * that one", because that's a UI concern. So this is split in two: the model declares
 * the fields, and an Admin plugin fills the dependent list in.
 */
export const DependentDropdownsExtension = () => {
    return (
        <>
            {/* This model is registered just for demo purposes. */}
            <Api.Extension src={"/extensions/dependentDropdowns/DependentDropdownsModel.ts"} />

            {/* Admin: populates `city` from whatever `country` currently holds. */}
            <Admin.Extension
                src={"/extensions/dependentDropdowns/DependentDropdownsModifier.tsx"}
            />
        </>
    );
};

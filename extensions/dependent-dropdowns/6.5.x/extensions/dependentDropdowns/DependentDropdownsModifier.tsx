import React from "react";
import { createFeature, RegisterFeature } from "webiny/admin";
import { ContentEntryFormModelModifier } from "webiny/admin/cms/entry/editor";
import type { IFormModel } from "@webiny/app-admin/features/formModel/abstractions.js";
import type { CmsModel } from "@webiny/app-headless-cms/types.js";
import { DEPENDENT_DROPDOWNS_MODEL_ID } from "./DependentDropdownsModel.js";
import { CityCatalogue } from "./CityCatalogue.js";

/**
 * Populates the `city` dropdown from whatever `country` currently holds, with the city
 * list fetched rather than hardcoded.
 *
 * Note this redeclares the field through `form.fields()` rather than reaching for
 * `form.traverse()`. By the time a modifier runs, the form is already built, and
 * builders hand their config to the field by copy, so mutating a builder at this point
 * changes nothing. Redeclaring rebuilds the field, which does take effect.
 *
 * Three things to notice:
 *
 *   1. `.options(cb)` makes the city list reactive. The callback re-runs whenever
 *      anything it read changes — the country field, and the catalogue's observable
 *      state — so the dropdown repaints on its own when the fetch resolves. Nothing
 *      has to push the result back into the form.
 *   2. `.disabledWhen()` keeps the field closed until the catalogue arrives. Without it,
 *      "still loading" looks exactly like "this country has no cities".
 *   3. `.addAfterChange()` on country clears a city the new country doesn't have.
 *      Without it, picking Italy + Milan then switching to Germany leaves "milan" in
 *      the field: gone from the dropdown, but still submitted.
 */
class DependentDropdownsModifierImpl implements ContentEntryFormModelModifier.Interface {
    private catalogue = new CityCatalogue();

    modifyForm(form: IFormModel, model: CmsModel): void {
        if (model.modelId !== DEPENDENT_DROPDOWNS_MODEL_ID) {
            return;
        }

        void this.catalogue.load();

        form.fields(fields => ({
            city: fields
                .text()
                .label("City")
                .disabledWhen(() => !this.catalogue.isLoaded)
                .options(({ form }) => this.catalogue.forCountry(form.field("country").getValue()))
        }));

        form.field("country").addAfterChange((value, { form }) => {
            const allowed = this.catalogue.forCountry(value).map(city => city.value);
            const city = form.field("city");
            const current = city.getValue();

            if (current && !allowed.includes(String(current))) {
                city.setValue(null);
            }
        });
    }
}

const DependentDropdownsFeature = createFeature({
    name: "DependentDropdownsModifier",
    register(container) {
        container.register(
            ContentEntryFormModelModifier.createImplementation({
                implementation: DependentDropdownsModifierImpl,
                dependencies: []
            })
        );
    }
});

export default () => {
    return <RegisterFeature feature={DependentDropdownsFeature} />;
};

import React from "react";
import { createFeature, RegisterFeature } from "webiny/admin";
import { ContentEntryFormModelModifier } from "webiny/admin/cms/entry/editor";
import type { IFormModel } from "@webiny/app-admin/features/formModel/abstractions.js";
import type { CmsModel } from "@webiny/app-headless-cms/types.js";
import { DEPENDENT_DROPDOWNS_MODEL_ID } from "./DependentDropdownsModel.js";

const CITIES: Record<string, { label: string; value: string }[]> = {
    hr: [
        { label: "Zagreb", value: "zagreb" },
        { label: "Split", value: "split" },
        { label: "Rijeka", value: "rijeka" }
    ],
    de: [
        { label: "Berlin", value: "berlin" },
        { label: "Hamburg", value: "hamburg" },
        { label: "Munich", value: "munich" }
    ],
    uk: [
        { label: "London", value: "london" },
        { label: "Manchester", value: "manchester" },
        { label: "Bristol", value: "bristol" }
    ]
};

const citiesFor = (country: unknown) => CITIES[String(country ?? "")] ?? [];

/**
 * Populates the `city` dropdown from whatever `country` currently holds.
 *
 * Note this redeclares the field through `form.fields()` rather than reaching for
 * `form.traverse()`. By the time a modifier runs, the form is already built, and
 * builders hand their config to the field by copy, so mutating a builder at this
 * point changes nothing. Redeclaring rebuilds the field, which does take effect.
 *
 * Two halves to the behaviour, and the second one is the half people forget:
 *
 *   1. `.options(cb)` makes the city list reactive. The callback re-runs whenever
 *      something it read changes, so picking a country repaints the city list.
 *      Passing options also flips the renderer from a text input to a select.
 *   2. `.afterChange()` on country clears a city the new country doesn't have.
 *      Without it, picking Croatia + Split then switching to Germany leaves
 *      "split" in the field: gone from the dropdown, but still submitted.
 */
class DependentDropdownsModifierImpl implements ContentEntryFormModelModifier.Interface {
    modifyForm(form: IFormModel, model: CmsModel): void {
        if (model.modelId !== DEPENDENT_DROPDOWNS_MODEL_ID) {
            return;
        }

        form.fields(fields => ({
            city: fields
                .text()
                .label("City")
                .options(({ form }) => citiesFor(form.field("country").getValue()))
        }));

        form.field("country").addAfterChange((value, { form }) => {
            const allowed = citiesFor(value).map(city => city.value);
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

import { ModelFactory } from "webiny/api/cms/model";

export const DEPENDENT_DROPDOWNS_MODEL_ID = "storeLocation";

/**
 * The model side of the dependent dropdowns example. It declares two plain text
 * fields and nothing else: `country` carries its own fixed list of values, while
 * `city` deliberately has none.
 *
 * Which cities belong to which country is a UI concern, so it lives in the admin
 * plugin (see DependentDropdownsModifier.tsx). A code model can't express "options
 * of this field depend on the value of that one".
 */
class DependentDropdownsModelImpl implements ModelFactory.Interface {
    async execute(builder: ModelFactory.Builder) {
        return [
            builder
                .public({
                    modelId: DEPENDENT_DROPDOWNS_MODEL_ID,
                    name: "Store Location",
                    group: "ungrouped"
                })
                .description("Example: a city dropdown populated from the selected country.")
                .fields(fields => ({
                    name: fields.text().label("Name").required("Name is required"),
                    country: fields
                        .text()
                        .label("Country")
                        .predefinedValues([
                            { label: "Croatia", value: "hr" },
                            { label: "Germany", value: "de" },
                            { label: "United Kingdom", value: "uk" }
                        ]),
                    /**
                     * No values here on purpose. The admin plugin fills them in based on
                     * whatever `country` currently holds, matching on the field name.
                     */
                    city: fields.text().label("City")
                }))
                .layout([["name"], ["country", "city"]])
                .titleFieldId("name")
                .singularApiName("StoreLocation")
                .pluralApiName("StoreLocations")
        ];
    }
}

export const DependentDropdownsModel = ModelFactory.createImplementation({
    implementation: DependentDropdownsModelImpl,
    dependencies: []
});

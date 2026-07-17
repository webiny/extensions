import { ModelFactory } from "webiny/api/cms/model";

/**
 * Minimal Product model for the demo — the "Apply Discount" bulk action reduces `price`
 * and flips `onSale` (which also drives the task's convergence filter).
 */
class ProductModelImpl implements ModelFactory.Interface {
    async execute(builder: ModelFactory.Builder) {
        return [
            builder
                .public({ modelId: "product", name: "Product", group: "ungrouped" })
                .description("Demo products for the Apply Discount bulk action.")
                .fields(fields => ({
                    name: fields
                        .text()
                        .renderer("textInput")
                        .label("Name")
                        .required("Name is required"),
                    sku: fields.text().renderer("textInput").label("SKU"),
                    price: fields
                        .number()
                        .renderer("numberInput")
                        .label("Price")
                        .required("Price is required")
                        .gte(0, "Price must be greater than or equal to 0"),
                    onSale: fields
                        .boolean()
                        .renderer("switch")
                        .label("On sale")
                        .help(
                            "Set by the \"Apply Discount\" bulk action. Turn off to make the product eligible for a discount again."
                        )
                }))
                .layout([["name"], ["sku"], ["price", "onSale"]])
                .titleFieldId("name")
                .singularApiName("Product")
                .pluralApiName("Products")
        ];
    }
}

export const ProductModel = ModelFactory.createImplementation({
    implementation: ProductModelImpl,
    dependencies: []
});

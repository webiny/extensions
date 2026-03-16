import { TenantModelExtension as ModelExtension } from "webiny/api/tenant-manager";

class TenantModelExtension implements ModelExtension.Interface {
    execute(extension: ModelExtension.Extension) {
        extension
            .fields(fields => ({
                websiteTitle: fields
                    .text()
                    .label("Website Title")
                    .description("Enter a website title")
                    .renderer("textInput"),
                primaryColor: fields
                    .text()
                    .label("Primary Color")
                    .description("Enter a color code (e.g., #000000)")
                    .renderer("textInput")
                    .defaultValue(""),
                additionalColors: fields
                    .text()
                    .list()
                    .label("Additional Colors")
                    .description("Enter a color code (e.g., #000000)")
                    .defaultValue([])
                    .renderer("textInput"),
                font: fields
                    .text()
                    .label("Font")
                    .description("Select a font")
                    .renderer("radioButtons")
                    .predefinedValues([
                        { value: "InterVariable, sans-serif", label: "Inter" },
                        { value: "Menlo, Consolas, Monaco, monospace", label: "Menlo" },
                        { value: "Roboto, sans-serif", label: "Roboto" }
                    ])
            }))
            .layout([["websiteTitle"], ["primaryColor"], ["additionalColors"], ["font"]]);
    }
}

export default ModelExtension.createImplementation({
    implementation: TenantModelExtension,
    dependencies: []
});

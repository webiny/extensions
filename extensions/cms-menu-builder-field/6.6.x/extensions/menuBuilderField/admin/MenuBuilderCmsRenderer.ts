import { CmsFieldRenderer } from "webiny/admin/cms/model";
import type { CmsModelField } from "webiny/admin/cms";

/**
 * Makes the menu builder selectable as the renderer of any repeatable object field, from the
 * "Appearance" tab of the field editor.
 */
class MenuBuilderCmsRendererImpl implements CmsFieldRenderer.Interface {
    rendererName = "menuBuilder";
    formRenderer = "menuBuilder";
    name = "Menu Builder";
    description = "A drag-and-drop tree for menus and other ordered, nested lists.";

    canUse({ field }: { field: CmsModelField }) {
        return field.type === "object" && !!field.list;
    }

    buildSettingsForm(form: CmsFieldRenderer.FormBuilder) {
        /**
         * The defaults match the field IDs the renderer looks for on its own, so picking the
         * renderer and saving is enough for a field whose children follow the usual shape.
         */
        form.fields(fields => ({
            labelField: fields
                .text()
                .label("Title field")
                .defaultValue("label")
                .help("Field ID whose value is shown as the item's title."),
            subtitleField: fields
                .text()
                .label("Subtitle field")
                .defaultValue("url")
                .help("Field ID shown next to the title, greyed out."),
            depthField: fields
                .text()
                .label("Nesting field")
                .defaultValue("depth")
                .help(
                    "Field ID of a number field on each item that holds the nesting level. " +
                        "Nesting stays off until that field exists. Clear this for a flat list."
                ),
            maxDepth: fields
                .number()
                .label("Maximum nesting depth")
                .defaultValue(2)
                .help("0 is the top level, so 2 allows three levels."),
            addItemLabel: fields.text().label('"Add item" button label')
        }));

        form.layout(layout => [
            layout.row("labelField", "subtitleField"),
            layout.row("depthField", "maxDepth"),
            layout.row("addItemLabel")
        ]);
    }
}

export const MenuBuilderCmsRenderer = CmsFieldRenderer.createImplementation({
    implementation: MenuBuilderCmsRendererImpl,
    dependencies: []
});

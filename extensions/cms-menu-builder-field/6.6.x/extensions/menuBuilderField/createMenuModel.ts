/**
 * Creates the demo Menu model through the CMS manage API, the same way the model editor does, so
 * the model lives in the database and can be edited in the admin. Handy for switching the Menu
 * items field between the stock accordion renderer and the menu builder to compare the two.
 *
 *   npx tsx extensions/menuBuilderField/createMenuModel.ts <api-token>
 *
 * The endpoint defaults to the local API. Override with API_URL. The token can also come from
 * API_TOKEN instead of the argument.
 */

const API_URL = process.env.API_URL || "http://localhost:3002";
const API_TOKEN = process.argv[2] || process.env.API_TOKEN;

const menuItemFields = [
    {
        id: "label",
        fieldId: "label",
        storageId: "text@label",
        type: "text",
        label: "Label",
        renderer: { name: "text-input" },
        validation: [{ name: "required", message: "Label is required.", settings: {} }]
    },
    {
        id: "url",
        fieldId: "url",
        storageId: "text@url",
        type: "text",
        label: "URL",
        placeholder: "/about-us",
        renderer: { name: "text-input" }
    },
    {
        id: "openInNewTab",
        fieldId: "openInNewTab",
        storageId: "boolean@openInNewTab",
        type: "boolean",
        label: "Open in a new tab",
        renderer: { name: "boolean-input" }
    },
    {
        /**
         * Nesting is stored per item: 0 is a top-level item, 1 sits under the closest item above
         * it with depth 0, and so on. The menu builder owns this value, so the `hidden` renderer
         * keeps it out of the item's own form while leaving it in the entry.
         */
        id: "depth",
        fieldId: "depth",
        storageId: "number@depth",
        type: "number",
        label: "Depth",
        renderer: { name: "hidden" },
        settings: { defaultValue: 0 }
    }
];

const model = {
    name: "Menu",
    modelId: "menu",
    singularApiName: "Menu",
    pluralApiName: "Menus",
    group: "ungrouped",
    description: "Navigation menus, edited as a tree.",
    titleFieldId: "name",
    layout: [["name", "slug"], ["items"]],
    fields: [
        {
            id: "name",
            fieldId: "name",
            storageId: "text@name",
            type: "text",
            label: "Name",
            help: 'Where this menu is used, for example "Main navigation".',
            renderer: { name: "text-input" },
            validation: [
                { name: "required", message: "Name is required.", settings: {} },
                { name: "minLength", message: "Value is too short.", settings: { value: "2" } },
                { name: "maxLength", message: "Value is too long.", settings: { value: "100" } }
            ]
        },
        {
            id: "slug",
            fieldId: "slug",
            storageId: "text@slug",
            type: "text",
            label: "Slug",
            help: "How the front end asks for this menu, for example main-navigation.",
            placeholder: "main-navigation",
            renderer: { name: "text-input" },
            validation: [
                { name: "required", message: "Slug is required.", settings: {} },
                {
                    name: "unique",
                    message: "A menu with this slug already exists.",
                    settings: {}
                },
                {
                    name: "pattern",
                    message: "Use lowercase letters, numbers and single hyphens.",
                    settings: {
                        preset: "custom",
                        regex: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
                        flags: ""
                    }
                }
            ]
        },
        {
            id: "items",
            fieldId: "items",
            storageId: "object@items",
            type: "object",
            label: "Menu items",
            help: "Drag items to reorder them, or sideways to nest them.",
            list: true,
            /**
             * Swap this for `{ name: "objects-accordion" }` to see the same data in the stock
             * renderer. The field editor's Appearance tab does the same thing.
             */
            renderer: {
                name: "menuBuilder",
                settings: {
                    labelField: "label",
                    subtitleField: "url",
                    depthField: "depth",
                    maxDepth: 2,
                    addItemLabel: "Add menu item"
                }
            },
            settings: {
                fields: menuItemFields,
                layout: [["label", "url"], ["openInNewTab"]]
            }
        }
    ]
};

const MUTATION = /* GraphQL */ `
    mutation CreateMenuModel($data: CmsContentModelCreateInput!) {
        createContentModel(data: $data) {
            data {
                modelId
                name
            }
            error {
                message
                code
                data
            }
        }
    }
`;

const run = async () => {
    if (!API_TOKEN) {
        throw new Error("Pass an API token as the first argument, or set API_TOKEN.");
    }

    const response = await fetch(`${API_URL}/cms/manage`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: API_TOKEN
        },
        body: JSON.stringify({ query: MUTATION, variables: { data: model } })
    });

    const body = await response.json();

    if (body.errors) {
        throw new Error(JSON.stringify(body.errors, null, 2));
    }

    const result = body.data.createContentModel;

    if (result.error) {
        throw new Error(JSON.stringify(result.error, null, 2));
    }

    console.log(`Created model "${result.data.name}" (${result.data.modelId}).`);
};

run().catch(error => {
    console.error(error.message);
    process.exit(1);
});

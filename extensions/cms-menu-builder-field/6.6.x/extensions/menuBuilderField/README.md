# Menu builder field

A custom field renderer for repeatable object fields in the Headless CMS. Instead of a stack of
accordions, the field renders as a compact tree you drag around: up and down to reorder, sideways to
nest.

Pick it in the Appearance tab of any object field that holds multiple values, the same place you
would pick Accordion. The stored data does not change, only the way you edit it.

## Requirements

Webiny 6.6.0 or newer. The renderer uses two things that older versions do not export:
`LayoutNodeRenderer` from `webiny/admin/form`, to render each item's own form inline, and
`CmsFieldRenderer` from `webiny/admin/cms/model`, to offer itself in the field editor.

## Data shape

The tree is stored as a flat list. Each item carries a `depth` number, and its parent is the closest
item above it with a smaller depth. No ids, no parent references, and nothing about the GraphQL API
changes: the field is still a plain object list.

Rebuilding the tree on the front end is one pass over the array with a stack of open parents.

An item therefore needs a number field to hold its level. Give it the `hidden` renderer and it stays
out of the item's form and out of the model editor's field list. Without such a field the list still
reorders, but nesting stays off.

## Settings

The renderer recognises the usual field IDs on its own, so a field whose children are named `label`,
`url` and `depth` works with nothing filled in. Settings override the detection.

| Setting         | What it does                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `labelField`    | Field ID shown as the item's title. Detected from `label`, `title`, `name`, `text`, else the first text field    |
| `subtitleField` | Field ID shown next to the title, greyed out. Detected from `url`, `link`, `href`, `subtitle`                    |
| `depthField`    | Field ID holding the nesting level. Detected from `depth`, `level`, `nesting`, `indent`. Empty means a flat list |
| `maxDepth`      | How deep items may nest. 2 allows three levels                                                                   |
| `addItemLabel`  | Label of the add button                                                                                          |

## Editing

Click a row to open that item's own form underneath it, built from the fields defined on the model.
The row itself stays a single line, so a menu with thirty items is still one screen.

Typing a label into the box at the bottom and pressing Enter appends an item, which beats opening an
accordion for every link you add.

While a row is being dragged it follows the pointer vertically and snaps to whole nesting levels
horizontally, so you can see the level it will land on before you let go. A line marks the slot it
is heading for, indented to that level. Escape cancels the drag and puts the row back.

Drag handles work with the keyboard too. Arrow up and down move an item past its siblings, arrow
left and right change its nesting. Dragging, duplicating and removing all take an item's nested
items with it.

## Trying it

`createMenuModel.ts` creates a demo Menu model through the manage API, the same call the model
editor makes, so the model stays editable in the admin:

```bash
npx tsx extensions/menuBuilderField/createMenuModel.ts <api-token>
```

It has a `name`, a unique `slug` so the front end can ask for a menu by a name it knows, and a
`items` field wired to this renderer. Menus are then fetched with:

```graphql
{
  getMenu(where: { values: { slug: "main-navigation" } }) {
    data {
      name
      items {
        label
        url
        openInNewTab
        depth
      }
    }
  }
}
```

## Using it on a model defined in code

Add the renderer to the registry so `renderer("menuBuilder")` typechecks:

```ts
declare module "webiny/api/cms/model" {
  interface IFieldRendererRegistry {
    menuBuilder: {
      fieldType: "object";
      settings?: {
        labelField?: string;
        subtitleField?: string;
        depthField?: string;
        maxDepth?: number;
        addItemLabel?: string;
      };
    };
  }
}
```

Then define a repeatable object field with a hidden number field for the nesting level:

```ts
items: fields
  .object()
  .list()
  .renderer("menuBuilder", { maxDepth: 2 })
  .label("Menu items")
  .fields(item => ({
    label: item.text().renderer("textInput").label("Label").required("Label is required."),
    url: item.text().renderer("textInput").label("URL"),
    depth: item.number().renderer("hidden").label("Depth").defaultValue(0)
  }));
```

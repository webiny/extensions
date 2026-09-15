# Menu builder field

A custom CMS field renderer for repeatable object fields. Instead of a stack of accordions, the
field renders as a compact tree you drag around: up and down to reorder, sideways to nest.

[See it in action](https://x.com/WebinyCMS/status/2099743551605084409).

`MenuBuilderCmsRenderer.ts` registers the renderer with the CMS, so "Menu Builder" shows up in the
Appearance tab of any object field that holds multiple values. It also declares the settings form.

The renderer itself lives under `presentation/`, split the usual way: `MenuBuilderPresenter.ts`
holds every piece of state and all the tree work and exposes a view model, the components read that
view model and call presenter methods, and `menuTree.ts` keeps the tree maths pure and testable.
`useMenuDrag.ts` is the one place that touches the DOM, measuring rows and following the pointer.

## Requirements

Webiny 6.6.0 or newer. The renderer uses two things that older versions do not export:
`LayoutNodeRenderer` from `webiny/admin/form`, to render each item's own form inline, and
`CmsFieldRenderer` from `webiny/admin/cms/model`, to offer itself in the field editor.

## Data shape

The tree is stored as a flat list. Each item carries a `depth` number, and its parent is the closest
item above it with a smaller depth. No ids, no parent references, and nothing about the GraphQL API
changes: the field is still a plain object list.

Turning it back into a tree on the front end is a short loop over the array.

Leave the nesting field empty and you get a flat list that can only be reordered.

## Fetching a menu

Give the model a unique `slug` field and the front end can ask for a menu by a name it already
knows, instead of hardcoding an entry id:

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

Items come back in editing order, so a single pass with a stack of open parents rebuilds the tree.

## Settings

| Setting         | What it does                                                     |
| --------------- | ---------------------------------------------------------------- |
| `labelField`    | Field ID shown as the item's title. Defaults to first text field |
| `subtitleField` | Field ID shown next to the title, greyed out                     |
| `depthField`    | Field ID holding the nesting level. Empty means a flat list      |
| `maxDepth`      | How deep items may nest. 2 allows three levels                   |
| `addItemLabel`  | Label of the add button                                          |

## Editing

Click a row to open that item's own form underneath it, built from the fields you defined on the
model. The row itself stays a single line, so a menu with thirty items is still one screen.

Typing a label into the box at the bottom and pressing Enter appends an item, which beats opening an
accordion for every link you add.

While a row is being dragged it follows the pointer vertically and snaps to whole nesting levels
horizontally, so you can see the level it will land on before you let go. A line marks the slot it
is heading for, indented to that level. Escape cancels the drag and puts the row back.

Drag handles work with the keyboard too. Arrow up and down move an item past its siblings, arrow
left and right change its nesting.

## Trying it

There is no model to install. Build one in the model editor: add an object field, tick multiple
values, and give it the children `label` (text), `url` (text) and `depth` (number, `hidden`
renderer). Then open its Appearance tab and pick Menu Builder.

Nothing else needs filling in, since the renderer recognises those field IDs on its own. Switching
the same field back to Accordion leaves the data untouched, so the two are easy to compare side by
side.

## Using it on a model defined in code

A code model works too. Add the renderer to the registry so `renderer("menuBuilder")` typechecks:

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
  .renderer("menuBuilder", {
    labelField: "label",
    subtitleField: "url",
    depthField: "depth",
    maxDepth: 2
  })
  .label("Menu items")
  .fields(item => ({
    label: item.text().renderer("textInput").label("Label").required("Label is required."),
    url: item.text().renderer("textInput").label("URL"),
    depth: item.number().renderer("hidden").label("Depth").defaultValue(0)
  }));
```

The `hidden` renderer keeps `depth` out of the item form while leaving the value in the entry, which
is what the builder writes to when you drag something.

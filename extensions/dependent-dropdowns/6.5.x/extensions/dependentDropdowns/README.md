# Dependent dropdowns — one CMS field's options from another's value

Picking a **Country** on a content entry repopulates the **City** dropdown. Switching to a
country that doesn't have the currently selected city clears it.

Requires Webiny **6.5.0** or newer.

## How it works

A code-defined model can't say "the options of this field depend on the value of that
one" — that's a UI concern, decided while someone is filling the form in. So the work is
split:

- `DependentDropdownsModel.ts` declares the fields. `country` carries a fixed list via
  `.predefinedValues()`. `city` deliberately carries none.
- `DependentDropdownsModifier.tsx` is a `ContentEntryFormModelModifier` that fills `city`
  in, per model.

The modifier does two things, and the second is the one that's easy to forget:

```ts
form.fields(fields => ({
  city: fields
    .text()
    .label("City")
    .options(({ form }) => citiesFor(form.field("country").getValue()))
}));

form.field("country").addAfterChange((value, { form }) => {
  // clear a city the new country doesn't have
});
```

1. `.options(cb)` makes the list reactive. The callback re-runs whenever something it read
   changes, so choosing a country repaints the cities. Passing options to a text field also
   switches its renderer from a text input to a select.
2. `addAfterChange` on `country` clears a stale `city`. Without it, picking Croatia + Split
   and then switching to Germany leaves `"split"` in the field — gone from the dropdown, but
   still submitted.

## Notable details

**Redeclare with `form.fields()`, don't reach for `form.traverse()`.** By the time a
modifier runs, the form is already built, and a field builder hands its config to the field
by copy. Mutating a builder at that point changes nothing. `form.fields()` rebuilds the
field, which does take effect.

**The options callback is where the data comes from.** Here it's a static map, so the whole
thing is synchronous. Fetching the list instead is the same shape: hold the result in your
own observable state, read it inside the callback, and the dropdown repaints when it lands.

**Matching is by field name.** The modifier keys off `city` and `country`, so it's tied to
this model's field IDs. `modifyForm` receives the model, so guard on `model.modelId` to keep
the plugin scoped to the model you mean.

## Files

| File                              | What it does                                            |
| --------------------------------- | ------------------------------------------------------- |
| `DependentDropdownsExtension.tsx` | Registers both halves.                                  |
| `DependentDropdownsModel.ts`      | Demo `Store Location` model: `name`, `country`, `city`. |
| `DependentDropdownsModifier.tsx`  | Populates `city` from `country`, clears stale values.   |

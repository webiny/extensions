# Dependent dropdowns — one CMS field's options from another's value

Picking a **Country** on a content entry repopulates the **City** dropdown. The city list is
fetched, and the field stays disabled until it arrives. Switching to a country that doesn't
have the currently selected city clears it.

Requires Webiny **6.5.0** or newer.

## How it works

A code-defined model can't say "the options of this field depend on the value of that
one" — that's a UI concern, decided while someone is filling the form in. So the work is
split:

- `DependentDropdownsModel.ts` declares the fields. `country` carries a fixed list via
  `.predefinedValues()`. `city` deliberately carries none.
- `DependentDropdownsModifier.tsx` is a `ContentEntryFormModelModifier` that fills `city`
  in, per model.
- `CityCatalogue.ts` fetches the cities and holds them in observable state.

```ts
void this.catalogue.load();

form.fields(fields => ({
  city: fields
    .text()
    .label("City")
    .disabledWhen(() => !this.catalogue.isLoaded)
    .options(({ form }) => this.catalogue.forCountry(form.field("country").getValue()))
}));

form.field("country").addAfterChange((value, { form }) => {
  // clear a city the new country doesn't have
});
```

1. `.options(cb)` makes the list reactive. The callback re-runs whenever anything it read
   changes — the country field, and the catalogue's observable state — so the dropdown
   repaints by itself when the fetch resolves. Nothing has to push the result back into the
   form. Passing options to a text field also switches its renderer from a text input to a
   select.
2. `.disabledWhen()` keeps the field closed until the data arrives. Without it, "still
   loading" looks exactly like "this country has no cities".
3. `addAfterChange` on `country` clears a stale `city`. Without it, picking Croatia + Split
   and then switching to Germany leaves `"split"` in the field — gone from the dropdown, but
   still submitted.

## Notable details

**Redeclare with `form.fields()`, don't reach for `form.traverse()`.** By the time a
modifier runs, the form is already built, and a field builder hands its config to the field
by copy. Mutating a builder at that point changes nothing. `form.fields()` rebuilds the
field, which does take effect.

**The async part is free, as long as the data is observable.** `CityCatalogue` uses
`makeAutoObservable` and commits the fetched result in `runInAction`. That's the whole
requirement: the options callback runs inside a computed, so it subscribes to whatever it
touches. Park the result in a plain object instead and the dropdown will never repaint.

**`load()` guards against re-entry.** `modifyForm` runs whenever the form is built, so the
fetch would otherwise fire more than once.

**Matching is by field name.** The modifier keys off `city` and `country`, so it's tied to
this model's field IDs. `modifyForm` receives the model, so guard on `model.modelId` to keep
the plugin scoped to the model you mean.

## Files

| File                              | What it does                                            |
| --------------------------------- | ------------------------------------------------------- |
| `DependentDropdownsExtension.tsx` | Registers both halves.                                  |
| `DependentDropdownsModel.ts`      | Demo `Store Location` model: `name`, `country`, `city`. |
| `DependentDropdownsModifier.tsx`  | Populates `city` from `country`, clears stale values.   |
| `CityCatalogue.ts`                | Fetches the cities into observable state.               |

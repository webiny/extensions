import React, { useEffect, useMemo } from "react";
import { useFeature } from "webiny/admin";
import { createObjectFieldRenderer } from "webiny/admin/form";
import { MenuBuilderFeature } from "./feature.js";
import { MenuBuilder } from "./MenuBuilder.js";
import type { MenuBuilderSettings, MenuField } from "./abstractions.js";

declare module "webiny/admin/form" {
    interface IFieldRendererRegistry {
        menuBuilder: {
            fieldType: "object";
            settings?: MenuBuilderSettings;
        };
    }
}

export const MenuBuilderRenderer = createObjectFieldRenderer<"menuBuilder">(({ field }) => {
    const { createPresenter } = useFeature(MenuBuilderFeature);
    const presenter = useMemo(() => createPresenter(), []);

    // The form rebuilds the field view model on every render, so the presenter is handed the
    // current one before anything reads from it.
    presenter.init(field as MenuField);

    useEffect(() => {
        presenter.flush();
    });

    if (!field.isList) {
        return null;
    }

    /**
     * The view model is read here and handed down, rather than read again inside each child.
     * Reactive components are memoised, and the field itself is not observable, so a field the
     * form rebuilt would not reach a child whose only prop is the presenter.
     */
    return <MenuBuilder vm={presenter.vm} presenter={presenter} />;
});

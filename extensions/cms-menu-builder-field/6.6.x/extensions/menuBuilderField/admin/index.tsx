import React from "react";
import { AdminConfig, RegisterFeature } from "webiny/admin";
import { createFeature } from "webiny/admin";
import { MenuBuilderCmsRenderer } from "./MenuBuilderCmsRenderer.js";
import { MenuBuilderFeature } from "./presentation/feature.js";
import { MenuBuilderRenderer } from "./presentation/MenuBuilderRenderer.js";

const MenuBuilderFieldFeature = createFeature({
    name: "MenuBuilderField",
    register(container) {
        container.register(MenuBuilderCmsRenderer);
    },
    resolve() {
        return {};
    }
});

export default () => {
    return (
        <>
            <RegisterFeature feature={MenuBuilderFieldFeature} />
            <RegisterFeature feature={MenuBuilderFeature} />
            <AdminConfig>
                <AdminConfig.Form.FieldRenderer
                    name={"menuBuilder"}
                    component={MenuBuilderRenderer}
                />
            </AdminConfig>
        </>
    );
};

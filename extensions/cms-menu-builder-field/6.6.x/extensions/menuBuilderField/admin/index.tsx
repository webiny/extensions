import React from "react";
import { AdminConfig, createFeature, RegisterFeature } from "webiny/admin";
import { MenuBuilderCmsRenderer } from "./MenuBuilderCmsRenderer.js";
import { MenuBuilderRenderer } from "./MenuBuilderRenderer.js";

const MenuBuilderFieldFeature = createFeature({
    name: "MenuBuilderField",
    register(container) {
        container.register(MenuBuilderCmsRenderer);
    }
});

export default () => {
    return (
        <>
            <RegisterFeature feature={MenuBuilderFieldFeature} />
            <AdminConfig>
                <AdminConfig.Form.FieldRenderer
                    name={"menuBuilder"}
                    component={MenuBuilderRenderer}
                />
            </AdminConfig>
        </>
    );
};

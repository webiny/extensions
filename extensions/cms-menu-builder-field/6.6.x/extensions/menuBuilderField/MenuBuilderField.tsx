import React from "react";
import { Admin } from "webiny/extensions";

export const MenuBuilderField = () => {
    return <Admin.Extension src={"/extensions/menuBuilderField/admin/index.tsx"} />;
};

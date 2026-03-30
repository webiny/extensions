import React from "react";
import { Admin, Api } from "webiny/extensions";

export const FunnelBuilder = () => {
    return (
        <>
            <Api.Extension src={import.meta.dirname + "/api/TenantModelExtension.ts"} />
            <Admin.Extension src={import.meta.dirname + "/pageType/index.tsx"} />
            <Admin.Extension src={import.meta.dirname + "/pageEditor/index.tsx"} />
        </>
    );
};

import React from "react";
import { AdminConfig } from "webiny/admin/configs";
import squareLogo from "./logo.png";
import horizontalLogo from "./logo.png";

const { Title, Logo, Theme } = AdminConfig;

const AdminBranding = () => {
    return (
        <AdminConfig.Public>
            <Title value={"ACME Corp"} />
            <Logo
                squareLogo={<img src={squareLogo} alt={"ACME Corp"} />}
                horizontalLogo={<img src={horizontalLogo} alt={"ACME Corp"} />}
            />
            <Theme.Color palette={"primary"} color={"purple"} />
            <Theme.Color palette={"neutral"} color={"light-green"} />
        </AdminConfig.Public>
    );
};

export default AdminBranding;

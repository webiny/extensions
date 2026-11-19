import React from "react";
import { Api, Infra } from "webiny/extensions";

/**
 * Sends Webiny's mail (password reset codes, workflow notifications, the test email) through
 * Amazon SES, using the API function's IAM role instead of stored credentials.
 *
 * Configured with environment variables, so the same values reach both halves: the API function
 * (WEBINY_ variables are passed to it on deploy) and the Pulumi program that grants the permission.
 */
export const AwsSesMailer = () => {
    return (
        <>
            {/* Registers the SES transport. It takes over from SMTP once WEBINY_API_SES_FROM is set. */}
            <Api.Extension src={"/extensions/awsSesMailer/api/SesMailTransportFactory.ts"} />

            {/* Gives the API functions' role permission to send as WEBINY_API_SES_FROM. */}
            <Infra.Api.Pulumi src={"/extensions/awsSesMailer/pulumi/SesSendPermission.ts"} />
        </>
    );
};

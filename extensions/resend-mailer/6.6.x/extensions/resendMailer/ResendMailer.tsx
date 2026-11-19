import React from "react";
import { Api } from "webiny/extensions";

/**
 * Sends Webiny's mail (password reset codes, workflow notifications, the test email) through
 * Resend's HTTP API.
 *
 * Configured with environment variables. WEBINY_ variables are passed to the API functions on
 * deploy.
 */
export const ResendMailer = () => {
    return (
        <>
            {/* Registers the Resend transport. It takes over from SMTP once the API key and sender are set. */}
            <Api.Extension src={"/extensions/resendMailer/api/ResendMailTransportFactory.ts"} />
        </>
    );
};

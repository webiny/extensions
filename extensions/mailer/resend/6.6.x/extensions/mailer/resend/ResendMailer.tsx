import React from "react";
import { Api } from "webiny/extensions";

/**
 * Sends Webiny's mail (password reset codes, workflow notifications, the test email) through
 * Resend's HTTP API. While configured, it is used instead of the built-in SMTP transport.
 *
 * Configured with environment variables, read when mail is sent, so the API key never goes into
 * the build. WEBINY_ variables are passed to the API functions on deploy.
 */
export const ResendMailer = () => {
    return <Api.Extension src={"/extensions/mailer/resend/api/ResendMailTransportFactory.ts"} />;
};

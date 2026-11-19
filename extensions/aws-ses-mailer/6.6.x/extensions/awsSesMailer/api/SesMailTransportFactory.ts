import type { SESv2Client } from "@aws-sdk/client-sesv2";
import { MailTransport, MailTransportFactory } from "webiny/api/mailer";

const TRANSPORT_NAME = "AwsSes";

interface SesConfig {
    from: string;
    replyTo?: string;
    configurationSet?: string;
}

class SesMailTransport implements MailTransport.Interface {
    readonly name = TRANSPORT_NAME;

    constructor(
        private client: SESv2Client,
        private config: SesConfig
    ) {}

    async send(params: MailTransport.SendParams) {
        const { SendEmailCommand } = await import("@aws-sdk/client-sesv2");

        const replyTo = params.replyTo || this.config.replyTo;

        try {
            const response = await this.client.send(
                new SendEmailCommand({
                    // An explicit sender wins, as with the SMTP transport.
                    FromEmailAddress: params.from || this.config.from,
                    ReplyToAddresses: replyTo ? [replyTo] : undefined,
                    Destination: {
                        ToAddresses: params.to,
                        CcAddresses: params.cc,
                        BccAddresses: params.bcc
                    },
                    Content: {
                        Simple: {
                            Subject: { Data: params.subject, Charset: "UTF-8" },
                            Body: {
                                Text: params.text
                                    ? { Data: params.text, Charset: "UTF-8" }
                                    : undefined,
                                Html: params.html
                                    ? { Data: params.html, Charset: "UTF-8" }
                                    : undefined
                            }
                        }
                    },
                    ConfigurationSetName: this.config.configurationSet
                })
            );

            return { result: response.MessageId ?? null, error: null };
        } catch (ex: any) {
            /*
             * Only the error's name, message and request id. The SDK error also carries the
             * request, which is not worth returning to a GraphQL caller.
             */
            return {
                result: null,
                error: {
                    message: ex.message,
                    code: ex.name ?? "SES_ERROR",
                    data: { requestId: ex.$metadata?.requestId }
                }
            };
        }
    }
}

let client: SESv2Client | undefined;

class SesMailTransportFactoryImpl implements MailTransportFactory.Interface {
    readonly name = TRANSPORT_NAME;

    /*
     * Configured when WEBINY_API_SES_FROM is set. Otherwise this returns null and the mailer falls
     * back to SMTP, if its settings exist.
     *
     * No credentials here: on Lambda the SDK uses the function's IAM role, and anywhere else it
     * uses the default credential chain (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY, a profile...).
     */
    async createTransport() {
        const from = process.env.WEBINY_API_SES_FROM;
        if (!from) {
            return null;
        }

        if (!client) {
            const { SESv2Client } = await import("@aws-sdk/client-sesv2");
            client = new SESv2Client({
                region: process.env.WEBINY_API_SES_REGION || process.env.AWS_REGION
            });
        }

        return new SesMailTransport(client, {
            from,
            replyTo: process.env.WEBINY_API_SES_REPLY_TO || undefined,
            configurationSet: process.env.WEBINY_API_SES_CONFIGURATION_SET || undefined
        });
    }
}

export default MailTransportFactory.createImplementation({
    implementation: SesMailTransportFactoryImpl,
    dependencies: []
});

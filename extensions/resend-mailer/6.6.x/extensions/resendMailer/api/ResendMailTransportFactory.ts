import { MailTransport, MailTransportFactory } from "webiny/api/mailer";

const TRANSPORT_NAME = "Resend";

const RESEND_EMAILS_URL = "https://api.resend.com/emails";

interface ResendConfig {
    apiKey: string;
    from: string;
    replyTo?: string;
}

// "Webiny <no-reply@example.com>" -> "no-reply@example.com".
const getAddress = (sender: string) => {
    const match = sender.match(/<([^>]+)>/);
    return match ? match[1] : sender.trim();
};

class ResendMailTransport implements MailTransport.Interface {
    readonly name = TRANSPORT_NAME;

    constructor(private config: ResendConfig) {}

    async send(params: MailTransport.SendParams) {
        // An explicit sender wins, as with the SMTP transport.
        const from = params.from || this.config.from;
        const replyTo = params.replyTo || this.config.replyTo;

        /*
         * Resend requires `to`. Workflow notifications only set `bcc`, so those are addressed to
         * the sender, the way a BCC-only message usually is.
         */
        const to = params.to?.length ? params.to : [getAddress(from)];

        try {
            const response = await fetch(RESEND_EMAILS_URL, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.config.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    from,
                    to,
                    cc: params.cc?.length ? params.cc : undefined,
                    bcc: params.bcc?.length ? params.bcc : undefined,
                    reply_to: replyTo || undefined,
                    subject: params.subject,
                    text: params.text,
                    html: params.html
                })
            });

            const body: any = await response.json().catch(() => null);

            if (!response.ok) {
                return {
                    result: null,
                    error: {
                        message: body?.message ?? `Resend responded with HTTP ${response.status}.`,
                        code: body?.name ?? "RESEND_ERROR",
                        data: { statusCode: response.status }
                    }
                };
            }

            return { result: body?.id ?? null, error: null };
        } catch (ex: any) {
            // The request did not complete: DNS, connection or a timeout.
            return {
                result: null,
                error: {
                    message: ex.message,
                    code: "RESEND_REQUEST_FAILED",
                    data: {}
                }
            };
        }
    }
}

class ResendMailTransportFactoryImpl implements MailTransportFactory.Interface {
    readonly name = TRANSPORT_NAME;

    /*
     * Configured when WEBINY_API_RESEND_API_KEY and WEBINY_API_RESEND_FROM are both set. Otherwise
     * this returns null and the mailer falls back to SMTP, if its settings exist.
     */
    async createTransport() {
        const apiKey = process.env.WEBINY_API_RESEND_API_KEY;
        const from = process.env.WEBINY_API_RESEND_FROM;
        if (!apiKey || !from) {
            return null;
        }

        return new ResendMailTransport({
            apiKey,
            from,
            replyTo: process.env.WEBINY_API_RESEND_REPLY_TO || undefined
        });
    }
}

export default MailTransportFactory.createImplementation({
    implementation: ResendMailTransportFactoryImpl,
    dependencies: []
});

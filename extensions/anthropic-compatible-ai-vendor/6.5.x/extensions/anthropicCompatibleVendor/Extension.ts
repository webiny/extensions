import { AiSdkFactory } from "webiny/api";

/*
 * Shown as the vendor in AI Power-Ups > Connections and in front of every model name.
 * The id is stored as the prefix of each selected model ("anthropic-compatible/<model>"), so
 * changing it after models have been picked in settings means picking them again.
 */
const VENDOR_ID = "anthropic-compatible";
const VENDOR_NAME = "Anthropic-compatible";

/*
 * The models your endpoint serves, by the id it knows them under. If you already point Claude Code
 * at the endpoint, these are the values of ANTHROPIC_DEFAULT_OPUS_MODEL,
 * ANTHROPIC_DEFAULT_SONNET_MODEL and ANTHROPIC_DEFAULT_HAIKU_MODEL.
 *
 * `supports.temperature` is optional. Without it, Webiny leaves `temperature` out of the request,
 * which is the safe default because several current models reject it.
 */
const MODELS: AiSdkFactory.Interface["models"] = [
    { id: "claude-opus-5", name: "Claude Opus 5" },
    { id: "claude-sonnet-5", name: "Claude Sonnet 5" },
    { id: "claude-haiku-4-5", name: "Claude Haiku 4.5" }
];

/*
 * Claude Code and Anthropic's own SDKs take a base URL without the API version and add
 * "/v1/messages" themselves. The AI SDK expects the version in the base URL. Accepting both forms
 * means the value already used for Claude Code's ANTHROPIC_BASE_URL can be copied over as it is.
 */
const toAiSdkBaseUrl = (baseUrl: string) => {
    const trimmed = baseUrl.replace(/\/+$/, "");
    return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
};

class AnthropicCompatibleSdkFactoryImpl implements AiSdkFactory.Interface {
    readonly id = VENDOR_ID;
    readonly name = VENDOR_NAME;
    readonly models = MODELS;

    async execute(apiKey?: string) {
        const baseUrl = process.env.WEBINY_API_ANTHROPIC_COMPATIBLE_BASE_URL;
        if (!baseUrl) {
            throw new Error(
                `WEBINY_API_ANTHROPIC_COMPATIBLE_BASE_URL is not set. Set it to the base URL of the Anthropic-compatible endpoint, e.g. "https://claude.example.com".`
            );
        }

        const key = apiKey ?? process.env.WEBINY_API_ANTHROPIC_COMPATIBLE_API_KEY;

        /*
         * Anthropic's own API reads the key from the `x-api-key` header. Gateways in front of Claude
         * usually want `Authorization: Bearer`, the header Claude Code sends for
         * ANTHROPIC_AUTH_TOKEN, so that is the default here.
         */
        const useApiKeyHeader = process.env.WEBINY_API_ANTHROPIC_COMPATIBLE_AUTH === "x-api-key";

        const { createAnthropic } = await import("@ai-sdk/anthropic");
        const provider = createAnthropic({
            baseURL: toAiSdkBaseUrl(baseUrl),
            ...(useApiKeyHeader ? { apiKey: key } : { authToken: key })
        });

        return {
            languageModel: (modelId: string) => provider.chat(modelId)
        };
    }
}

export default AiSdkFactory.createImplementation({
    implementation: AnthropicCompatibleSdkFactoryImpl,
    dependencies: []
});

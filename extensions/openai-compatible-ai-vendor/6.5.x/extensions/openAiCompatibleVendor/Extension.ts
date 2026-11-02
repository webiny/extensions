import { AiSdkFactory } from "webiny/api";

/*
 * Shown as the vendor in AI Power-Ups > Connections and in front of every model name.
 * The id is stored as the prefix of each selected model ("openai-compatible/<model>"), so changing
 * it after models have been picked in settings means picking them again.
 */
const VENDOR_ID = "openai-compatible";
const VENDOR_NAME = "OpenAI-compatible";

/*
 * The models your gateway serves, by the name the gateway knows them under (for LiteLLM, the
 * `model_name` entries in its config). Every model listed here must support tool calling: AI
 * Power-Ups uses tools for structured output.
 *
 * `supports.temperature` is optional. Without it, Webiny leaves `temperature` out of the request,
 * which is the safe default because several current models reject it.
 */
const MODELS: AiSdkFactory.Interface["models"] = [
    { id: "gpt-5.4", name: "GPT-5.4" },
    { id: "gpt-5.4-mini", name: "GPT-5.4 Mini" },
    { id: "claude-sonnet-5", name: "Claude Sonnet 5" }
];

class OpenAiCompatibleSdkFactoryImpl implements AiSdkFactory.Interface {
    readonly id = VENDOR_ID;
    readonly name = VENDOR_NAME;
    readonly models = MODELS;

    async execute(apiKey?: string) {
        const baseURL = process.env.WEBINY_API_OPENAI_COMPATIBLE_BASE_URL;
        if (!baseURL) {
            throw new Error(
                `WEBINY_API_OPENAI_COMPATIBLE_BASE_URL is not set. Set it to the gateway's OpenAI-compatible base URL, e.g. "https://litellm.example.com/v1".`
            );
        }

        const { createOpenAI } = await import("@ai-sdk/openai");
        const provider = createOpenAI({
            baseURL,
            apiKey: apiKey ?? process.env.WEBINY_API_OPENAI_COMPATIBLE_API_KEY
        });

        /*
         * "chat" calls /chat/completions, which every OpenAI-compatible gateway serves.
         * "responses" calls /responses. LiteLLM serves it, but how well depends on the upstream
         * model, so it is opt-in.
         */
        const useResponses = process.env.WEBINY_API_OPENAI_COMPATIBLE_API === "responses";

        return {
            languageModel: (modelId: string) =>
                useResponses ? provider.responses(modelId) : provider.chat(modelId)
        };
    }
}

export default AiSdkFactory.createImplementation({
    implementation: OpenAiCompatibleSdkFactoryImpl,
    dependencies: []
});

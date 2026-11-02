# OpenAI-compatible AI vendor

Adds an AI Power-Ups vendor that talks to any OpenAI-compatible endpoint at a URL you choose:
LiteLLM, vLLM, Ollama, a corporate LLM gateway, or anything else that serves the OpenAI API.

Webiny ships vendors for OpenAI, Anthropic, Google and OpenRouter. Each one calls that vendor's
own API. If your company routes all LLM traffic through a gateway, this extension points AI
Power-Ups at the gateway instead.

## Requirements

Webiny 6.5.0 or newer.

## Setup

1. Set the gateway's base URL for the API. It is usually the URL that ends in `/v1`:

   ```
   WEBINY_API_OPENAI_COMPATIBLE_BASE_URL=https://litellm.example.com/v1
   ```

2. Edit `MODELS` in `Extension.ts` so it lists the models your gateway serves, by the name the
   gateway knows them under. For LiteLLM, that is the `model_name` of each entry in its config.
   Only list models that support tool calling. AI Power-Ups uses tools for structured output, and
   a model without them fails at runtime.

3. Deploy the API (`yarn webiny deploy api`).

4. In the Admin app, open AI Power-Ups settings. Under Connections, add a connection with
   "OpenAI-compatible" as the vendor and your gateway key as the API key. The models from step 2
   are now available to pick.

To rename the vendor, for example to "LiteLLM", change `VENDOR_NAME` in `Extension.ts`. Leave
`VENDOR_ID` alone once models have been selected in settings: each selected model is stored as
`openai-compatible/<model>`, and a new id means selecting them again.

## Environment variables

| Variable                                | Required | Description                                                                   |
| --------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| `WEBINY_API_OPENAI_COMPATIBLE_BASE_URL` | Yes      | Base URL of the OpenAI-compatible API, e.g. `https://litellm.example.com/v1`. |
| `WEBINY_API_OPENAI_COMPATIBLE_API_KEY`  | No       | Used when a connection has no API key of its own.                             |
| `WEBINY_API_OPENAI_COMPATIBLE_API`      | No       | `chat` (default) or `responses`. See below.                                   |

Variables prefixed with `WEBINY_` are passed to the API functions on deploy, so setting them in the
shell or in the project's `.env` file is enough.

## Dependency version

`@ai-sdk/openai` is pinned to the version Webiny 6.5.0 itself uses. A newer release can depend on a
newer `@ai-sdk/provider` than Webiny's `ai` package, and the extension then fails to typecheck.
When you upgrade Webiny, match the version in `@webiny/api-core`'s `package.json`.

## Chat Completions or Responses

By default the extension calls `/chat/completions`. Every OpenAI-compatible gateway serves it.

Set `WEBINY_API_OPENAI_COMPATIBLE_API=responses` to call `/responses` instead. LiteLLM serves it
for all of its models, but it translates the request for models that are not OpenAI's, and tool
calls are where that translation is most likely to differ. Try it with your models before relying
on it.

## Limitations

- One gateway per deployment. The base URL comes from the environment, not from the connection,
  so every connection with this vendor goes to the same gateway.
- The model list is static. A model you add to the gateway appears in Webiny once it is added to
  `MODELS` and the API is deployed.
- `temperature` is not sent unless a model entry says it is supported:
  `{ id: "gpt-5.4", name: "GPT-5.4", supports: { temperature: true } }`. Several current models
  reject it, so leaving it out is the default.

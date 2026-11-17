# Anthropic-compatible AI vendor

Adds an AI Power-Ups vendor that sends requests to an Anthropic Messages API endpoint at a URL you
choose: a private Claude deployment, a corporate LLM gateway, LiteLLM's Anthropic route, or anything
else that serves `/v1/messages`.

Webiny ships an Anthropic vendor, and it always calls `api.anthropic.com` with an `x-api-key` header.
If your company runs Claude behind its own URL, or the endpoint expects a Bearer token, use this
extension instead.

For gateways that serve the OpenAI API, use the `openai-compatible-ai-vendor` extension.

## Requirements

Webiny 6.5.0 or newer.

## Setup

1. Set the endpoint's base URL for the API:

   ```
   WEBINY_API_ANTHROPIC_COMPATIBLE_BASE_URL=https://claude.example.com
   ```

   If you already point Claude Code at this endpoint, use the same value as its
   `ANTHROPIC_BASE_URL`. A URL that ends in `/v1` works too.

2. Edit `MODELS` in `Extension.ts` so it lists the models your endpoint serves, by the id the
   endpoint knows them under. With Claude Code, those are the values of
   `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL` and
   `ANTHROPIC_DEFAULT_HAIKU_MODEL`.

3. Deploy the API (`yarn webiny deploy api`).

4. In the Admin app, open AI Power-Ups settings. Under Connections, add a connection with
   "Anthropic-compatible" as the vendor and your token as the API key. With Claude Code, that is
   the value of `ANTHROPIC_AUTH_TOKEN`. The models from step 2 are now available to pick.

To rename the vendor, for example to "Company Claude", change `VENDOR_NAME` in `Extension.ts`. Leave
`VENDOR_ID` alone once models have been selected in settings: each selected model is stored as
`anthropic-compatible/<model>`, and a new id means selecting them again.

## Environment variables

| Variable                                   | Required | Description                                                      |
| ------------------------------------------ | -------- | ---------------------------------------------------------------- |
| `WEBINY_API_ANTHROPIC_COMPATIBLE_BASE_URL` | Yes      | Base URL of the endpoint, with or without `/v1`.                 |
| `WEBINY_API_ANTHROPIC_COMPATIBLE_API_KEY`  | No       | Used when a connection has no API key of its own.                |
| `WEBINY_API_ANTHROPIC_COMPATIBLE_AUTH`     | No       | `bearer` (default) or `x-api-key`. Which header carries the key. |

Variables prefixed with `WEBINY_` are passed to the API functions on deploy, so setting them in the
shell or in the project's `.env` file is enough.

## Authentication header

By default the key goes in `Authorization: Bearer <key>`. Claude Code sends the same header for
`ANTHROPIC_AUTH_TOKEN`, and most gateways expect it.

If your endpoint wants the key in `x-api-key`, the way Anthropic's own API does (Claude Code's
`ANTHROPIC_API_KEY`), set `WEBINY_API_ANTHROPIC_COMPATIBLE_AUTH=x-api-key`.

## Dependency version

`@ai-sdk/anthropic` is pinned to the version Webiny 6.5.0 itself uses. A newer release can depend on
a newer `@ai-sdk/provider` than Webiny's `ai` package, and the extension then fails to typecheck.
When you upgrade Webiny, match the version in `@webiny/api-core`'s `package.json`.

## Limitations

- One endpoint per deployment. The base URL comes from the environment, not from the connection,
  so every connection with this vendor goes to the same endpoint.
- The model list is static. A model you add to the endpoint appears in Webiny once it is added to
  `MODELS` and the API is deployed.
- `temperature` is not sent unless a model entry says it is supported:
  `{ id: "claude-sonnet-5", name: "Claude Sonnet 5", supports: { temperature: true } }`. Several
  current models reject it, so leaving it out is the default.

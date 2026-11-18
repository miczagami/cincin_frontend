# AI providers and models for launch

**Question** ([#22](https://github.com/miczagami/cincin_frontend/issues/22), map [#5](https://github.com/miczagami/cincin_frontend/issues/5)): which providers and models should CinCin use at launch for **label vision** and for **LLM guess evaluation and note synthesis**? What are the supported models and retirement dates, accuracy fit, latency, cost, rate limits and data-handling terms? What config do we need?

**Code read:** `cincin_backend` `origin/main` at `0232bae`, and `cincin_frontend` `origin/main` for the upload path. Both read on 2026-11-18. Provider pages were also fetched on 2026-11-18 (see [Sources](#sources)).

## Answer in brief

1. **Use Anthropic for both roles at launch.** The Claude models are the only provider's models I could verify against the provider's own pages from this session. The code already defaults to Anthropic and has an Anthropic path for every call site. The app also degrades gracefully without AI: scans can fall back to barcode and manual search, and guesses fall back to exact and taxonomy matching. So a second provider is not a launch blocker.

   | Role | Primary | Fallback (same key, separate rate-limit row) |
   |---|---|---|
   | Label vision (`scanLabel`) | `claude-sonnet-5-5`, effort `low`, `thinking: {type: "between_tools"}` | `claude-haiku-5-5` |
   | Guess evaluation (`evaluateGuessWithAI`) | `claude-haiku-5-5`, effort `low`, `thinking: {type: "disabled"}` | `claude-sonnet-5-5`, then the existing non-AI matching |
   | Note synthesis (`synthesiseNotes`) | `claude-sonnet-5-5`, effort `medium` | `claude-haiku-5-5` |

   Re-decide the vision primary after a small label eval (open question 1). Haiku 5.5 is about 20 times cheaper per scan. If it reads Australian labels as well as Sonnet 5.5, it should become the primary.

2. **Changing only the model ID is not enough.** Claude Haiku 5.5 and Sonnet 5.5 have adaptive thinking **on by default**. When it is on, the response can start with a `thinking` block. All three Anthropic call sites read `content[0].text`, and they cap output at 300 to 600 tokens. Thinking counts toward that cap. With only the ID swapped, vision would parse nothing and return confidence 0, and guess evaluation would silently return `null`. The fix list is in [section 6](#6-code-changes-for-build-tickets).

3. **Cost is small at both launch sizes.** With the recommended mix, the estimates are below. They exclude one-off note synthesis, which is about $10 to $25 for a 2,000-bottle catalogue.
   - Soft launch: about **US$6 a month at 100 users** and **US$28 a month at 500 users**.
   - Public launch: about **US$280 a month at 5,000 users**, or about **US$180** if the PWA downsizes photos before upload.

   This fits the Anthropic **Start tier** ($500 monthly cap). Move to **Build** ($1,000 cap) before public launch for headroom (section 4).

4. **Drop Google Vision and OpenAI from the launch config.**
   - `google_vision` returns raw OCR with no `brand` or `product`, so `matchBottle` can never match a bottle.
   - The OpenAI path hard-codes `gpt-4o` and `gpt-4o-mini`. Their shutdown is announced for **2027-01-14**, 8 weeks from now (section 1.2).
   - Keep both code paths only if a build ticket makes their model IDs configurable.

5. **New env vars:** `AI_VISION_MODEL`, `AI_VISION_FALLBACK_MODEL`, `AI_LLM_MODEL`, `AI_LLM_FALLBACK_MODEL`, `AI_SYNTHESIS_MODEL`, `AI_SYNTHESIS_FALLBACK_MODEL`, `AI_VISION_TIMEOUT_MS`, `AI_GUESS_TIMEOUT_MS` and `AI_INFERENCE_GEO` (section 5).

## 1. Supported models and retirement dates

### 1.1 Anthropic (verified on platform.claude.com)

Current lineup, from the [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview), [Pricing](https://platform.claude.com/docs/en/about-claude/pricing) and [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations) pages:

| Model | API ID | Input / output (US$ per MTok) | Comparative latency | Default effort | Retirement |
|---|---|---|---|---|---|
| Claude Haiku 5.5 | `claude-haiku-5-5` | $0.10 / $0.50 for prompts up to 100k tokens ($0.50 / $2.50 above) | Fastest | `medium` | Not sooner than 2027-10-07 |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | $2 / $10 | Fast | `high` | Not sooner than 2027-09-28 |
| Claude Opus 5.5 | `claude-opus-5-5` | $4 / $20 | Moderate | `medium` | Not sooner than 2027-09-22 |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | $1 / $5 | — | — | Not sooner than 2026-10-15 (date passed; still Active) |
| Claude Sonnet 4.5 | `claude-sonnet-4-5-20250929` | $3 / $15 | — | — | **Deprecated, retires 2026-11-30** |
| Claude Sonnet 4 (in the code today) | `claude-sonnet-4-20250514` | — | — | — | **Retired 2026-06-15**; replacement `claude-sonnet-5-5` |

Other notes from the same pages:

- **All current models accept image input.**
- **Model IDs are pinned snapshots.** "Every Claude model ID is a pinned snapshot, including the dateless IDs used from the 4.6 generation on". `claude-haiku-5-5` "is a fixed model ID with no date suffix and no separate alias".
- **Notice before retirement:** "at least 60 days' notice before model retirement for publicly released models", by email and in the docs.
- **Discounts:** the Batch API is 50% off. Cache reads cost 10% of base input on Haiku 5.5 and 5% on Sonnet 5.5.
- **Avoid Fable and Mythos models.** They are "Covered Models" that require 30-day data retention ([API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention)). They are also over-powered for this work.

### 1.2 OpenAI (not verified)

`developers.openai.com` and `platform.openai.com` do not resolve from this session's network. A web search of OpenAI's own domains returned these items:

- The [deprecations page](https://developers.openai.com/api/docs/deprecations) lists `gpt-4o-2024-08-06`, `gpt-4o-2024-11-20` and `gpt-4o-mini-2024-07-18` with a **2027-01-14** shutdown.
- The [chat completions API reference](https://developers.openai.com/api/reference/python/resources/chat/subresources/completions/methods/create) marks `gpt-4o` as "Deprecated. Announced shutdown date: 2027-01-14".

These match the third-party reports cited in the production checklist. I could not open the pages, so I have not recorded current OpenAI model IDs, prices, rate limits or data terms. **Confirm these on OpenAI's pages before adding OpenAI back** (open question 3).

### 1.3 Google (not verified)

`ai.google.dev` does not resolve from this session. The code's only Google path is Cloud Vision `images:annotate` with `TEXT_DETECTION`, `LOGO_DETECTION` and `WEB_DETECTION` (`scanService.js` `callGoogleVision`). It returns `textAnnotations`, `logoAnnotations`, `webDetection` and `rawText`, but no `brand`, `product`, `vintage` or `category`. `matchBottle` returns no match when both `product` and `brand` are empty, so **every Google Vision scan fails to identify a bottle**. There is no Gemini path in the code. Gemini was not evaluated.

## 2. How the code chooses providers and models today

### 2.1 Provider selection

| Call site | Env read | Values accepted | Unknown value | Default |
|---|---|---|---|---|
| `scanService.callVisionAPI` | `AI_VISION_PROVIDER` | `anthropic`, `openai`, `google_vision` | Silently uses **Anthropic** (so `.env.example`'s documented `google` becomes Anthropic) | `anthropic` |
| `scanService.callLLM` (synthesis) | `AI_LLM_PROVIDER`, else `AI_VISION_PROVIDER` | `anthropic`, `openai` | Silently uses **Anthropic** (so `google_vision` inherited from the vision var becomes Anthropic) | `anthropic` |
| `gameService.evaluateGuessWithAI` | `AI_LLM_PROVIDER` only | `anthropic`, `openai` | Silently returns `null`, so there is **no AI matching** | `anthropic` |

Further findings:

- `src/config/index.js` defines `visionProvider`, `llmProvider`, `anthropicApiKey`, `openaiApiKey` and `aiGuessEval: { minConfidence: 0.7, timeoutMs: 5000 }`. **Nothing reads them.** Every service reads `process.env` directly, the 0.7 threshold is hard-coded, and no timeout is applied.
- **Key lookup is inconsistent.**
  - Scan and synthesis accept `ANTHROPIC_API_KEY` or the undocumented `AI_SERVICE_API_KEY`.
  - Guess evaluation gates on `ANTHROPIC_API_KEY || OPENAI_API_KEY`, then builds the Anthropic client with `ANTHROPIC_API_KEY` only. With only an OpenAI key and the provider `anthropic`, the client gets an undefined key and the error is swallowed.
- **Synthesis is not part of a scan.** `sourceTastingNotes` runs only from `POST /api/scan/source-notes/:bottleId`, and only when a bottle has fewer than 3 notes. The route comment says "Admin/internal use", but the route is gated only by `requireAuth` and `requireAgeVerified`.

### 2.2 Hard-coded model IDs and request shapes

| Call site | Provider | Model | Transport | Input | JSON output | `max_tokens` | Reads |
|---|---|---|---|---|---|---|---|
| `callAnthropicVision` | Anthropic | `claude-sonnet-4-20250514` | raw `fetch`, `anthropic-version: 2023-06-01` | `image` block, `source: {type: "base64", media_type, data}`, then a text prompt | Prompt only ("Return ONLY a JSON object … Do not include markdown"), then code strips ```` ``` ```` fences and runs `JSON.parse` | 400 | `content[0].text` |
| `callOpenAIVision` | OpenAI | `gpt-4o` | raw `fetch` to `/v1/chat/completions` | `image_url` data URI, then text | Prompt only | 300 | `choices[0].message.content` |
| `callGoogleVision` | Google Cloud Vision | n/a | raw `fetch`, key in the query string | `image.content` base64 | n/a (OCR) | n/a | `responses[0]` |
| `callAnthropicLLM` (synthesis) | Anthropic | `claude-sonnet-4-20250514` | raw `fetch` | `system` and a user string | Prompt asks for a bare JSON array; fences stripped | 600 | `content[0].text` |
| `callOpenAILLM` (synthesis) | OpenAI | `gpt-4o-mini` | raw `fetch` | system and user messages | Prompt only | 600 | `choices[0].message.content` |
| `evaluateGuessWithAI` | Anthropic | `claude-sonnet-4-20250514` | `@anthropic-ai/sdk` `^0.135.0`, default timeout and retries | `system` and a user prompt with the guess and a pretty-printed note list (with IDs) | Prompt only; fences stripped | 300 | `content[0].text` |
| `evaluateGuessWithAI` | OpenAI | `gpt-4o-mini` | `openai` `^4.104.0` | system and user messages | `response_format: {type: "json_object"}` | unset | `choices[0].message.content` |

Error handling:

- **Vision:** a non-2xx response throws `AppError(502)` and loses the provider's error body. The scan counter is incremented only after a successful vision call.
- **Synthesis:** errors are logged and return `[]`.
- **Guess evaluation:** errors are logged and return `null`. The game then scores the guess with the non-AI result.

### 2.3 What the new models change

From the [Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) page and the [Haiku 5.5 migration guide](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide):

**Thinking is on by default.** "Adaptive thinking is on by default, so a response can start with one or more `thinking` blocks even when the request doesn't set `thinking`."
- **Read blocks by type.** "Select content blocks by their `type` field rather than by position."
- **Raise `max_tokens`.** "Thinking tokens count toward `max_tokens`, so a request with a small `max_tokens` can stop with `stop_reason: "max_tokens"` after a `thinking` block and before any text."

**How to turn thinking off:**

| Model | Lowest thinking setting | Accepted at | Rejected |
|---|---|---|---|
| Haiku 5.5 | `thinking: {type: "disabled"}` | effort `high` or below | at `xhigh` or `max` |
| Sonnet 5.5 | `thinking: {type: "between_tools"}`. Without tools, "the response contains only text". | effort `high` or below | `{type: "disabled"}` is always a 400 |

**Other request rules on both models:**
- **Remove sampling parameters.** Non-default `temperature`, `top_p` or `top_k` returns a 400. Since API version `2026-10-21`, any value of them returns a 400. The code sends none of them.
- **No prefill.** "Claude Haiku 5.5 rejects it with a 400 error". The code does not prefill.
- **Handle refusals.** Haiku 5.5 runs safety classifiers that can return `stop_reason: "refusal"`, and "it has no server-side fallback".

**Tokens and images:**
- **More text tokens.** The new tokenizer counts the same text as about 30% more tokens than Claude 4.5-era models.
- **Higher-resolution images.** Images use the high-resolution tier: up to 2,576 px on the long edge and 4,784 visual tokens, where the older standard tier allowed 1,568 px and 1,568 tokens ([Vision](https://platform.claude.com/docs/en/build-with-claude/vision)).

**JSON output can be enforced.** [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) (`output_config.format`) is stable with no beta header, and it supports `claude-haiku-5-5` and `claude-sonnet-5-5`. Limits that matter here:
- It does not support `minimum` or `maximum`, so it cannot bound `confidence` to 0..1.
- `additionalProperties` must be `false`.
- "The first time you use a specific schema, there is additional latency while the grammar compiles". Compiled grammars are cached for 24 hours.

**API version.** The installed code sends `anthropic-version: 2023-06-01`. That version is still listed. The current version is `2026-10-21` ([API versions](https://platform.claude.com/docs/en/api/versioning)). The code is unaffected by the `2026-10-21` changes.

## 3. Accuracy and latency fit

**Label vision.**
- **No benchmark exists.** Anthropic publishes no benchmark for reading wine, spirits or beer labels. The overview only says current models excel at "image processing". It lists Haiku 5.5 "for high-volume, latency-sensitive tasks such as classification, extraction, and routing" and Sonnet 5.5 as "the best combination of speed and intelligence".
- **The task needs knowledge as well as reading.** It is partly OCR and partly world knowledge: mapping a stylised label to producer, product, region and vintage. A larger model is the safer default.
- **The cost gap is small in dollars.** Sonnet 5.5 costs about US$0.013 a scan against US$0.0007 for Haiku 5.5. Free users are capped at 5 scans a month (`config.freeTier.monthlyScans`).
- **Image limits from the [Vision](https://platform.claude.com/docs/en/build-with-claude/vision) page:**
  - Accepted: JPEG, PNG, GIF and WebP. The route allows jpeg, png and webp.
  - Maximum per image: 10 MB base64 on the Claude API and 8000×8000 px.
  - Claude "might hallucinate or make mistakes when interpreting low-quality, rotated, or very small images under 200 pixels".

**Guess evaluation.**
- **This is the classification case Haiku is built for.** The task is short: match a free-text guess to one of about 8 notes, with synonyms and regional terms.
- **It is on the critical path of every round.** `submitGuess` awaits it for each guess that misses the exact, generic and taxonomy passes. That covers REST `POST /api/games/:gameId/guess` and the Socket.io handler in `socketServer.js`.
- **Use Haiku 5.5 with thinking off and effort `low`.** That is the lowest-latency configuration Anthropic documents.

**Note synthesis.**
- **Quality matters more than speed.** Synthesised notes become the game's answers.
- **It runs rarely.** It runs once per thin bottle, offline or admin-triggered.
- **Use Sonnet 5.5 at effort `medium`.** For a bulk catalogue load, the Batch API gives 50% off.

**Latency.** Anthropic publishes only comparative latency ("Fastest", "Fast", "Moderate"), not milliseconds. Measure p50 and p95 in the label eval (open question 1).
- **Guess evaluation:** set a hard timeout. Config already has `aiGuessEval.timeoutMs: 5000`, but nothing applies it. I suggest 4 s.
- **Vision:** suggest 15 s.
- **Today there is no timeout.** The SDK default is 10 minutes with 2 retries, and the raw `fetch` calls have no timeout at all.

## 4. Cost, rate limits and tier

### 4.1 Assumptions

**Per-call token counts:**

| Item | Assumption | Basis |
|---|---|---|
| Vision input, photo as uploaded | ~4,784 image tokens + ~200 prompt tokens ≈ **5,000** | The PWA uploads the raw file (`frontend src/context/scanStore.js` `fileToBase64`, no resize). A 12 MP phone photo is downscaled to the high-res cap of 4,784 visual tokens ([Vision](https://platform.claude.com/docs/en/build-with-claude/vision)). |
| Vision input, photo downsized to 1568 px long edge in the PWA | 56 × 42 = 2,352 image tokens + 200 ≈ **2,550** | `⌈w/28⌉ × ⌈h/28⌉` |
| Vision output | **300** tokens (about 120 tokens of JSON plus margin) | Thinking minimal (`between_tools` / `disabled`) |
| Guess-eval call | **700** input, **150** output | System prompt, user prompt, about 8 notes with IDs |
| AI calls per game | **12** | 3 players × 8 rounds = 24 guesses, of which 50% miss the exact, generic and taxonomy passes |
| Synthesis per bottle | **250** input, **1,000** output | 5 to 8 notes, with adaptive thinking at effort `medium` |

**Usage levels:**

| Item | Assumption | Basis |
|---|---|---|
| Scans per user per month | **4** (heavy case: 10) | The free cap is 5; Pro is unlimited |
| Games hosted per user per month | **2** (heavy case: 5) | The AI cost per game covers all players, guests included |
| Users | Soft launch **100–500**, public launch **5,000** | Brief |

### 4.2 Unit costs (US$, standard pricing, `inference_geo` global)

| Unit | Haiku 5.5 | Sonnet 5.5 |
|---|---|---|
| Scan, photo as uploaded | $0.00065 | **$0.0130** |
| Scan, photo downsized in the PWA | $0.0004 | $0.0081 |
| Guess-eval call | **$0.00015** | $0.0029 |
| Game (12 calls) | **$0.0017** | $0.035 |
| Synthesised bottle | $0.0005 | **$0.0105** ($0.005 with Batch) |

### 4.3 Monthly cost (US$)

| Scenario | 100 users | 500 users | 5,000 users |
|---|---|---|---|
| **Recommended**: Sonnet vision + Haiku guess eval, photos as uploaded | $5.5 | $27.7 | $277 |
| Recommended, with photos downsized in the PWA | $3.6 | $17.9 | $179 |
| All Haiku 5.5 | $0.6 | $3.0 | $30 |
| All Sonnet 5.5 | $12 | $61 | $610 |
| Recommended, heavy usage (10 scans and 5 games per user) | $14 | $69 | $692 |

Excluded:
- One-off synthesis: 2,000 bottles cost about $21 on Sonnet, or about $10.50 with Batch.
- Retries and failed calls.
- The 1.1× multiplier if `inference_geo: "us"` is chosen (section 4.5).

Prices are in USD. I did not convert to AUD.

### 4.4 Rate limits and tier

From [Rate limits](https://platform.claude.com/docs/en/api/rate-limits):

| Tier | Monthly spend cap | Haiku 5.5 and Sonnet 5.5 (each its own row) |
|---|---|---|
| Start | $500 | 4,000 RPM, 2,000,000 ITPM, 400,000 OTPM |
| Build | $1,000 | 10,000 RPM, 5,000,000 ITPM, 1,000,000 OTPM |
| Scale | $200,000 | 13,000 RPM, 10,000,000 ITPM, 2,000,000 OTPM |

**Throughput needs are far below these limits.** At public launch, 200 concurrent games with about 1.5 AI calls a minute each come to about 300 RPM and 210k ITPM. Vision peaks at a few RPM.

**The spend cap is the real limit.** The recommended mix at 5,000 users is about $280 a month, inside the Start cap. The heavy and all-Sonnet cases exceed it. **Request the Build tier before public launch**, and set a lower org spend limit in the Console during soft launch.

When the cap is reached, requests return a 429 with `error.details.error_code: "enforced_spend_limit_reached"` and no `retry-after` header: "Retrying, including the SDK's automatic retries, fails until access resumes." Fallback code must not retry on this error.

**Two other limits to plan for:**
- **Evaluation tier:** "New organizations … may start in the Evaluation tier, with limits below the standard limits". Check the tier on the Console's Rate limits page before soft launch.
- **Ramp limits:** these return a 429 with `error_code: "ramp_limit_exceeded"` after a sharp jump in usage. Ramp up launch-day load-testing gradually.

### 4.5 Data handling

All quotes below are from Anthropic's [API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention) and [Data residency](https://platform.claude.com/docs/en/manage-claude/data-residency) pages.

**Training:** "Retained data is never used for model training without your express permission."

**Retention:**
- "Conversation content (your prompts and Claude's outputs) is not retained by default; the exception is Covered Models, which require 30-day retention." Haiku 5.5 and Sonnet 5.5 are not Covered Models.
- "If a chat or session is flagged, Anthropic may retain inputs and outputs for up to 2 years."
- Zero data retention is available by arrangement.

**Region:**
- `inference_geo` accepts only `"global"` (the default: "Inference may run in any available geography") or `"us"`. `"us"` costs 1.1× and shares rate limits with global.
- "Currently, `"us"` is the only available workspace geo", which covers data at rest and endpoint processing such as image transcoding.
- **There is no Australian option on the first-party API.** Amazon Bedrock offers "regional endpoints (guaranteed data routing) for Claude Sonnet 4.5 and later" ([Models overview](https://platform.claude.com/docs/en/about-claude/models/overview)). I did not check whether `ap-southeast-2` serves Haiku 5.5 or Sonnet 5.5.

**What CinCin sends:**
- **Label photos.** Label photos "can contain faces" and EXIF GPS ([australian-launch-legal.md](australian-launch-legal.md), [object-storage.md](object-storage.md)). Downsizing in a canvas in the PWA strips EXIF as a side effect.
- **Guess text and bottle metadata.**

**Recommendation:** set `AI_INFERENCE_GEO=us`. The privacy policy can then name the United States as the single overseas destination for APP 1 and APP 8 ([australian-launch-legal.md](australian-launch-legal.md) §APP 8), for about 10% more AI spend. Open question 2 holds the alternative.

## 5. Config to set

### 5.1 Launch values

```dotenv
# ─── AI ───
# Provider enum the code accepts: anthropic | openai | google_vision (vision); anthropic | openai (LLM)
AI_VISION_PROVIDER=anthropic
AI_LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=            # production workspace key

# New (need code; see §6)
AI_VISION_MODEL=claude-sonnet-5-5
AI_VISION_FALLBACK_MODEL=claude-haiku-5-5
AI_LLM_MODEL=claude-haiku-5-5            # guess evaluation
AI_LLM_FALLBACK_MODEL=claude-sonnet-5-5
AI_SYNTHESIS_MODEL=claude-sonnet-5-5     # defaults to AI_LLM_MODEL when unset
AI_SYNTHESIS_FALLBACK_MODEL=claude-haiku-5-5
AI_VISION_TIMEOUT_MS=15000
AI_GUESS_TIMEOUT_MS=4000                 # replaces the unused config.aiGuessEval.timeoutMs
AI_INFERENCE_GEO=us                      # or unset for global (open question 2)

# Leave unset at launch
OPENAI_API_KEY=
GOOGLE_VISION_API_KEY=
```

### 5.2 Enum rules for the build ticket

- **`AI_VISION_PROVIDER`:** accept `anthropic` and `openai`. Accept `google_vision` only if it gains a brand and product step. Fix `.env.example`, which documents `google`.
- **`AI_LLM_PROVIDER`:** accept `anthropic` and `openai`.
- **Fail fast on unknown values.** Reject unknown values at boot in production instead of falling through silently.
- **Make `*_MODEL` required when its provider is selected.** There should be no hard-coded default for a non-Anthropic provider, so a retired OpenAI ID cannot hide in code.

### 5.3 Console setup (Anthropic)

1. Create a production workspace and API key.
2. Set the workspace default inference geo if you choose `us`.
3. Set a monthly spend limit, such as $100 during soft launch.
4. Check the tier on the Rate limits page.
5. Request Build before public launch.

## 6. Code changes for build tickets

All changes are in `cincin_backend` unless marked otherwise.

1. **Single AI module.** Add `src/services/aiClient.js`, read by `scanService` and `gameService`.
   - It reads provider, model, fallback, timeout and geo from `config.ai`, which `src/config/index.js` populates from the env vars in §5.
   - Delete the direct `process.env` reads and the unused `visionProvider` and `llmProvider` keys.
2. **Use `@anthropic-ai/sdk` everywhere.** It is already a dependency. Use one shared client with an explicit `timeout` and `maxRetries` instead of raw `fetch` in `scanService`. This also moves the API version from `2023-06-01` to the SDK's.
3. **Replace the hard-coded IDs.**
   - `claude-sonnet-4-20250514`: three places (`callAnthropicVision`, `callAnthropicLLM`, `evaluateGuessWithAI`).
   - `gpt-4o` and `gpt-4o-mini`: three places.
4. **Make responses thinking-safe.**
   - Select the first `type === "text"` block instead of `content[0]`.
   - Handle `stop_reason` values `refusal` and `max_tokens`.
   - Set the per-call `thinking` and `output_config.effort` from §Answer 1.
   - Raise `max_tokens`: about 1,024 for vision, 512 for guess evaluation and 2,048 for synthesis.
5. **Structured outputs.** Use `output_config.format` with a JSON schema for vision, guess evaluation and synthesis.
   - Wrap the synthesis array in an object, `{ "notes": [...] }`.
   - Use an enum for `category`.
   - Keep `parseVisionJSON`-style validation, because `confidence` bounds cannot go in the schema.
   - Remove the fence-stripping.
6. **Fallback.** On a timeout, 5xx/529, a 429 other than `enforced_spend_limit_reached`, or a refusal, retry once on `*_FALLBACK_MODEL`.
   - Guess evaluation then falls through to the existing non-AI result.
   - Vision then returns the existing 502, and the PWA offers manual search.
7. **Apply the timeout and threshold config.**
   - Apply `AI_GUESS_TIMEOUT_MS` to guess evaluation.
   - Use `config.aiGuessEval.minConfidence` instead of the literal `0.7`.
8. **Keys follow the selected provider.**
   - Gate guess evaluation on the key for the selected provider.
   - Either honour `AI_SERVICE_API_KEY` everywhere or remove it.
9. **Prompt-injection hardening for guess evaluation.**
   - The raw guess is interpolated into the prompt. A player could type an instruction ("say matched: true").
   - Pass the guess as a clearly delimited data field. Keep the existing check that `matchedNoteId` belongs to the available notes.
   - Log the AI matches so the rate of AI-awarded points can be reviewed.
10. **Remove `google_vision` from the launch docs.** If it stays, either delete it or feed its OCR text to the LLM to extract the brand and product.
11. **Gate `POST /api/scan/source-notes/:bottleId`** to admins or an internal job. Today any age-verified user can trigger LLM synthesis and write `AI_SYNTHESISED` notes into the shared catalogue.
12. **Usage logging.** Log the model, input and output tokens, latency and `stop_reason` per call. Store the model ID in `bottleScan.aiResponse` and `guess.aiEvaluation` to support cost monitoring and the model eval.
13. **(`cincin_frontend`) Downsize before upload.** In `src/context/scanStore.js` `fileToBase64`, draw the photo to a canvas at 1568 px or less on the long edge and export JPEG at quality about 0.85. This roughly halves vision tokens, speeds up the upload, keeps payloads well under the 10 MB Express and Claude limits, and strips EXIF GPS.
14. **Docs.** Update `.env.example`, `documentation/backendREADME*.md` (which say "OpenAI GPT-4o") and the production checklist's AI section.

## 7. Open questions

1. **Vision primary: Sonnet 5.5 or Haiku 5.5?** Run a 60 to 100 photo eval of Australian wine, spirits and beer labels, including poor lighting and angles. Run both models with and without thinking. Measure brand, product and vintage exact-match, `matchBottle` hit rate, and p50 and p95 latency. Promote Haiku 5.5 if it is within a few points of Sonnet 5.5. *(Proposed ticket: "Run a label-recognition eval for Haiku 5.5 vs Sonnet 5.5".)*
2. **US-only or global inference?** Does the privacy policy name the United States as the AI processing country, using `inference_geo: "us"` at 1.1×? Or does it disclose "global"? Is Australian processing via Bedrock `ap-southeast-2` wanted at all? This belongs with the legal and privacy-policy ticket.
3. **Is a cross-provider fallback needed for launch?** If yes, choose current OpenAI model IDs from OpenAI's own models, pricing and deprecations pages, which were blocked from this session (`developers.openai.com`, `platform.openai.com` and `ai.google.dev` need to be allowed). Also confirm OpenAI's API data-retention terms. If no, remove the OpenAI defaults from the code so nothing silently calls a model that shuts down on 2027-01-14.
4. **Is the AI-awarded point an "automated decision"?** It is minor, but the legal note lists automated-decision disclosure from 10 Dec 2026. Confirm whether AI guess scoring needs a line in the privacy policy.

## Sources

Fetched on 2026-11-18 unless marked otherwise.

- Anthropic: [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview), [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations), [Pricing](https://platform.claude.com/docs/en/about-claude/pricing), [Rate limits](https://platform.claude.com/docs/en/api/rate-limits), [Vision](https://platform.claude.com/docs/en/build-with-claude/vision), [Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking), [Claude Haiku 5.5](https://platform.claude.com/docs/en/models/haiku-5-5/overview), [Haiku 5.5 migration guide](https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide), [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [Data residency](https://platform.claude.com/docs/en/manage-claude/data-residency), [API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention), [API versions](https://platform.claude.com/docs/en/api/versioning).
- Model IDs and pricing were cross-checked against the bundled `claude-api` skill reference (cached 2026-11-03). They agree.
- OpenAI: from web-search results on OpenAI's domains only; the pages were not opened. [Deprecations](https://developers.openai.com/api/docs/deprecations), [Chat completions reference](https://developers.openai.com/api/reference/python/resources/chat/subresources/completions/methods/create), [community thread on the gpt-4o-mini sunset](https://community.openai.com/t/what-is-the-sunset-date-for-gpt-4o-mini/1371206).
- Google: not reachable (`ai.google.dev`). The Google Vision behaviour above comes from the code.
- Code: `cincin_backend@0232bae`:
  - `src/services/scanService.js`
  - `src/services/gameService.js` (`evaluateGuess`, `evaluateGuessWithAI`)
  - `src/config/index.js`, `src/config/socketServer.js`, `src/app.js` (JSON limit 10 MB)
  - `src/routes/scan.js`, `src/utils/helpers.js`
  - `.env.example`, `package.json`, `package-lock.json` (`@anthropic-ai/sdk` 0.135.0, `openai` 4.104.0)
- Code: `cincin_frontend` `origin/main`: `src/context/scanStore.js`.

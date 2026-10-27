import Anthropic from '@anthropic-ai/sdk';
import { normalizeScan, SCAN_SCHEMA, type ScanItem } from '../equipment-scan';

// Reads equipment out of a photo with Claude (D42, D47). This is the only place
// Cellar talks to the internet, and only when Seth taps "Add from photo".
// Without an API key the screen still works, with a blank form.

export const DEFAULT_VISION_MODEL = 'claude-opus-5-5';

export type ScanResult =
	{ status: 'ok'; items: ScanItem[] } | { status: 'off' } | { status: 'failed'; message: string };

type CreateParams = Anthropic.Beta.MessageCreateParamsNonStreaming;
type CreateFn = (params: CreateParams) => Promise<Anthropic.Beta.BetaMessage>;

export function visionModel(): string {
	return process.env.CELLAR_VISION_MODEL?.trim() || DEFAULT_VISION_MODEL;
}

export function recognitionOn(): boolean {
	return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

const PROMPT = `You catalog equipment for a home basement lab used for fermenting, growing mushrooms, a hydroponic tower, starting pepper and flower seeds, and canning.

List each distinct piece of equipment you can see in the photo.

Kinds:
- grow_container: grow bins, monotubs, grow bags, buckets, tubs, seed trays, pots, the hydroponic tower
- canner: water bath or pressure canners
- light: grow lights, shop lights
- fan: fans and air movers
- humidifier: humidifiers and foggers
- controller: timers, thermostats, environment controllers, heat mat controllers
- meter: pH and EC meters, thermometers, hygrometers, scales
- fermenter: crocks, mason jars, carboys, fermentation lids, airlocks, weights
- other: anything else that is clearly equipment

Rules:
- Put identical items in one entry with a count, e.g. 12 quart jars.
- Skip food, people, pets, packaging, furniture, and the room itself.
- name: short and plain, brand plus what it is plus its main size, e.g. "Presto 23 qt pressure canner" or "Ball wide mouth quart jar".
- brand and model: only what you can read or are confident of; otherwise an empty string.
- sizes: source "label" when the size is printed or embossed and readable in the photo, "known" when you are confident of the spec for that exact brand and model, "estimate" when you judged it from how the item looks. Leave out a size you cannot reasonably judge.
- Units: US units as the label gives them (gal, qt, pt, cup, fl_oz, in, ft, W). Use metric only when the label is metric. Liquid volume is "capacity".
- where: a few words that locate the item in the photo, e.g. "top shelf, left".
- If there is no equipment in the photo, return an empty list.`;

function defaultCreate(): CreateFn {
	const client = new Anthropic({ timeout: 90_000, maxRetries: 1 });
	return (params) => client.beta.messages.create(params);
}

/** Sends one JPEG to Claude and returns the items it found, cleaned up. */
export async function recognizeEquipment(
	jpeg: Uint8Array,
	opts: { create?: CreateFn; model?: string } = {}
): Promise<ScanResult> {
	if (!opts.create && !recognitionOn()) return { status: 'off' };
	const create = opts.create ?? defaultCreate();
	try {
		const res = await create({
			model: opts.model ?? visionModel(),
			max_tokens: 16000,
			// If a safety check declines the photo, Anthropic retries it on another model.
			betas: ['server-side-fallback-2026-07-01'],
			fallbacks: 'default',
			system: PROMPT,
			output_config: { format: { type: 'json_schema', schema: SCAN_SCHEMA } },
			messages: [
				{
					role: 'user',
					content: [
						{
							type: 'image',
							source: {
								type: 'base64',
								media_type: 'image/jpeg',
								data: Buffer.from(jpeg).toString('base64')
							}
						},
						{ type: 'text', text: 'List the equipment in this photo.' }
					]
				}
			]
		});
		if (res.stop_reason === 'refusal') {
			return { status: 'failed', message: 'Claude declined to read this photo.' };
		}
		if (res.stop_reason === 'max_tokens') {
			return { status: 'failed', message: 'The answer was cut off. Try a photo with fewer items.' };
		}
		const text = res.content.find((b) => b.type === 'text');
		if (!text || text.type !== 'text') {
			return { status: 'failed', message: 'Claude sent back no list.' };
		}
		return { status: 'ok', items: normalizeScan(JSON.parse(text.text)) };
	} catch (e) {
		return { status: 'failed', message: failureMessage(e) };
	}
}

function failureMessage(e: unknown): string {
	if (e instanceof Anthropic.AuthenticationError) return 'The API key was not accepted.';
	if (e instanceof Anthropic.RateLimitError) return 'Too many photos at once. Wait a minute.';
	if (e instanceof Anthropic.APIConnectionError)
		return 'Could not reach Anthropic. Is the internet up?';
	if (e instanceof Anthropic.APIError) return `Anthropic answered with an error (${e.status}).`;
	if (e instanceof SyntaxError) return 'Claude sent back something that was not a list.';
	return 'Something went wrong reading the photo.';
}

import { afterEach, describe, expect, it, vi } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { recognizeEquipment, visionModel } from './recognize';

// No test here talks to Anthropic: each one hands in its own `create`.

type Message = Anthropic.Beta.BetaMessage;

function reply(text: string, stop_reason: Message['stop_reason'] = 'end_turn'): Message {
	return {
		id: 'msg_test',
		type: 'message',
		role: 'assistant',
		model: 'claude-opus-5-5',
		content: [{ type: 'text', text, citations: null }],
		stop_reason,
		stop_sequence: null
	} as unknown as Message;
}

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

afterEach(() => vi.unstubAllEnvs());

describe('recognizeEquipment', () => {
	it('sends the photo and schema, and cleans up the answer', async () => {
		const create = vi.fn<(p: Anthropic.Beta.MessageCreateParamsNonStreaming) => Promise<Message>>(
			async () =>
				reply(
					JSON.stringify({
						items: [
							{
								name: 'Ball quart jar',
								brand: 'Ball',
								model: '',
								kind: 'fermenter',
								count: 12,
								where: 'top shelf',
								sizes: [{ name: 'capacity', value: 1, unit: 'qt', source: 'label' }]
							}
						]
					})
				)
		);
		const result = await recognizeEquipment(jpeg, { create, model: 'claude-test' });

		expect(result).toEqual({
			status: 'ok',
			items: [expect.objectContaining({ name: 'Ball quart jar', count: 12 })]
		});
		const params = create.mock.calls[0][0];
		expect(params.model).toBe('claude-test');
		expect(params.output_config?.format).toMatchObject({ type: 'json_schema' });
		expect(params.fallbacks).toBe('default');
		const content = params.messages[0].content as Anthropic.Beta.BetaContentBlockParam[];
		expect(content[0]).toMatchObject({
			type: 'image',
			source: { type: 'base64', media_type: 'image/jpeg', data: '/9j/2Q==' }
		});
	});

	it('reports a refusal, a cut-off answer, or a non-list as failed', async () => {
		const refused = await recognizeEquipment(jpeg, { create: async () => reply('', 'refusal') });
		expect(refused).toEqual({ status: 'failed', message: 'Claude declined to read this photo.' });

		const cut = await recognizeEquipment(jpeg, { create: async () => reply('{"it', 'max_tokens') });
		expect(cut.status).toBe('failed');

		const junk = await recognizeEquipment(jpeg, { create: async () => reply('a bucket') });
		expect(junk).toEqual({
			status: 'failed',
			message: 'Claude sent back something that was not a list.'
		});

		const offline = await recognizeEquipment(jpeg, {
			create: async () => {
				throw new Anthropic.APIConnectionError({ message: 'offline' });
			}
		});
		expect(offline).toEqual({
			status: 'failed',
			message: 'Could not reach Anthropic. Is the internet up?'
		});
	});

	it('is off without an API key, and uses the model setting', async () => {
		vi.stubEnv('ANTHROPIC_API_KEY', '');
		expect(await recognizeEquipment(jpeg)).toEqual({ status: 'off' });

		vi.stubEnv('CELLAR_VISION_MODEL', '');
		expect(visionModel()).toBe('claude-opus-5-5');
		vi.stubEnv('CELLAR_VISION_MODEL', 'claude-sonnet-5-5');
		expect(visionModel()).toBe('claude-sonnet-5-5');
	});
});

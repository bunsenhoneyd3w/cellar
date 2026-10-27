// Pure rules for comparing batches (D39 to D41), shared by the server and the
// compare screen. Batches line up on days since their own Day 0.

import { fixedPhases, type BatchType } from './enums';
import { dayNumber } from './time';
import type { TargetRange } from './protocol-body';

/** The most batches one comparison shows (D40). */
export const MAX_COMPARE = 4;

/**
 * Line color and dash per batch, in a fixed order. The colors are the first
 * four slots of a palette checked for color blindness; the dashes mean lines
 * can be told apart without color, on paper, or in bright basement light.
 */
export const SERIES_STYLES = [
	{ color: '#2a78d6', dash: '' },
	{ color: '#eb6834', dash: '7 4' },
	{ color: '#1baf7a', dash: '2 4' },
	{ color: '#eda100', dash: '10 4 2 4' }
] as const;

/** Days from `startIso` to `atIso` with the fraction kept, so two readings on one day do not overlap. */
export function daysSince(startIso: string, atIso: string): number {
	return (new Date(atIso).getTime() - new Date(startIso).getTime()) / 86_400_000;
}

/**
 * The day each phase was first seen on a check-in, as Day numbers. A phase
 * changed only on the edit screen leaves no check-in, so it is not here. The
 * first phase of a fixed list (germination, sown, spawn) can only be where a
 * batch starts, so once seen it counts from Day 0.
 */
export function phaseTimeline(
	observations: { observedAt: string; phase: string | null }[],
	startIso: string | null,
	firstPhase?: string
): Record<string, number> {
	const first: Record<string, string> = {};
	for (const o of observations) {
		if (!o.phase) continue;
		if (!first[o.phase] || o.observedAt < first[o.phase]) first[o.phase] = o.observedAt;
	}
	const days: Record<string, number> = {};
	for (const [phase, at] of Object.entries(first)) {
		days[phase] = startIso && phase !== firstPhase ? dayNumber(startIso, at) : 0;
	}
	return days;
}

/**
 * Rows for the phase table: a fixed list's phases in their own order, then any
 * free-text phases by the earliest day any batch reached them. Phases no batch
 * reached are left out.
 */
export function phaseRows(type: BatchType, timelines: Record<string, number>[]): string[] {
	const reached = new Map<string, number>();
	for (const t of timelines) {
		for (const [phase, day] of Object.entries(t)) {
			reached.set(phase, Math.min(day, reached.get(phase) ?? Infinity));
		}
	}
	const fixed = (fixedPhases(type) ?? []).filter((p) => reached.has(p));
	const rest = [...reached.entries()]
		.filter(([p]) => !fixed.includes(p))
		.sort((a, b) => a[1] - b[1])
		.map(([p]) => p);
	return [...fixed, ...rest];
}

/**
 * The target band a comparison chart can draw: only when every batch's
 * protocol copy has the same all-phases target for the kind. Otherwise the
 * batches were aiming at different things and no single band is honest.
 */
export function sharedTarget(targetLists: TargetRange[][], kind: string): TargetRange | undefined {
	const picks = targetLists.map((list) => list.find((t) => t.kind === kind && !t.phase));
	const first = picks[0];
	if (!first) return undefined;
	const same = picks.every(
		(t) => t && t.min === first.min && t.max === first.max && t.unit === first.unit
	);
	return same ? first : undefined;
}

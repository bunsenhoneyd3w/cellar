import { describe, expect, it } from 'vitest';
import {
	blankReviewItem,
	checkEstimates,
	normalizeScan,
	sizeSource,
	specsFromItem,
	toReview
} from './equipment-scan';

const canner = {
	name: 'Presto 23 qt pressure canner',
	brand: 'Presto',
	model: '01781',
	kind: 'canner',
	count: 1,
	where: 'floor, right',
	sizes: [{ name: 'capacity', value: 23, unit: 'qt', source: 'known' }]
};

describe('normalizeScan', () => {
	it('keeps good items and drops what does not fit', () => {
		const items = normalizeScan({
			items: [
				canner,
				{
					name: '  Quart jar  ',
					brand: 'Ball',
					model: '',
					kind: 'jar',
					count: 11.6,
					where: 'top shelf',
					sizes: [
						{ name: 'capacity', value: 1, unit: 'qt', source: 'label' },
						{ name: 'capacity', value: 32, unit: 'qt', source: 'label' },
						{ name: 'height', value: -3, unit: 'in', source: 'estimate' },
						{ name: 'weight', value: 2, unit: 'lb', source: 'estimate' }
					]
				},
				{ name: '', kind: 'light' },
				null,
				'bucket'
			]
		});
		expect(items).toHaveLength(2);
		expect(items[0]).toEqual({ ...canner, kind: 'canner' });
		expect(items[1]).toMatchObject({
			name: 'Quart jar',
			kind: 'other',
			count: 12,
			sizes: [{ name: 'capacity', value: 1, unit: 'qt', source: 'label' }]
		});
	});

	it('returns nothing for an answer of the wrong shape', () => {
		expect(normalizeScan(null)).toEqual([]);
		expect(normalizeScan({ items: 'none' })).toEqual([]);
		expect(normalizeScan({ items: [{ name: 'Fan', count: 0 }] })[0].count).toBe(1);
	});
});

describe('reviewing a scan', () => {
	const bucket = toReview(
		normalizeScan({
			items: [
				{
					name: '5 gal bucket',
					brand: '',
					model: '',
					kind: 'grow_container',
					count: 3,
					where: 'floor',
					sizes: [
						{ name: 'capacity', value: 5, unit: 'gal', source: 'estimate' },
						{ name: 'height', value: 14, unit: 'in', source: 'estimate' }
					]
				}
			]
		})
	)[0];

	it('asks for estimates to be confirmed or changed on ticked items only', () => {
		expect(checkEstimates([bucket])).toBe('Confirm or fix the estimated sizes on: 5 gal bucket.');
		expect(checkEstimates([{ ...bucket, keep: false }])).toBeNull();

		const fixed = {
			...bucket,
			sizes: [
				{ ...bucket.sizes[0], confirmed: true },
				{ ...bucket.sizes[1], value: 15 }
			]
		};
		expect(checkEstimates([fixed])).toBeNull();
		expect(fixed.sizes.map(sizeSource)).toEqual(['estimate', 'entered']);
	});

	it('writes specs with units and where each size came from', () => {
		const fixed = {
			...bucket,
			sizes: [
				{ ...bucket.sizes[0], confirmed: true },
				{ ...bucket.sizes[1], value: 15 }
			]
		};
		expect(specsFromItem(fixed)).toEqual({
			count: 3,
			capacity_gal: 5,
			capacity_gal_source: 'estimate',
			height_in: 15,
			height_in_source: 'entered'
		});
		const presto = toReview(normalizeScan({ items: [canner] }))[0];
		expect(specsFromItem(presto)).toEqual({
			brand: 'Presto',
			capacity_qt: 23,
			capacity_qt_source: 'known'
		});
		expect(specsFromItem(blankReviewItem())).toBeNull();
	});
});

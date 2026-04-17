import { describe, expect, test } from 'vitest';
import { FIXED_DESTINATION } from '../src/contracts/index.js';
import {
	buildCalibratedOffsetFromDestination,
	cardinalFromBearing,
	computeLiveUpdate,
	computeMaskedDistanceKm,
	distanceMeters,
} from '../src/domain/index.js';

describe('domain', () => {
	test('distance is zero at the same coordinates', () => {
		const value = distanceMeters(FIXED_DESTINATION, FIXED_DESTINATION);
		expect(value).toBeCloseTo(0, 6);
	});

	test('cardinal conversion works', () => {
		expect(cardinalFromBearing(0)).toBe('N');
		expect(cardinalFromBearing(90)).toBe('E');
		expect(cardinalFromBearing(180)).toBe('S');
		expect(cardinalFromBearing(270)).toBe('W');
	});

	test('distance masking follows 100km steps', () => {
		expect(computeMaskedDistanceKm(30_000)).toBe(100);
		expect(computeMaskedDistanceKm(120_000)).toBe(200);
	});

	test('live update becomes active in range', () => {
		const result = computeLiveUpdate({
			isSupported: true,
			isEnabled: true,
			isDestinationAnswered: false,
			distanceMeters: 250,
			startDistanceMeters: 300,
			anchorDistanceMeters: null
		});
		expect(result.type).toBe('active');
		if (result.type === 'active') {
			expect(result.progressPercent).toBeGreaterThanOrEqual(0);
		}
	});

	test('calibrated offset produces near target distance', () => {
		const target = 5_000;
		const mocked = buildCalibratedOffsetFromDestination(FIXED_DESTINATION, target, 180);
		const measured = distanceMeters(mocked, FIXED_DESTINATION);
		expect(Math.abs(measured - target)).toBeLessThan(30);
	});
});

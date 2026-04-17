import { okAsync } from 'neverthrow';
import { describe, expect, test } from 'vitest';
import { BeastLocatorService } from '../src/application/index.js';
import {
	cloneDefaultPersistedState,
	type ClockPort,
	type GeocoderPort,
	type PersistedState,
	type StoragePort
} from '../src/contracts/index.js';

const createServiceHarness = (loadedState: PersistedState | null) => {
	let savedState: PersistedState | null = null;

	const storage: StoragePort = {
		load: () => okAsync(loadedState),
		save: (state) => {
			savedState = state;
			return okAsync(undefined);
		}
	};

	const geocoder: GeocoderPort = {
		reverseGeocode: () => okAsync('resolved')
	};

	const clock: ClockPort = {
		nowMs: () => 0
	};

	return {
		service: new BeastLocatorService({
			storage,
			geocoder,
			clock,
			liveUpdateSupported: true
		}),
		getSavedState: (): PersistedState | null => savedState
	};
};

describe('BeastLocatorService sound settings migration', () => {
	test('promotes untouched legacy sound settings to enabled on initialize', async () => {
		const legacyState = cloneDefaultPersistedState();
		legacyState.settings.arrivalSoundEnabled = false;
		legacyState.settings.distance114514SoundEnabled = false;
		legacyState.settings.distanceIntervalSoundEnabled = false;
		legacyState.settings.soundSettingsPromoted = false;

		const { service, getSavedState } = createServiceHarness(legacyState);
		const result = await service.initialize();

		expect(result.isOk()).toBe(true);
		if (result.isErr()) {
			throw result.error;
		}

		expect(result.value.view.settings.arrivalSoundEnabled).toBe(true);
		expect(result.value.view.settings.distance114514SoundEnabled).toBe(true);
		expect(result.value.view.settings.distanceIntervalSoundEnabled).toBe(true);
		expect(result.value.view.settings.soundSettingsPromoted).toBe(true);
		expect(getSavedState()?.settings.arrivalSoundEnabled).toBe(true);
		expect(getSavedState()?.settings.distance114514SoundEnabled).toBe(true);
		expect(getSavedState()?.settings.distanceIntervalSoundEnabled).toBe(true);
	});

	test('preserves legacy custom sound combinations while marking migration complete', async () => {
		const legacyState = cloneDefaultPersistedState();
		legacyState.settings.arrivalSoundEnabled = true;
		legacyState.settings.distance114514SoundEnabled = false;
		legacyState.settings.distanceIntervalSoundEnabled = false;
		legacyState.settings.soundSettingsPromoted = false;

		const { service, getSavedState } = createServiceHarness(legacyState);
		const result = await service.initialize();

		expect(result.isOk()).toBe(true);
		if (result.isErr()) {
			throw result.error;
		}

		expect(result.value.view.settings.arrivalSoundEnabled).toBe(true);
		expect(result.value.view.settings.distance114514SoundEnabled).toBe(false);
		expect(result.value.view.settings.distanceIntervalSoundEnabled).toBe(false);
		expect(result.value.view.settings.soundSettingsPromoted).toBe(true);
		expect(getSavedState()?.settings.soundSettingsPromoted).toBe(true);
	});

	test('preserves explicit opt-out after migration has already completed', async () => {
		const migratedState = cloneDefaultPersistedState();
		migratedState.settings.arrivalSoundEnabled = false;
		migratedState.settings.distance114514SoundEnabled = false;
		migratedState.settings.distanceIntervalSoundEnabled = false;
		migratedState.settings.soundSettingsPromoted = true;

		const { service } = createServiceHarness(migratedState);
		const result = await service.initialize();

		expect(result.isOk()).toBe(true);
		if (result.isErr()) {
			throw result.error;
		}

		expect(result.value.view.settings.arrivalSoundEnabled).toBe(false);
		expect(result.value.view.settings.distance114514SoundEnabled).toBe(false);
		expect(result.value.view.settings.distanceIntervalSoundEnabled).toBe(false);
		expect(result.value.view.settings.soundSettingsPromoted).toBe(true);
	});
});

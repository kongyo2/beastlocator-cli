import type { ResultAsync } from 'neverthrow';
import type { AppError } from './errors.js';
import type { Coordinates, DomainSoundEffect, LocaleTag, PersistedState } from './models.js';

export type StoragePort = {
	load: () => ResultAsync<PersistedState | null, AppError>;
	save: (state: PersistedState) => ResultAsync<void, AppError>;
};

export type GeocoderPort = {
	reverseGeocode: (
		coordinates: Coordinates,
		locale: LocaleTag
	) => ResultAsync<string, AppError>;
};

export type ClockPort = {
	nowMs: () => number;
};

export type SoundPlayerPort = {
	play: (sound: DomainSoundEffect) => Promise<void>;
};

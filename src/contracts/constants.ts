import type { Coordinates } from './models.js';

export const FIXED_DESTINATION: Coordinates = Object.freeze({
	lat: 35.665554,
	lng: 139.669717
});

export const ARRIVAL_THRESHOLD_METERS = 50;
export const DISTANCE_MASK_STEP_KM = 100;
export const LIVE_UPDATE_START_MIN_METERS = 200;
export const LIVE_UPDATE_START_MAX_METERS = 5000;
export const LIVE_UPDATE_START_DEFAULT_METERS = 300;
export const DISTANCE_INTERVAL_SOUND_MIN_METERS = 100;
export const DISTANCE_INTERVAL_SOUND_MAX_METERS = 5000;
export const DISTANCE_INTERVAL_SOUND_DEFAULT_METERS = 1000;
export const DISTANCE_114514_METERS = 114_514;
export const DISTANCE_MATCH_TOLERANCE_METERS = 80;

export const APP_VERSION_NAME = '1';
export const APP_REVISION_ID = 'cli-migration';

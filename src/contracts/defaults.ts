import {
	DISTANCE_INTERVAL_SOUND_DEFAULT_METERS,
	LIVE_UPDATE_START_DEFAULT_METERS
} from './constants.js';
import type { PersistedState } from './models.js';

export const DEFAULT_PERSISTED_STATE: PersistedState = Object.freeze({
	settings: {
		arrivalNotificationEnabled: true,
		liveUpdateEnabled: true,
		liveUpdateStartDistanceMeters: LIVE_UPDATE_START_DEFAULT_METERS,
		backgroundLocationUpdateEnabled: true,
		widgetBearingMode: 'absolute',
		legacyCompassModeEnabled: false,
		landOnlyDestinationEnabled: false,
		distanceMaskButtonVisible: true,
		manualDistanceMaskEnabled: false,
		screenshotWarningEnabled: true,
		arrivalSoundEnabled: false,
		distance114514SoundEnabled: false,
		distanceIntervalSoundEnabled: false,
		compassSmoothingEnabled: true,
		distanceIntervalSoundMeters: DISTANCE_INTERVAL_SOUND_DEFAULT_METERS,
		debugMenuVisible: false,
		stableDebugMenuUnlockEnabled: false,
		nonJapaneseLanguageEnabled: true,
		backgroundPermissionGuideShown: false,
		welcomeCompleted: false,
		locale: 'ja'
	},
	runtime: {
		destinationAnswered: false,
		arrivalRearmRequired: false,
		arrivalDestinationName: null,
		currentLocation: null,
		headingDegrees: null,
		debugDistanceOverrideEnabled: false,
		liveUpdateAnchorDistanceMeters: null,
		previousDistanceMeters: null,
		lastIntervalBucket: null,
		distance114514SoundPlayed: false
	}
});

export const cloneDefaultPersistedState = (): PersistedState => ({
	settings: {...DEFAULT_PERSISTED_STATE.settings},
	runtime: {...DEFAULT_PERSISTED_STATE.runtime}
});

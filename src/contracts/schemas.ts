import { z } from 'zod';

export const coordinatesSchema = z.object({
	lat: z.number().finite().min(-90).max(90),
	lng: z.number().finite().min(-180).max(180)
});

export const localeTagSchema = z.enum(['ja', 'en', 'zh-CN']);
export const widgetBearingModeSchema = z.enum(['absolute', 'relative']);

export const settingsSchema = z.object({
	arrivalNotificationEnabled: z.boolean(),
	liveUpdateEnabled: z.boolean(),
	liveUpdateStartDistanceMeters: z.number().int().min(200).max(5000),
	backgroundLocationUpdateEnabled: z.boolean(),
	widgetBearingMode: widgetBearingModeSchema,
	legacyCompassModeEnabled: z.boolean(),
	landOnlyDestinationEnabled: z.boolean(),
	distanceMaskButtonVisible: z.boolean(),
	manualDistanceMaskEnabled: z.boolean(),
	screenshotWarningEnabled: z.boolean(),
	arrivalSoundEnabled: z.boolean(),
	distance114514SoundEnabled: z.boolean(),
	distanceIntervalSoundEnabled: z.boolean(),
	compassSmoothingEnabled: z.boolean(),
	distanceIntervalSoundMeters: z.number().int().min(100).max(5000),
	debugMenuVisible: z.boolean(),
	stableDebugMenuUnlockEnabled: z.boolean(),
	nonJapaneseLanguageEnabled: z.boolean(),
	backgroundPermissionGuideShown: z.boolean(),
	welcomeCompleted: z.boolean(),
	locale: localeTagSchema
});

export const runtimeSchema = z.object({
	destinationAnswered: z.boolean(),
	arrivalRearmRequired: z.boolean(),
	arrivalDestinationName: z.string().nullable(),
	currentLocation: coordinatesSchema.nullable(),
	headingDegrees: z.number().finite().min(0).max(360).nullable(),
	debugDistanceOverrideEnabled: z.boolean(),
	liveUpdateAnchorDistanceMeters: z.number().finite().nonnegative().nullable(),
	previousDistanceMeters: z.number().finite().nonnegative().nullable(),
	lastIntervalBucket: z.number().int().nonnegative().nullable(),
	distance114514SoundPlayed: z.boolean()
});

export const persistedStateSchema = z.object({
	settings: settingsSchema,
	runtime: runtimeSchema
});

export const locationInputSchema = z.object({
	latText: z.string().trim().min(1),
	lngText: z.string().trim().min(1)
});

export const numberInputSchema = z.object({
	valueText: z.string().trim().min(1)
});

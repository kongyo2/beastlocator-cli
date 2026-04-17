import {
	DISTANCE_114514_METERS,
	DISTANCE_INTERVAL_SOUND_MAX_METERS,
	DISTANCE_INTERVAL_SOUND_MIN_METERS,
	DISTANCE_MATCH_TOLERANCE_METERS
} from '../contracts/constants.js';

export const entered114514Range = (
	previousDistanceMeters: number | null,
	currentDistanceMeters: number
): boolean => {
	if (previousDistanceMeters === null) {
		return false;
	}

	const enterThreshold = DISTANCE_114514_METERS + DISTANCE_MATCH_TOLERANCE_METERS;
	return previousDistanceMeters > enterThreshold && currentDistanceMeters <= enterThreshold;
};

export const crossedIntervalBoundary = (
	previousDistanceMeters: number | null,
	currentDistanceMeters: number,
	intervalMeters: number
): boolean => {
	if (previousDistanceMeters === null) {
		return false;
	}

	const clampedInterval = Math.max(
		DISTANCE_INTERVAL_SOUND_MIN_METERS,
		Math.min(DISTANCE_INTERVAL_SOUND_MAX_METERS, intervalMeters)
	);
	const previousBucket = Math.floor(previousDistanceMeters / clampedInterval);
	const currentBucket = Math.floor(currentDistanceMeters / clampedInterval);
	return currentBucket < previousBucket;
};

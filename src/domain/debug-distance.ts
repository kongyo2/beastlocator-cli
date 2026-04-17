import type { Coordinates } from '../contracts/models.js';
import { distanceMeters } from './geo.js';

const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

export const offsetFromDestination = (
	destination: Coordinates,
	distanceInMeters: number,
	bearingDegrees: number
): Coordinates => {
	const angularDistance = distanceInMeters / EARTH_RADIUS_METERS;
	const bearing = toRadians(bearingDegrees);
	const lat1 = toRadians(destination.lat);
	const lng1 = toRadians(destination.lng);

	const lat2 = Math.asin(
		Math.sin(lat1) * Math.cos(angularDistance) +
			Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
	);
	const lng2 =
		lng1 +
		Math.atan2(
			Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
			Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
		);

	return {
		lat: toDegrees(lat2),
		lng: toDegrees(lng2)
	};
};

export const buildCalibratedOffsetFromDestination = (
	destination: Coordinates,
	targetDistanceMeters: number,
	bearingDegrees: number
): Coordinates => {
	if (targetDistanceMeters <= 0) {
		return destination;
	}

	let estimatedMeters = targetDistanceMeters;
	let candidate = offsetFromDestination(destination, estimatedMeters, bearingDegrees);
	for (let i = 0; i < 5; i += 1) {
		const actual = distanceMeters(candidate, destination);
		const error = targetDistanceMeters - actual;
		if (Math.abs(error) < 1) {
			return candidate;
		}
		const safeActual = Math.max(actual, 1);
		estimatedMeters = Math.max(0, estimatedMeters * (targetDistanceMeters / safeActual));
		candidate = offsetFromDestination(destination, estimatedMeters, bearingDegrees);
	}
	return candidate;
};

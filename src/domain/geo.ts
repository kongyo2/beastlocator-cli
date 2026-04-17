import type { CardinalDirection, Coordinates } from '../contracts/models.js';

const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

export const isFiniteNumber = (value: number): boolean =>
	Number.isFinite(value) && !Number.isNaN(value);

export const isValidCoordinates = (coordinates: Coordinates): boolean =>
	isFiniteNumber(coordinates.lat) &&
	isFiniteNumber(coordinates.lng) &&
	coordinates.lat >= -90 &&
	coordinates.lat <= 90 &&
	coordinates.lng >= -180 &&
	coordinates.lng <= 180;

export const distanceMeters = (from: Coordinates, to: Coordinates): number => {
	const lat1 = toRadians(from.lat);
	const lat2 = toRadians(to.lat);
	const deltaLat = toRadians(to.lat - from.lat);
	const deltaLng = toRadians(to.lng - from.lng);

	const halfChord =
		Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
		Math.cos(lat1) *
			Math.cos(lat2) *
			Math.sin(deltaLng / 2) *
			Math.sin(deltaLng / 2);
	const arc = 2 * Math.atan2(Math.sqrt(halfChord), Math.sqrt(1 - halfChord));
	return EARTH_RADIUS_METERS * arc;
};

export const normalizeTo360 = (value: number): number => {
	if (!isFiniteNumber(value)) {
		return 0;
	}

	const mod = value % 360;
	return mod < 0 ? mod + 360 : mod;
};

export const normalizeRotation = (value: number): number => {
	if (!isFiniteNumber(value)) {
		return 0;
	}

	let normalized = value % 360;
	if (normalized > 180) {
		normalized -= 360;
	}
	if (normalized < -180) {
		normalized += 360;
	}
	if (Math.abs(normalized) < 0.5) {
		return 0;
	}
	return normalized;
};

export const bearingDegrees = (from: Coordinates, to: Coordinates): number => {
	const lat1 = toRadians(from.lat);
	const lat2 = toRadians(to.lat);
	const deltaLng = toRadians(to.lng - from.lng);

	const y = Math.sin(deltaLng) * Math.cos(lat2);
	const x =
		Math.cos(lat1) * Math.sin(lat2) -
		Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
	const raw = toDegrees(Math.atan2(y, x));
	return normalizeTo360(raw);
};

export const smoothAngleDegrees = (
	current: number,
	target: number,
	alpha: number
): number => {
	const clampedAlpha = Math.max(0, Math.min(1, alpha));
	const delta = normalizeRotation(target - current);
	return normalizeTo360(current + delta * clampedAlpha);
};

export const cardinalFromBearing = (bearing: number): CardinalDirection => {
	const directions: CardinalDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
	const index = Math.floor((((bearing + 22.5) % 360) / 45) % directions.length);
	return directions[index] ?? 'N';
};

export const formatDistance = (distanceInMeters: number): string => {
	if (!isFiniteNumber(distanceInMeters) || distanceInMeters < 0) {
		return '--';
	}
	if (distanceInMeters >= 1000) {
		return `${(distanceInMeters / 1000).toFixed(2)} km`;
	}
	return `${Math.floor(distanceInMeters)} m`;
};

export const formatWidgetDistance = (distanceInMeters: number): string => {
	if (!isFiniteNumber(distanceInMeters) || distanceInMeters < 0) {
		return '--';
	}
	if (distanceInMeters >= 1000) {
		const km = distanceInMeters / 1000;
		return km >= 100 ? `${km.toFixed(0)} km` : `${km.toFixed(1)} km`;
	}
	return `${Math.floor(distanceInMeters)} m`;
};

export const toCoordinateText = (coordinates: Coordinates): string =>
	`${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`;

export const sameCoordinates = (a: Coordinates, b: Coordinates): boolean =>
	a.lat === b.lat && a.lng === b.lng;

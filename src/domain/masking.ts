import { DISTANCE_MASK_STEP_KM } from '../contracts/constants.js';

export const computeMaskedDistanceKm = (distanceMeters: number): number => {
	const distanceKm = distanceMeters / 1000;
	if (distanceKm <= DISTANCE_MASK_STEP_KM) {
		return DISTANCE_MASK_STEP_KM;
	}
	return Math.ceil(distanceKm / DISTANCE_MASK_STEP_KM) * DISTANCE_MASK_STEP_KM;
};

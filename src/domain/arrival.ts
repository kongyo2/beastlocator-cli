import { ARRIVAL_THRESHOLD_METERS } from '../contracts/constants.js';

export const shouldClearArrivalRearm = (
	arrivalRearmRequired: boolean,
	distanceInMeters: number
): boolean => arrivalRearmRequired && distanceInMeters > ARRIVAL_THRESHOLD_METERS;

export const shouldMarkArrived = (
	destinationAnswered: boolean,
	arrivalRearmRequired: boolean,
	distanceInMeters: number
): boolean =>
	!destinationAnswered &&
	!arrivalRearmRequired &&
	distanceInMeters <= ARRIVAL_THRESHOLD_METERS;

import { ARRIVAL_THRESHOLD_METERS } from '../contracts/constants.js';

export type LiveUpdateInput = {
	readonly isSupported: boolean;
	readonly isEnabled: boolean;
	readonly isDestinationAnswered: boolean;
	readonly distanceMeters: number;
	readonly startDistanceMeters: number;
	readonly anchorDistanceMeters: number | null;
};

export type LiveUpdateComputation =
	| {
			readonly type: 'inactive';
			readonly nextAnchorDistanceMeters: null;
	  }
	| {
			readonly type: 'active';
			readonly nextAnchorDistanceMeters: number;
			readonly progressPercent: number;
	  };

export const computeLiveUpdate = (input: LiveUpdateInput): LiveUpdateComputation => {
	if (!input.isSupported || !input.isEnabled || input.isDestinationAnswered) {
		return {
			type: 'inactive',
			nextAnchorDistanceMeters: null
		};
	}

	if (
		input.distanceMeters > input.startDistanceMeters ||
		input.distanceMeters <= ARRIVAL_THRESHOLD_METERS
	) {
		return {
			type: 'inactive',
			nextAnchorDistanceMeters: null
		};
	}

	const anchor =
		input.anchorDistanceMeters !== null && input.anchorDistanceMeters > ARRIVAL_THRESHOLD_METERS
			? input.anchorDistanceMeters
			: input.distanceMeters;

	const span = Math.max(anchor - ARRIVAL_THRESHOLD_METERS, 1);
	const progressPercent = Math.max(
		0,
		Math.min(100, Math.trunc(((anchor - input.distanceMeters) / span) * 100))
	);

	return {
		type: 'active',
		nextAnchorDistanceMeters: anchor,
		progressPercent
	};
};

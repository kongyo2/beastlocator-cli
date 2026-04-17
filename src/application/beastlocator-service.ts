import { err, errAsync, ok, okAsync, Result, ResultAsync } from 'neverthrow';
import {
	ARRIVAL_THRESHOLD_METERS,
	DISTANCE_INTERVAL_SOUND_MAX_METERS,
	DISTANCE_INTERVAL_SOUND_MIN_METERS,
	FIXED_DESTINATION,
	LIVE_UPDATE_START_MAX_METERS,
	LIVE_UPDATE_START_MIN_METERS,
	cloneDefaultPersistedState,
	createAppError,
	type AppError,
	type AppViewModel,
	type Coordinates,
	type DomainEvent,
	type LocaleTag,
	type OperationResult,
	type PersistedState,
	type SettingsState,
	type WidgetBearingMode
} from '../contracts/index.js';
import {
	buildCalibratedOffsetFromDestination,
	bearingDegrees,
	cardinalFromBearing,
	computeLiveUpdate,
	computeMaskedDistanceKm,
	crossedIntervalBoundary,
	distanceMeters,
	entered114514Range,
	formatDistance,
	isValidCoordinates,
	normalizeTo360,
	normalizeRotation,
	shouldClearArrivalRearm,
	shouldMarkArrived,
	smoothAngleDegrees
} from '../domain/index.js';
import type { ClockPort, GeocoderPort, StoragePort } from '../contracts/index.js';

type ServiceDependencies = {
	readonly storage: StoragePort;
	readonly geocoder: GeocoderPort;
	readonly clock: ClockPort;
	readonly liveUpdateSupported: boolean;
};

type RuntimeEvaluationResult = {
	readonly state: PersistedState;
	readonly events: DomainEvent[];
	readonly shouldResolveArrivalName: boolean;
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const toArrivalFallbackName = (): string => `${FIXED_DESTINATION.lat}, ${FIXED_DESTINATION.lng}`;

const cloneState = (state: PersistedState): PersistedState => ({
	settings: {...state.settings},
	runtime: {
		...state.runtime,
		currentLocation: state.runtime.currentLocation ? {...state.runtime.currentLocation} : null
	}
});

export class BeastLocatorService {
	private readonly deps: ServiceDependencies;
	private state: PersistedState | null = null;

	public constructor(dependencies: ServiceDependencies) {
		this.deps = dependencies;
	}

	public initialize(): ResultAsync<OperationResult, AppError> {
		return this.deps.storage.load().andThen((loaded) => {
			const baseState = loaded ?? cloneDefaultPersistedState();
			const normalized = this.normalizeLocalePolicy(baseState);
			this.state = normalized;
			return this.finalize(normalized, [
				{
					type: 'info',
					message: 'initialized'
				}
			]);
		});
	}

	public getOperationResult(): Result<OperationResult, AppError> {
		const stateResult = this.ensureState();
		if (stateResult.isErr()) {
			return err(stateResult.error);
		}

		const state = stateResult.value;
		return ok({
			state: cloneState(state),
			view: this.buildViewModel(state),
			events: []
		});
	}

	public updateCurrentLocationFromSystem(coordinates: Coordinates): ResultAsync<OperationResult, AppError> {
		const validated = this.validateCoordinates(coordinates);
		if (validated.isErr()) {
			return errAsync(validated.error);
		}

		const stateResult = this.ensureState();
		if (stateResult.isErr()) {
			return errAsync(stateResult.error);
		}

		const state = stateResult.value;
		if (state.runtime.debugDistanceOverrideEnabled) {
			return errAsync(
				createAppError('invalid_operation', 'Debug distance override is active', {
					action: 'updateCurrentLocationFromSystem'
				})
			);
		}

		const draft = cloneState(state);
		draft.runtime.currentLocation = validated.value;
		const evaluated = this.evaluateRuntime(draft);
		return this.finalize(evaluated.state, evaluated.events, evaluated.shouldResolveArrivalName);
	}

	public setHeadingDegrees(rawHeadingDegrees: number): ResultAsync<OperationResult, AppError> {
		if (!Number.isFinite(rawHeadingDegrees)) {
			return errAsync(createAppError('validation_failed', 'Heading must be a finite number'));
		}

		const stateResult = this.ensureState();
		if (stateResult.isErr()) {
			return errAsync(stateResult.error);
		}

		const state = stateResult.value;
		const draft = cloneState(state);
		const normalized = normalizeTo360(rawHeadingDegrees);
		if (draft.runtime.headingDegrees !== null && draft.settings.compassSmoothingEnabled) {
			const alpha = draft.settings.legacyCompassModeEnabled ? 0.1 : 0.15;
			draft.runtime.headingDegrees = smoothAngleDegrees(draft.runtime.headingDegrees, normalized, alpha);
		} else {
			draft.runtime.headingDegrees = normalized;
		}
		return this.finalize(draft, []);
	}

	public toggleManualDistanceMask(): ResultAsync<OperationResult, AppError> {
		const stateResult = this.ensureState();
		if (stateResult.isErr()) {
			return errAsync(stateResult.error);
		}
		const draft = cloneState(stateResult.value);
		if (!draft.settings.distanceMaskButtonVisible) {
			draft.settings.manualDistanceMaskEnabled = false;
		} else {
			draft.settings.manualDistanceMaskEnabled = !draft.settings.manualDistanceMaskEnabled;
		}
		return this.finalize(draft, []);
	}

	public resetArrivalProgress(): ResultAsync<OperationResult, AppError> {
		const stateResult = this.ensureState();
		if (stateResult.isErr()) {
			return errAsync(stateResult.error);
		}

		const draft = cloneState(stateResult.value);
		draft.runtime.destinationAnswered = false;
		draft.runtime.arrivalRearmRequired = true;
		draft.runtime.arrivalDestinationName = null;
		draft.runtime.liveUpdateAnchorDistanceMeters = null;
		const evaluated = this.evaluateRuntime(draft);
		return this.finalize(
			evaluated.state,
			[
				{
					type: 'info',
					message: 'arrival_progress_reset'
				},
				...evaluated.events
			],
			evaluated.shouldResolveArrivalName
		);
	}

	public markArrivedDebug(): ResultAsync<OperationResult, AppError> {
		const stateResult = this.ensureState();
		if (stateResult.isErr()) {
			return errAsync(stateResult.error);
		}

		const state = stateResult.value;
		const draft = cloneState(state);
		draft.runtime.destinationAnswered = true;
		draft.runtime.arrivalRearmRequired = false;
		draft.runtime.arrivalDestinationName = toArrivalFallbackName();
		draft.runtime.liveUpdateAnchorDistanceMeters = null;
		const events: DomainEvent[] = [
			{
				type: 'arrival',
				message: draft.runtime.arrivalDestinationName
			}
		];
		if (draft.settings.arrivalSoundEnabled) {
			events.push({
				type: 'sound',
				sound: 'arrival_0km'
			});
		}

		return this.finalize(draft, events, true);
	}

	public setDebugDistanceMeters(distanceInMeters: number): ResultAsync<OperationResult, AppError> {
		if (!Number.isFinite(distanceInMeters) || distanceInMeters < 0 || distanceInMeters > 20_000_000) {
			return errAsync(
				createAppError('validation_failed', 'Debug distance must be in 0..20,000,000', {
					distanceInMeters
				})
			);
		}

		const stateResult = this.ensureState();
		if (stateResult.isErr()) {
			return errAsync(stateResult.error);
		}

		const state = stateResult.value;
		const draft = cloneState(state);
		const previousDistance = draft.runtime.currentLocation
			? distanceMeters(draft.runtime.currentLocation, FIXED_DESTINATION)
			: null;
		const mockCurrent = buildCalibratedOffsetFromDestination(FIXED_DESTINATION, distanceInMeters, 180);
		draft.runtime.currentLocation = mockCurrent;
		draft.runtime.debugDistanceOverrideEnabled = true;
		if (distanceInMeters > ARRIVAL_THRESHOLD_METERS) {
			draft.runtime.arrivalRearmRequired = false;
			draft.runtime.destinationAnswered = false;
			draft.runtime.arrivalDestinationName = null;
		}

		const evaluated = this.evaluateRuntime(draft);
		const events: DomainEvent[] = [
			{
				type: 'info',
				message: `debug_distance_set_${Math.floor(distanceInMeters)}m`
			},
			...evaluated.events
		];

		if (
			draft.settings.distance114514SoundEnabled &&
			entered114514Range(previousDistance, distanceInMeters)
		) {
			events.push({
				type: 'sound',
				sound: 'distance_114514km'
			});
		}

		if (
			draft.settings.distanceIntervalSoundEnabled &&
			crossedIntervalBoundary(
				previousDistance,
				distanceInMeters,
				draft.settings.distanceIntervalSoundMeters
			)
		) {
			events.push({
				type: 'sound',
				sound: 'distance_interval_kankaku'
			});
		}

		return this.finalize(evaluated.state, events, evaluated.shouldResolveArrivalName);
	}

	public clearDebugDistanceOverride(): ResultAsync<OperationResult, AppError> {
		const stateResult = this.ensureState();
		if (stateResult.isErr()) {
			return errAsync(stateResult.error);
		}

		const draft = cloneState(stateResult.value);
		draft.runtime.debugDistanceOverrideEnabled = false;
		draft.runtime.currentLocation = null;
		draft.runtime.headingDegrees = null;
		draft.runtime.previousDistanceMeters = null;
		draft.runtime.lastIntervalBucket = null;
		draft.runtime.liveUpdateAnchorDistanceMeters = null;
		draft.runtime.distance114514SoundPlayed = false;

		return this.finalize(draft, [
			{
				type: 'info',
				message: 'debug_distance_cleared'
			}
		]);
	}

	public toggleSetting(settingKey: keyof SettingsState): ResultAsync<OperationResult, AppError> {
		const stateResult = this.ensureState();
		if (stateResult.isErr()) {
			return errAsync(stateResult.error);
		}

		const draft = cloneState(stateResult.value);
		const currentValue = draft.settings[settingKey];
		if (typeof currentValue !== 'boolean') {
			return errAsync(
				createAppError('invalid_operation', 'Requested setting is not a boolean toggle', {
					settingKey
				})
			);
		}

		const nextValue = !currentValue;
		draft.settings = {
			...draft.settings,
			[settingKey]: nextValue
		};

		if (settingKey === 'distanceMaskButtonVisible' && !nextValue) {
			draft.settings.manualDistanceMaskEnabled = false;
		}
		if (settingKey === 'liveUpdateEnabled' && !nextValue) {
			draft.runtime.liveUpdateAnchorDistanceMeters = null;
		}
		if (settingKey === 'distanceIntervalSoundEnabled' && !nextValue) {
			draft.runtime.lastIntervalBucket = null;
		}
		if (settingKey === 'nonJapaneseLanguageEnabled' && !nextValue) {
			draft.settings.locale = 'ja';
		}

		const evaluated = this.evaluateRuntime(draft);
		return this.finalize(
			evaluated.state,
			[
				{
					type: 'info',
					message: `setting_toggled_${String(settingKey)}_${nextValue ? 'on' : 'off'}`
				},
				...evaluated.events
			],
			evaluated.shouldResolveArrivalName
		);
	}

	public setWidgetBearingMode(mode: WidgetBearingMode): ResultAsync<OperationResult, AppError> {
		const stateResult = this.ensureState();
		if (stateResult.isErr()) {
			return errAsync(stateResult.error);
		}
		const draft = cloneState(stateResult.value);
		draft.settings.widgetBearingMode = mode;
		return this.finalize(draft, [
			{
				type: 'info',
				message: `widget_mode_${mode}`
			}
		]);
	}

	public setLiveUpdateStartDistanceMeters(
		liveUpdateStartMeters: number
	): ResultAsync<OperationResult, AppError> {
		if (!Number.isFinite(liveUpdateStartMeters)) {
			return errAsync(createAppError('validation_failed', 'Distance must be finite'));
		}
		const stateResult = this.ensureState();
		if (stateResult.isErr()) {
			return errAsync(stateResult.error);
		}
		const draft = cloneState(stateResult.value);
		draft.settings.liveUpdateStartDistanceMeters = clamp(
			Math.trunc(liveUpdateStartMeters),
			LIVE_UPDATE_START_MIN_METERS,
			LIVE_UPDATE_START_MAX_METERS
		);
		const evaluated = this.evaluateRuntime(draft);
		return this.finalize(evaluated.state, evaluated.events, evaluated.shouldResolveArrivalName);
	}

	public setDistanceIntervalSoundMeters(
		intervalDistanceMeters: number
	): ResultAsync<OperationResult, AppError> {
		if (!Number.isFinite(intervalDistanceMeters)) {
			return errAsync(createAppError('validation_failed', 'Distance must be finite'));
		}
		const stateResult = this.ensureState();
		if (stateResult.isErr()) {
			return errAsync(stateResult.error);
		}
		const draft = cloneState(stateResult.value);
		draft.settings.distanceIntervalSoundMeters = clamp(
			Math.trunc(intervalDistanceMeters),
			DISTANCE_INTERVAL_SOUND_MIN_METERS,
			DISTANCE_INTERVAL_SOUND_MAX_METERS
		);
		return this.finalize(draft, [
			{
				type: 'info',
				message: `distance_interval_${draft.settings.distanceIntervalSoundMeters}m`
			}
		]);
	}

	public setLocale(locale: LocaleTag): ResultAsync<OperationResult, AppError> {
		const stateResult = this.ensureState();
		if (stateResult.isErr()) {
			return errAsync(stateResult.error);
		}
		const draft = cloneState(stateResult.value);
		if (!draft.settings.nonJapaneseLanguageEnabled && locale !== 'ja') {
			return errAsync(
				createAppError('invalid_operation', 'Non-Japanese languages are disabled', {
					locale
				})
			);
		}
		draft.settings.locale = locale;
		return this.finalize(draft, [
			{
				type: 'info',
				message: `locale_${locale}`
			}
		]);
	}

	private normalizeLocalePolicy(state: PersistedState): PersistedState {
		const draft = cloneState(state);
		if (!draft.settings.nonJapaneseLanguageEnabled) {
			draft.settings.locale = 'ja';
		}
		return draft;
	}

	private ensureState(): Result<PersistedState, AppError> {
		if (this.state === null) {
			return err(createAppError('state_not_initialized', 'Service is not initialized yet'));
		}
		return ok(this.state);
	}

	private validateCoordinates(coordinates: Coordinates): Result<Coordinates, AppError> {
		if (!isValidCoordinates(coordinates)) {
			return err(
				createAppError('validation_failed', 'Coordinates are out of range', {
					lat: coordinates.lat,
					lng: coordinates.lng
				})
			);
		}
		return ok(coordinates);
	}

	private evaluateRuntime(state: PersistedState): RuntimeEvaluationResult {
		const draft = cloneState(state);
		const events: DomainEvent[] = [];
		const current = draft.runtime.currentLocation;
		if (current === null || !isValidCoordinates(current)) {
			draft.runtime.previousDistanceMeters = null;
			draft.runtime.lastIntervalBucket = null;
			draft.runtime.liveUpdateAnchorDistanceMeters = null;
			return {
				state: draft,
				events,
				shouldResolveArrivalName: false
			};
		}

		const distance = distanceMeters(current, FIXED_DESTINATION);
		if (shouldClearArrivalRearm(draft.runtime.arrivalRearmRequired, distance)) {
			draft.runtime.arrivalRearmRequired = false;
		}

		let shouldResolveArrivalName = false;
		if (
			shouldMarkArrived(
				draft.runtime.destinationAnswered,
				draft.runtime.arrivalRearmRequired,
				distance
			)
		) {
			draft.runtime.destinationAnswered = true;
			draft.runtime.arrivalDestinationName = toArrivalFallbackName();
			draft.runtime.liveUpdateAnchorDistanceMeters = null;
			events.push({
				type: 'arrival',
				message: draft.runtime.arrivalDestinationName
			});
			if (draft.settings.arrivalSoundEnabled) {
				events.push({
					type: 'sound',
					sound: 'arrival_0km'
				});
			}
			shouldResolveArrivalName = true;
		}

		const liveUpdate = computeLiveUpdate({
			isSupported: this.deps.liveUpdateSupported,
			isEnabled: draft.settings.liveUpdateEnabled,
			isDestinationAnswered: draft.runtime.destinationAnswered,
			distanceMeters: distance,
			startDistanceMeters: draft.settings.liveUpdateStartDistanceMeters,
			anchorDistanceMeters: draft.runtime.liveUpdateAnchorDistanceMeters
		});
		if (liveUpdate.type === 'inactive') {
			if (draft.runtime.liveUpdateAnchorDistanceMeters !== null) {
				events.push({
					type: 'live-progress-cancelled'
				});
			}
			draft.runtime.liveUpdateAnchorDistanceMeters = null;
		} else {
			draft.runtime.liveUpdateAnchorDistanceMeters = liveUpdate.nextAnchorDistanceMeters;
			events.push({
				type: 'live-progress',
				progressPercent: liveUpdate.progressPercent,
				remainingMeters: distance
			});
		}

		if (
			draft.settings.distance114514SoundEnabled &&
			!draft.runtime.distance114514SoundPlayed &&
			entered114514Range(draft.runtime.previousDistanceMeters, distance)
		) {
			draft.runtime.distance114514SoundPlayed = true;
			events.push({
				type: 'sound',
				sound: 'distance_114514km'
			});
		}

		if (draft.settings.distanceIntervalSoundEnabled && !draft.runtime.destinationAnswered) {
			if (
				crossedIntervalBoundary(
					draft.runtime.previousDistanceMeters,
					distance,
					draft.settings.distanceIntervalSoundMeters
				)
			) {
				events.push({
					type: 'sound',
					sound: 'distance_interval_kankaku'
				});
			}
			draft.runtime.lastIntervalBucket = Math.floor(
				distance / draft.settings.distanceIntervalSoundMeters
			);
		} else {
			draft.runtime.lastIntervalBucket = null;
		}

		draft.runtime.previousDistanceMeters = distance;
		return {
			state: draft,
			events,
			shouldResolveArrivalName
		};
	}

	private resolveArrivalNameIfNeeded(state: PersistedState): ResultAsync<PersistedState, AppError> {
		if (!state.runtime.destinationAnswered) {
			return okAsync(state);
		}

		const locale = state.settings.locale;
		return this.deps.geocoder.reverseGeocode(FIXED_DESTINATION, locale).map((resolved) => {
			const draft = cloneState(state);
			draft.runtime.arrivalDestinationName = resolved;
			return draft;
		});
	}

	private finalize(
		nextState: PersistedState,
		initialEvents: DomainEvent[],
		resolveArrivalName = false
	): ResultAsync<OperationResult, AppError> {
		const normalized = this.normalizeLocalePolicy(nextState);
		const withOptionalResolution = resolveArrivalName
			? this.resolveArrivalNameIfNeeded(normalized)
			: okAsync(normalized);

		return withOptionalResolution.andThen((resolvedState) =>
			this.deps.storage.save(resolvedState).map(() => {
				this.state = resolvedState;
				const finalEvents =
					resolveArrivalName && resolvedState.runtime.arrivalDestinationName
						? [
								...initialEvents,
								{
									type: 'info',
									message: `arrival_name_resolved_${resolvedState.runtime.arrivalDestinationName}`
								} satisfies DomainEvent
						  ]
						: initialEvents;
				return {
					state: cloneState(resolvedState),
					view: this.buildViewModel(resolvedState),
					events: finalEvents
				};
			})
		);
	}

	private buildViewModel(state: PersistedState): AppViewModel {
		const location = state.runtime.currentLocation;
		let distance: number | null = null;
		let absoluteBearing: number | null = null;
		let displayBearing: number | null = null;
		let arrowRotation: number | null = null;
		let cardinal = null;
		let displayDistanceText = '--';
		let displayDirectionText = '--';
		let liveUpdateProgressPercent: number | null = null;

		if (location !== null && isValidCoordinates(location)) {
			distance = distanceMeters(location, FIXED_DESTINATION);
			absoluteBearing = bearingDegrees(location, FIXED_DESTINATION);
			cardinal = cardinalFromBearing(absoluteBearing);

			if (state.settings.widgetBearingMode === 'relative' && state.runtime.headingDegrees !== null) {
				displayBearing = normalizeTo360(absoluteBearing - state.runtime.headingDegrees);
			} else {
				displayBearing = absoluteBearing;
			}
			arrowRotation = normalizeRotation(displayBearing - 45);

			if (state.settings.manualDistanceMaskEnabled) {
				displayDistanceText = `${computeMaskedDistanceKm(distance)} km`;
				displayDirectionText = '--';
			} else {
				displayDistanceText = formatDistance(distance);
				displayDirectionText = cardinal;
			}

			if (state.runtime.liveUpdateAnchorDistanceMeters !== null) {
				const span = Math.max(
					state.runtime.liveUpdateAnchorDistanceMeters - ARRIVAL_THRESHOLD_METERS,
					1
				);
				liveUpdateProgressPercent = Math.max(
					0,
					Math.min(
						100,
						Math.trunc(
							((state.runtime.liveUpdateAnchorDistanceMeters - distance) / span) * 100
						)
					)
				);
			}
		}

		return {
			destination: FIXED_DESTINATION,
			settings: state.settings,
			runtime: state.runtime,
			navigation: {
				distanceMeters: distance,
				bearingDegrees: absoluteBearing,
				displayBearingDegrees: displayBearing,
				arrowRotationDegrees: arrowRotation,
				cardinal,
				displayDistanceText,
				displayDirectionText,
				liveUpdateProgressPercent
			}
		};
	}
}

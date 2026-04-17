export type LocaleTag = 'ja' | 'en' | 'zh-CN';
export type WidgetBearingMode = 'absolute' | 'relative';
export type CardinalDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export type Coordinates = {
	lat: number;
	lng: number;
};

export type SettingsState = {
	arrivalNotificationEnabled: boolean;
	systemLocationEnabled: boolean;
	liveUpdateEnabled: boolean;
	liveUpdateStartDistanceMeters: number;
	backgroundLocationUpdateEnabled: boolean;
	widgetBearingMode: WidgetBearingMode;
	legacyCompassModeEnabled: boolean;
	landOnlyDestinationEnabled: boolean;
	distanceMaskButtonVisible: boolean;
	manualDistanceMaskEnabled: boolean;
	screenshotWarningEnabled: boolean;
	textArrowFallbackEnabled: boolean;
	arrivalSoundEnabled: boolean;
	distance114514SoundEnabled: boolean;
	distanceIntervalSoundEnabled: boolean;
	compassSmoothingEnabled: boolean;
	distanceIntervalSoundMeters: number;
	debugMenuVisible: boolean;
	stableDebugMenuUnlockEnabled: boolean;
	nonJapaneseLanguageEnabled: boolean;
	backgroundPermissionGuideShown: boolean;
	welcomeCompleted: boolean;
	locale: LocaleTag;
};

export type RuntimeState = {
	destinationAnswered: boolean;
	arrivalRearmRequired: boolean;
	arrivalDestinationName: string | null;
	currentLocation: Coordinates | null;
	headingDegrees: number | null;
	debugDistanceOverrideEnabled: boolean;
	liveUpdateAnchorDistanceMeters: number | null;
	previousDistanceMeters: number | null;
	lastIntervalBucket: number | null;
	distance114514SoundPlayed: boolean;
};

export type PersistedState = {
	settings: SettingsState;
	runtime: RuntimeState;
};

export type DomainSoundEffect = 'arrival_0km' | 'distance_114514km' | 'distance_interval_kankaku';

export type DomainEvent =
	| {
			type: 'arrival';
			message: string;
	  }
	| {
			type: 'sound';
			sound: DomainSoundEffect;
	  }
	| {
			type: 'live-progress';
			progressPercent: number;
			remainingMeters: number;
	  }
	| {
			type: 'live-progress-cancelled';
	  }
	| {
			type: 'info';
			message: string;
	  };

export type NavigationComputed = {
	distanceMeters: number | null;
	bearingDegrees: number | null;
	displayBearingDegrees: number | null;
	arrowRotationDegrees: number | null;
	cardinal: CardinalDirection | null;
	displayDistanceText: string;
	displayDirectionText: string;
	liveUpdateProgressPercent: number | null;
};

export type AppViewModel = {
	destination: Coordinates;
	settings: SettingsState;
	runtime: RuntimeState;
	navigation: NavigationComputed;
};

export type LocationProviderResult = {
	coordinates: Coordinates;
	source: 'device' | 'network';
};

export type OperationResult = {
	state: PersistedState;
	view: AppViewModel;
	events: DomainEvent[];
};

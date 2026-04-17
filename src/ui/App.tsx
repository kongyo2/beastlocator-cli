import React, { useEffect, useMemo, useState } from 'react';
import { Box, Spacer, Text, useApp, useInput, useWindowSize } from 'ink';
import Image, { TerminalInfoProvider } from 'ink-picture';
import {
	Alert,
	Badge,
	ConfirmInput,
	OrderedList,
	ProgressBar,
	Select,
	Spinner,
	StatusMessage,
	TextInput,
	ThemeProvider
} from '@inkjs/ui';
import type { ResultAsync } from 'neverthrow';
import type { BeastLocatorService } from '../application/index.js';
import { APP_REVISION_ID, APP_VERSION_NAME, type AppError, type DomainEvent, type LocaleTag, type OperationResult } from '../contracts/index.js';
import { OSS_CATALOG } from '../infra/index.js';
import { getBeastArrowImageSource } from './beast-arrow.js';
import { resolveDictionary } from './i18n.js';
import { CountBadge, DetailRow, MetricStrip, Panel, formatCoordinates, formatDegrees, type AccentColor, uiTheme } from './layout.js';

type AppProps = {
	readonly service: BeastLocatorService;
};

type UiStatus = {
	readonly variant: 'success' | 'error' | 'warning' | 'info';
	readonly message: string;
};

type Route =
	| { readonly kind: 'home' }
	| { readonly kind: 'main' }
	| { readonly kind: 'settings' }
	| { readonly kind: 'experimental' }
	| { readonly kind: 'about' }
	| { readonly kind: 'oss' }
	| { readonly kind: 'location-lat' }
	| { readonly kind: 'location-lng'; readonly latText: string }
	| { readonly kind: 'heading-input' }
	| { readonly kind: 'debug-distance-input' }
	| { readonly kind: 'live-update-start-input' }
	| { readonly kind: 'interval-distance-input' }
	| { readonly kind: 'locale-select' }
	| { readonly kind: 'confirm-reset-arrival' }
	| { readonly kind: 'confirm-mark-arrived' };

const mapEventToMessage = (
	event: DomainEvent,
	fallbackLabel: string
): UiStatus => {
	if (event.type === 'arrival') {
		return {
			variant: 'success',
			message: `${fallbackLabel}: ${event.message}`
		};
	}
	if (event.type === 'sound') {
		return {
			variant: 'info',
			message: `sound: ${event.sound}`
		};
	}
	if (event.type === 'live-progress') {
		return {
			variant: 'info',
			message: `live: ${event.progressPercent}% (${Math.floor(event.remainingMeters)}m)`
		};
	}
	if (event.type === 'live-progress-cancelled') {
		return {
			variant: 'info',
			message: 'live update cancelled'
		};
	}
	return {
		variant: 'info',
		message: event.message
	};
};

const latestStatusFromEvents = (
	events: readonly DomainEvent[],
	defaultMessage: string
): UiStatus => {
	const latest = events[events.length - 1];
	if (!latest) {
		return {
			variant: 'success',
			message: defaultMessage
		};
	}
	return mapEventToMessage(latest, defaultMessage);
};

export const App = ({ service }: AppProps): React.JSX.Element => {
	const { exit } = useApp();
	const { columns, rows } = useWindowSize();
	const [route, setRoute] = useState<Route>({ kind: 'home' });
	const [isBusy, setIsBusy] = useState<boolean>(true);
	const [operationResult, setOperationResult] = useState<OperationResult | null>(null);
	const [status, setStatus] = useState<UiStatus | null>(null);
	const [lastEvents, setLastEvents] = useState<DomainEvent[]>([]);
	const [directionImageSrc, setDirectionImageSrc] = useState<string | null>(null);

	const locale: LocaleTag = operationResult?.view.settings.locale ?? 'ja';
	const i18n = useMemo(() => resolveDictionary(locale), [locale]);
	const isWideLayout = columns >= 110;
	const visibleActionCount = Math.max(4, Math.min(9, rows - (isWideLayout ? 18 : 24)));

	const runOperation = (
		operation: ResultAsync<OperationResult, AppError>,
		successMessage: string
	): void => {
		setIsBusy(true);
		void operation.match(
			(result) => {
				setIsBusy(false);
				setOperationResult(result);
				setLastEvents(result.events);
				setStatus(latestStatusFromEvents(result.events, successMessage));
			},
			(error) => {
				setIsBusy(false);
				setStatus({
					variant: 'error',
					message: `${i18n.statusError}: ${error.message}`
				});
			}
		);
	};

	useEffect(() => {
		runOperation(service.initialize(), i18n.statusInitialized);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [service]);

	useInput((input, key) => {
		if (key.escape && route.kind !== 'home') {
			setRoute({ kind: 'home' });
		}
		if (route.kind === 'home' && input.toLowerCase() === 'q') {
			exit();
		}
	});

	const view = operationResult?.view ?? null;
	const settingState = view?.settings ?? null;
	const runtimeState = view?.runtime ?? null;
	const navigation = view?.navigation ?? null;

	useEffect(() => {
		let isActive = true;

		void (async () => {
			try {
				const nextSource = await getBeastArrowImageSource(navigation?.arrowRotationDegrees ?? null);
				if (isActive) {
					setDirectionImageSrc(nextSource);
				}
			} catch {
				if (isActive) {
					setDirectionImageSrc(null);
				}
			}
		})();

		return () => {
			isActive = false;
		};
	}, [navigation?.arrowRotationDegrees]);

	const boolText = (enabled: boolean): string => (enabled ? i18n.on : i18n.off);
	const toggleBadge = (enabled: boolean, offColor: AccentColor = 'yellow'): React.JSX.Element => (
		<Badge color={enabled ? 'green' : offColor}>{boolText(enabled)}</Badge>
	);
	const appendState = (label: string, value: string): string => `${label} [${value}]`;

	const currentRouteTitle = (() => {
		switch (route.kind) {
			case 'home':
				return i18n.homeMenuLabel;
			case 'main':
				return i18n.menuMain;
			case 'settings':
				return i18n.menuSettings;
			case 'experimental':
				return i18n.menuExperimental;
			case 'about':
				return i18n.menuAbout;
			case 'oss':
				return i18n.menuOss;
			case 'location-lat':
				return i18n.locationInputLat;
			case 'location-lng':
				return i18n.locationInputLng;
			case 'heading-input':
				return i18n.headingInput;
			case 'debug-distance-input':
				return i18n.debugDistanceInput;
			case 'live-update-start-input':
				return i18n.settingsLiveUpdateStartDistance;
			case 'interval-distance-input':
				return i18n.experimentalIntervalDistance;
			case 'locale-select':
				return i18n.experimentalLocale;
			case 'confirm-reset-arrival':
				return i18n.mainActionResetArrival;
			case 'confirm-mark-arrived':
				return i18n.mainActionMarkArrived;
		}
	})();

	const renderPanelStack = (panels: readonly React.ReactNode[]): React.JSX.Element => (
		<Box flexDirection="column">
			{panels.map((panel, index) => (
				<Box key={index} marginTop={index === 0 ? 0 : 1}>
					{panel}
				</Box>
			))}
		</Box>
	);

	const renderResponsiveColumns = (
		primaryPanels: readonly React.ReactNode[],
		secondaryPanels: readonly React.ReactNode[] = []
	): React.JSX.Element => {
		if (secondaryPanels.length === 0) {
			return <Box marginTop={1}>{renderPanelStack(primaryPanels)}</Box>;
		}

		if (isWideLayout) {
			return (
				<Box marginTop={1}>
					<Box flexDirection="column" flexGrow={3} marginRight={1}>
						{renderPanelStack(primaryPanels)}
					</Box>
					<Box flexDirection="column" flexGrow={2}>
						{renderPanelStack(secondaryPanels)}
					</Box>
				</Box>
			);
		}

		return (
			<Box flexDirection="column" marginTop={1}>
				{renderPanelStack(primaryPanels)}
				<Box marginTop={1}>{renderPanelStack(secondaryPanels)}</Box>
			</Box>
		);
	};

	const renderHeader = (): React.JSX.Element => (
		<Box borderColor="cyan" borderStyle="round" flexDirection="column" paddingLeft={1} paddingRight={1}>
			<Box>
				<Text bold color="cyan">
					{i18n.appTitle}
				</Text>
				<Text> </Text>
				<Badge color="cyan">{APP_VERSION_NAME}</Badge>
				<Text> </Text>
				<Badge color="blue">{locale}</Badge>
				{runtimeState?.debugDistanceOverrideEnabled ? (
					<>
						<Text> </Text>
						<Badge color="yellow">DEBUG</Badge>
					</>
				) : null}
				{settingState?.manualDistanceMaskEnabled ? (
					<>
						<Text> </Text>
						<Badge color="magenta">MASK</Badge>
					</>
				) : null}
				{runtimeState?.destinationAnswered ? (
					<>
						<Text> </Text>
						<Badge color="green">ARRIVED</Badge>
					</>
				) : null}
			</Box>
			<Box>
				<Text color="gray">{i18n.appSubtitle}</Text>
				<Spacer />
				<Badge color="blue">{currentRouteTitle}</Badge>
			</Box>
		</Box>
	);

	const renderStatus = (): React.JSX.Element | null => {
		if (!status && !isBusy) {
			return null;
		}

		return (
			<Box flexDirection="column" marginTop={1}>
				{isBusy ? <Spinner label="Loading" /> : null}
				{status ? (
					<Box marginTop={isBusy ? 1 : 0}>
						<StatusMessage variant={status.variant}>{status.message}</StatusMessage>
					</Box>
				) : null}
			</Box>
		);
	};

	const renderDirectionHero = (): React.JSX.Element => {
		if (!runtimeState || !navigation) {
			return <Text color="gray">{i18n.waitingLocation}</Text>;
		}

		const headlineDistance =
			runtimeState.currentLocation === null
				? i18n.waitingLocation
				: navigation.displayDistanceText;
		const directionText = settingState?.manualDistanceMaskEnabled
			? `${i18n.directionLabel}: --`
			: `${i18n.directionLabel}: ${navigation.displayDirectionText}`;
		const imageWidth = isWideLayout ? 28 : 22;

		if (runtimeState.destinationAnswered) {
			return (
				<Box flexDirection="column" alignItems="center">
					<Text bold color="green">
						{i18n.arrivalTitle}
					</Text>
					<Box marginTop={1}>
						<Text color="white">{runtimeState.arrivalDestinationName ?? i18n.arrivalNamePending}</Text>
					</Box>
				</Box>
			);
		}

		return (
			<Box flexDirection="column" alignItems="center">
				{directionImageSrc ? (
					<Image
						alt={`${i18n.directionLabel}: ${navigation.displayDirectionText}`}
						src={directionImageSrc}
						width={imageWidth}
					/>
				) : (
					<Text color="gray">{i18n.waitingLocation}</Text>
				)}
				<Box marginTop={1}>
					<Text bold color="cyan">
						{headlineDistance}
					</Text>
				</Box>
				<Text color={settingState?.manualDistanceMaskEnabled ? 'gray' : 'blue'}>{directionText}</Text>
			</Box>
		);
	};

	const renderMainSummary = (): React.JSX.Element => {
		if (!view || !runtimeState || !navigation) {
			return (
				<Panel accentColor="cyan" title={i18n.menuMain}>
					<Text>{i18n.notAvailable}</Text>
				</Panel>
			);
		}

		const directionBadgeColor: AccentColor =
			runtimeState.currentLocation === null || navigation.displayDirectionText === '--' ? 'blue' : 'green';

		return (
			<Panel
				accentColor="cyan"
				badge={
					runtimeState.destinationAnswered ? (
						<Badge color="green">{i18n.arrivalTitle}</Badge>
					) : (
						<Badge color={directionBadgeColor}>{navigation.displayDirectionText}</Badge>
					)
				}
				title={i18n.menuMain}
			>
				{runtimeState.debugDistanceOverrideEnabled ? (
					<Alert title="debug" variant="warning">
						{i18n.locationBlockedByDebug}
					</Alert>
				) : null}
				<Box marginTop={1}>
					{renderDirectionHero()}
				</Box>
				<Box marginTop={1}>
					<MetricStrip
						isWide={isWideLayout}
						items={[
							{ label: i18n.distanceLabel, value: navigation.displayDistanceText, color: 'cyan' },
							{ label: 'bearing', value: formatDegrees(navigation.displayBearingDegrees), color: 'green' },
							{ label: i18n.headingLabel, value: formatDegrees(runtimeState.headingDegrees), color: 'yellow' }
						]}
					/>
				</Box>
				<Box flexDirection="column" marginTop={1}>
					<DetailRow label={i18n.destinationLabel} valueText={formatCoordinates(view.destination)} />
					<DetailRow label={i18n.currentLocationLabel} valueText={formatCoordinates(runtimeState.currentLocation)} />
					<DetailRow label="bearing" valueText={formatDegrees(navigation.displayBearingDegrees)} />
					<DetailRow
						label={i18n.settingsWidgetBearingMode}
						valueText={
							settingState?.widgetBearingMode === 'absolute'
								? i18n.widgetModeAbsolute
								: i18n.widgetModeRelative
						}
					/>
				</Box>
				{navigation.liveUpdateProgressPercent !== null ? (
					<Box flexDirection="column" marginTop={1}>
						<DetailRow label={i18n.liveProgressLabel} valueColor="cyan" valueText={`${navigation.liveUpdateProgressPercent}%`} />
						<ProgressBar value={navigation.liveUpdateProgressPercent} />
					</Box>
				) : null}
			</Panel>
		);
	};

	const renderEventLog = (): React.JSX.Element | null => {
		return (
			<Panel accentColor="magenta" badge={<CountBadge color={lastEvents.length > 0 ? 'magenta' : 'blue'} value={lastEvents.length} />} title="events">
				{lastEvents.length === 0 ? (
					<Text color="gray">No recent events</Text>
				) : (
					<OrderedList>
						{lastEvents.slice(-5).map((event, index) => (
							<OrderedList.Item key={`${event.type}-${index}`}>
								<Text>{mapEventToMessage(event, i18n.statusSaved).message}</Text>
							</OrderedList.Item>
						))}
					</OrderedList>
				)}
			</Panel>
		);
	};

	const renderActionPanel = ({
		title,
		accentColor,
		options,
		onChange,
		helpText = 'arrows / enter',
		defaultValue,
		badge
	}: {
		readonly title: string;
		readonly accentColor: AccentColor;
		readonly options: Array<{ readonly label: string; readonly value: string }>;
		readonly onChange: (value: string) => void;
		readonly helpText?: string;
		readonly defaultValue?: string;
		readonly badge?: React.ReactNode;
	}): React.JSX.Element => (
		<Panel accentColor={accentColor} badge={badge ?? <CountBadge color={accentColor} value={options.length} />} title={title}>
			<Text color="gray">{helpText}</Text>
			<Select
				onChange={onChange}
				options={options}
				visibleOptionCount={Math.min(options.length, visibleActionCount)}
				{...(defaultValue ? { defaultValue } : {})}
			/>
		</Panel>
	);

	const runBooleanToggle = (key: keyof NonNullable<typeof settingState>): void => {
		if (!settingState) {
			return;
		}
		runOperation(service.toggleSetting(key), i18n.statusToggled);
	};

	const onMainAction = (value: string): void => {
		if (value === 'main:update-location') {
			setRoute({ kind: 'location-lat' });
			return;
		}
		if (value === 'main:update-heading') {
			setRoute({ kind: 'heading-input' });
			return;
		}
		if (value === 'main:toggle-mask') {
			runOperation(service.toggleManualDistanceMask(), i18n.statusToggled);
			return;
		}
		if (value === 'main:reset-arrival') {
			setRoute({ kind: 'confirm-reset-arrival' });
			return;
		}
		if (value === 'main:mark-arrived') {
			setRoute({ kind: 'confirm-mark-arrived' });
			return;
		}
		if (value === 'main:set-debug-distance') {
			setRoute({ kind: 'debug-distance-input' });
			return;
		}
		if (value === 'main:clear-debug-distance') {
			runOperation(service.clearDebugDistanceOverride(), i18n.statusDistanceCleared);
			return;
		}
		setRoute({ kind: 'home' });
	};

	const onSettingsAction = (value: string): void => {
		if (!settingState) {
			return;
		}
		if (value === 'settings:arrival-notification') {
			runBooleanToggle('arrivalNotificationEnabled');
			return;
		}
		if (value === 'settings:live-update') {
			runBooleanToggle('liveUpdateEnabled');
			return;
		}
		if (value === 'settings:live-update-distance') {
			setRoute({ kind: 'live-update-start-input' });
			return;
		}
		if (value === 'settings:background') {
			runBooleanToggle('backgroundLocationUpdateEnabled');
			return;
		}
		if (value === 'settings:widget-mode') {
			runOperation(
				service.setWidgetBearingMode(
					settingState.widgetBearingMode === 'absolute' ? 'relative' : 'absolute'
				),
				i18n.statusToggled
			);
			return;
		}
		if (value === 'settings:legacy-compass') {
			runBooleanToggle('legacyCompassModeEnabled');
			return;
		}
		if (value === 'settings:distance-mask-button') {
			runBooleanToggle('distanceMaskButtonVisible');
			return;
		}
		if (value === 'settings:screenshot-warning') {
			runBooleanToggle('screenshotWarningEnabled');
			return;
		}
		setRoute({ kind: 'home' });
	};

	const onExperimentalAction = (value: string): void => {
		if (!settingState) {
			return;
		}
		if (value === 'experimental:arrival-sound') {
			runBooleanToggle('arrivalSoundEnabled');
			return;
		}
		if (value === 'experimental:114514-sound') {
			runBooleanToggle('distance114514SoundEnabled');
			return;
		}
		if (value === 'experimental:interval-sound') {
			runBooleanToggle('distanceIntervalSoundEnabled');
			return;
		}
		if (value === 'experimental:interval-distance') {
			setRoute({ kind: 'interval-distance-input' });
			return;
		}
		if (value === 'experimental:compass-smoothing') {
			runBooleanToggle('compassSmoothingEnabled');
			return;
		}
		if (value === 'experimental:non-japanese') {
			runBooleanToggle('nonJapaneseLanguageEnabled');
			return;
		}
		if (value === 'experimental:locale') {
			setRoute({ kind: 'locale-select' });
			return;
		}
		setRoute({ kind: 'home' });
	};

	const renderHome = (): React.JSX.Element => (
		renderResponsiveColumns(
			[renderMainSummary(), renderEventLog()],
			[
				renderActionPanel({
					title: i18n.homeMenuLabel,
					accentColor: 'green',
					helpText: 'arrows / enter / q',
					onChange: (value) => {
						if (value === 'home:main') {
							setRoute({ kind: 'main' });
							return;
						}
						if (value === 'home:settings') {
							setRoute({ kind: 'settings' });
							return;
						}
						if (value === 'home:experimental') {
							setRoute({ kind: 'experimental' });
							return;
						}
						if (value === 'home:about') {
							setRoute({ kind: 'about' });
							return;
						}
						if (value === 'home:oss') {
							setRoute({ kind: 'oss' });
							return;
						}
						exit();
					},
					options: [
						{ label: i18n.menuMain, value: 'home:main' },
						{ label: i18n.menuSettings, value: 'home:settings' },
						{ label: i18n.menuExperimental, value: 'home:experimental' },
						{ label: i18n.menuAbout, value: 'home:about' },
						{ label: i18n.menuOss, value: 'home:oss' },
						{ label: i18n.menuExit, value: 'home:exit' }
					]
				})
			]
		)
	);

	const renderMain = (): React.JSX.Element => (
		renderResponsiveColumns(
			[renderMainSummary()],
			[
				renderActionPanel({
					title: i18n.mainActionsLabel,
					accentColor: 'cyan',
					onChange: onMainAction,
					options: [
						{ label: i18n.mainActionUpdateLocation, value: 'main:update-location' },
						{ label: i18n.mainActionUpdateHeading, value: 'main:update-heading' },
						{
							label: appendState(i18n.mainActionToggleMask, boolText(settingState?.manualDistanceMaskEnabled ?? false)),
							value: 'main:toggle-mask'
						},
						{ label: i18n.mainActionResetArrival, value: 'main:reset-arrival' },
						{ label: i18n.mainActionMarkArrived, value: 'main:mark-arrived' },
						{ label: i18n.mainActionSetDebugDistance, value: 'main:set-debug-distance' },
						{
							label: appendState(i18n.mainActionClearDebugDistance, boolText(runtimeState?.debugDistanceOverrideEnabled ?? false)),
							value: 'main:clear-debug-distance'
						},
						{ label: i18n.back, value: 'main:back' }
					]
				}),
				renderEventLog()
			]
		)
	);

	const renderSettings = (): React.JSX.Element => {
		if (!settingState) {
			return <Text>{i18n.notAvailable}</Text>;
		}
		return (
			renderResponsiveColumns(
				[
					<Panel accentColor="green" badge={<CountBadge color="green" value={8} />} title={i18n.menuSettings}>
						<DetailRow label={i18n.settingsArrivalNotification} valueNode={toggleBadge(settingState.arrivalNotificationEnabled)} />
						<DetailRow label={i18n.settingsLiveUpdate} valueNode={toggleBadge(settingState.liveUpdateEnabled)} />
						<DetailRow label={i18n.settingsLiveUpdateStartDistance} valueText={`${settingState.liveUpdateStartDistanceMeters}m`} />
						<DetailRow label={i18n.settingsBackgroundUpdate} valueNode={toggleBadge(settingState.backgroundLocationUpdateEnabled)} />
						<DetailRow
							label={i18n.settingsWidgetBearingMode}
							valueText={settingState.widgetBearingMode === 'absolute' ? i18n.widgetModeAbsolute : i18n.widgetModeRelative}
						/>
						<DetailRow label={i18n.settingsLegacyCompass} valueNode={toggleBadge(settingState.legacyCompassModeEnabled)} />
						<DetailRow label={i18n.settingsDistanceMaskButton} valueNode={toggleBadge(settingState.distanceMaskButtonVisible)} />
						<DetailRow label={i18n.settingsScreenshotWarning} valueNode={toggleBadge(settingState.screenshotWarningEnabled)} />
					</Panel>
				],
				[
					renderActionPanel({
						title: i18n.settingsActionsLabel,
						accentColor: 'green',
						onChange: onSettingsAction,
						options: [
							{
								label: appendState(i18n.settingsArrivalNotification, boolText(settingState.arrivalNotificationEnabled)),
								value: 'settings:arrival-notification'
							},
							{
								label: appendState(i18n.settingsLiveUpdate, boolText(settingState.liveUpdateEnabled)),
								value: 'settings:live-update'
							},
							{
								label: appendState(i18n.settingsLiveUpdateStartDistance, `${settingState.liveUpdateStartDistanceMeters}m`),
								value: 'settings:live-update-distance'
							},
							{
								label: appendState(i18n.settingsBackgroundUpdate, boolText(settingState.backgroundLocationUpdateEnabled)),
								value: 'settings:background'
							},
							{
								label: appendState(
									i18n.settingsWidgetBearingMode,
									settingState.widgetBearingMode === 'absolute' ? i18n.widgetModeAbsolute : i18n.widgetModeRelative
								),
								value: 'settings:widget-mode'
							},
							{
								label: appendState(i18n.settingsLegacyCompass, boolText(settingState.legacyCompassModeEnabled)),
								value: 'settings:legacy-compass'
							},
							{
								label: appendState(i18n.settingsDistanceMaskButton, boolText(settingState.distanceMaskButtonVisible)),
								value: 'settings:distance-mask-button'
							},
							{
								label: appendState(i18n.settingsScreenshotWarning, boolText(settingState.screenshotWarningEnabled)),
								value: 'settings:screenshot-warning'
							},
							{ label: i18n.back, value: 'settings:back' }
						]
					}),
					renderEventLog()
				]
			)
		);
	};

	const renderExperimental = (): React.JSX.Element => {
		if (!settingState) {
			return <Text>{i18n.notAvailable}</Text>;
		}
		return (
			renderResponsiveColumns(
				[
					<Panel accentColor="yellow" badge={<CountBadge color="yellow" value={7} />} title={i18n.menuExperimental}>
						<DetailRow label={i18n.experimentalArrivalSound} valueNode={toggleBadge(settingState.arrivalSoundEnabled)} />
						<DetailRow label={i18n.experimental114514Sound} valueNode={toggleBadge(settingState.distance114514SoundEnabled)} />
						<DetailRow label={i18n.experimentalIntervalSound} valueNode={toggleBadge(settingState.distanceIntervalSoundEnabled)} />
						<DetailRow label={i18n.experimentalIntervalDistance} valueText={`${settingState.distanceIntervalSoundMeters}m`} />
						<DetailRow label={i18n.experimentalCompassSmoothing} valueNode={toggleBadge(settingState.compassSmoothingEnabled)} />
						<DetailRow label={i18n.experimentalNonJapanese} valueNode={toggleBadge(settingState.nonJapaneseLanguageEnabled)} />
						<DetailRow label={i18n.experimentalLocale} valueText={settingState.locale} />
					</Panel>
				],
				[
					renderActionPanel({
						title: i18n.experimentalActionsLabel,
						accentColor: 'yellow',
						onChange: onExperimentalAction,
						options: [
							{
								label: appendState(i18n.experimentalArrivalSound, boolText(settingState.arrivalSoundEnabled)),
								value: 'experimental:arrival-sound'
							},
							{
								label: appendState(i18n.experimental114514Sound, boolText(settingState.distance114514SoundEnabled)),
								value: 'experimental:114514-sound'
							},
							{
								label: appendState(i18n.experimentalIntervalSound, boolText(settingState.distanceIntervalSoundEnabled)),
								value: 'experimental:interval-sound'
							},
							{
								label: appendState(i18n.experimentalIntervalDistance, `${settingState.distanceIntervalSoundMeters}m`),
								value: 'experimental:interval-distance'
							},
							{
								label: appendState(i18n.experimentalCompassSmoothing, boolText(settingState.compassSmoothingEnabled)),
								value: 'experimental:compass-smoothing'
							},
							{
								label: appendState(i18n.experimentalNonJapanese, boolText(settingState.nonJapaneseLanguageEnabled)),
								value: 'experimental:non-japanese'
							},
							{
								label: appendState(i18n.experimentalLocale, settingState.locale),
								value: 'experimental:locale'
							},
							{ label: i18n.back, value: 'experimental:back' }
						]
					}),
					renderEventLog()
				]
			)
		);
	};

	const renderAbout = (): React.JSX.Element => (
		renderResponsiveColumns(
			[
				<Panel accentColor="blue" badge={<Badge color="cyan">{APP_VERSION_NAME}</Badge>} title={i18n.menuAbout}>
					<DetailRow label={i18n.aboutVersion} valueText={APP_VERSION_NAME} />
					<DetailRow label={i18n.aboutRevision} valueText={APP_REVISION_ID} />
					<Box marginTop={1}>
						<Alert title={i18n.menuAbout} variant="warning">
							{i18n.aboutDisclaimer}
						</Alert>
					</Box>
				</Panel>
			],
			[
				renderActionPanel({
					title: i18n.back,
					accentColor: 'blue',
					onChange: () => setRoute({ kind: 'home' }),
					options: [{ label: i18n.back, value: 'about:back' }],
					badge: <CountBadge color="blue" value={1} />
				})
			]
		)
	);

	const renderOss = (): React.JSX.Element => (
		renderResponsiveColumns(
			[
				<Panel accentColor="blue" badge={<CountBadge color="blue" value={OSS_CATALOG.length} />} title={i18n.ossTitle}>
					<OrderedList>
						{OSS_CATALOG.map((entry) => (
							<OrderedList.Item key={entry.title}>
								<Text>
									{entry.title} ({entry.license}) - {entry.url}
								</Text>
							</OrderedList.Item>
						))}
					</OrderedList>
				</Panel>
			],
			[
				renderActionPanel({
					title: i18n.back,
					accentColor: 'blue',
					onChange: () => setRoute({ kind: 'home' }),
					options: [{ label: i18n.back, value: 'oss:back' }],
					badge: <CountBadge color="blue" value={1} />
				})
			]
		)
	);

	const renderInputScreen = ({
		title,
		placeholder,
		hint,
		details,
		onSubmit
	}: {
		readonly title: string;
		readonly placeholder: string;
		readonly hint: string;
		readonly details: ReadonlyArray<{ readonly label: string; readonly value: string }>;
		readonly onSubmit: (value: string) => void;
	}): React.JSX.Element =>
		renderResponsiveColumns(
			[renderMainSummary()],
			[
				<Panel accentColor="yellow" badge={<Badge color="yellow">INPUT</Badge>} title={title}>
					<Text color="gray">{hint}</Text>
					<Box flexDirection="column" marginTop={1}>
						{details.map((detail) => (
							<DetailRow key={`${detail.label}-${detail.value}`} label={detail.label} valueText={detail.value} />
						))}
					</Box>
					<Box marginTop={1}>
						<TextInput onSubmit={onSubmit} placeholder={placeholder} />
					</Box>
				</Panel>
			]
		);

	const renderLocationInput = (routeState: Extract<Route, { kind: 'location-lat' | 'location-lng' }>): React.JSX.Element => {
		if (routeState.kind === 'location-lat') {
			return renderInputScreen({
				title: i18n.locationInputLat,
				placeholder: '35.665554',
				hint: 'range: -90 .. 90',
				details: [{ label: i18n.currentLocationLabel, value: formatCoordinates(runtimeState?.currentLocation) }],
				onSubmit: (latText) => setRoute({ kind: 'location-lng', latText })
			});
		}

		return renderInputScreen({
			title: i18n.locationInputLng,
			placeholder: '139.669717',
			hint: 'range: -180 .. 180',
			details: [
				{ label: 'lat', value: routeState.latText },
				{ label: i18n.currentLocationLabel, value: formatCoordinates(runtimeState?.currentLocation) }
			],
			onSubmit: (lngText) => {
				const lat = Number(routeState.latText);
				const lng = Number(lngText);
				if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
					setStatus({
						variant: 'error',
						message: i18n.invalidCoordinates
					});
					setRoute({ kind: 'main' });
					return;
				}
				runOperation(
					service.updateCurrentLocationFromSystem({ lat, lng }),
					i18n.statusSaved
				);
				setRoute({ kind: 'main' });
			}
		});
	};

	const renderHeadingInput = (): React.JSX.Element => (
		renderInputScreen({
			title: i18n.headingInput,
			placeholder: '0',
			hint: 'range: 0 .. 360',
			details: [{ label: i18n.headingLabel, value: formatDegrees(runtimeState?.headingDegrees) }],
			onSubmit: (valueText) => {
				const value = Number(valueText);
				if (!Number.isFinite(value)) {
					setStatus({
						variant: 'error',
						message: i18n.invalidNumber
					});
					setRoute({ kind: 'main' });
					return;
				}
				runOperation(service.setHeadingDegrees(value), i18n.statusSaved);
				setRoute({ kind: 'main' });
			}
		})
	);

	const renderDebugDistanceInput = (): React.JSX.Element => (
		renderInputScreen({
			title: i18n.debugDistanceInput,
			placeholder: '1000',
			hint: 'range: 0 .. 20000000',
			details: [
				{ label: i18n.distanceLabel, value: navigation?.displayDistanceText ?? i18n.notAvailable },
				{ label: 'debug', value: boolText(runtimeState?.debugDistanceOverrideEnabled ?? false) }
			],
			onSubmit: (valueText) => {
				const value = Number(valueText);
				if (!Number.isFinite(value)) {
					setStatus({
						variant: 'error',
						message: i18n.invalidNumber
					});
					setRoute({ kind: 'main' });
					return;
				}
				runOperation(service.setDebugDistanceMeters(value), i18n.statusSaved);
				setRoute({ kind: 'main' });
			}
		})
	);

	const renderLiveUpdateStartInput = (): React.JSX.Element => (
		renderInputScreen({
			title: i18n.settingsLiveUpdateStartDistance,
			placeholder: '300',
			hint: 'meters',
			details: [
				{ label: i18n.settingsLiveUpdateStartDistance, value: `${settingState?.liveUpdateStartDistanceMeters ?? 0}m` },
				{ label: i18n.settingsLiveUpdate, value: boolText(settingState?.liveUpdateEnabled ?? false) }
			],
			onSubmit: (valueText) => {
				const value = Number(valueText);
				if (!Number.isFinite(value)) {
					setStatus({
						variant: 'error',
						message: i18n.invalidNumber
					});
					setRoute({ kind: 'settings' });
					return;
				}
				runOperation(service.setLiveUpdateStartDistanceMeters(value), i18n.statusSaved);
				setRoute({ kind: 'settings' });
			}
		})
	);

	const renderIntervalDistanceInput = (): React.JSX.Element => (
		renderInputScreen({
			title: i18n.experimentalIntervalDistance,
			placeholder: '1000',
			hint: 'meters',
			details: [
				{ label: i18n.experimentalIntervalDistance, value: `${settingState?.distanceIntervalSoundMeters ?? 0}m` },
				{ label: i18n.experimentalIntervalSound, value: boolText(settingState?.distanceIntervalSoundEnabled ?? false) }
			],
			onSubmit: (valueText) => {
				const value = Number(valueText);
				if (!Number.isFinite(value)) {
					setStatus({
						variant: 'error',
						message: i18n.invalidNumber
					});
					setRoute({ kind: 'experimental' });
					return;
				}
				runOperation(service.setDistanceIntervalSoundMeters(value), i18n.statusSaved);
				setRoute({ kind: 'experimental' });
			}
		})
	);

	const renderLocaleSelect = (): React.JSX.Element => (
		renderResponsiveColumns(
			[renderMainSummary()],
			[
				renderActionPanel({
					title: i18n.experimentalLocale,
					accentColor: 'yellow',
					defaultValue: `locale:${settingState?.locale ?? 'ja'}`,
					onChange: (value) => {
						if (value === 'locale:back') {
							setRoute({ kind: 'experimental' });
							return;
						}
						if (value === 'locale:ja') {
							runOperation(service.setLocale('ja'), i18n.statusLocaleChanged);
							setRoute({ kind: 'experimental' });
							return;
						}
						if (value === 'locale:en') {
							runOperation(service.setLocale('en'), i18n.statusLocaleChanged);
							setRoute({ kind: 'experimental' });
							return;
						}
						runOperation(service.setLocale('zh-CN'), i18n.statusLocaleChanged);
						setRoute({ kind: 'experimental' });
					},
					options: [
						{ label: 'ja', value: 'locale:ja' },
						{ label: 'en', value: 'locale:en' },
						{ label: 'zh-CN', value: 'locale:zh-CN' },
						{ label: i18n.back, value: 'locale:back' }
					]
				})
			]
		)
	);

	const renderConfirm = (kind: 'reset' | 'arrived'): React.JSX.Element => (
		renderResponsiveColumns(
			[renderMainSummary()],
			[
				<Panel accentColor="red" badge={<Badge color="red">CONFIRM</Badge>} title={kind === 'reset' ? i18n.mainActionResetArrival : i18n.mainActionMarkArrived}>
					<Alert title={kind === 'reset' ? i18n.mainActionResetArrival : i18n.mainActionMarkArrived} variant="warning">
						{i18n.confirmPrompt}
					</Alert>
					<Box marginTop={1}>
						<ConfirmInput
							onConfirm={() => {
								if (kind === 'reset') {
									runOperation(service.resetArrivalProgress(), i18n.statusArrivalReset);
									setRoute({ kind: 'main' });
									return;
								}
								runOperation(service.markArrivedDebug(), i18n.statusSaved);
								setRoute({ kind: 'main' });
							}}
							onCancel={() => setRoute({ kind: 'main' })}
						/>
					</Box>
				</Panel>
			]
		)
	);

	const renderRoute = (): React.JSX.Element => {
		if (route.kind === 'home') {
			return renderHome();
		}
		if (route.kind === 'main') {
			return renderMain();
		}
		if (route.kind === 'settings') {
			return renderSettings();
		}
		if (route.kind === 'experimental') {
			return renderExperimental();
		}
		if (route.kind === 'about') {
			return renderAbout();
		}
		if (route.kind === 'oss') {
			return renderOss();
		}
		if (route.kind === 'location-lat' || route.kind === 'location-lng') {
			return renderLocationInput(route);
		}
		if (route.kind === 'heading-input') {
			return renderHeadingInput();
		}
		if (route.kind === 'debug-distance-input') {
			return renderDebugDistanceInput();
		}
		if (route.kind === 'live-update-start-input') {
			return renderLiveUpdateStartInput();
		}
		if (route.kind === 'interval-distance-input') {
			return renderIntervalDistanceInput();
		}
		if (route.kind === 'locale-select') {
			return renderLocaleSelect();
		}
		if (route.kind === 'confirm-reset-arrival') {
			return renderConfirm('reset');
		}
		return renderConfirm('arrived');
	};

	const keyboardHint =
		route.kind === 'home'
			? 'Enter to select / q to exit'
			: route.kind === 'confirm-reset-arrival' || route.kind === 'confirm-mark-arrived'
				? 'Y / N / Enter to confirm  Esc to return home'
				: route.kind === 'location-lat' ||
					  route.kind === 'location-lng' ||
					  route.kind === 'heading-input' ||
					  route.kind === 'debug-distance-input' ||
					  route.kind === 'live-update-start-input' ||
					  route.kind === 'interval-distance-input'
					? 'Type and press Enter  Esc to return home'
					: 'Arrow keys / Enter  Esc to return home';

	return (
		<TerminalInfoProvider>
			<ThemeProvider theme={uiTheme}>
				<Box flexDirection="column">
					{renderHeader()}
					{renderStatus()}
					{renderRoute()}
					<Box marginTop={1}>
						<Text color="gray">{keyboardHint}</Text>
					</Box>
				</Box>
			</ThemeProvider>
		</TerminalInfoProvider>
	);
	};

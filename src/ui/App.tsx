import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import {
	Badge,
	ConfirmInput,
	OrderedList,
	ProgressBar,
	Select,
	Spinner,
	StatusMessage,
	TextInput
} from '@inkjs/ui';
import type { ResultAsync } from 'neverthrow';
import type { BeastLocatorService } from '../application/index.js';
import { APP_REVISION_ID, APP_VERSION_NAME, type AppError, type DomainEvent, type LocaleTag, type OperationResult } from '../contracts/index.js';
import { OSS_CATALOG } from '../infra/index.js';
import { resolveDictionary } from './i18n.js';

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
	const [route, setRoute] = useState<Route>({ kind: 'home' });
	const [isBusy, setIsBusy] = useState<boolean>(true);
	const [operationResult, setOperationResult] = useState<OperationResult | null>(null);
	const [status, setStatus] = useState<UiStatus | null>(null);
	const [lastEvents, setLastEvents] = useState<DomainEvent[]>([]);

	const locale: LocaleTag = operationResult?.view.settings.locale ?? 'ja';
	const i18n = useMemo(() => resolveDictionary(locale), [locale]);

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

	const renderHeader = (): React.JSX.Element => (
		<Box flexDirection="column">
			<Box>
				<Text bold>{i18n.appTitle}</Text>
				<Text> </Text>
				<Badge color="cyan">{APP_VERSION_NAME}</Badge>
			</Box>
			<Text color="gray">{i18n.appSubtitle}</Text>
		</Box>
	);

	const renderStatus = (): React.JSX.Element | null => {
		if (!status) {
			return null;
		}
		return <StatusMessage variant={status.variant}>{status.message}</StatusMessage>;
	};

	const renderMainSummary = (): React.JSX.Element => {
		if (!view || !runtimeState || !navigation) {
			return <Text>{i18n.notAvailable}</Text>;
		}

		return (
			<Box flexDirection="column" marginTop={1}>
				<Text>
					{i18n.destinationLabel}: {view.destination.lat.toFixed(6)}, {view.destination.lng.toFixed(6)}
				</Text>
				<Text>
					{i18n.currentLocationLabel}:{' '}
					{runtimeState.currentLocation
						? `${runtimeState.currentLocation.lat.toFixed(6)}, ${runtimeState.currentLocation.lng.toFixed(6)}`
						: i18n.notAvailable}
				</Text>
				<Text>
					{i18n.headingLabel}:{' '}
					{runtimeState.headingDegrees === null
						? i18n.notAvailable
						: `${runtimeState.headingDegrees.toFixed(1)}°`}
				</Text>
				<Text>
					{i18n.distanceLabel}: {navigation.displayDistanceText}
				</Text>
				<Text>
					{i18n.directionLabel}: {navigation.displayDirectionText}
				</Text>
				<Text>
					widget:{' '}
					{settingState?.widgetBearingMode === 'absolute'
						? i18n.widgetModeAbsolute
						: i18n.widgetModeRelative}
				</Text>
				{runtimeState.destinationAnswered ? (
					<Box flexDirection="column" marginTop={1}>
						<Text bold>{i18n.arrivalTitle}</Text>
						<Text>{runtimeState.arrivalDestinationName ?? i18n.arrivalNamePending}</Text>
					</Box>
				) : null}
				{navigation.liveUpdateProgressPercent !== null ? (
					<Box flexDirection="column" marginTop={1}>
						<Text>{i18n.liveProgressLabel}</Text>
						<ProgressBar value={navigation.liveUpdateProgressPercent} />
					</Box>
				) : null}
			</Box>
		);
	};

	const renderEventLog = (): React.JSX.Element | null => {
		if (lastEvents.length === 0) {
			return null;
		}

		return (
			<Box flexDirection="column" marginTop={1}>
				<Text color="gray">events:</Text>
				<OrderedList>
					{lastEvents.slice(-3).map((event, index) => (
						<OrderedList.Item key={`${event.type}-${index}`}>
							<Text>{mapEventToMessage(event, i18n.statusSaved).message}</Text>
						</OrderedList.Item>
					))}
				</OrderedList>
			</Box>
		);
	};

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
		<Box flexDirection="column" marginTop={1}>
			<Text>{i18n.homeMenuLabel}</Text>
			<Select
				options={[
					{ label: i18n.menuMain, value: 'home:main' },
					{ label: i18n.menuSettings, value: 'home:settings' },
					{ label: i18n.menuExperimental, value: 'home:experimental' },
					{ label: i18n.menuAbout, value: 'home:about' },
					{ label: i18n.menuOss, value: 'home:oss' },
					{ label: i18n.menuExit, value: 'home:exit' }
				]}
				onChange={(value) => {
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
				}}
			/>
		</Box>
	);

	const renderMain = (): React.JSX.Element => (
		<Box flexDirection="column" marginTop={1}>
			{renderMainSummary()}
			{renderEventLog()}
			<Box marginTop={1} flexDirection="column">
				<Text>{i18n.mainActionsLabel}</Text>
				<Select
					options={[
						{ label: i18n.mainActionUpdateLocation, value: 'main:update-location' },
						{ label: i18n.mainActionUpdateHeading, value: 'main:update-heading' },
						{ label: i18n.mainActionToggleMask, value: 'main:toggle-mask' },
						{ label: i18n.mainActionResetArrival, value: 'main:reset-arrival' },
						{ label: i18n.mainActionMarkArrived, value: 'main:mark-arrived' },
						{ label: i18n.mainActionSetDebugDistance, value: 'main:set-debug-distance' },
						{ label: i18n.mainActionClearDebugDistance, value: 'main:clear-debug-distance' },
						{ label: i18n.back, value: 'main:back' }
					]}
					onChange={onMainAction}
				/>
			</Box>
		</Box>
	);

	const renderSettings = (): React.JSX.Element => {
		if (!settingState) {
			return <Text>{i18n.notAvailable}</Text>;
		}
		return (
			<Box flexDirection="column" marginTop={1}>
				<Text>
					{i18n.settingsArrivalNotification}: {settingState.arrivalNotificationEnabled ? i18n.on : i18n.off}
				</Text>
				<Text>
					{i18n.settingsLiveUpdate}: {settingState.liveUpdateEnabled ? i18n.on : i18n.off}
				</Text>
				<Text>
					{i18n.settingsLiveUpdateStartDistance}: {settingState.liveUpdateStartDistanceMeters}m
				</Text>
				<Text>
					{i18n.settingsBackgroundUpdate}: {settingState.backgroundLocationUpdateEnabled ? i18n.on : i18n.off}
				</Text>
				<Text>
					{i18n.settingsWidgetBearingMode}:{' '}
					{settingState.widgetBearingMode === 'absolute' ? i18n.widgetModeAbsolute : i18n.widgetModeRelative}
				</Text>
				<Text>
					{i18n.settingsLegacyCompass}: {settingState.legacyCompassModeEnabled ? i18n.on : i18n.off}
				</Text>
				<Text>
					{i18n.settingsDistanceMaskButton}: {settingState.distanceMaskButtonVisible ? i18n.on : i18n.off}
				</Text>
				<Text>
					{i18n.settingsScreenshotWarning}: {settingState.screenshotWarningEnabled ? i18n.on : i18n.off}
				</Text>
				<Box marginTop={1} flexDirection="column">
					<Text>{i18n.settingsActionsLabel}</Text>
					<Select
						options={[
							{ label: i18n.settingsArrivalNotification, value: 'settings:arrival-notification' },
							{ label: i18n.settingsLiveUpdate, value: 'settings:live-update' },
							{
								label: i18n.settingsLiveUpdateStartDistance,
								value: 'settings:live-update-distance'
							},
							{ label: i18n.settingsBackgroundUpdate, value: 'settings:background' },
							{ label: i18n.settingsWidgetBearingMode, value: 'settings:widget-mode' },
							{ label: i18n.settingsLegacyCompass, value: 'settings:legacy-compass' },
							{ label: i18n.settingsDistanceMaskButton, value: 'settings:distance-mask-button' },
							{ label: i18n.settingsScreenshotWarning, value: 'settings:screenshot-warning' },
							{ label: i18n.back, value: 'settings:back' }
						]}
						onChange={onSettingsAction}
					/>
				</Box>
			</Box>
		);
	};

	const renderExperimental = (): React.JSX.Element => {
		if (!settingState) {
			return <Text>{i18n.notAvailable}</Text>;
		}
		return (
			<Box flexDirection="column" marginTop={1}>
				<Text>
					{i18n.experimentalArrivalSound}: {settingState.arrivalSoundEnabled ? i18n.on : i18n.off}
				</Text>
				<Text>
					{i18n.experimental114514Sound}: {settingState.distance114514SoundEnabled ? i18n.on : i18n.off}
				</Text>
				<Text>
					{i18n.experimentalIntervalSound}:{' '}
					{settingState.distanceIntervalSoundEnabled ? i18n.on : i18n.off}
				</Text>
				<Text>
					{i18n.experimentalIntervalDistance}: {settingState.distanceIntervalSoundMeters}m
				</Text>
				<Text>
					{i18n.experimentalCompassSmoothing}: {settingState.compassSmoothingEnabled ? i18n.on : i18n.off}
				</Text>
				<Text>
					{i18n.experimentalNonJapanese}: {settingState.nonJapaneseLanguageEnabled ? i18n.on : i18n.off}
				</Text>
				<Text>
					{i18n.experimentalLocale}: {settingState.locale}
				</Text>
				<Box marginTop={1} flexDirection="column">
					<Text>{i18n.experimentalActionsLabel}</Text>
					<Select
						options={[
							{ label: i18n.experimentalArrivalSound, value: 'experimental:arrival-sound' },
							{ label: i18n.experimental114514Sound, value: 'experimental:114514-sound' },
							{ label: i18n.experimentalIntervalSound, value: 'experimental:interval-sound' },
							{
								label: i18n.experimentalIntervalDistance,
								value: 'experimental:interval-distance'
							},
							{
								label: i18n.experimentalCompassSmoothing,
								value: 'experimental:compass-smoothing'
							},
							{ label: i18n.experimentalNonJapanese, value: 'experimental:non-japanese' },
							{ label: i18n.experimentalLocale, value: 'experimental:locale' },
							{ label: i18n.back, value: 'experimental:back' }
						]}
						onChange={onExperimentalAction}
					/>
				</Box>
			</Box>
		);
	};

	const renderAbout = (): React.JSX.Element => (
		<Box flexDirection="column" marginTop={1}>
			<Text>
				{i18n.aboutVersion}: {APP_VERSION_NAME}
			</Text>
			<Text>
				{i18n.aboutRevision}: {APP_REVISION_ID}
			</Text>
			<Text>{i18n.aboutDisclaimer}</Text>
			<Box marginTop={1}>
				<Select
					options={[{ label: i18n.back, value: 'about:back' }]}
					onChange={() => setRoute({ kind: 'home' })}
				/>
			</Box>
		</Box>
	);

	const renderOss = (): React.JSX.Element => (
		<Box flexDirection="column" marginTop={1}>
			<Text>{i18n.ossTitle}</Text>
			<OrderedList>
				{OSS_CATALOG.map((entry) => (
					<OrderedList.Item key={entry.title}>
						<Text>
							{entry.title} ({entry.license}) - {entry.url}
						</Text>
					</OrderedList.Item>
				))}
			</OrderedList>
			<Box marginTop={1}>
				<Select
					options={[{ label: i18n.back, value: 'oss:back' }]}
					onChange={() => setRoute({ kind: 'home' })}
				/>
			</Box>
		</Box>
	);

	const renderLocationInput = (routeState: Extract<Route, { kind: 'location-lat' | 'location-lng' }>): React.JSX.Element => {
		if (routeState.kind === 'location-lat') {
			return (
				<Box flexDirection="column" marginTop={1}>
					<Text>{i18n.locationInputLat}</Text>
					<TextInput
						placeholder="35.665554"
						onSubmit={(latText) => setRoute({ kind: 'location-lng', latText })}
					/>
				</Box>
			);
		}

		return (
			<Box flexDirection="column" marginTop={1}>
				<Text>{i18n.locationInputLng}</Text>
				<TextInput
					placeholder="139.669717"
					onSubmit={(lngText) => {
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
					}}
				/>
			</Box>
		);
	};

	const renderHeadingInput = (): React.JSX.Element => (
		<Box flexDirection="column" marginTop={1}>
			<Text>{i18n.headingInput}</Text>
			<TextInput
				placeholder="0"
				onSubmit={(valueText) => {
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
				}}
			/>
		</Box>
	);

	const renderDebugDistanceInput = (): React.JSX.Element => (
		<Box flexDirection="column" marginTop={1}>
			<Text>{i18n.debugDistanceInput}</Text>
			<TextInput
				placeholder="1000"
				onSubmit={(valueText) => {
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
				}}
			/>
		</Box>
	);

	const renderLiveUpdateStartInput = (): React.JSX.Element => (
		<Box flexDirection="column" marginTop={1}>
			<Text>{i18n.settingsLiveUpdateStartDistance}</Text>
			<TextInput
				placeholder="300"
				onSubmit={(valueText) => {
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
				}}
			/>
		</Box>
	);

	const renderIntervalDistanceInput = (): React.JSX.Element => (
		<Box flexDirection="column" marginTop={1}>
			<Text>{i18n.experimentalIntervalDistance}</Text>
			<TextInput
				placeholder="1000"
				onSubmit={(valueText) => {
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
				}}
			/>
		</Box>
	);

	const renderLocaleSelect = (): React.JSX.Element => (
		<Box flexDirection="column" marginTop={1}>
			<Text>{i18n.experimentalLocale}</Text>
			<Select
				options={[
					{ label: 'ja', value: 'locale:ja' },
					{ label: 'en', value: 'locale:en' },
					{ label: 'zh-CN', value: 'locale:zh-CN' },
					{ label: i18n.back, value: 'locale:back' }
				]}
				onChange={(value) => {
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
				}}
			/>
		</Box>
	);

	const renderConfirm = (kind: 'reset' | 'arrived'): React.JSX.Element => (
		<Box flexDirection="column" marginTop={1}>
			<Text>{i18n.confirmPrompt}</Text>
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

	return (
		<Box flexDirection="column">
			{renderHeader()}
			{isBusy ? <Spinner label="Loading" /> : null}
			{renderStatus()}
			{renderRoute()}
		</Box>
	);
};

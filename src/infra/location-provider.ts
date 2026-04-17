import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import { z } from 'zod';
import {
	createAppError,
	type AppError,
	type Coordinates,
	type LocationProviderPort,
	type LocationProviderResult
} from '../contracts/index.js';

const execFileAsync = promisify(execFile);

const coordinateTupleSchema = z.tuple([
	z.number().finite().min(-90).max(90),
	z.number().finite().min(-180).max(180)
]);

const ipInfoResponseSchema = z.object({
	loc: z.string().trim().min(3)
});

const freeIpApiResponseSchema = z.object({
	latitude: z.number().finite(),
	longitude: z.number().finite()
});

const ipSbResponseSchema = z.object({
	latitude: z.number().finite(),
	longitude: z.number().finite()
});

const termuxLocationResponseSchema = z.object({
	latitude: z.number().finite(),
	longitude: z.number().finite()
});

const WINDOWS_GEOLOCATION_SCRIPT = [
	'Add-Type -AssemblyName System.Device',
	'$watcher = New-Object System.Device.Location.GeoCoordinateWatcher',
	'$started = $watcher.TryStart($false, [TimeSpan]::FromSeconds(10))',
	'if (-not $started) { throw \'windows_geolocation_start_failed\' }',
	'$coord = $watcher.Position.Location',
	'if ($coord.IsUnknown) { throw \'windows_geolocation_unknown\' }',
	'$lat = $coord.Latitude.ToString([System.Globalization.CultureInfo]::InvariantCulture)',
	'$lng = $coord.Longitude.ToString([System.Globalization.CultureInfo]::InvariantCulture)',
	'Write-Output ($lat + \',\' + $lng)'
].join('; ');

type CommandRunner = (
	file: string,
	args: readonly string[]
) => Promise<{
	stdout: string;
	stderr: string;
}>;

type Fetcher = typeof fetch;

const defaultCommandRunner: CommandRunner = (file, args) =>
	execFileAsync(file, [...args], {
		encoding: 'utf8',
		timeout: 12_000,
		windowsHide: true
	});

const parseCoordinateTuple = (lat: number, lng: number): Coordinates | null => {
	const parsed = coordinateTupleSchema.safeParse([lat, lng]);
	if (!parsed.success) {
		return null;
	}

	return {
		lat: parsed.data[0],
		lng: parsed.data[1]
	};
};

const toLocationProviderResult = (
	coordinates: Coordinates | null,
	source: LocationProviderResult['source'],
	message: string
): ResultAsync<LocationProviderResult, AppError> => {
	if (coordinates === null) {
		return errAsync(createAppError('location_failed', message));
	}

	return okAsync<LocationProviderResult, AppError>({
		coordinates,
		source
	});
};

export const parseWindowsCoordinateOutput = (stdout: string): Coordinates | null => {
	const [latText, lngText] = stdout.trim().split(',', 2);
	return parseCoordinateTuple(Number(latText), Number(lngText));
};

export const parseIpInfoCoordinates = (payload: unknown): Coordinates | null => {
	const parsedPayload = ipInfoResponseSchema.safeParse(payload);
	if (!parsedPayload.success) {
		return null;
	}

	const [latText, lngText] = parsedPayload.data.loc.split(',', 2);
	return parseCoordinateTuple(Number(latText), Number(lngText));
};

export const parseFreeIpApiCoordinates = (payload: unknown): Coordinates | null => {
	const parsedPayload = freeIpApiResponseSchema.safeParse(payload);
	if (!parsedPayload.success) {
		return null;
	}

	return parseCoordinateTuple(
		parsedPayload.data.latitude,
		parsedPayload.data.longitude
	);
};

export const parseIpSbCoordinates = (payload: unknown): Coordinates | null => {
	const parsedPayload = ipSbResponseSchema.safeParse(payload);
	if (!parsedPayload.success) {
		return null;
	}

	return parseCoordinateTuple(
		parsedPayload.data.latitude,
		parsedPayload.data.longitude
	);
};

export const parseTermuxCoordinates = (payload: unknown): Coordinates | null => {
	const parsedPayload = termuxLocationResponseSchema.safeParse(payload);
	if (!parsedPayload.success) {
		return null;
	}

	return parseCoordinateTuple(
		parsedPayload.data.latitude,
		parsedPayload.data.longitude
	);
};

const readWindowsDeviceLocation = (
	commandRunner: CommandRunner
): ResultAsync<LocationProviderResult, AppError> => {
	if (process.platform !== 'win32') {
		return errAsync(
			createAppError('location_failed', 'Windows device geolocation is not available on this platform')
		);
	}

	return ResultAsync.fromPromise(
		commandRunner('powershell', ['-NoProfile', '-NonInteractive', '-Command', WINDOWS_GEOLOCATION_SCRIPT]),
		(error) =>
			createAppError('location_failed', 'Windows device geolocation failed', {
				reason: error instanceof Error ? error.message : 'unknown'
			})
	).andThen(({stdout}) =>
		toLocationProviderResult(
			parseWindowsCoordinateOutput(stdout),
			'device',
			'Windows device geolocation returned invalid coordinates'
		)
	);
};

const readTermuxLocation = (
	commandRunner: CommandRunner
): ResultAsync<LocationProviderResult, AppError> =>
	ResultAsync.fromPromise(
		commandRunner('termux-location', []),
		(error) =>
			createAppError('location_failed', 'Termux geolocation failed', {
				reason: error instanceof Error ? error.message : 'unknown'
			})
	)
		.andThen(({stdout}) =>
			ResultAsync.fromPromise(
				Promise.resolve(JSON.parse(stdout) as unknown),
				(error) =>
					createAppError('location_failed', 'Termux geolocation JSON parse failed', {
						reason: error instanceof Error ? error.message : 'unknown'
					})
			)
		)
		.andThen((payload) =>
			toLocationProviderResult(
				parseTermuxCoordinates(payload),
				'device',
				'Termux geolocation returned invalid coordinates'
			)
		);

const readJsonLocation = ({
	fetcher,
	url,
	requestName,
	parser
}: {
	fetcher: Fetcher;
	url: string;
	requestName: string;
	parser: (payload: unknown) => Coordinates | null;
}): ResultAsync<LocationProviderResult, AppError> =>
	ResultAsync.fromPromise(
		fetcher(url, {
			headers: {
				'user-agent': 'beastlocator-cli/1.0.0'
			},
			signal: AbortSignal.timeout(10_000)
		}),
		(error) =>
			createAppError('location_failed', `${requestName} request failed`, {
				reason: error instanceof Error ? error.message : 'unknown'
			})
	)
		.andThen((response) => {
			if (!response.ok) {
				return errAsync(
					createAppError('location_failed', `${requestName} request was rejected`, {
						status: response.status
					})
				);
			}

			return ResultAsync.fromPromise(
				response.json(),
				(error) =>
					createAppError('location_failed', `${requestName} JSON parse failed`, {
						reason: error instanceof Error ? error.message : 'unknown'
					})
			);
		})
		.andThen((payload) =>
			toLocationProviderResult(
				parser(payload),
				'network',
				`${requestName} returned invalid coordinates`
			)
		);

const chainLocationReaders = (
	readers: ReadonlyArray<() => ResultAsync<LocationProviderResult, AppError>>
): ResultAsync<LocationProviderResult, AppError> => {
	const [firstReader, ...restReaders] = readers;
	if (!firstReader) {
		return errAsync(createAppError('location_failed', 'No location providers are configured'));
	}

	return restReaders.reduce(
		(result, nextReader) => result.orElse(() => nextReader()),
		firstReader()
	);
};

export class SystemLocationProviderPort implements LocationProviderPort {
	private readonly commandRunner: CommandRunner;
	private readonly fetcher: Fetcher;

	public constructor(commandRunner: CommandRunner = defaultCommandRunner, fetcher: Fetcher = fetch) {
		this.commandRunner = commandRunner;
		this.fetcher = fetcher;
	}

	public getCurrentLocation(): ResultAsync<LocationProviderResult, AppError> {
		const readers: Array<() => ResultAsync<LocationProviderResult, AppError>> = [];

		if (process.env.TERMUX_VERSION) {
			readers.push(() => readTermuxLocation(this.commandRunner));
		}
		if (process.platform === 'win32') {
			readers.push(() => readWindowsDeviceLocation(this.commandRunner));
		}

		readers.push(() =>
			readJsonLocation({
				fetcher: this.fetcher,
				url: 'https://ipinfo.io/json',
				requestName: 'IP geolocation (ipinfo)',
				parser: parseIpInfoCoordinates
			})
		);
		readers.push(() =>
			readJsonLocation({
				fetcher: this.fetcher,
				url: 'https://freeipapi.com/api/json',
				requestName: 'IP geolocation (freeipapi)',
				parser: parseFreeIpApiCoordinates
			})
		);
		readers.push(() =>
			readJsonLocation({
				fetcher: this.fetcher,
				url: 'https://api.ip.sb/geoip',
				requestName: 'IP geolocation (ip.sb)',
				parser: parseIpSbCoordinates
			})
		);

		return chainLocationReaders(readers);
	}
}

export const createSystemLocationProviderPort = (): LocationProviderPort =>
	new SystemLocationProviderPort();

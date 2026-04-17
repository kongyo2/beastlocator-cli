import { okAsync, ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { createAppError, type AppError, type Coordinates, type GeocoderPort, type LocaleTag } from '../contracts/index.js';

const reverseResponseSchema = z.object({
	display_name: z.string().min(1).optional()
});

const toFallbackText = (coordinates: Coordinates): string =>
	`${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`;

const buildLanguageHeader = (locale: LocaleTag): string => {
	if (locale === 'zh-CN') {
		return 'zh-CN,zh;q=0.9,en;q=0.8';
	}
	if (locale === 'en') {
		return 'en-US,en;q=0.9';
	}
	return 'ja-JP,ja;q=0.9,en;q=0.8';
};

export class NominatimGeocoderPort implements GeocoderPort {
	public reverseGeocode(
		coordinates: Coordinates,
		locale: LocaleTag
	): ResultAsync<string, AppError> {
		const fallback = toFallbackText(coordinates);
		const endpoint = new URL('https://nominatim.openstreetmap.org/reverse');
		endpoint.searchParams.set('format', 'jsonv2');
		endpoint.searchParams.set('lat', String(coordinates.lat));
		endpoint.searchParams.set('lon', String(coordinates.lng));
		endpoint.searchParams.set('addressdetails', '0');

		return ResultAsync.fromPromise(
			fetch(endpoint.toString(), {
				headers: {
					'accept-language': buildLanguageHeader(locale),
					'user-agent': 'beastlocator-cli/1.0.0'
				}
			}),
			(error) =>
				createAppError('geocode_failed', 'Reverse geocoding request failed', {
					reason: error instanceof Error ? error.message : 'unknown'
				})
		)
			.andThen((response) => {
				if (!response.ok) {
					return okAsync<string, AppError>(fallback);
				}

				return ResultAsync.fromPromise(
					response.json(),
					(error) =>
						createAppError('geocode_failed', 'Reverse geocoding JSON parse failed', {
							reason: error instanceof Error ? error.message : 'unknown'
						})
				).andThen((payload) => {
					const parsed = reverseResponseSchema.safeParse(payload);
					if (!parsed.success) {
						return okAsync<string, AppError>(fallback);
					}
					const text = parsed.data.display_name;
					return okAsync<string, AppError>(text && text.trim().length > 0 ? text : fallback);
				});
			})
			.orElse(() => okAsync<string, AppError>(fallback));
	}
}

export const createNominatimGeocoderPort = (): GeocoderPort => new NominatimGeocoderPort();

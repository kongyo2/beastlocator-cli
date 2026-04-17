export type AppErrorCode =
	| 'validation_failed'
	| 'io_read_failed'
	| 'io_write_failed'
	| 'json_parse_failed'
	| 'geocode_failed'
	| 'location_failed'
	| 'state_not_initialized'
	| 'invalid_operation';

export type AppError = {
	readonly code: AppErrorCode;
	readonly message: string;
	readonly details?: Record<string, string | number | boolean | null>;
};

export const createAppError = (
	code: AppErrorCode,
	message: string,
	details?: Record<string, string | number | boolean | null>
): AppError =>
	details
		? {
				code,
				message,
				details
		  }
		: {
				code,
				message
		  };

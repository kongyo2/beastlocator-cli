import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { err, ok, okAsync, Result, ResultAsync } from 'neverthrow';
import {
	createAppError,
	persistedStateSchema,
	type AppError,
	type PersistedState,
	type StoragePort
} from '../contracts/index.js';

const parseJson = Result.fromThrowable(
	(value: string) => JSON.parse(value) as unknown,
	() =>
		createAppError('json_parse_failed', 'Failed to parse persisted state JSON', {
			path: 'state.json'
		})
);

export class FileStoragePort implements StoragePort {
	private readonly stateFilePath: string;

	public constructor(baseDirectory: string = process.cwd()) {
		this.stateFilePath = path.join(baseDirectory, '.beastlocator-cli', 'state.json');
	}

	public load(): ResultAsync<PersistedState | null, AppError> {
		const readFileSafely = async (): Promise<string | null> => {
			try {
				return await readFile(this.stateFilePath, 'utf8');
			} catch (error) {
				const errno = error as NodeJS.ErrnoException;
				if (errno.code === 'ENOENT') {
					return null;
				}
				return Promise.reject(error);
			}
		};

		return ResultAsync.fromPromise(
			readFileSafely(),
			(error) =>
				createAppError('io_read_failed', 'Failed to read persisted state file', {
					path: this.stateFilePath,
					reason: error instanceof Error ? error.message : 'unknown'
				})
		).andThen((raw) => {
			if (raw === null) {
				return ok<PersistedState | null, AppError>(null);
			}

			const parsed = parseJson(raw);
			if (parsed.isErr()) {
				return err(parsed.error);
			}

			const validated = persistedStateSchema.safeParse(parsed.value);
			if (!validated.success) {
				return err(
					createAppError('validation_failed', 'Persisted state schema mismatch', {
						issues: validated.error.issues.map((issue) => issue.path.join('.')).join(', ')
					})
				);
			}

			return ok<PersistedState | null, AppError>(validated.data);
		});
	}

	public save(state: PersistedState): ResultAsync<void, AppError> {
		const directory = path.dirname(this.stateFilePath);
		return ResultAsync.fromPromise(
			mkdir(directory, { recursive: true }),
			(error) =>
				createAppError('io_write_failed', 'Failed to create state directory', {
					path: directory,
					reason: error instanceof Error ? error.message : 'unknown'
				})
		).andThen(() => {
			const json = JSON.stringify(state, null, 2);
			return ResultAsync.fromPromise(
				writeFile(this.stateFilePath, json, 'utf8'),
				(error) =>
					createAppError('io_write_failed', 'Failed to write persisted state file', {
						path: this.stateFilePath,
						reason: error instanceof Error ? error.message : 'unknown'
					})
			);
		});
	}
}

export const createFileStoragePort = (baseDirectory?: string): StoragePort =>
	new FileStoragePort(baseDirectory);

export const loadStateOrNull = (storage: StoragePort): ResultAsync<PersistedState | null, AppError> =>
	storage.load().orElse(() => okAsync<PersistedState | null, AppError>(null));

import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import createPlaySound from 'play-sound';
import type { DomainSoundEffect, SoundPlayerPort } from '../contracts/index.js';

type PlaybackPlan = {
	readonly command: string;
	readonly args: readonly string[];
};

type RunningPlayback = {
	readonly child: ChildProcess;
	readonly priority: number;
	interrupted: boolean;
};

const SOUND_ASSET_FILENAMES: Record<DomainSoundEffect, string> = {
	arrival_0km: 'arrival_0km.wav',
	distance_114514km: 'distance_114514km.mp3',
	distance_interval_kankaku: 'distance_interval_kankaku.mp3'
};

const SOUND_PRIORITIES: Record<DomainSoundEffect, number> = {
	distance_interval_kankaku: 1,
	arrival_0km: 2,
	distance_114514km: 3
};

const infraDirectory = path.dirname(fileURLToPath(import.meta.url));
const assetsDirectory = path.resolve(infraDirectory, '..', 'assets');
const dependencyAudioPlayer = createPlaySound({});

const escapePowerShellLiteral = (value: string): string => value.replaceAll("'", "''");

const hasCommand = (command: string): boolean => {
	const lookupCommand = process.platform === 'win32' ? 'where.exe' : 'which';
	const result = spawnSync(lookupCommand, [command], { stdio: 'ignore' });
	return result.status === 0;
};

const buildWindowsPlaybackPlan = (filePath: string): PlaybackPlan => {
	const fileUrl = escapePowerShellLiteral(pathToFileURL(filePath).href);
	const script = [
		'Add-Type -AssemblyName presentationCore',
		'$player = New-Object System.Windows.Media.MediaPlayer',
		`$player.Open([Uri]'${fileUrl}')`,
		'$player.Volume = 1.0',
		'$player.Play()',
		'while (-not $player.NaturalDuration.HasTimeSpan) { Start-Sleep -Milliseconds 50 }',
		'$durationMs = [Math]::Ceiling($player.NaturalDuration.TimeSpan.TotalMilliseconds) + 50',
		'Start-Sleep -Milliseconds $durationMs',
		'$player.Stop()',
		'$player.Close()'
	].join('; ');

	return {
		command: 'powershell',
		args: [
			'-STA',
			'-NoLogo',
			'-NoProfile',
			'-NonInteractive',
			'-ExecutionPolicy',
			'Bypass',
			'-Command',
			script
		]
	};
};

const buildDarwinPlaybackPlan = (filePath: string): PlaybackPlan => ({
	command: 'afplay',
	args: [filePath]
});

const buildLinuxPlaybackPlans = (filePath: string): readonly PlaybackPlan[] => {
	const extension = path.extname(filePath).toLowerCase();
	const isWaveFile = extension === '.wav';
	const plans: PlaybackPlan[] = [
		{
			command: 'ffplay',
			args: ['-nodisp', '-autoexit', '-loglevel', 'quiet', filePath]
		},
		{
			command: 'mpg123',
			args: ['-q', filePath]
		},
		{
			command: 'mpg321',
			args: ['-q', filePath]
		},
		{
			command: 'play',
			args: ['-q', filePath]
		},
		{
			command: 'cvlc',
			args: ['--play-and-exit', '--quiet', filePath]
		}
	];

	if (isWaveFile) {
		plans.splice(
			1,
			0,
			{
				command: 'paplay',
				args: [filePath]
			},
			{
				command: 'aplay',
				args: [filePath]
			}
		);
	}

	return plans;
};

export const resolveSoundAssetPath = (sound: DomainSoundEffect): string =>
	path.join(assetsDirectory, SOUND_ASSET_FILENAMES[sound]);

export const resolveSoundPlaybackPriority = (sound: DomainSoundEffect): number =>
	SOUND_PRIORITIES[sound];

export const resolvePlaybackPlan = (filePath: string): PlaybackPlan | null => {
	if (process.platform === 'win32') {
		return hasCommand('powershell') ? buildWindowsPlaybackPlan(filePath) : null;
	}

	if (process.platform === 'darwin') {
		return hasCommand('afplay') ? buildDarwinPlaybackPlan(filePath) : null;
	}

	for (const plan of buildLinuxPlaybackPlans(filePath)) {
		if (hasCommand(plan.command)) {
			return plan;
		}
	}

	return null;
};

const toPlaybackError = (error: unknown, fallbackMessage: string): Error => {
	if (error instanceof Error) {
		return error;
	}

	if (typeof error === 'number') {
		return new Error(`${fallbackMessage} (exit code ${error})`);
	}

	if (typeof error === 'string' && error.length > 0) {
		return new Error(`${fallbackMessage}: ${error}`);
	}

	return new Error(fallbackMessage);
};

export class SystemSoundPlayerPort implements SoundPlayerPort {
	private running: RunningPlayback | null = null;

	public constructor() {
		process.once('exit', () => {
			this.running?.child.kill();
		});
	}

	public play(sound: DomainSoundEffect): Promise<void> {
		const filePath = resolveSoundAssetPath(sound);
		if (!existsSync(filePath)) {
			return Promise.reject(
				new Error(`Sound asset not found: ${path.basename(filePath)}`)
			);
		}

		const plan = resolvePlaybackPlan(filePath);
		const priority = resolveSoundPlaybackPriority(sound);
		if (this.running !== null) {
			if (priority <= this.running.priority) {
				return Promise.resolve();
			}

			this.running.interrupted = true;
			this.running.child.kill();
		}

		if (plan === null) {
			return this.playWithDependencyFallback(filePath, priority);
		}

		return this.playWithResolvedPlan(plan, filePath, priority).catch((directError) =>
			this.playWithDependencyFallback(filePath, priority).catch((fallbackError) => {
				throw new Error(
					[
						`Direct audio playback failed: ${directError.message}`,
						`Dependency fallback failed: ${fallbackError.message}`
					].join(' | ')
				);
			})
		);
	}

	private playWithResolvedPlan(
		plan: PlaybackPlan,
		filePath: string,
		priority: number
	): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			const child = spawn(plan.command, [...plan.args], {
				stdio: 'ignore',
				windowsHide: true
			});
			const running: RunningPlayback = {
				child,
				priority,
				interrupted: false
			};
			this.running = running;

			let settled = false;
			const finish = (callback: () => void): void => {
				if (settled) {
					return;
				}
				settled = true;
				if (this.running === running) {
					this.running = null;
				}
				callback();
			};

			child.once('error', (error) => {
				finish(() => reject(error));
			});

			child.once('exit', (code) => {
				if (running.interrupted || code === 0) {
					finish(resolve);
					return;
				}

				finish(() =>
					reject(
						new Error(
							`Audio player exited with code ${String(code)} while playing ${path.basename(filePath)}`
						)
					)
				);
			});
		});
	}

	private playWithDependencyFallback(filePath: string, priority: number): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			let running: RunningPlayback | null = null;
			let settled = false;
			const fileName = path.basename(filePath);

			const finish = (callback: () => void): void => {
				if (settled) {
					return;
				}
				settled = true;
				if (running !== null && this.running === running) {
					this.running = null;
				}
				callback();
			};

			const child = dependencyAudioPlayer.play(filePath, (error) => {
				if (running?.interrupted) {
					finish(resolve);
					return;
				}

				if (error == null) {
					finish(resolve);
					return;
				}

				finish(() =>
					reject(
						toPlaybackError(
							error,
							`Dependency audio player failed while playing ${fileName}`
						)
					)
				);
			}) as ChildProcess | null;

			if (child === null) {
				finish(() =>
					reject(
						new Error(`Dependency audio player could not start for ${fileName}`)
					)
				);
				return;
			}

			running = {
				child,
				priority,
				interrupted: false
			};
			this.running = running;

			child.once('error', (error) => {
				finish(() =>
					reject(
						toPlaybackError(
							error,
							`Dependency audio player errored while playing ${fileName}`
						)
					)
				);
			});
		});
	}
}

export const createSystemSoundPlayerPort = (): SoundPlayerPort =>
	new SystemSoundPlayerPort();

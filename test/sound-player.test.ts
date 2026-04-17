import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
	resolveSoundAssetPath,
	resolveSoundPlaybackPriority
} from '../src/infra/sound-player.js';

describe('sound player', () => {
	test('maps sound effects to imported asset filenames', () => {
		expect(path.basename(resolveSoundAssetPath('arrival_0km'))).toBe('arrival_0km.wav');
		expect(path.basename(resolveSoundAssetPath('distance_114514km'))).toBe(
			'distance_114514km.mp3'
		);
		expect(path.basename(resolveSoundAssetPath('distance_interval_kankaku'))).toBe(
			'distance_interval_kankaku.mp3'
		);
	});

	test('uses the same playback priorities as the Android app', () => {
		expect(resolveSoundPlaybackPriority('distance_interval_kankaku')).toBe(1);
		expect(resolveSoundPlaybackPriority('arrival_0km')).toBe(2);
		expect(resolveSoundPlaybackPriority('distance_114514km')).toBe(3);
	});
});

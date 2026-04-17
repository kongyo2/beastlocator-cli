#!/usr/bin/env node

import { render } from 'ink';
import { BeastLocatorService } from './application/index.js';
import {
	systemClockPort,
	createFileStoragePort,
	createNominatimGeocoderPort,
	createSystemSoundPlayerPort
} from './infra/index.js';
import { App } from './ui/index.js';

const isInteractiveTerminal = Boolean(process.stdin.isTTY && process.stdout.isTTY);

if (!isInteractiveTerminal) {
	process.stderr.write('BeastLocator CLI requires an interactive TTY terminal.\n');
	process.exitCode = 1;
} else {
	const service = new BeastLocatorService({
		storage: createFileStoragePort(),
		geocoder: createNominatimGeocoderPort(),
		clock: systemClockPort,
		liveUpdateSupported: true
	});
	const soundPlayer = createSystemSoundPlayerPort();

	render(<App service={service} soundPlayer={soundPlayer} />);
}

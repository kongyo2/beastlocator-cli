#!/usr/bin/env node

import { render } from 'ink';
import { BeastLocatorService } from './application/index.js';
import { systemClockPort, createFileStoragePort, createNominatimGeocoderPort } from './infra/index.js';
import { App } from './ui/index.js';

const service = new BeastLocatorService({
	storage: createFileStoragePort(),
	geocoder: createNominatimGeocoderPort(),
	clock: systemClockPort,
	liveUpdateSupported: true
});

render(<App service={service} />);

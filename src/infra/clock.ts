import type { ClockPort } from '../contracts/index.js';

export const systemClockPort: ClockPort = {
	nowMs: () => Date.now()
};

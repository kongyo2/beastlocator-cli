import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const beastImageUrl = new URL('../assets/yjsnpi.png', import.meta.url);
const cacheDirectory = path.join(tmpdir(), 'beastlocator-cli', 'ink-picture-cache');

let embeddedAssetPromise: Promise<string> | null = null;

const normalizeRotationDegrees = (value: number): number => {
	const normalized = Math.round(value) % 360;
	return normalized >= 0 ? normalized : normalized + 360;
};

const buildRotatedSvg = (rotationDegrees: number, pngBase64: string): string => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
	<g transform="rotate(${rotationDegrees} 256 256)">
		<image
			href="data:image/png;base64,${pngBase64}"
			x="0"
			y="0"
			width="512"
			height="512"
			preserveAspectRatio="xMidYMid meet"
		/>
	</g>
</svg>
`;

const getEmbeddedAsset = async (): Promise<string> => {
	if (embeddedAssetPromise === null) {
		embeddedAssetPromise = readFile(fileURLToPath(beastImageUrl)).then((buffer) => buffer.toString('base64'));
	}

	return embeddedAssetPromise;
};

export const beastImagePath = fileURLToPath(beastImageUrl);

export const getBeastArrowImageSource = async (rotationDegrees: number | null): Promise<string> => {
	if (rotationDegrees === null || !Number.isFinite(rotationDegrees)) {
		return beastImagePath;
	}

	const normalizedRotation = normalizeRotationDegrees(rotationDegrees);
	const cachedFilePath = path.join(cacheDirectory, `yjsnpi-${normalizedRotation}.svg`);
	const alreadyExists = await stat(cachedFilePath).then(
		() => true,
		() => false
	);

	if (alreadyExists) {
		return cachedFilePath;
	}

	await mkdir(cacheDirectory, { recursive: true });
	const pngBase64 = await getEmbeddedAsset();
	await writeFile(cachedFilePath, buildRotatedSvg(normalizedRotation, pngBase64), 'utf8');
	return cachedFilePath;
};

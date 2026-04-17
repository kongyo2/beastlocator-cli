/**
 * Startup banner showing "(首)" in an oh-my-logo block-style silhouette.
 *
 * `oh-my-logo` (https://github.com/shinshin86/oh-my-logo) renders text via
 * figlet / cfonts — neither supports the CJK character `首`. The logo is
 * therefore composed manually: the parentheses borrow the cfonts `block`
 * font's classic shadow characters (`██╗`, `╚═╝`, `║`, `═`), and `首`
 * is drawn as a matching bitmap with 丷 + 一 + 自 visible.
 */

const LEFT_PAREN: readonly string[] = [
	'  ██╗ ',
	' ██╔╝ ',
	' ██║  ',
	' ██║  ',
	' ██║  ',
	' ██║  ',
	' ██║  ',
	' ██║  ',
	' ╚██╗ ',
	'  ╚═╝ '
];

const RIGHT_PAREN: readonly string[] = [
	' ██╗  ',
	' ╚██╗ ',
	'  ██║ ',
	'  ██║ ',
	'  ██║ ',
	'  ██║ ',
	'  ██║ ',
	'  ██║ ',
	' ██╔╝ ',
	' ╚═╝  '
];

const KUBI: readonly string[] = [
	'    ██        ██    ',
	'   ████      ████   ',
	'                    ',
	' ██████████████████ ',
	'                    ',
	'████████████████████',
	'██                ██',
	'████████████████████',
	'██                ██',
	'████████████████████'
];

const LOGO_LINES: readonly string[] = LEFT_PAREN.map(
	(left, i) => `${left}${KUBI[i] ?? ''}${RIGHT_PAREN[i] ?? ''}`
);

type Rgb = readonly [number, number, number];

// Vertical gradient inspired by oh-my-logo's default `grad-blue` palette
// (`#4ea8ff` → `#7f88ff`).
const GRADIENT_START: Rgb = [78, 168, 255];
const GRADIENT_END: Rgb = [127, 136, 255];

const interpolateColor = (start: Rgb, end: Rgb, t: number): Rgb => [
	Math.round(start[0] + (end[0] - start[0]) * t),
	Math.round(start[1] + (end[1] - start[1]) * t),
	Math.round(start[2] + (end[2] - start[2]) * t)
];

const colorizeLine = (line: string, color: Rgb): string => {
	const [r, g, b] = color;
	return `\x1b[38;2;${r};${g};${b}m${line}\x1b[0m`;
};

export const renderStartupLogo = (useColor: boolean = true): string => {
	if (!useColor) {
		return LOGO_LINES.join('\n');
	}
	const rows = LOGO_LINES.length;
	const colored = LOGO_LINES.map((line, index) => {
		const t = rows <= 1 ? 0 : index / (rows - 1);
		return colorizeLine(line, interpolateColor(GRADIENT_START, GRADIENT_END, t));
	});
	return colored.join('\n');
};

export const printStartupLogo = (stream: NodeJS.WriteStream = process.stdout): void => {
	const useColor = Boolean(stream.isTTY) && process.env['NO_COLOR'] === undefined;
	stream.write(`${renderStartupLogo(useColor)}\n\n`);
};

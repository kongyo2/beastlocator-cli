import React from 'react';
import { Box, Spacer, Text } from 'ink';
import { Badge, defaultTheme, extendTheme } from '@inkjs/ui';

export type AccentColor = 'blue' | 'cyan' | 'green' | 'magenta' | 'red' | 'yellow';

export type CoordinatesLike = {
	readonly lat: number;
	readonly lng: number;
};

export type PanelProps = {
	readonly title: string;
	readonly accentColor: AccentColor;
	readonly badge?: React.ReactNode;
	readonly subtitle?: string;
	readonly children: React.ReactNode;
};

export type DetailRowProps = {
	readonly label: string;
	readonly valueText?: string;
	readonly valueNode?: React.ReactNode;
	readonly valueColor?: AccentColor | 'gray' | 'white';
};

export type MetricStripProps = {
	readonly items: ReadonlyArray<{
		readonly label: string;
		readonly value: string;
		readonly color?: AccentColor | 'gray' | 'white';
	}>;
	readonly isWide: boolean;
};

export const uiTheme = extendTheme(defaultTheme, {
	components: {
		Alert: {
			styles: {
				title: () => ({ color: 'white' }),
				message: () => ({ color: 'white' })
			}
		},
		ConfirmInput: {
			styles: {
				input: ({ isFocused }: { readonly isFocused: boolean }) => ({
					color: isFocused ? 'cyan' : 'gray'
				})
			}
		},
		ProgressBar: {
			styles: {
				completed: () => ({ color: 'cyan' }),
				remaining: () => ({ color: 'gray' })
			},
			config: () => ({
				completedCharacter: '█',
				remainingCharacter: '░'
			})
		},
		Select: {
			styles: {
				focusIndicator: () => ({ color: 'cyan' }),
				selectedIndicator: () => ({ color: 'green' }),
				label: ({
					isFocused,
					isSelected
				}: {
					readonly isFocused: boolean;
					readonly isSelected: boolean;
				}) => {
					if (isFocused) {
						return { color: 'black', backgroundColor: 'cyan' };
					}

					if (isSelected) {
						return { color: 'cyan' };
					}

					return { color: 'white' };
				}
			}
		},
		Spinner: {
			styles: {
				frame: () => ({ color: 'cyan' }),
				label: () => ({ color: 'gray' })
			}
		},
		TextInput: {
			styles: {
				value: () => ({ color: 'yellow' })
			}
		}
	}
});

export const formatCoordinates = (coordinates: CoordinatesLike | null | undefined): string => {
	if (!coordinates) {
		return '--';
	}

	return `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`;
};

export const formatDegrees = (value: number | null | undefined, digits = 1): string => {
	if (value === null || value === undefined) {
		return '--';
	}

	return `${value.toFixed(digits)}°`;
};

export const Panel = ({
	title,
	accentColor,
	badge,
	subtitle,
	children
}: PanelProps): React.JSX.Element => (
	<Box borderColor={accentColor} borderStyle="round" flexDirection="column" flexGrow={1} paddingLeft={1} paddingRight={1}>
		<Box>
			<Text bold color={accentColor}>
				{title}
			</Text>
			<Spacer />
			{badge}
		</Box>
		{subtitle ? <Text color="gray">{subtitle}</Text> : null}
		<Box flexDirection="column" marginTop={1}>
			{children}
		</Box>
	</Box>
);

export const DetailRow = ({
	label,
	valueText,
	valueNode,
	valueColor = 'white'
}: DetailRowProps): React.JSX.Element => (
	<Box>
		<Text color="gray">{label}</Text>
		<Spacer />
		{valueNode ?? <Text color={valueColor}>{valueText ?? '--'}</Text>}
	</Box>
);

export const MetricStrip = ({ items, isWide }: MetricStripProps): React.JSX.Element => (
	<Box flexDirection={isWide ? 'row' : 'column'}>
		{items.map((item, index) => (
			<Box
				key={`${item.label}-${index}`}
				borderColor="gray"
				borderStyle="single"
				flexDirection="column"
				flexGrow={1}
				marginRight={isWide && index < items.length - 1 ? 1 : 0}
				marginTop={!isWide && index > 0 ? 1 : 0}
				paddingLeft={1}
				paddingRight={1}
			>
				<Text color="gray">{item.label}</Text>
				<Text bold color={item.color ?? 'white'}>
					{item.value}
				</Text>
			</Box>
		))}
	</Box>
);

export const CountBadge = ({
	color,
	value
}: {
	readonly color: AccentColor;
	readonly value: string | number;
}): React.JSX.Element => <Badge color={color}>{String(value)}</Badge>;

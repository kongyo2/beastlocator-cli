import type { LocaleTag } from '../contracts/index.js';

type Dictionary = {
	readonly appTitle: string;
	readonly appSubtitle: string;
	readonly homeMenuLabel: string;
	readonly menuMain: string;
	readonly menuSettings: string;
	readonly menuExperimental: string;
	readonly menuAbout: string;
	readonly menuOss: string;
	readonly menuExit: string;
	readonly back: string;
	readonly destinationLabel: string;
	readonly currentLocationLabel: string;
	readonly headingLabel: string;
	readonly distanceLabel: string;
	readonly directionLabel: string;
	readonly arrivalTitle: string;
	readonly arrivalNamePending: string;
	readonly notAvailable: string;
	readonly waitingLocation: string;
	readonly locationInputLat: string;
	readonly locationInputLng: string;
	readonly headingInput: string;
	readonly debugDistanceInput: string;
	readonly invalidNumber: string;
	readonly invalidCoordinates: string;
	readonly locationBlockedByDebug: string;
	readonly confirmPrompt: string;
	readonly confirmOk: string;
	readonly confirmCancel: string;
	readonly mainActionsLabel: string;
	readonly mainActionUpdateLocation: string;
	readonly mainActionUpdateHeading: string;
	readonly mainActionToggleMask: string;
	readonly mainActionResetArrival: string;
	readonly mainActionMarkArrived: string;
	readonly mainActionSetDebugDistance: string;
	readonly mainActionClearDebugDistance: string;
	readonly settingsActionsLabel: string;
	readonly experimentalActionsLabel: string;
	readonly aboutVersion: string;
	readonly aboutRevision: string;
	readonly aboutDisclaimer: string;
	readonly ossTitle: string;
	readonly liveProgressLabel: string;
	readonly statusSaved: string;
	readonly statusError: string;
	readonly statusInitialized: string;
	readonly statusArrivalReset: string;
	readonly statusDistanceCleared: string;
	readonly statusLocaleChanged: string;
	readonly statusSoundPlaybackFailed: string;
	readonly statusToggled: string;
	readonly settingsArrivalNotification: string;
	readonly settingsLiveUpdate: string;
	readonly settingsLiveUpdateStartDistance: string;
	readonly settingsBackgroundUpdate: string;
	readonly settingsWidgetBearingMode: string;
	readonly settingsLegacyCompass: string;
	readonly settingsDistanceMaskButton: string;
	readonly settingsScreenshotWarning: string;
	readonly settingsTextArrowFallback: string;
	readonly settingsArrivalSound: string;
	readonly settings114514Sound: string;
	readonly settingsIntervalSound: string;
	readonly settingsIntervalDistance: string;
	readonly experimentalCompassSmoothing: string;
	readonly experimentalNonJapanese: string;
	readonly experimentalLocale: string;
	readonly widgetModeAbsolute: string;
	readonly widgetModeRelative: string;
	readonly on: string;
	readonly off: string;
};

const JA: Dictionary = {
	appTitle: 'BeastLocator CLI',
	appSubtitle: '野獣邸の方角を知る',
	homeMenuLabel: 'メニュー',
	menuMain: 'メイン画面',
	menuSettings: '設定',
	menuExperimental: '実験的機能',
	menuAbout: 'このアプリについて',
	menuOss: 'OSSライセンス',
	menuExit: '終了',
	back: '戻る',
	destinationLabel: '目的地(固定)',
	currentLocationLabel: '現在地',
	headingLabel: '方位',
	distanceLabel: '距離',
	directionLabel: '方角',
	arrivalTitle: 'こ↑こ↓',
	arrivalNamePending: '正解位置を確認中...',
	notAvailable: '--',
	waitingLocation: '現在地を取得中...',
	locationInputLat: '緯度を入力',
	locationInputLng: '経度を入力',
	headingInput: '方位(0-360)を入力',
	debugDistanceInput: '目的地までの距離(m)を入力',
	invalidNumber: '数値が不正です',
	invalidCoordinates: '座標が不正です (緯度-90..90 / 経度-180..180)',
	locationBlockedByDebug: '距離デバッグ上書き中のため現在地更新は無効です',
	confirmPrompt: '実行しますか? (Y/n)',
	confirmOk: '確定',
	confirmCancel: 'キャンセル',
	mainActionsLabel: 'メイン操作',
	mainActionUpdateLocation: '現在地を更新',
	mainActionUpdateHeading: '方位を更新',
	mainActionToggleMask: '距離マスクを切り替え',
	mainActionResetArrival: '到達状態をリセット',
	mainActionMarkArrived: '到達状態にする(デバッグ)',
	mainActionSetDebugDistance: '距離をデバッグ上書き',
	mainActionClearDebugDistance: '距離デバッグ上書きを解除',
	settingsActionsLabel: '設定項目',
	experimentalActionsLabel: '実験設定',
	aboutVersion: 'バージョン',
	aboutRevision: 'リビジョン',
	aboutDisclaimer:
		'⚠️このCLIはファンメイド移植版です。迷惑行為を推奨・助長するものではありません。',
	ossTitle: '依存ライブラリ',
	liveProgressLabel: '到達進捗',
	statusSaved: '保存しました',
	statusError: 'エラー',
	statusInitialized: '初期化しました',
	statusArrivalReset: '到達状態をリセットしました',
	statusDistanceCleared: '距離のデバッグ上書きを解除しました',
	statusLocaleChanged: '言語設定を更新しました',
	statusSoundPlaybackFailed: '音声の再生に失敗しました',
	statusToggled: '設定を更新しました',
	settingsArrivalNotification: '到達通知',
	settingsLiveUpdate: '進捗通知',
	settingsLiveUpdateStartDistance: '進捗通知開始距離',
	settingsBackgroundUpdate: 'バックグラウンド更新',
	settingsWidgetBearingMode: 'ウィジェット方位モード',
	settingsLegacyCompass: '従来コンパスモード',
	settingsDistanceMaskButton: 'マスクボタン表示',
	settingsScreenshotWarning: 'スクリーンショット警告',
	settingsTextArrowFallback: '矢印フォールバック(画像無効)',
	settingsArrivalSound: '到達サウンド',
	settings114514Sound: '114.514kmサウンド',
	settingsIntervalSound: '距離間隔サウンド',
	settingsIntervalDistance: '距離間隔サウンド間隔',
	experimentalCompassSmoothing: 'コンパス平滑化',
	experimentalNonJapanese: '日本語以外を許可',
	experimentalLocale: '言語',
	widgetModeAbsolute: '絶対方位',
	widgetModeRelative: '相対方位',
	on: 'ON',
	off: 'OFF'
};

const EN: Dictionary = {
	appTitle: 'BeastLocator CLI',
	appSubtitle: 'Find the direction to Beast Residence',
	homeMenuLabel: 'Menu',
	menuMain: 'Main',
	menuSettings: 'Settings',
	menuExperimental: 'Experimental',
	menuAbout: 'About',
	menuOss: 'OSS licenses',
	menuExit: 'Exit',
	back: 'Back',
	destinationLabel: 'Destination (fixed)',
	currentLocationLabel: 'Current location',
	headingLabel: 'Heading',
	distanceLabel: 'Distance',
	directionLabel: 'Direction',
	arrivalTitle: 'Right here!',
	arrivalNamePending: 'Resolving place name...',
	notAvailable: '--',
	waitingLocation: 'Waiting for location...',
	locationInputLat: 'Enter latitude',
	locationInputLng: 'Enter longitude',
	headingInput: 'Enter heading (0-360)',
	debugDistanceInput: 'Enter debug distance to destination (m)',
	invalidNumber: 'Invalid number',
	invalidCoordinates: 'Invalid coordinates (lat -90..90 / lng -180..180)',
	locationBlockedByDebug: 'Location updates are blocked while debug distance override is active',
	confirmPrompt: 'Proceed? (Y/n)',
	confirmOk: 'Confirm',
	confirmCancel: 'Cancel',
	mainActionsLabel: 'Main actions',
	mainActionUpdateLocation: 'Update location',
	mainActionUpdateHeading: 'Update heading',
	mainActionToggleMask: 'Toggle distance mask',
	mainActionResetArrival: 'Reset arrival state',
	mainActionMarkArrived: 'Mark arrived (debug)',
	mainActionSetDebugDistance: 'Set debug distance override',
	mainActionClearDebugDistance: 'Clear debug distance override',
	settingsActionsLabel: 'Settings',
	experimentalActionsLabel: 'Experimental settings',
	aboutVersion: 'Version',
	aboutRevision: 'Revision',
	aboutDisclaimer:
		'⚠️ This CLI is a fan-made port. It does not encourage nuisance behavior.',
	ossTitle: 'Dependencies',
	liveProgressLabel: 'Arrival progress',
	statusSaved: 'Saved',
	statusError: 'Error',
	statusInitialized: 'Initialized',
	statusArrivalReset: 'Arrival state has been reset',
	statusDistanceCleared: 'Debug distance override cleared',
	statusLocaleChanged: 'Locale updated',
	statusSoundPlaybackFailed: 'Sound playback failed',
	statusToggled: 'Setting updated',
	settingsArrivalNotification: 'Arrival notification',
	settingsLiveUpdate: 'Live progress update',
	settingsLiveUpdateStartDistance: 'Live update start distance',
	settingsBackgroundUpdate: 'Background update',
	settingsWidgetBearingMode: 'Widget bearing mode',
	settingsLegacyCompass: 'Legacy compass mode',
	settingsDistanceMaskButton: 'Distance mask button',
	settingsScreenshotWarning: 'Screenshot warning',
	settingsTextArrowFallback: 'Text arrow fallback (no image)',
	settingsArrivalSound: 'Arrival sound',
	settings114514Sound: '114.514km sound',
	settingsIntervalSound: 'Interval roar sound',
	settingsIntervalDistance: 'Interval distance',
	experimentalCompassSmoothing: 'Compass smoothing',
	experimentalNonJapanese: 'Enable non-Japanese languages',
	experimentalLocale: 'Language',
	widgetModeAbsolute: 'Absolute',
	widgetModeRelative: 'Relative',
	on: 'ON',
	off: 'OFF'
};

const ZH_CN: Dictionary = {
	appTitle: 'BeastLocator CLI',
	appSubtitle: '查看前往野兽邸方向',
	homeMenuLabel: '菜单',
	menuMain: '主界面',
	menuSettings: '设置',
	menuExperimental: '实验功能',
	menuAbout: '关于',
	menuOss: '开源许可',
	menuExit: '退出',
	back: '返回',
	destinationLabel: '目的地(固定)',
	currentLocationLabel: '当前位置',
	headingLabel: '方位',
	distanceLabel: '距离',
	directionLabel: '方向',
	arrivalTitle: 'こ↑こ↓',
	arrivalNamePending: '正在解析地点名称...',
	notAvailable: '--',
	waitingLocation: '正在获取当前位置...',
	locationInputLat: '输入纬度',
	locationInputLng: '输入经度',
	headingInput: '输入方位(0-360)',
	debugDistanceInput: '输入到目的地调试距离(m)',
	invalidNumber: '数值无效',
	invalidCoordinates: '坐标无效 (纬度-90..90 / 经度-180..180)',
	locationBlockedByDebug: '已开启距离调试覆盖，当前位置更新被阻止',
	confirmPrompt: '确认执行? (Y/n)',
	confirmOk: '确认',
	confirmCancel: '取消',
	mainActionsLabel: '主操作',
	mainActionUpdateLocation: '更新当前位置',
	mainActionUpdateHeading: '更新方位',
	mainActionToggleMask: '切换距离遮罩',
	mainActionResetArrival: '重置到达状态',
	mainActionMarkArrived: '标记已到达(调试)',
	mainActionSetDebugDistance: '设置调试距离覆盖',
	mainActionClearDebugDistance: '清除调试距离覆盖',
	settingsActionsLabel: '设置项',
	experimentalActionsLabel: '实验设置',
	aboutVersion: '版本',
	aboutRevision: '修订',
	aboutDisclaimer: '⚠️ 本CLI为粉丝移植版，不鼓励任何扰民行为。',
	ossTitle: '依赖库',
	liveProgressLabel: '到达进度',
	statusSaved: '已保存',
	statusError: '错误',
	statusInitialized: '初始化完成',
	statusArrivalReset: '已重置到达状态',
	statusDistanceCleared: '已清除调试距离覆盖',
	statusLocaleChanged: '已更新语言',
	statusSoundPlaybackFailed: '音频播放失败',
	statusToggled: '设置已更新',
	settingsArrivalNotification: '到达通知',
	settingsLiveUpdate: '进度通知',
	settingsLiveUpdateStartDistance: '进度通知起始距离',
	settingsBackgroundUpdate: '后台更新',
	settingsWidgetBearingMode: '小组件方位模式',
	settingsLegacyCompass: '旧版指南针模式',
	settingsDistanceMaskButton: '显示遮罩按钮',
	settingsScreenshotWarning: '截图警告',
	settingsTextArrowFallback: '文字箭头回退(禁用图片)',
	settingsArrivalSound: '到达音效',
	settings114514Sound: '114.514km音效',
	settingsIntervalSound: '间隔咆哮音效',
	settingsIntervalDistance: '间隔距离',
	experimentalCompassSmoothing: '指南针平滑',
	experimentalNonJapanese: '允许日语以外语言',
	experimentalLocale: '语言',
	widgetModeAbsolute: '绝对方位',
	widgetModeRelative: '相对方位',
	on: 'ON',
	off: 'OFF'
};

const DICTIONARIES: Record<LocaleTag, Dictionary> = {
	ja: JA,
	en: EN,
	'zh-CN': ZH_CN
};

export const resolveDictionary = (locale: LocaleTag): Dictionary => DICTIONARIES[locale];

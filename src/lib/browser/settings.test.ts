import { describe, expect, it } from 'vitest';
import { loadSettings, saveSettings } from './settings';

const memory = () => {
	const kept = new Map<string, string>();
	return {
		getItem: (k: string) => kept.get(k) ?? null,
		setItem: (k: string, v: string) => void kept.set(k, v)
	};
};

describe('settings', () => {
	it('asks after the weather and departures unless told not to', () => {
		expect(loadSettings(memory())).toEqual({ weather: true, departures: true });
	});

	it('keeps what the reader chose', () => {
		const store = memory();
		saveSettings({ weather: false, departures: true }, store);
		expect(loadSettings(store)).toEqual({ weather: false, departures: true });
	});

	it('falls back to asking when the browser keeps nothing, or refuses', () => {
		const refusing = {
			getItem: () => {
				throw new Error('blocked');
			},
			setItem: () => {
				throw new Error('blocked');
			}
		};
		expect(() => saveSettings({ weather: false, departures: false }, refusing)).not.toThrow();
		expect(loadSettings(refusing)).toEqual({ weather: true, departures: true });
		expect(loadSettings(undefined)).toEqual({ weather: true, departures: true });
		const garbled = memory();
		garbled.setItem('a-partial-guide:settings', '{not json');
		expect(loadSettings(garbled)).toEqual({ weather: true, departures: true });
	});
});

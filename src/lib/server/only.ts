import { readFileSync } from 'node:fs';
import { isBusier } from '../core/busier';
import { areaWards, inArea, type AreaList } from '../core/release';
import type { Scene } from '../core/scene';
import type { Stop } from '../core/stops';
import { loadRecords } from './narrator';

/**
 * Which stops a narration run writes, for `npm run narrate` and `npm run narrate:prompts` alike:
 * NARRATE_ONLY=busier, only stops whose data has something going on; NARRATE_AREA=Shirley, only
 * the stops in that area's wards (data/areas.json). Every stop, if told neither.
 */
export function narrationOnly(
	env: Record<string, string | undefined>,
	recordsDir?: string,
	areasPath = 'data/areas.json'
): ((scene: Scene) => boolean) | undefined {
	const tests: ((scene: Scene) => boolean)[] = [];
	if (env.NARRATE_ONLY === 'busier') tests.push(isBusier);
	const inside = narrationWithin(env, recordsDir, areasPath);
	if (inside) tests.push((scene) => inside({ position: scene.position }));
	return tests.length ? (scene) => tests.every((test) => test(scene)) : undefined;
}

/**
 * The stops in NARRATE_AREA's wards, by place alone, so a run looks at no other: told before a stop
 * is visited, which on a borough's map saves minutes. Every stop, if no area is named.
 */
export function narrationWithin(
	env: Record<string, string | undefined>,
	recordsDir?: string,
	areasPath = 'data/areas.json'
): ((stop: Pick<Stop, 'position'>) => boolean) | undefined {
	if (!env.NARRATE_AREA) return undefined;
	const areas: AreaList = JSON.parse(readFileSync(areasPath, 'utf8')).areas;
	const wards = loadRecords(recordsDir).flatMap((store) => store.areas ?? []);
	const inside = inArea(wards, areaWards(areas, env.NARRATE_AREA));
	return (stop) => inside(stop.position);
}

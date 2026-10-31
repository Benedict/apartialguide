import { readFileSync } from 'node:fs';
import { isBusier } from '../core/busier';
import { areaWards, inArea, type AreaList } from '../core/release';
import type { Scene } from '../core/scene';
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
	if (env.NARRATE_AREA) {
		const areas: AreaList = JSON.parse(readFileSync(areasPath, 'utf8')).areas;
		const wards = loadRecords(recordsDir).flatMap((store) => store.areas ?? []);
		const inside = inArea(wards, areaWards(areas, env.NARRATE_AREA));
		tests.push((scene) => inside(scene.position));
	}
	return tests.length ? (scene) => tests.every((test) => test(scene)) : undefined;
}

import type { NarrationPlan } from '../slippage';

/** Turns a plan into words. The template renderer and, later, a model sit behind this port. */
export interface Renderer {
	render(plan: NarrationPlan): string;
}

import type { Scene } from '../scene';

/** Something in view the reader can examine. */
export interface Thing {
	id: string;
	name: string;
	/** Lower-case words the reader might type to mean this thing. */
	aliases: string[];
	description: string;
}

export interface Room {
	title: string;
	paragraphs: string[];
	things: Thing[];
	/** What is in view but unnoticed: told, and examinable, only once the reader looks closer. */
	hidden?: { lines: string[]; things: Thing[] };
}

/** Turns a scene into words. The adventure renderer and, later, a model sit behind this port. */
export interface Renderer {
	render(scene: Scene): Room;
}

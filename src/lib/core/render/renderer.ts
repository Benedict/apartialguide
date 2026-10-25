import type { Scene } from '../scene';

/** Something in view the reader can examine. */
export interface Thing {
	id: string;
	name: string;
	/** Lower-case words the reader might type to mean this thing. */
	aliases: string[];
	description: string;
}

/** One sentence or more of a room, labelled so the game can leave out what the reader just heard. */
export interface Part {
	kind: 'where' | 'street' | 'setting' | 'thing' | 'frame' | 'exits';
	text: string;
	/** What makes two parts the same to a listener: a thing's subject, a setting's names. */
	key: string;
	/** For where the reader stands part way along one street: that street. */
	street?: string;
	/** For framing lines: the ways Guide may put it, to turn between. */
	options?: string[];
}

export interface Room {
	title: string;
	paragraphs: string[];
	/** The paragraphs as labelled parts, when the renderer can tell them apart. */
	parts?: Part[][];
	things: Thing[];
	/** What is in view but unnoticed: told, and examinable, only once the reader looks closer. */
	hidden?: { lines: string[]; things: Thing[] };
}

/** Turns a scene into words. The adventure renderer and, later, a model sit behind this port. */
export interface Renderer {
	render(scene: Scene): Room;
}

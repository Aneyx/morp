import { currentConnection } from '$lib/api/connection';
import type { Vector2 } from '$lib/utils/math';
import {
	Application,
	Graphics,
	ParticleContainer,
	RenderTexture,
	Sprite,
	type Container,
} from 'pixi.js';
import { get } from 'svelte/store';
import { Blob } from './Blob';
import { GRAY, GREEN, ownerMap, RED, WHITE, type Owner } from './utils';

let canvasFactor = 1;
export class Troop {
	static container: ParticleContainer;
	static grSelf: RenderTexture;
	static grOther: RenderTexture;
	static troops: Troop[] = [];
	static Setup(app: Application) {
		canvasFactor = ((1 / 10) * app.view.width) / window.devicePixelRatio;

		this.container = new ParticleContainer(100_000);
		app.stage.addChild(this.container);
		const gr = new Graphics();

		gr.clear();
		gr.drawCircle(0, 0, 0.05 * canvasFactor);
		this.grSelf = app.renderer.generateTexture(gr);

		gr.clear();
		gr.beginFill(RED);
		gr.drawCircle(0, 0, 0.07 * canvasFactor);
		this.grOther = app.renderer.generateTexture(gr);
	}
	static Update(dt: number) {
		for (const troop of this.troops) {
			troop.update(dt);
		}
	}

	static Draw() {
		for (const troop of this.troops) {
			troop.draw();
		}
	}

	pos: Vector2;
	sprite: Sprite;
	owner: Owner;

	target: Blob;
	remote: boolean;

	constructor(origin: Blob, target: Blob, remote = false) {
		this.remote = remote;
		this.pos = origin.pos.copy();
		this.pos.x += Math.random() * Blob.baseRadius - Blob.baseRadius;
		this.pos.y += Math.random() * Blob.baseRadius - Blob.baseRadius;

		this.owner = origin.owner;
		this.target = target;

		if (this.owner === 'other') this.sprite = new Sprite(Troop.grOther);
		else this.sprite = new Sprite(Troop.grSelf);

		Troop.container.addChild(this.sprite);
		Troop.troops.push(this);

		if (!remote)
			get(currentConnection)?.send({
				type: 'capture.troopSpawn',
				troopData: {
					x: this.pos.x,
					y: this.pos.y,
					targetID: target.id,
					originID: origin.id,
				},
			});
	}

	update(dt: number) {
		const between = this.pos.to(this.target.pos);
		const movement = between.scale(1 / between.norm()).scale(dt / 700);
		this.pos.add(movement);

		if (this.target.pos.to(this.pos).norm() < Blob.baseRadius) {
			// Calculate impact
			if (!this.remote) this.target.receive(this);
			this.destroy();
		}
	}

	draw() {
		if (this.owner === 'other') this.sprite.texture = Troop.grOther;
		else this.sprite.texture = Troop.grSelf;

		this.sprite.position.set(this.pos.x * canvasFactor, this.pos.y * canvasFactor);
	}

	destroy() {
		Troop.troops = Troop.troops.filter((t) => t != this);
		Troop.container.removeChild(this.sprite);
	}
}

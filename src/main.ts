import "./style.css";

import * as Boid2D from "./Boid2D/boid2D";

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d")!;

ctx.canvas.width = window.innerWidth;
ctx.canvas.height = window.innerHeight;

const flock: Boid2D.Boid[] = [];
const flockSize = 250;

for (let i = 0; i < flockSize; i++) {
    flock.push(Boid2D.createBoid(ctx));
}

const loop = () => {
    Boid2D.update(ctx, flock);

    requestAnimationFrame(loop);
};
requestAnimationFrame(loop);

window.addEventListener("resize", () => {
    console.log("resize");
    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
});

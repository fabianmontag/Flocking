import * as BQT from "./boidQuadTree";

export interface Boid {
    position: Vec2;
    veloctiy: Vec2;
    accelaration: Vec2;

    cohesion: Vec2;
    alignment: Vec2;
    seperation: Vec2;
}

const getRandomIntInclusive = (min: number, max: number) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min);
};

interface Vec2 {
    x: number;
    y: number;
}

const createVec2 = (x?: number, y?: number): Vec2 => {
    return {
        x: x ?? 0,
        y: y ?? 0,
    };
};

const addVec2s = (v1: Vec2, v2: Vec2) => {
    return createVec2(v1.x + v2.x, v1.y + v2.y);
};

const subVec2s = (v1: Vec2, v2: Vec2) => {
    return createVec2(v1.x - v2.x, v1.y - v2.y);
};

const divVec2byScalar = (v: Vec2, s: number) => {
    return createVec2(v.x / s, v.y / s);
};

const getVec2Length = (v: Vec2) => {
    return Math.sqrt(v.x ** 2 + v.y ** 2);
};

const getNormalizedVector = (v: Vec2) => {
    const l = getVec2Length(v);
    const d = divVec2byScalar(v, l);
    return d;
};

const mulVec2byScalar = (v: Vec2, s: number) => {
    return createVec2(v.x * s, v.y * s);
};

export const createBoid = (ctx: CanvasRenderingContext2D): Boid => {
    // get random veloctiy values and normalize them so that the veloctiy length is 1
    let randXVel = Math.random() * 10 - 5;
    let randYVel = Math.random() * 10 - 5;
    const hypo = Math.hypot(randXVel, randYVel);
    randXVel /= hypo;
    randYVel /= hypo;
    const veloctiy = createVec2(randXVel, randYVel);

    const boid: Boid = {
        position: createVec2(getRandomIntInclusive(0, ctx.canvas.width), getRandomIntInclusive(0, ctx.canvas.height)),
        veloctiy,
        accelaration: createVec2(),
        cohesion: createVec2(),
        alignment: createVec2(),
        seperation: createVec2(),
    };
    return boid;
};

const createBoidAlignmentSteer = (b: Boid, quadTree: BQT.BoidQuadTree, alignmentRadius: number) => {
    let averageVelocity = createVec2();

    const boids = quadTree.getNearbyBoidsCircleRadius(b, alignmentRadius);

    let total = 0;
    // sum all the position vectors together
    for (const boid of boids) {
        if (boid != b) {
            averageVelocity = addVec2s(averageVelocity, boid.veloctiy);
            total++;
        }
    }

    // get the average position
    if (total > 0) {
        averageVelocity = divVec2byScalar(averageVelocity, total);

        let steer = subVec2s(averageVelocity, b.veloctiy);

        // clamp force
        steer = getNormalizedVector(steer);
        steer = mulVec2byScalar(steer, 0.02);

        return steer;
    }

    return averageVelocity;
};

const createBoidCohesionSteer = (b: Boid, quadTree: BQT.BoidQuadTree, cohesionRadius: number) => {
    let averagePosition = createVec2();

    const boids = quadTree.getNearbyBoidsCircleRadius(b, cohesionRadius);

    let total = 0;
    // sum all the position vectors together
    for (const boid of boids) {
        if (b != boid) {
            averagePosition = addVec2s(averagePosition, boid.position);
            total++;
        }
    }

    // get the average position
    if (total > 0) {
        averagePosition = divVec2byScalar(averagePosition, total);

        let direction = subVec2s(averagePosition, b.position);
        let steer = subVec2s(direction, b.veloctiy);

        // clamp force
        steer = getNormalizedVector(steer);
        steer = mulVec2byScalar(steer, 0.03);

        return steer;
    }

    return averagePosition;
};

const createBoidSeperationSteer = (b: Boid, quadTree: BQT.BoidQuadTree, seperationRadius: number) => {
    let averageVelocity = createVec2();

    const boids = quadTree.getNearbyBoidsCircleRadius(b, seperationRadius);

    let total = 0;
    // sum all the position vectors together
    for (const boid of boids) {
        const connectionVec = subVec2s(b.position, boid.position);
        const connectionVecLength = getVec2Length(connectionVec);
        if (b != boid) {
            const diff = divVec2byScalar(connectionVec, connectionVecLength);
            averageVelocity = addVec2s(averageVelocity, diff);
            total++;
        }
    }

    // get the average position
    if (total > 0) {
        averageVelocity = divVec2byScalar(averageVelocity, total);

        let steer = subVec2s(averageVelocity, b.veloctiy);

        // clamp force
        steer = getNormalizedVector(steer);
        steer = mulVec2byScalar(steer, 0.08);

        return steer;
    }

    return averageVelocity;
};

const updateBoidProps = (b: Boid, boidQuadTree: BQT.BoidQuadTree) => {
    const alignment = createBoidAlignmentSteer(b, boidQuadTree, 50);
    b.alignment = alignment;

    const cohesion = createBoidCohesionSteer(b, boidQuadTree, 30);
    b.cohesion = cohesion;

    const seperation = createBoidSeperationSteer(b, boidQuadTree, 30);
    b.seperation = seperation;
};

const updateBoidPosition = (b: Boid, maxWidth: number, maxHeight: number) => {
    b.accelaration = createVec2();
    b.accelaration = addVec2s(b.accelaration, b.alignment);
    b.accelaration = addVec2s(b.accelaration, b.cohesion);
    b.accelaration = addVec2s(b.accelaration, b.seperation);

    b.veloctiy = addVec2s(b.veloctiy, b.accelaration);

    b.veloctiy = getNormalizedVector(b.veloctiy);

    b.position = addVec2s(b.position, b.veloctiy);

    // wrap them around the canvas
    if (b.position.x > maxWidth) b.position.x = 0;
    else if (b.position.x < 0) b.position.x = maxWidth;

    if (b.position.y > maxHeight) b.position.y = 0;
    else if (b.position.y < 0) b.position.y = maxHeight;
};

const angleOnCircle = (cx: number, cy: number, px: number, py: number) => {
    // calculate the angle in radians
    let angleRadians = Math.atan2(py - cy, px - cx);

    // ensure the angle is positive (between 0 and 2*PI)
    if (angleRadians < 0) {
        angleRadians += 2 * Math.PI;
    }

    return angleRadians;
};

const drawBoid = (ctx: CanvasRenderingContext2D, b: Boid) => {
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = "rgb(100, 100, 100, 1)";
    ctx.strokeStyle = "rgb(100, 100, 100, 1)";

    const boidSize = 6;

    ctx.translate(b.position.x, b.position.y);
    ctx.rotate(-Math.PI / 2);
    ctx.rotate(angleOnCircle(b.position.x, b.position.y, b.position.x + b.veloctiy.x * 5, b.position.y + b.veloctiy.y * 5));
    ctx.translate(-b.position.x, -b.position.y);

    ctx.moveTo(b.position.x - boidSize, b.position.y - boidSize);
    ctx.lineTo(b.position.x, b.position.y + boidSize);
    ctx.lineTo(b.position.x + boidSize, b.position.y - boidSize);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
};

const updateBoid = (b: Boid, ctx: CanvasRenderingContext2D) => {
    // update the positon
    updateBoidPosition(b, ctx.canvas.width, ctx.canvas.height);
};

export const update = (ctx: CanvasRenderingContext2D, flock: Boid[]) => {
    const boidQuadTree = new BQT.BoidQuadTree(new BQT.Rectangle(0, 0, ctx.canvas.width, ctx.canvas.height));
    for (const boid of flock) {
        boidQuadTree.insertBoid(boid);
    }

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (const boid of flock) {
        updateBoidProps(boid, boidQuadTree);
    }

    for (const boid of flock) {
        updateBoid(boid, ctx);
        drawBoid(ctx, boid);
    }
};

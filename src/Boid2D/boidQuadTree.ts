import { Boid } from "./boid2D";

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

const rectanglesIntersect = (minAx: number, minAy: number, maxAx: number, maxAy: number, minBx: number, minBy: number, maxBx: number, maxBy: number) => {
    let aLeftOfB = maxAx < minBx;
    let aRightOfB = minAx > maxBx;
    let aAboveB = minAy > maxBy;
    let aBelowB = maxAy < minBy;

    return !(aLeftOfB || aRightOfB || aAboveB || aBelowB);
};

export class Rectangle {
    public x1: number;
    public y1: number;
    public x2: number;
    public y2: number;

    constructor(x1: number, y1: number, x2: number, y2: number) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }

    containsPoint(p: Vec2) {
        if (p.x >= this.x1 && p.x <= this.x2 && p.y >= this.y1 && p.y <= this.y2) {
            return true;
        } else return false;
    }

    intersectsWithRect(other: Rectangle) {
        return rectanglesIntersect(this.x1, this.y1, this.x2, this.y2, other.x1, other.y1, other.x2, other.y2);
    }

    intersectsWithCircle(cx: number, cy: number, cr: number) {
        return RectCircleColliding(this, cx, cy, cr);
    }
}

const RectCircleColliding = (rect: Rectangle, cx: number, cy: number, cr: number) => {
    const { x1, y1, x2, y2 } = rect;
    const middlePoint = createVec2(x1 + (x2 - x1) / 2, y1 + (y2 - y1) / 2);
    const width = x2 - x1;
    const height = y2 - y1;

    var distX = Math.abs(cx - middlePoint.x);
    var distY = Math.abs(cy - middlePoint.y);

    if (distX > width / 2 + cr) {
        return false;
    }
    if (distY > height / 2 + cr) {
        return false;
    }

    if (distX <= width / 2) {
        return true;
    }
    if (distY <= height / 2) {
        return true;
    }

    var dx = distX - width / 2;
    var dy = distY - height / 2;
    return dx * dx + dy * dy <= cr * cr;
};

const pointIsInCircle = (circle_x: number, circle_y: number, rad: number, x: number, y: number) => {
    if ((x - circle_x) * (x - circle_x) + (y - circle_y) * (y - circle_y) <= rad * rad) return true;
    else return false;
};

export class BoidQuadTree {
    boundary: Rectangle;

    split: boolean;
    topLeftQuad: BoidQuadTree | undefined;
    topRightQuad: BoidQuadTree | undefined;
    bottomLeftQuad: BoidQuadTree | undefined;
    bottomRightQuad: BoidQuadTree | undefined;
    boids: Boid[];
    capacity: number;

    constructor(boundary: Rectangle) {
        this.boundary = boundary;
        this.split = false;
        this.boids = [];
        this.capacity = 1;
    }

    splitIntoQuads() {
        const { x1, y1, x2, y2 } = this.boundary;
        const middlePoint = createVec2(x1 + (x2 - x1) / 2, y1 + (y2 - y1) / 2);

        const topLeftQuad = new BoidQuadTree(new Rectangle(x1, y1, middlePoint.x, middlePoint.y));
        this.topLeftQuad = topLeftQuad;

        const topRightQuad = new BoidQuadTree(new Rectangle(middlePoint.x, y1, x2, middlePoint.y));
        this.topRightQuad = topRightQuad;

        const bottomLeftQuad = new BoidQuadTree(new Rectangle(x1, middlePoint.y, middlePoint.x, y2));
        this.bottomLeftQuad = bottomLeftQuad;

        const bottomRightQuad = new BoidQuadTree(new Rectangle(middlePoint.x, middlePoint.y, x2, y2));
        this.bottomRightQuad = bottomRightQuad;

        this.split = true;
    }

    insertBoid(boid: Boid) {
        if (!this.boundary.containsPoint(boid.position)) return;

        if (this.boids.length < this.capacity) {
            this.boids.push(boid);
        } else {
            if (!this.split) this.splitIntoQuads();

            if (this.topLeftQuad?.boundary.containsPoint(boid.position)) {
                this.topLeftQuad.insertBoid(boid);
            } else if (this.topRightQuad?.boundary.containsPoint(boid.position)) {
                this.topRightQuad.insertBoid(boid);
            } else if (this.bottomLeftQuad?.boundary.containsPoint(boid.position)) {
                this.bottomLeftQuad.insertBoid(boid);
            } else if (this.bottomRightQuad?.boundary.containsPoint(boid.position)) {
                this.bottomRightQuad.insertBoid(boid);
            }
        }
    }

    getNearbyBoidsRectangleRadius(b: Boid, radius: number): Boid[] {
        const radiusRectangle = new Rectangle(b.position.x - radius, b.position.y - radius, b.position.x + radius, b.position.y + radius);

        const boids: Boid[] = [];

        if (this.boundary.intersectsWithRect(radiusRectangle)) {
            for (const boid of this.boids) {
                if (radiusRectangle.containsPoint(boid.position)) boids.push(boid);
            }

            if (this.split) {
                boids.push(...this.topLeftQuad!.getNearbyBoidsRectangleRadius(b, radius));
                boids.push(...this.topRightQuad!.getNearbyBoidsRectangleRadius(b, radius));
                boids.push(...this.bottomLeftQuad!.getNearbyBoidsRectangleRadius(b, radius));
                boids.push(...this.bottomRightQuad!.getNearbyBoidsRectangleRadius(b, radius));
            }
        }

        return boids;
    }

    getNearbyBoidsCircleRadius(b: Boid, radius: number): Boid[] {
        const boids: Boid[] = [];

        if (this.boundary.intersectsWithCircle(b.position.x, b.position.y, radius)) {
            for (const boid of this.boids) {
                if (pointIsInCircle(b.position.x, b.position.y, radius, boid.position.x, boid.position.y)) boids.push(boid);
            }

            if (this.split) {
                boids.push(...this.topLeftQuad!.getNearbyBoidsCircleRadius(b, radius));
                boids.push(...this.topRightQuad!.getNearbyBoidsCircleRadius(b, radius));
                boids.push(...this.bottomLeftQuad!.getNearbyBoidsCircleRadius(b, radius));
                boids.push(...this.bottomRightQuad!.getNearbyBoidsCircleRadius(b, radius));
            }
        }

        return boids;
    }
}

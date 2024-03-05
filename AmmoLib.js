(function (global, factory) {
    typeof exports === "object" && typeof module !== "undefined"
        ? factory(exports)
        : typeof define === "function" && define.amd
        ? define(["exports"], factory)
        : ((global =
              typeof globalThis !== "undefined" ? globalThis : global || self),
          factory((global.AmmoLib = {})));
})(this, function (exports) {

    function threeToAmmo(three, ammo) {
        if(typeof ammo == "object") ammo = Ammo.getPointer(ammo);
        three.toArray(Ammo.HEAPF32, ammo / 4);
    }

    function ammoToThree(three, ammo) {
        if(typeof ammo == "object") ammo = Ammo.getPointer(ammo);
        three.fromArray(Ammo.HEAPF32, ammo / 4);
    }

    function destroyAll(...objs) {
        for (const obj of objs) {
            Ammo.destroy(obj);
        }
    }

    // Quick hull, three.js implementation
    /**
     * Ported from: https://github.com/maurizzzio/quickhull3d/ by Mauricio Poppe (https://github.com/maurizzzio)
     */

    const Visible = 0;
    const Deleted = 1;

    const _v1 = new THREE.Vector3();
    const _line3 = new THREE.Line3();
    const _plane = new THREE.Plane();
    const _closestPoint = new THREE.Vector3();
    const _triangle = new THREE.Triangle();

    class ConvexHull {
        constructor() {
            this.tolerance = -1;

            this.faces = []; // the generated faces of the convex hull
            this.newFaces = []; // this array holds the faces that are generated within a single iteration

            // the vertex lists work as follows:
            //
            // let 'a' and 'b' be 'Face' instances
            // let 'v' be points wrapped as instance of 'Vertex'
            //
            //     [v, v, ..., v, v, v, ...]
            //      ^             ^
            //      |             |
            //  a.outside     b.outside
            //
            this.assigned = new VertexList();
            this.unassigned = new VertexList();

            this.vertices = []; // vertices of the hull (internal representation of given geometry data)
        }

        setFromPoints(points) {
            // The algorithm needs at least four points.

            if (points.length >= 4) {
                this.makeEmpty();

                for (let i = 0, l = points.length; i < l; i++) {
                    this.vertices.push(new VertexNode(points[i]));
                }

                this.compute();
            }

            return this;
        }

        setFromObject(object) {
            const points = [];

            object.updateMatrixWorld(true);

            object.traverse(function (node) {
                const geometry = node.geometry;

                if (geometry !== undefined) {
                    const attribute = geometry.attributes.position;

                    if (attribute !== undefined) {
                        for (let i = 0, l = attribute.count; i < l; i++) {
                            const point = new THREE.Vector3();

                            point
                                .fromBufferAttribute(attribute, i)
                                .applyMatrix4(node.matrixWorld);

                            points.push(point);
                        }
                    }
                }
            });

            return this.setFromPoints(points);
        }

        containsPoint(point) {
            const faces = this.faces;

            for (let i = 0, l = faces.length; i < l; i++) {
                const face = faces[i];

                // compute signed distance and check on what half space the point lies

                if (face.distanceToPoint(point) > this.tolerance) return false;
            }

            return true;
        }

        intersectRay(ray, target) {
            // based on "Fast Ray-Convex Polyhedron Intersection"  by Eric Haines, GRAPHICS GEMS II

            const faces = this.faces;

            let tNear = -Infinity;
            let tFar = Infinity;

            for (let i = 0, l = faces.length; i < l; i++) {
                const face = faces[i];

                // interpret faces as planes for the further computation

                const vN = face.distanceToPoint(ray.origin);
                const vD = face.normal.dot(ray.direction);

                // if the origin is on the positive side of a plane (so the plane can "see" the origin) and
                // the ray is turned away or parallel to the plane, there is no intersection

                if (vN > 0 && vD >= 0) return null;

                // compute the distance from the ray’s origin to the intersection with the plane

                const t = vD !== 0 ? -vN / vD : 0;

                // only proceed if the distance is positive. a negative distance means the intersection point
                // lies "behind" the origin

                if (t <= 0) continue;

                // now categorized plane as front-facing or back-facing

                if (vD > 0) {
                    //  plane faces away from the ray, so this plane is a back-face

                    tFar = Math.min(t, tFar);
                } else {
                    // front-face

                    tNear = Math.max(t, tNear);
                }

                if (tNear > tFar) {
                    // if tNear ever is greater than tFar, the ray must miss the convex hull

                    return null;
                }
            }

            // evaluate intersection point

            // always try tNear first since its the closer intersection point

            if (tNear !== -Infinity) {
                ray.at(tNear, target);
            } else {
                ray.at(tFar, target);
            }

            return target;
        }

        intersectsRay(ray) {
            return this.intersectRay(ray, _v1) !== null;
        }

        makeEmpty() {
            this.faces = [];
            this.vertices = [];

            return this;
        }

        // Adds a vertex to the 'assigned' list of vertices and assigns it to the given face

        addVertexToFace(vertex, face) {
            vertex.face = face;

            if (face.outside === null) {
                this.assigned.append(vertex);
            } else {
                this.assigned.insertBefore(face.outside, vertex);
            }

            face.outside = vertex;

            return this;
        }

        // Removes a vertex from the 'assigned' list of vertices and from the given face

        removeVertexFromFace(vertex, face) {
            if (vertex === face.outside) {
                // fix face.outside link

                if (vertex.next !== null && vertex.next.face === face) {
                    // face has at least 2 outside vertices, move the 'outside' reference

                    face.outside = vertex.next;
                } else {
                    // vertex was the only outside vertex that face had

                    face.outside = null;
                }
            }

            this.assigned.remove(vertex);

            return this;
        }

        // Removes all the visible vertices that a given face is able to see which are stored in the 'assigned' vertext list

        removeAllVerticesFromFace(face) {
            if (face.outside !== null) {
                // reference to the first and last vertex of this face

                const start = face.outside;
                let end = face.outside;

                while (end.next !== null && end.next.face === face) {
                    end = end.next;
                }

                this.assigned.removeSubList(start, end);

                // fix references

                start.prev = end.next = null;
                face.outside = null;

                return start;
            }
        }

        // Removes all the visible vertices that 'face' is able to see

        deleteFaceVertices(face, absorbingFace) {
            const faceVertices = this.removeAllVerticesFromFace(face);

            if (faceVertices !== undefined) {
                if (absorbingFace === undefined) {
                    // mark the vertices to be reassigned to some other face

                    this.unassigned.appendChain(faceVertices);
                } else {
                    // if there's an absorbing face try to assign as many vertices as possible to it

                    let vertex = faceVertices;

                    do {
                        // we need to buffer the subsequent vertex at this point because the 'vertex.next' reference
                        // will be changed by upcoming method calls

                        const nextVertex = vertex.next;

                        const distance = absorbingFace.distanceToPoint(
                            vertex.point
                        );

                        // check if 'vertex' is able to see 'absorbingFace'

                        if (distance > this.tolerance) {
                            this.addVertexToFace(vertex, absorbingFace);
                        } else {
                            this.unassigned.append(vertex);
                        }

                        // now assign next vertex

                        vertex = nextVertex;
                    } while (vertex !== null);
                }
            }

            return this;
        }

        // Reassigns as many vertices as possible from the unassigned list to the new faces

        resolveUnassignedPoints(newFaces) {
            if (this.unassigned.isEmpty() === false) {
                let vertex = this.unassigned.first();

                do {
                    // buffer 'next' reference, see .deleteFaceVertices()

                    const nextVertex = vertex.next;

                    let maxDistance = this.tolerance;

                    let maxFace = null;

                    for (let i = 0; i < newFaces.length; i++) {
                        const face = newFaces[i];

                        if (face.mark === Visible) {
                            const distance = face.distanceToPoint(vertex.point);

                            if (distance > maxDistance) {
                                maxDistance = distance;
                                maxFace = face;
                            }

                            if (maxDistance > 1000 * this.tolerance) break;
                        }
                    }

                    // 'maxFace' can be null e.g. if there are identical vertices

                    if (maxFace !== null) {
                        this.addVertexToFace(vertex, maxFace);
                    }

                    vertex = nextVertex;
                } while (vertex !== null);
            }

            return this;
        }

        // Computes the extremes of a simplex which will be the initial hull

        computeExtremes() {
            const min = new THREE.Vector3();
            const max = new THREE.Vector3();

            const minVertices = [];
            const maxVertices = [];

            // initially assume that the first vertex is the min/max

            for (let i = 0; i < 3; i++) {
                minVertices[i] = maxVertices[i] = this.vertices[0];
            }

            min.copy(this.vertices[0].point);
            max.copy(this.vertices[0].point);

            // compute the min/max vertex on all six directions

            for (let i = 0, l = this.vertices.length; i < l; i++) {
                const vertex = this.vertices[i];
                const point = vertex.point;

                // update the min coordinates

                for (let j = 0; j < 3; j++) {
                    if (point.getComponent(j) < min.getComponent(j)) {
                        min.setComponent(j, point.getComponent(j));
                        minVertices[j] = vertex;
                    }
                }

                // update the max coordinates

                for (let j = 0; j < 3; j++) {
                    if (point.getComponent(j) > max.getComponent(j)) {
                        max.setComponent(j, point.getComponent(j));
                        maxVertices[j] = vertex;
                    }
                }
            }

            // use min/max vectors to compute an optimal epsilon

            this.tolerance =
                3 *
                Number.EPSILON *
                (Math.max(Math.abs(min.x), Math.abs(max.x)) +
                    Math.max(Math.abs(min.y), Math.abs(max.y)) +
                    Math.max(Math.abs(min.z), Math.abs(max.z)));

            return { min: minVertices, max: maxVertices };
        }

        // Computes the initial simplex assigning to its faces all the points
        // that are candidates to form part of the hull

        computeInitialHull() {
            const vertices = this.vertices;
            const extremes = this.computeExtremes();
            const min = extremes.min;
            const max = extremes.max;

            // 1. Find the two vertices 'v0' and 'v1' with the greatest 1d separation
            // (max.x - min.x)
            // (max.y - min.y)
            // (max.z - min.z)

            let maxDistance = 0;
            let index = 0;

            for (let i = 0; i < 3; i++) {
                const distance =
                    max[i].point.getComponent(i) - min[i].point.getComponent(i);

                if (distance > maxDistance) {
                    maxDistance = distance;
                    index = i;
                }
            }

            const v0 = min[index];
            const v1 = max[index];
            let v2;
            let v3;

            // 2. The next vertex 'v2' is the one farthest to the line formed by 'v0' and 'v1'

            maxDistance = 0;
            _line3.set(v0.point, v1.point);

            for (let i = 0, l = this.vertices.length; i < l; i++) {
                const vertex = vertices[i];

                if (vertex !== v0 && vertex !== v1) {
                    _line3.closestPointToPoint(
                        vertex.point,
                        true,
                        _closestPoint
                    );

                    const distance = _closestPoint.distanceToSquared(
                        vertex.point
                    );

                    if (distance > maxDistance) {
                        maxDistance = distance;
                        v2 = vertex;
                    }
                }
            }

            // 3. The next vertex 'v3' is the one farthest to the plane 'v0', 'v1', 'v2'

            maxDistance = -1;
            _plane.setFromCoplanarPoints(v0.point, v1.point, v2.point);

            for (let i = 0, l = this.vertices.length; i < l; i++) {
                const vertex = vertices[i];

                if (vertex !== v0 && vertex !== v1 && vertex !== v2) {
                    const distance = Math.abs(
                        _plane.distanceToPoint(vertex.point)
                    );

                    if (distance > maxDistance) {
                        maxDistance = distance;
                        v3 = vertex;
                    }
                }
            }

            const faces = [];

            if (_plane.distanceToPoint(v3.point) < 0) {
                // the face is not able to see the point so 'plane.normal' is pointing outside the tetrahedron

                faces.push(
                    Face.create(v0, v1, v2),
                    Face.create(v3, v1, v0),
                    Face.create(v3, v2, v1),
                    Face.create(v3, v0, v2)
                );

                // set the twin edge

                for (let i = 0; i < 3; i++) {
                    const j = (i + 1) % 3;

                    // join face[ i ] i > 0, with the first face

                    faces[i + 1].getEdge(2).setTwin(faces[0].getEdge(j));

                    // join face[ i ] with face[ i + 1 ], 1 <= i <= 3

                    faces[i + 1].getEdge(1).setTwin(faces[j + 1].getEdge(0));
                }
            } else {
                // the face is able to see the point so 'plane.normal' is pointing inside the tetrahedron

                faces.push(
                    Face.create(v0, v2, v1),
                    Face.create(v3, v0, v1),
                    Face.create(v3, v1, v2),
                    Face.create(v3, v2, v0)
                );

                // set the twin edge

                for (let i = 0; i < 3; i++) {
                    const j = (i + 1) % 3;

                    // join face[ i ] i > 0, with the first face

                    faces[i + 1]
                        .getEdge(2)
                        .setTwin(faces[0].getEdge((3 - i) % 3));

                    // join face[ i ] with face[ i + 1 ]

                    faces[i + 1].getEdge(0).setTwin(faces[j + 1].getEdge(1));
                }
            }

            // the initial hull is the tetrahedron

            for (let i = 0; i < 4; i++) {
                this.faces.push(faces[i]);
            }

            // initial assignment of vertices to the faces of the tetrahedron

            for (let i = 0, l = vertices.length; i < l; i++) {
                const vertex = vertices[i];

                if (
                    vertex !== v0 &&
                    vertex !== v1 &&
                    vertex !== v2 &&
                    vertex !== v3
                ) {
                    maxDistance = this.tolerance;
                    let maxFace = null;

                    for (let j = 0; j < 4; j++) {
                        const distance = this.faces[j].distanceToPoint(
                            vertex.point
                        );

                        if (distance > maxDistance) {
                            maxDistance = distance;
                            maxFace = this.faces[j];
                        }
                    }

                    if (maxFace !== null) {
                        this.addVertexToFace(vertex, maxFace);
                    }
                }
            }

            return this;
        }

        // Removes inactive faces

        reindexFaces() {
            const activeFaces = [];

            for (let i = 0; i < this.faces.length; i++) {
                const face = this.faces[i];

                if (face.mark === Visible) {
                    activeFaces.push(face);
                }
            }

            this.faces = activeFaces;

            return this;
        }

        // Finds the next vertex to create faces with the current hull

        nextVertexToAdd() {
            // if the 'assigned' list of vertices is empty, no vertices are left. return with 'undefined'

            if (this.assigned.isEmpty() === false) {
                let eyeVertex,
                    maxDistance = 0;

                // grap the first available face and start with the first visible vertex of that face

                const eyeFace = this.assigned.first().face;
                let vertex = eyeFace.outside;

                // now calculate the farthest vertex that face can see

                do {
                    const distance = eyeFace.distanceToPoint(vertex.point);

                    if (distance > maxDistance) {
                        maxDistance = distance;
                        eyeVertex = vertex;
                    }

                    vertex = vertex.next;
                } while (vertex !== null && vertex.face === eyeFace);

                return eyeVertex;
            }
        }

        // Computes a chain of half edges in CCW order called the 'horizon'.
        // For an edge to be part of the horizon it must join a face that can see
        // 'eyePoint' and a face that cannot see 'eyePoint'.

        computeHorizon(eyePoint, crossEdge, face, horizon) {
            // moves face's vertices to the 'unassigned' vertex list

            this.deleteFaceVertices(face);

            face.mark = Deleted;

            let edge;

            if (crossEdge === null) {
                edge = crossEdge = face.getEdge(0);
            } else {
                // start from the next edge since 'crossEdge' was already analyzed
                // (actually 'crossEdge.twin' was the edge who called this method recursively)

                edge = crossEdge.next;
            }

            do {
                const twinEdge = edge.twin;
                const oppositeFace = twinEdge.face;

                if (oppositeFace.mark === Visible) {
                    if (
                        oppositeFace.distanceToPoint(eyePoint) > this.tolerance
                    ) {
                        // the opposite face can see the vertex, so proceed with next edge

                        this.computeHorizon(
                            eyePoint,
                            twinEdge,
                            oppositeFace,
                            horizon
                        );
                    } else {
                        // the opposite face can't see the vertex, so this edge is part of the horizon

                        horizon.push(edge);
                    }
                }

                edge = edge.next;
            } while (edge !== crossEdge);

            return this;
        }

        // Creates a face with the vertices 'eyeVertex.point', 'horizonEdge.tail' and 'horizonEdge.head' in CCW order

        addAdjoiningFace(eyeVertex, horizonEdge) {
            // all the half edges are created in ccw order thus the face is always pointing outside the hull

            const face = Face.create(
                eyeVertex,
                horizonEdge.tail(),
                horizonEdge.head()
            );

            this.faces.push(face);

            // join face.getEdge( - 1 ) with the horizon's opposite edge face.getEdge( - 1 ) = face.getEdge( 2 )

            face.getEdge(-1).setTwin(horizonEdge.twin);

            return face.getEdge(0); // the half edge whose vertex is the eyeVertex
        }

        //  Adds 'horizon.length' faces to the hull, each face will be linked with the
        //  horizon opposite face and the face on the left/right

        addNewFaces(eyeVertex, horizon) {
            this.newFaces = [];

            let firstSideEdge = null;
            let previousSideEdge = null;

            for (let i = 0; i < horizon.length; i++) {
                const horizonEdge = horizon[i];

                // returns the right side edge

                const sideEdge = this.addAdjoiningFace(eyeVertex, horizonEdge);

                if (firstSideEdge === null) {
                    firstSideEdge = sideEdge;
                } else {
                    // joins face.getEdge( 1 ) with previousFace.getEdge( 0 )

                    sideEdge.next.setTwin(previousSideEdge);
                }

                this.newFaces.push(sideEdge.face);
                previousSideEdge = sideEdge;
            }

            // perform final join of new faces

            firstSideEdge.next.setTwin(previousSideEdge);

            return this;
        }

        // Adds a vertex to the hull

        addVertexToHull(eyeVertex) {
            const horizon = [];

            this.unassigned.clear();

            // remove 'eyeVertex' from 'eyeVertex.face' so that it can't be added to the 'unassigned' vertex list

            this.removeVertexFromFace(eyeVertex, eyeVertex.face);

            this.computeHorizon(eyeVertex.point, null, eyeVertex.face, horizon);

            this.addNewFaces(eyeVertex, horizon);

            // reassign 'unassigned' vertices to the new faces

            this.resolveUnassignedPoints(this.newFaces);

            return this;
        }

        cleanup() {
            this.assigned.clear();
            this.unassigned.clear();
            this.newFaces = [];

            return this;
        }

        compute() {
            let vertex;

            this.computeInitialHull();

            // add all available vertices gradually to the hull

            while ((vertex = this.nextVertexToAdd()) !== undefined) {
                this.addVertexToHull(vertex);
            }

            this.reindexFaces();

            this.cleanup();

            return this;
        }
    }

    //

    class Face {
        constructor() {
            this.normal = new THREE.Vector3();
            this.midpoint = new THREE.Vector3();
            this.area = 0;

            this.constant = 0; // signed distance from face to the origin
            this.outside = null; // reference to a vertex in a vertex list this face can see
            this.mark = Visible;
            this.edge = null;
        }

        static create(a, b, c) {
            const face = new Face();

            const e0 = new HalfEdge(a, face);
            const e1 = new HalfEdge(b, face);
            const e2 = new HalfEdge(c, face);

            // join edges

            e0.next = e2.prev = e1;
            e1.next = e0.prev = e2;
            e2.next = e1.prev = e0;

            // main half edge reference

            face.edge = e0;

            return face.compute();
        }

        getEdge(i) {
            let edge = this.edge;

            while (i > 0) {
                edge = edge.next;
                i--;
            }

            while (i < 0) {
                edge = edge.prev;
                i++;
            }

            return edge;
        }

        compute() {
            const a = this.edge.tail();
            const b = this.edge.head();
            const c = this.edge.next.head();

            _triangle.set(a.point, b.point, c.point);

            _triangle.getNormal(this.normal);
            _triangle.getMidpoint(this.midpoint);
            this.area = _triangle.getArea();

            this.constant = this.normal.dot(this.midpoint);

            return this;
        }

        distanceToPoint(point) {
            return this.normal.dot(point) - this.constant;
        }
    }

    // Entity for a Doubly-Connected Edge List (DCEL).

    class HalfEdge {
        constructor(vertex, face) {
            this.vertex = vertex;
            this.prev = null;
            this.next = null;
            this.twin = null;
            this.face = face;
        }

        head() {
            return this.vertex;
        }

        tail() {
            return this.prev ? this.prev.vertex : null;
        }

        length() {
            const head = this.head();
            const tail = this.tail();

            if (tail !== null) {
                return tail.point.distanceTo(head.point);
            }

            return -1;
        }

        lengthSquared() {
            const head = this.head();
            const tail = this.tail();

            if (tail !== null) {
                return tail.point.distanceToSquared(head.point);
            }

            return -1;
        }

        setTwin(edge) {
            this.twin = edge;
            edge.twin = this;

            return this;
        }
    }

    // A vertex as a double linked list node.

    class VertexNode {
        constructor(point) {
            this.point = point;
            this.prev = null;
            this.next = null;
            this.face = null; // the face that is able to see this vertex
        }
    }

    // A double linked list that contains vertex nodes.

    class VertexList {
        constructor() {
            this.head = null;
            this.tail = null;
        }

        first() {
            return this.head;
        }

        last() {
            return this.tail;
        }

        clear() {
            this.head = this.tail = null;

            return this;
        }

        // Inserts a vertex before the target vertex

        insertBefore(target, vertex) {
            vertex.prev = target.prev;
            vertex.next = target;

            if (vertex.prev === null) {
                this.head = vertex;
            } else {
                vertex.prev.next = vertex;
            }

            target.prev = vertex;

            return this;
        }

        // Inserts a vertex after the target vertex

        insertAfter(target, vertex) {
            vertex.prev = target;
            vertex.next = target.next;

            if (vertex.next === null) {
                this.tail = vertex;
            } else {
                vertex.next.prev = vertex;
            }

            target.next = vertex;

            return this;
        }

        // Appends a vertex to the end of the linked list

        append(vertex) {
            if (this.head === null) {
                this.head = vertex;
            } else {
                this.tail.next = vertex;
            }

            vertex.prev = this.tail;
            vertex.next = null; // the tail has no subsequent vertex

            this.tail = vertex;

            return this;
        }

        // Appends a chain of vertices where 'vertex' is the head.

        appendChain(vertex) {
            if (this.head === null) {
                this.head = vertex;
            } else {
                this.tail.next = vertex;
            }

            vertex.prev = this.tail;

            // ensure that the 'tail' reference points to the last vertex of the chain

            while (vertex.next !== null) {
                vertex = vertex.next;
            }

            this.tail = vertex;

            return this;
        }

        // Removes a vertex from the linked list

        remove(vertex) {
            if (vertex.prev === null) {
                this.head = vertex.next;
            } else {
                vertex.prev.next = vertex.next;
            }

            if (vertex.next === null) {
                this.tail = vertex.prev;
            } else {
                vertex.next.prev = vertex.prev;
            }

            return this;
        }

        // Removes a list of vertices whose 'head' is 'a' and whose 'tail' is b

        removeSubList(a, b) {
            if (a.prev === null) {
                this.head = b.next;
            } else {
                a.prev.next = b.next;
            }

            if (b.next === null) {
                this.tail = a.prev;
            } else {
                b.next.prev = a.prev;
            }

            return this;
        }

        isEmpty() {
            return this.head === null;
        }
    }

    function euclideanModulo(m, n) {
        return ((m % n) + n) % n;
    }

    function inputModulo(num, min, max) {
        return euclideanModulo(num - min, max - min) + min;
    }

    const ActivationStates = Object.freeze({
        Active: 1,
        IslandSleeping: 2,
        WantsDeactivation: 3,
        DisableDeactivation: 4,
        DisableSimulation: 5,
    });

    const CollisionFlags = Object.freeze({
        StaticObject: 1,
        KinematicObject: 2,
        NoContactResponse: 4,
        CustomMaterialCallback: 8,
        CharacterObject: 16,
        DisableVisualizeObject: 32,
        DisableSPUCollisionProcessing: 64,
    });

    const AnisotropicFrictionFlags = Object.freeze({
        AnisotropicFrictionDisabled: 0,
        AnisotropicFriction: 1,
        AnisotropicRollingFriction: 2,
    });

    class Shape {
        constructor(geometry, shape) {
            this.geometry = geometry;
            this.shape = shape;
        }

        dispose() {
            this.geometry.dispose();
            Ammo.destroy(this.shape);
        }
    }

    class RigidBody extends THREE.EventDispatcher {
        constructor(mesh, body, motionState) {
			super();
            this.mesh = mesh;
            this.body = body;
			this.motionState = motionState;
            this.isSleeping = false;
            this.pointer = Ammo.getPointer(body);

			this.body.bodyWrapper = this;
            this.mesh.userData.bodyWrapper = this;
        }


		applyImpulse(impulse, relativeLocation) {
            const imp = new Ammo.btVector3();
            const relPos = new Ammo.btVector3();

            threeToAmmo(impulse, imp);
            threeToAmmo(relativeLocation, relPos);

            this.body.applyImpulse(imp, relPos);

            destroyAll(imp, relPos);
        }

        applyCentralImpulse(impulse) {
            this.applyImpulse(impulse, new THREE.Vector3());
        }

        applyForce(force, relativeLocation) {
            const frc = new Ammo.btVector3();
            const relPos = new Ammo.btVector3();

            threeToAmmo(force, frc);
            threeToAmmo(relativeLocation, relPos);

            this.body.applyForce(frc, relPos);

            destroyAll(frc, relPos);
        }

        applyCentralForce(force) {
            this.applyForce(force, new THREE.Vector3());
        }

        setLinearVelocity(velocity) {
            velocity.toArray(Ammo.HEAPF32, this.pointer / 4 + 78);
        }

        getLinearVelocity() {
			const vel = new THREE.Vector3();
            vel.fromArray(Ammo.HEAPF32, this.pointer / 4 + 78);
			return vel;
		}

        setAngularVelocity(velocity) {
            velocity.toArray(Ammo.HEAPF32, this.pointer / 4 + 82);
        }

        getAngularVelocity() {
			const vel = new THREE.Vector3();
            vel.fromArray(Ammo.HEAPF32, this.pointer / 4 + 82);
			return vel;
		}

		setActivationState(state) {
			Ammo.HEAP32[this.pointer / 4 + 54] = state;
		}

        getActivationState() {
            return Ammo.HEAP32[this.pointer / 4 + 54];
        }

		setLinearFactor(factor) {
			factor.toArray(Ammo.HEAPF32, this.pointer / 4 + 87);
		}

		setAngularFactor(factor) {
			factor.toArray(Ammo.HEAPF32, this.pointer / 4 + 136)
		}

        setDamping(linearDamping, angularDamping) {
            Ammo.HEAPF32[this.pointer / 4 + 111] = linearDamping;
            Ammo.HEAPF32[this.pointer / 4 + 112] = angularDamping;
        }

        setLinearDamping(damping) {
            Ammo.HEAPF32[this.pointer / 4 + 111] = damping;
        }

        getLinearDamping() {
            return Ammo.HEAPF32[this.pointer / 4 + 111];
        }

        setAngularDamping(damping) {
            Ammo.HEAPF32[this.pointer / 4 + 112] = damping;
        }

        getAngularDamping() {
            return Ammo.HEAPF32[this.pointer / 4 + 112];
        }

        setFriction(friction) {
            Ammo.HEAPF32[this.pointer / 4 + 56] = friction;
        }

        getFriction() {
            return Ammo.HEAPF32[this.pointer / 4 + 56];
        }

        setRestitution(restitution) {
            Ammo.HEAPF32[this.pointer / 4 + 57] = restitution;
        }

        getRestitution() {
            return Ammo.HEAPF32[this.pointer / 4 + 57];
        }

        setRollingFriction(friction) {
            Ammo.HEAPF32[this.pointer / 4 + 58] = friction;
        }

        getRollingFriction() {
            return Ammo.HEAPF32[this.pointer / 4 + 58];
        }

        setCollisionFlags(flags) {
            Ammo.HEAP32[this.pointer / 4 + 51] = flags;
        }

        getCollisionFlags() {
            return Ammo.HEAP32[this.pointer / 4 + 51];
        }

        getInverseMass() {
            return Ammo.HEAPF32[this.pointer / 4 + 86];
        }

        isStaticObject() {
            return !!(Ammo.HEAP32[this.pointer / 4 + 51] & 1);
        }

        isKinematicObject() {
            return !!(Ammo.HEAP32[this.pointer / 4 + 51] & 2);
        }

        isStaticOrKinematicObject() {
            return !!(Ammo.HEAP32[this.pointer / 4 + 51] & 3);
        }

        setTransform(position, rotation) {
            const v = new Ammo.btVector3(), q = new Ammo.btQuaternion();
            const t = new Ammo.btTransform();

            threeToAmmo(position, v);
            threeToAmmo(rotation, q);

            t.setOrigin(v);
            t.setRotation(q);

            const ms = new Ammo.btDefaultMotionState(t);

            this.body.setMotionState(ms);

            const pms = this.motionState;
            this.motionState = ms;

            this.mesh.position.copy(position);
            this.mesh.quaternion.copy(rotation);

            destroyAll(v, q, t, pms);
        }

        setPosition(position) {
            this.setTransform(position, this.mesh.quaternion);
        }

        setRotation(rotation) {
            this.setTransform(this.mesh.position, rotation);
        }

        dispose() {
			Ammo.destroy(this.body);
			Ammo.destroy(this.motionState);
		}

        onBeforeUpdate(world) {}

        onAfterUpdate(world) {}
    }

    class World {
        constructor(scene, world) {
            this.bodies = [];
            this.constraints = [];
            this.scene = scene;
            this.world = world;
            this.tmpTrans = new Ammo.btTransform();

			this.contactResult = new Ammo.ConcreteContactResultCallback();
			this.contactResult.checkObj = null;
			this.contactResult.addSingleResult = function(cp, colObj0Wrap, partId0, index0, colObj1Wrap, partId1, index1) {
				const contact = Ammo.wrapPointer(cp, Ammo.btManifoldPoint);
				const distance = contact.getDistance();
				if(distance > 0) return;

				let wrap0 = Ammo.wrapPointer(colObj0Wrap, Ammo.btCollisionObjectWrapper);
				let body0 = Ammo.castObject(wrap0.getCollisionObject(), Ammo.btRigidBody);

				let wrap1 = Ammo.wrapPointer(colObj1Wrap, Ammo.btCollisionObjectWrapper);
				let body1 = Ammo.castObject(wrap1.getCollisionObject(), Ammo.btRigidBody);

				let normal = new THREE.Vector3();
				let ammoNorm = contact.get_m_normalWorldOnB();

				let contactPt = new THREE.Vector3();
				let ctp = contact.get_m_positionWorldOnA();

				ammoToThree(normal, ammoNorm);
				ammoToThree(contactPt, ctp);

				if(this.checkObj == body0) {
					body0.bodyWrapper.dispatchEvent({
						type:"collide",
						body0:body0.bodyWrapper,
						body1:body1.bodyWrapper,
						normal:normal,
						contactPoint:contactPt
					});
				} else if(this.checkObj == body1) {

					normal.negate();

					body1.bodyWrapper.dispatchEvent({
						type:"collide",
						body0:body1.bodyWrapper,
						body1:body0.bodyWrapper,
						normal:normal,
						contactPoint:contactPt
					});
				}
			};
        }

        add(body, collisionGroup = 1, collisionMask = 1) {
            this.bodies.push(body);
            this.world.addRigidBody(body.body, collisionGroup, collisionMask);
            this.scene.add(body.mesh);
        }

        remove(body) {
            const ind = this.bodies.indexOf(body);
            if (ind >= 0) {
                this.scene.remove(body.mesh);
                this.world.removeRigidBody(body.body);
                this.bodies.splice(ind, 1);
            }
        }

        addConstraint(constraint) {
            this.world.addConstraint(constraint.constraint);
            this.constraints.push(constraint);
        }

        removeConstraint(constraint) {
            const ind = this.constraints.indexOf(constraint);

            if(ind >= 0) {
                this.world.removeConstraint(constraint.constraint);
                this.constraints.splice(ind, 1);
            }
        }

        update(dt) {
            for(const constraint of this.constraints) constraint.onBeforeUpdate.call(constraint);
            this.onUpdate();
            this.world.stepSimulation(dt, 4, 1 / 60);
            
            let i = 0;
            for (const body of this.bodies) {
                const t = body.mesh,
                    a = body.body;
				
                body.onBeforeUpdate.call(body, this, dt);

				this.contactResult.checkObj = a;
				this.world.contactTest(a, this.contactResult);

                const ms = a.getMotionState();
                if (ms) {

                    if(body.isKinematicObject()) {
                        const v = new Ammo.btVector3();
                        const q = new Ammo.btQuaternion();

                        threeToAmmo(t.position, v);
                        threeToAmmo(t.quaternion, q);

                        this.tmpTrans.setIdentity();
                        this.tmpTrans.setOrigin(v);
                        this.tmpTrans.setRotation(q);

                        ms.setWorldTransform(this.tmpTrans);

                        destroyAll(v, q);
                    } else {
                        ms.getWorldTransform(this.tmpTrans);

                        const p = this.tmpTrans.getOrigin();
                        const q = this.tmpTrans.getRotation();

                        ammoToThree(t.position, p);
                        ammoToThree(t.quaternion, q);

                        if(body.getActivationState() == ActivationStates.IslandSleeping) {
                            if(!body.isSleeping) {
                                body.dispatchEvent({type:"sleep"});
                                body.isSleeping = true;
                            }
                        } else {
                            if(body.isSleeping) {
                                body.dispatchEvent({type:"awake"});
                                body.isSleeping = false;
                            }
                        }
                    }
                }

                body.onAfterUpdate.call(body, this, dt);
            }
        }

        enableGImpact() {
            if(Ammo.btGImpactCollisionAlgorithm) {
                Ammo.btGImpactCollisionAlgorithm.prototype.registerAlgorithm(this.world.getDispatcher());
            } else {
                console.warn("AmmoLib.World: btGImpactCollisionAlgorithm not found in Ammo");
            }
        }

        render(renderer, camera) {
            renderer.render(this.scene, camera);
        }

        onUpdate() {}
    }

    class Constraint {
        constructor(bodyA, bodyB, constraint) {
            this.bodyA = bodyA;
            this.bodyB = bodyB;
            this.constraint = constraint;
        }

        dispose() {
            Ammo.destroy(this.constraint);
        }

        onBeforeUpdate() {}
    }

    class BoxShape extends Shape {
        constructor(halfExtents) {
            let v = new Ammo.btVector3();
            threeToAmmo(halfExtents, v);
            super(
                new THREE.BoxGeometry(
                    halfExtents.x * 2,
                    halfExtents.y * 2,
                    halfExtents.z * 2
                ),
                new Ammo.btBoxShape(v)
            );
            Ammo.destroy(v);
        }
    }

    class SphereShape extends Shape {
        constructor(radius) {
            super(
                new THREE.SphereGeometry(radius),
                new Ammo.btSphereShape(radius)
            );
        }
    }

    class ConeShape extends Shape {
        constructor(radius, height) {
            super(
                new THREE.ConeGeometry(radius, height, 32),
                new Ammo.btConeShape(radius, height)
            );
        }
    }

    class CylinderShape extends Shape {
        constructor(radius, height) {
            let v = new Ammo.btVector3();
            v.setValue(radius, height / 2, radius);

            super(
                new THREE.CylinderGeometry(radius, radius, height, 32),
                new Ammo.btCylinderShape(v)
            );

            Ammo.destroy(v);
        }
    }

    class CapsuleShape extends Shape {
        constructor(radius, height) {
            super(
                new THREE.CapsuleGeometry(radius, height, 4, 32),
                new Ammo.btCapsuleShape(radius, height)
            );
        }
    }

	class ConvexShape extends Shape {
		constructor(points) {
			if(points.length < 4) throw new Error("Not enough points to create hull");
			const hull = new ConvexHull();
			const shape = new Ammo.btConvexHullShape();
			const vec = new Ammo.btVector3();
            
			for(let i = 0; i < points.length; i++) {
                const point = points[i];

				hull.vertices.push(new VertexNode(point));
                vec.setValue(point.x, point.y, point.z);
				shape.addPoint(vec, i >= (points.length - 1));
			}

			hull.compute();

			const vertices = [];
			const normals = [];

			const geo = new THREE.BufferGeometry();

			for(const face of hull.faces) {
				let edge = face.edge;

				do {
					const point = edge.head().point;

					vertices.push(point.x, point.y, point.z);
					normals.push(face.normal.x, face.normal.y, face.normal.z);

					edge = edge.next;
				} while(edge != face.edge);

			}

			geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
			geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));

			super(
				geo,
				shape
			);

			Ammo.destroy(vec);
		}
	}

	class TrimeshShape extends Shape {
		constructor(geometry, removeDuplicateVertices = false) {
			const threeVec = new THREE.Vector3();
            const v1 = new Ammo.btVector3(), v2 = new Ammo.btVector3(), v3 = new Ammo.btVector3();
			const trimesh = new Ammo.btTriangleMesh(true, true);

			const positionAttribute = geometry.getAttribute("position");
			if(!positionAttribute) throw new Error("geometry must have a position attribute");

			if(geometry.index != null) {
				const index = geometry.index.array;

				for(let i = 0; i < index.length; i += 3) {

                    threeVec.fromBufferAttribute(positionAttribute, index[i + 0]);
                    threeToAmmo(threeVec, v1);
                    threeVec.fromBufferAttribute(positionAttribute, index[i + 1]);
                    threeToAmmo(threeVec, v2);
                    threeVec.fromBufferAttribute(positionAttribute, index[i + 2]);
                    threeToAmmo(threeVec, v3);

					trimesh.addTriangle(v1, v2, v3, removeDuplicateVertices);
				}
			} else {
				for(let i = 0; i < positionAttribute.count; i++) {
					threeVec.fromBufferAttribute(positionAttribute, i + 0);
                    threeToAmmo(threeVec, v1);
                    threeVec.fromBufferAttribute(positionAttribute, i + 1);
                    threeToAmmo(threeVec, v2);
                    threeVec.fromBufferAttribute(positionAttribute, i + 2);
                    threeToAmmo(threeVec, v3);

					trimesh.addTriangle(v1, v2, v3, removeDuplicateVertices);
				}
			}

			const shape = new Ammo.btBvhTriangleMeshShape(trimesh, true, true);

			super(
				geometry,
				shape
			);
			this.trimesh = trimesh;

            destroyAll(v1, v2, v3);
        }

		dispose() {
			super.dispose();
			Ammo.destroy(this.trimesh);
		}
	}

    let gImpactShapeWarned = false;

    class GImpactMeshShape extends Shape {
        constructor(geometry, removeDuplicateVertices = false) {
            const threeVec = new THREE.Vector3();
            const v1 = new Ammo.btVector3(), v2 = new Ammo.btVector3(), v3 = new Ammo.btVector3();
			const trimesh = new Ammo.btTriangleMesh();

			const positionAttribute = geometry.getAttribute("position");
			if(!positionAttribute) throw new Error("geometry must have a position attribute");

			if(geometry.index != null) {
				const index = geometry.index.array;

				for(let i = 0; i < index.length; i += 3) {

                    threeVec.fromBufferAttribute(positionAttribute, index[i + 0]);
                    threeToAmmo(threeVec, v1);
                    threeVec.fromBufferAttribute(positionAttribute, index[i + 1]);
                    threeToAmmo(threeVec, v2);
                    threeVec.fromBufferAttribute(positionAttribute, index[i + 2]);
                    threeToAmmo(threeVec, v3);

					trimesh.addTriangle(v1, v2, v3, removeDuplicateVertices);
				}
			} else {
				for(let i = 0; i < positionAttribute.count; i++) {
					threeVec.fromBufferAttribute(positionAttribute, i + 0);
                    threeToAmmo(threeVec, v1);
                    threeVec.fromBufferAttribute(positionAttribute, i + 1);
                    threeToAmmo(threeVec, v2);
                    threeVec.fromBufferAttribute(positionAttribute, i + 2);
                    threeToAmmo(threeVec, v3);

					trimesh.addTriangle(v1, v2, v3, removeDuplicateVertices);
				}
			}

            let shape;
            if(!Ammo.btGImpactMeshShape) {
                shape = new Ammo.btBvhTriangleMeshShape(trimesh, true, true);
                if(!gImpactWarned) {
                    gImpactWarned = true;
                    console.warn("AmmoLib.GImpactMeshShape: GImpactMeshShape not found in Ammo");
                }
            } else {
                shape = new Ammo.btGImpactMeshShape(trimesh);
                shape.updateBound();
            }

			super(
				geometry,
				shape
			);
			this.trimesh = trimesh;

            destroyAll(v1, v2, v3);
        }

        dispose() {
            super.dispose();
            Ammo.destroy(this.trimesh)
        }
    }

    class Material {
        constructor(material, friction = 0.25, restitution = 0.0) {
            this.material = material;
            this.friction = friction;
            this.restitution = restitution;
        }

        dispose() {
            this.material.dispose();
        }
    }

    class Body extends RigidBody {
        constructor(shape, mass, material, position = new THREE.Vector3, rotation = new THREE.Quaternion) {
            const mesh = new THREE.Mesh(shape.geometry, material.material);

            const transform = new Ammo.btTransform();
            transform.setIdentity();

			const p = new Ammo.btVector3(), q = new Ammo.btQuaternion();
			threeToAmmo(position, p);
			threeToAmmo(rotation, q);

			transform.setOrigin(p);
			transform.setRotation(q);

            const ms = new Ammo.btDefaultMotionState(transform);

            const inertia = new Ammo.btVector3(0, 0, 0);

            shape.shape.setMargin(0.05);
            shape.shape.calculateLocalInertia(mass, inertia);

            const info = new Ammo.btRigidBodyConstructionInfo(
                mass,
                ms,
                shape.shape,
                inertia
            );

            const body = new Ammo.btRigidBody(info);

            destroyAll(transform, info, inertia, p, q);

            body.setFriction(material.friction);
            body.setRestitution(material.restitution);

            super(mesh, body, ms);
            this.shape = shape;
        }
    }

    class InfinitePlane extends RigidBody {
        constructor(material, normal = new THREE.Vector3(0, 1, 0), distance = 0, options = {}) {
            options.meshWidth = options.meshWidth || distance * Math.SQRT2;
            options.meshHeight = options.meshHeight || distance * Math.SQRT2;
            options.meshWidthSegments = options.meshWidthSegments || 1;
            options.meshHeightSegments = options.meshHeightSegments || 1;

            const v = new Ammo.btVector3();
            threeToAmmo(normal, v);

            const collisionShape = new Ammo.btStaticPlaneShape(v, distance);

            const geometry = new THREE.PlaneGeometry(options.meshWidth, options.meshHeight, options.meshWidthSegments, options.meshHeightSegments);

            const q = new THREE.Quaternion();
            q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

            geometry.translate(0, 0, distance);
            geometry.applyQuaternion(q);

            const t = new Ammo.btTransform();
            t.setIdentity();

            const ms = new Ammo.btDefaultMotionState(t);

            collisionShape.calculateLocalInertia(0, v);

            const info = new Ammo.btRigidBodyConstructionInfo(0, ms, collisionShape, v);

            const body = new Ammo.btRigidBody(info);

            body.setFriction(material.friction);
            body.setRestitution(material.restitution);

            destroyAll(t, v, info);

            super(new THREE.Mesh(geometry, material.material), body, ms);
        }
    }

    class DynamicsWorld extends World {
        constructor() {
            const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(),
                dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration),
                broadphase = new Ammo.btDbvtBroadphase(),
                solver = new Ammo.btSequentialImpulseConstraintSolver();

            const world = new Ammo.btDiscreteDynamicsWorld(
                dispatcher,
                broadphase,
                solver,
                collisionConfiguration
            );


            super(new THREE.Scene(), world);
        }

        updateWorld(dt) {
            this.world.stepSimulation(dt, 4, 1 / 60);
        }

        setGravity(gravity) {
            const v = new Ammo.btVector3();
            threeToAmmo(gravity, v);
            this.world.setGravity(v);

            Ammo.destroy(v);
        }
    }

    class SoftBodyWorld extends World {
        constructor() {
            const collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration(),
                dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration),
                broadphase = new Ammo.btDbvtBroadphase(),
                solver = new Ammo.btSequentialImpulseConstraintSolver(),
                softBodySolver = new Ammo.btDefaultSoftBodySolver();

            const world = new Ammo.btSoftRigidDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration, softBodySolver);

            super(new THREE.Scene(), world);

            this.softbodies = [];
        }

        setGravity(gravity) {
            const v = new Ammo.btVector3();

            threeToAmmo(gravity, v);

            this.world.setGravity(v);
            this.world.getWorldInfo().set_m_gravity(v);

            Ammo.destroy(v);
        }

        addSoftBody(body, collisionGroup, collisionMask) {
            this.softbodies.push(body);
            this.scene.add(body.mesh);
            this.world.addSoftBody(body.body, collisionGroup, collisionGroup);
        }

        update(dt) {
            super.update(dt);

            for(const softbody of this.softbodies) {
                softbody.update();
            }
        }
    }

    class SoftBody extends THREE.EventDispatcher {
        constructor(softbody, mesh) {
            super();
            this.body = softbody;
            this.mesh = mesh;
            this.config = this.body.get_m_cfg();
            this.config.set_collisions( 0x11 );

        }

        update() {
            console.error("AmmoLib.SoftBody: Update method not implemented");
        }

        appendAnchor(nodeIndex, body, collisionBetweenBodies = false, influence = 1) {
            this.body.appendAnchor(nodeIndex, body.body, collisionBetweenBodies, influence);
        }
    }

    class SoftVolume extends SoftBody {
        constructor(geometry, mass, material, world, position = new THREE.Vector3, rotation = new THREE.Quaternion) {
            geometry.applyQuaternion(rotation);
            geometry.translate(position.x, position.y, position.z);

            if(!geometry.attributes.position) {
                console.error("AmmoLib.SoftVolume: Geometry must have a position attribute");
            }

            if(!geometry.attributes.normal) {
                const normal = new Float32Array(geometry.attributes.position.count * 3);

                geometry.addAttribute("normal", new THREE.BufferAttribute(normal, 3));
            }

            const pos = geometry.attributes.position;
            const nor = geometry.attributes.normal;
            const ind = geometry.index;

            const ct = ind ? ind.count : pos.count;

            pos.usage = THREE.StreamDrawUsage;
            nor.usage = THREE.StreamDrawUsage;
            
            const helpers = new Ammo.btSoftBodyHelpers();

            const hashToInd = {};
            const v1 = new THREE.Vector3();
            let newInd = 0;

            const positions = [];
            const indices = [];
            const associations = [];

            for (let i = 0; i < ct; i++) {
                const index = ind ? ind.getX(i) : i;
                v1.fromBufferAttribute(pos, index);

                let hash = `${~~(v1.x * 10000)}},${~~(v1.y * 10000)},${~~(v1.z * 10000)}`;

                if(!(hash in hashToInd)) {
                    associations.push([]);
                    positions.push(v1.x, v1.y, v1.z);
                    hashToInd[hash] = newInd++;
                }

                const hashInd = hashToInd[hash];

                associations[hashInd].push(index);
                indices.push(hashInd);
            }

            const tempGeo = new THREE.BufferGeometry();
            tempGeo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
            tempGeo.setIndex(indices);

            const mesh = new THREE.Mesh(geometry, material.material);

            const body = helpers.CreateFromTriMesh(
                world.world.getWorldInfo(),
                positions,
                indices,
                indices.length / 3,
                true
            );

            const sbConfig = body.get_m_cfg();
            sbConfig.set_viterations( 20 );
            sbConfig.set_piterations( 20 );

            // Friction
            sbConfig.set_kDF( material.friction );
            // Damping
            sbConfig.set_kDP( 0.01 );

            // Stiffness
            body.get_m_materials().at( 0 ).set_m_kLST( 0.9 );
            body.get_m_materials().at( 0 ).set_m_kAST( 0.9 );

            body.setTotalMass( mass, false );
            Ammo.castObject( body, Ammo.btCollisionObject ).getCollisionShape().setMargin( 0.05 );

            super(body, mesh);

            mesh.frustumCulled = false;

            this.associations = associations;

            Ammo.destroy(helpers);
        }

        setPressure(pressure) {
            this.config.set_kPR( pressure );
        }

        setLift(lift) {
            this.config.set_kLF(lift);
        }

        setDrag(drag) {
            this.config.setkDG(drag);
        }

        setFriction(friction) {
            this.config.set_m_kDF(friction)
        }

        update() {
            const geo =  this.mesh.geometry;
            const body = this.body;
            const positions = geo.attributes.position.array;
            const normals = geo.attributes.normal.array;
            const association = this.associations;
            const len = association.length;
            const nodes = body.get_m_nodes();

            for(let i = 0; i < len; i++) {
                const node = nodes.at(i);

                const pos = node.get_m_x();
                const px = pos.x(), py = pos.y(), pz = pos.z();
                const norm = node.get_m_n();
                const nx = norm.x(), ny = norm.y(), nz = norm.z();
                const assoc = association[i];

                for(let j = 0; j < assoc.length; j++) {
                    let ind = assoc[j] * 3;

                    positions[ind] = px;
                    normals[ind] = nx;
                    ind++;

                    positions[ind] = py;
                    normals[ind] = ny;
                    ind++;

                    positions[ind] = pz;
                    normals[ind] = nz;
                    ind++;
                }
            }

            geo.attributes.position.needsUpdate = true;
            geo.attributes.normal.needsUpdate = true;
        }
    }

    class Cloth extends SoftBody {
        constructor(planeGeometry, mass, material, world, position = new THREE.Vector3, rotation = new THREE.Quaternion) {
            const {width, height, widthSegments, heightSegments} = planeGeometry.parameters;
            const pos = planeGeometry.attributes.position;
            const w2 = width / 2, h2 = height / 2;
            planeGeometry.applyQuaternion(rotation);
            planeGeometry.translate(...position);
            const v1 = new THREE.Vector3();

            const helpers = new Ammo.btSoftBodyHelpers();
            v1.fromBufferAttribute(pos, 0);
            const c00 = new Ammo.btVector3(...v1);

            v1.fromBufferAttribute(pos, widthSegments);
            const c01 = new Ammo.btVector3(...v1);

            v1.fromBufferAttribute(pos, (widthSegments + 1) * heightSegments);
            const c10 = new Ammo.btVector3(...v1);

            v1.fromBufferAttribute(pos, widthSegments * heightSegments + widthSegments + heightSegments);
            const c11 = new Ammo.btVector3(...v1);
            
            const body = helpers.CreatePatch(world.world.getWorldInfo(), c00, c01, c10, c11, widthSegments + 1, heightSegments + 1, 0, true);
            const config = body.get_m_cfg();
            

            config.set_viterations( 10 );
            config.set_piterations( 10 );

            body.setTotalMass( mass, false );

            Ammo.castObject(body, Ammo.btCollisionObject).getCollisionShape().setMargin(0.15);

            const mesh = new THREE.Mesh(planeGeometry, material.material);
            mesh.frustumCulled = false;

            super(body, mesh);

            destroyAll(helpers, c00, c01, c10, c11);
        }

        update() {
            const geo = this.mesh.geometry;
            const pos = geo.attributes.position;
            const norm = geo.attributes.normal;
            const pArr = pos.array;
            const nodes = this.body.get_m_nodes();
            const n = pos.count;
            let ind = 0;

            for(let i = 0; i < n; i++) {
                const node = nodes.at(i);
                const position = node.get_m_x();
                const normal = node.get_m_n();

                pArr[ind] = position.x();
                ind++;

                pArr[ind] = position.y();
                ind++;

                pArr[ind] = position.z();
                ind++;
            }

            geo.computeVertexNormals();
            pos.needsUpdate = true;
            norm.needsUpdate = true;
        }
    }

    class Rope extends SoftBody {
        constructor(startPoint, endPoint, segments, mass, material, world) {
            const geo = new THREE.BufferGeometry();
            const positions = new Float32Array(segments * 3);
            const indices = new Uint16Array(segments * 2);
            const v1 = new THREE.Vector3();

            startPoint.toArray(positions, 0);

            for(let i = 1; i <= segments; i++) {
                v1.lerpVectors(startPoint, endPoint, i / segments);

                positions.toArray(positions, i * 3);
                indices[(i - 1) * 2] = i - 1;
                indices[i * 2 - 1] = i;
            }

            geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
            geo.setIndex(indices);

            const mesh = new THREE.Mesh(geo, material.material);

            const helpers = new Ammo.btSoftBodyHelpers();
            const start = new Ammo.btVector3(...startPoint);
            const end = new Ammo.btVector3(...endPoint);

            const body = helpers.CreateRope(world.world.getWorldInfo(), start, end, segments - 1, 0);
            const config = body.get_m_cfg();
            config.set_piterations(10);
            config.set_viterations(10);

            body.setTotalMass(mass, false);

            super(body, mesh);

            destroyAll(helpers, start, end);
        }

        update() {
            const geo = this.mesh.geometry;
            const pos = geo.attributes.position;
            const pArr = pos.array;
            const n = pos.count;
            const nodes = this.body.get_m_nodes();
            let ind = 0;

            for(let i = 0; i < n; i++) {
                const node = nodes.at(i);
                const p = node.get_m_x();

                pArr[ind++] = p.x();
                pArr[ind++] = p.y();
                pArr[ind++] = p.z();
            }
        }
    }

    class Point2PointConstraint extends Constraint {
        constructor(bodyA, bodyB, localA, localB) {
            const locA = new Ammo.btVector3(),
                locB = new Ammo.btVector3();
            threeToAmmo(localA, locA);
            threeToAmmo(localB, locB);

            super(
                bodyA,
                bodyB,
                new Ammo.btPoint2PointConstraint(
                    bodyA.body,
                    bodyB.body,
                    locA,
                    locB
                )
            );

            destroyAll(locA, locB);
        }
    }

    class FixedConstraint extends Constraint {
        constructor(bodyA, bodyB, posLocA, rotLocA, posLocB, rotLocB) {
            const locA = new Ammo.btTransform(),
                locB = new Ammo.btTransform();
            locA.setIdentity();
            locB.setIdentity();

            const pLocA = new Ammo.btVector3(),
                qLocA = new Ammo.btQuaternion();
            const pLocB = new Ammo.btVector3(),
                qLocB = new Ammo.btQuaternion();

            threeToAmmo(posLocA, pLocA);
            threeToAmmo(rotLocA, qLocA);

            threeToAmmo(posLocB, pLocB);
            threeToAmmo(rotLocB, qLocB);

            locA.setOrigin(pLocA);
            locA.setRotation(qLocA);

            locB.setOrigin(pLocB);
            locB.setRotation(qLocB);

            super(
                bodyA,
                bodyB,
                new Ammo.btFixedConstraint(bodyA.body, bodyB.body, locA, locB)
            );

            destroyAll(pLocA, pLocB, qLocA, qLocB, locA, locB);
        }
    }

    class HingeConstraint extends Constraint {
        constructor(bodyA, bodyB, localA, localB, hingeAxisA, hingeAxisB) {
            const locA = new Ammo.btVector3(),
                locB = new Ammo.btVector3();
            const hingeA = new Ammo.btVector3(),
                hingeB = new Ammo.btVector3();

            threeToAmmo(localA, locA);
            threeToAmmo(localB, locB);
            threeToAmmo(hingeAxisA, hingeA);
            threeToAmmo(hingeAxisB, hingeB);

            super(
                bodyA,
                bodyB,
                new Ammo.btHingeConstraint(
                    bodyA.body,
                    bodyB.body,
                    locA,
                    locB,
                    hingeA,
                    hingeB
                )
            );

            destroyAll(locA, locB, hingeA, hingeB);
        }
    }

    class SpringConstraint extends Constraint {
        constructor(bodyA, bodyB, posLocA, posLocB, rotLocA, rotLocB) {
            const locA = new Ammo.btTransform(),
                locB = new Ammo.btTransform();
            locA.setIdentity();
            locB.setIdentity();

            const pLocA = new Ammo.btVector3(),
                qLocA = new Ammo.btQuaternion();
            const pLocB = new Ammo.btVector3(),
                qLocB = new Ammo.btQuaternion();

            threeToAmmo(posLocA, pLocA);
            threeToAmmo(rotLocA, qLocA);

            threeToAmmo(posLocB, pLocB);
            threeToAmmo(rotLocB, qLocB);

            locA.setOrigin(pLocA);
            locA.setRotation(qLocA);

            locB.setOrigin(pLocB);
            locB.setRotation(qLocB);

            super(
                bodyA,
                bodyB,
                new Ammo.btGeneric6DofSpringConstraint(
                    bodyA.body,
                    bodyB.body,
                    locA,
                    locB,
                    false
                )
            );
            destroyAll(pLocA, pLocB, qLocA, qLocB, locA, locB);

            this.ptr = Ammo.getPointer(this.constraint);
        }

        setSpring(index, equilibrium, stiffness, damping) {
            this.constraint.enableSpring(index, true);
            this.constraint.setStiffness(index, stiffness);
            this.constraint.setEquilibriumPoint(index, equilibrium);
            this.constraint.setDamping(index, damping);
        }

        setLinearXLimit(upper, lower) {
            Ammo.HEAPF32[this.ptr / 4 + 170] = lower;
            Ammo.HEAPF32[this.ptr / 4 + 174] = upper;
        }

        setLinearYLimit(upper, lower) {
            Ammo.HEAPF32[this.ptr / 4 + 171] = lower;
            Ammo.HEAPF32[this.ptr / 4 + 175] = upper;
        }

        setLinearZLimit(upper, lower) {
            Ammo.HEAPF32[this.ptr / 4 + 172] = lower;
            Ammo.HEAPF32[this.ptr / 4 + 176] = upper;
        }

        setAngularXLimit(upper, lower) {
            Ammo.HEAPF32[this.ptr / 4 + 217] = inputModulo(lower, -Math.PI, Math.PI);
            Ammo.HEAPF32[this.ptr / 4 + 218] = inputModulo(upper, -Math.PI, Math.PI);
        }

        setAngularYLimit(upper, lower) {
            Ammo.HEAPF32[this.ptr / 4 + 233] = inputModulo(lower, -Math.PI, Math.PI);
            Ammo.HEAPF32[this.ptr / 4 + 234] = inputModulo(upper, -Math.PI, Math.PI);
        }

        setAngularZLimit(upper, lower) {
            Ammo.HEAPF32[this.ptr / 4 + 249] = inputModulo(lower, -Math.PI, Math.PI);
            Ammo.HEAPF32[this.ptr / 4 + 250] = inputModulo(upper, -Math.PI, Math.PI);
        }

        setLinearXSpring(equilibrium, stiffness, damping = 0.1) {
            this.setSpring(0, equilibrium, stiffness, damping);
        }

        setLinearYSpring(equilibrium, stiffness, damping = 0.1) {
            this.setSpring(1, equilibrium, stiffness, damping);
        }

        setLinearZSpring(equilibrium, stiffness, damping = 0.1) {
            this.setSpring(2, equilibrium, stiffness, damping);
        }

        setAngularXSpring(equilibrium, stiffness, damping = 0.1) {
            this.setSpring(3, equilibrium, stiffness, damping);
        }

        setAngularYSpring(equilibrium, stiffness, damping = 0.1) {
            this.setSpring(4, equilibrium, stiffness, damping);
        }

        setAngularZSpring(equilibrium, stiffness, damping = 0.1) {
            this.setSpring(5, equilibrium, stiffness, damping);
        }
    }

    class ConeTwistConstraint extends Constraint {
        constructor(bodyA, bodyB, posLocA, posLocB, rotLocA, rotLocB) {
            const locA = new Ammo.btTransform(),
                locB = new Ammo.btTransform();
            locA.setIdentity();
            locB.setIdentity();

            const pLocA = new Ammo.btVector3(),
                qLocA = new Ammo.btQuaternion();
            const pLocB = new Ammo.btVector3(),
                qLocB = new Ammo.btQuaternion();

            threeToAmmo(posLocA, pLocA);
            threeToAmmo(rotLocA, qLocA);

            threeToAmmo(posLocB, pLocB);
            threeToAmmo(rotLocB, qLocB);

            locA.setOrigin(pLocA);
            locA.setRotation(qLocA);

            locB.setOrigin(pLocB);
            locB.setRotation(qLocB);

            super(
                bodyA,
                bodyB,
                new Ammo.btConeTwistConstraint(bodyA.body, bodyB.body, locA, locB)
            );

            destroyAll(pLocA, pLocB, qLocA, qLocB, locA, locB);
        }

        setTwistLimit(limit) {
            this.constraint.setLimit(3, limit);
        }

        setSpan1Limit(limit) {
            this.constraint.setLimit(4, limit);
        }

        setSpan2Limit(limit) {
            this.constraint.setLimit(5, limit);
        }
    }

    class GroupUtil {
        constructor() {
            this.groups = {};
            this.nextGroup = 1;
            this.unusedGroups = [];
        }

        hasGroup(name) {
            return name in this.groups;
        }

        addGroup(name) {
            if (this.hasGroup(name)) return;
            else if (this.unusedGroups.length > 0)
                this.groups[name] = this.unusedGroups.shift();
            else this.groups[name] = (this.nextGroup <<= 1) / 2;
        }

        removeGroup(name) {
            if (!this.hasGroup(name)) return;
            else if (this.groups[name] == this.nextGroup / 2)
                this.nextGroup >>= 1;
            else this.unusedGroups.push(this.groups[name]);
            delete this.groups[name];
        }

        getGroup(name) {
            if (!this.hasGroup(name)) this.addGroup(name);

            return this.groups[name];
        }

        unionGroups(...names) {
            let group = 0;

            for (const name of names) {
                group |= this.getGroup(name);
            }

            return group;
        }
    }

    const DebugDrawMode = Object.freeze({
        NoDebug: 0,
        Wireframe: 1,
        AABB: 2,
        FeaturesText: 4,
        ContactPoints: 8,
        NoDeactivation: 16,
        NoHelpText: 32,
        Text: 64,
        ProfileTimings: 128,
        EnableSatComparison: 256,
        DisableBulletLCP: 512,
        EnableCCD: 1024,
        Constraints: 2048,
        ConstraintLimits: 4096,
        FastWireframe: 8192,
        Normals: 16384,
        All: 0xffffffff,
        combine(...names) {
            let end = 0;
            for(const name of names) {
                end += name in this ? this[name] : 0;
            }

            return end;
        }
    });

    function DebugDrawer(world, bufferSize = 100000) {        
        this.world = world;

        this.index = 0;

        const posBuffer = new Float32Array(bufferSize * 3);
        const colBuffer = new Float32Array(bufferSize * 3);

        this.positionBuffer = new THREE.BufferAttribute(posBuffer, 3);
        this.colorBuffer = new THREE.BufferAttribute(colBuffer, 3);

        this.positionBuffer.setUsage(THREE.StreamDrawUsage);
        this.colorBuffer.setUsage(THREE.StreamDrawUsage);

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", this.positionBuffer);
        geometry.setAttribute("color", this.colorBuffer);

        this.drawMesh = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({vertexColors:true}));
        this.drawMode = 0;
        this.enabled = true;

        const scope = this;

        const drawer = new Ammo.DebugDrawer();
        drawer.drawLine = this.drawLine.bind(this);
        drawer.drawContactPoint = this.drawContactPoint.bind(this);
        drawer.reportErrorWarning = this.reportErrorWarning.bind(this);
        drawer.draw3dText = this.draw3dText.bind(this);
        drawer.setDebugMode = this.setDebugMode.bind(this);
        drawer.getDebugMode = this.getDebugMode.bind(this);
        drawer.enable = this.enable.bind(this);
        drawer.disable = this.disable.bind(this);
        drawer.update = this.update.bind(this);
        this.world.world.setDebugDrawer(drawer);
    }

    // DebugDrawer.prototype = Object.create(Ammo.DebugDrawer.prototype);
    // DebugDrawer.prototype.constructor = DebugDrawer;

    DebugDrawer.prototype.enable = function() {
        this.enabled = true;
        this.drawMesh.visible = true;
    }

    DebugDrawer.prototype.disable = function() {
        this.enabled = false;
        this.drawMesh.visible = false;
    }

    DebugDrawer.prototype.update = function() {
        if(!this.enabled) return;

        this.index = 0;
        this.world.world.debugDrawWorld();

        this.positionBuffer.needsUpdate = true;
        this.colorBuffer.needsUpdate = true;

        this.drawMesh.geometry.setDrawRange(0, this.index);
    }

    DebugDrawer.prototype.drawLine = function(from, to, color) {
        const heap = Ammo.HEAPF32;
        from /= 4;
        to /= 4;
        color /= 4;

        const r = heap[color], g = heap[color + 1], b = heap[color + 2];
        const fx = heap[from], fy = heap[from + 1], fz = heap[from + 2];
        const tx = heap[to], ty = heap[to + 1], tz = heap[to + 2];

        this.positionBuffer.setXYZ(this.index, fx, fy, fz);
        this.colorBuffer.setXYZ(this.index++, r, g, b);

        this.positionBuffer.setXYZ(this.index, tx, ty, tz);
        this.colorBuffer.setXYZ(this.index++, r, g, b);
    }

    DebugDrawer.prototype.drawContactPoint = function(pointOnB, normalOnB, distance, lifetime, color) {
        const heap = Ammo.HEAPF32;
        pointOnB /= 4;
        normalOnB /= 4;
        color /= 4;

        const r = heap[color], g = heap[color + 1], b = heap[color + 2];
        const px = heap[pointOnB], py = heap[pointOnB + 1], pz = heap[pointOnB + 2];
        const dx = heap[normalOnB] * distance, dy = heap[normalOnB + 1] * distance, dz = heap[normalOnB + 2] * distance;

        this.positionBuffer.setXYZ(this.index, px, py, pz);
        this.colorBuffer.setXYZ(this.index++, r, g, b);
        
        this.positionBuffer.setXYZ(this.index, px + dx, py + dy, pz + dz);
        this.colorBuffer.setXYZ(this.index++, r, g, b);
    }

    DebugDrawer.prototype.reportErrorWarning = function(warningString) {
        if (Ammo.hasOwnProperty("UTF8ToString")) {
            console.warn(Ammo.UTF8ToString(warningString));
        } else if (!this.warnedOnce) {
            this.warnedOnce = true;
            console.warn("Cannot print warningString, please export UTF8ToString from Ammo.js in make.py");
        }
    }

    DebugDrawer.prototype.draw3dText = function(location, textString) {
        //TODO
        console.warn("TODO: draw3dText");
    }
    
    DebugDrawer.prototype.setDebugMode = function(debugMode) {
        this.drawMode = debugMode;
    }
    
    DebugDrawer.prototype.getDebugMode = function() {
        return this.drawMode;
    }

    exports.ActivationStates = ActivationStates;

    exports.CollisionFlags = CollisionFlags;

    exports.AnisotropicFrictionFlags = AnisotropicFrictionFlags;

    exports.Shape = Shape;
    exports.RigidBody = RigidBody;
    exports.World = World;
    exports.Material = Material;
    exports.Constraint = Constraint;

    exports.BoxShape = BoxShape;
    exports.SphereShape = SphereShape;
    exports.ConeShape = ConeShape;
    exports.CylinderShape = CylinderShape;
    exports.CapsuleShape = CapsuleShape;
	exports.ConvexShape = ConvexShape;
	exports.TrimeshShape = TrimeshShape;
    exports.GImpactMeshShape = GImpactMeshShape;

    exports.Body = Body;
    exports.InfinitePlane = InfinitePlane;

    exports.DynamicsWorld = DynamicsWorld;
    exports.SoftBodyWorld = SoftBodyWorld;

    exports.SoftBody = SoftBody;
    exports.SoftVolume = SoftVolume;
    exports.Cloth = Cloth;
    exports.Rope = Rope;

    exports.Point2PointConstraint = Point2PointConstraint;
    exports.FixedConstraint = FixedConstraint;
    exports.HingeConstraint = HingeConstraint;
    exports.SpringConstraint = SpringConstraint;
    exports.ConeTwistConstraint = ConeTwistConstraint;

    exports.GroupUtil = GroupUtil;

    exports.DebugDrawer = DebugDrawer;
    exports.DebugDrawMode = DebugDrawMode;
});

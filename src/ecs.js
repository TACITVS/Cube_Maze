export class ECS {
    constructor() {
        this.entities = new Map();
        this.components = new Map();
        this.systems = [];
        this.nextEntityId = 0;
    }

    createEntity(id = null) {
        const entityId = id !== null ? id : this.nextEntityId++;
        this.entities.set(entityId, { id: entityId, active: true });
        this.nextEntityId = Math.max(this.nextEntityId, entityId + 1);
        return entityId;
    }

    addComponent(entityId, type, data) {
        if (!this.components.has(type)) {
            this.components.set(type, new Map());
        }
        this.components.get(type).set(entityId, { ...data });
    }

    getComponent(entityId, type) {
        return this.components.get(type)?.get(entityId);
    }

    removeEntity(entityId) {
        for (const componentMap of this.components.values()) {
            componentMap.delete(entityId);
        }
        this.entities.delete(entityId);
    }

    query(queries) {
        const entities = Array.from(this.entities.values());
        return entities
            .filter(entity => entity.active)
            .map(entity => entity.id)
            .filter(id => queries.every(type => this.getComponent(id, type)));
    }

    addSystem(systemFn) {
        this.systems.push(systemFn);
    }

    update(delta) {
        this.systems.forEach(system => system(this, delta));
    }
}

export class UnionFind {
    constructor(size) {
        this.parent = Array.from({ length: size }, (_, i) => i);
        this.rank = new Array(size).fill(0);
    }

    find(x) {
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]);
        }
        return this.parent[x];
    }

    union(x, y) {
        const px = this.find(x);
        const py = this.find(y);
        if (px === py) return false;

        if (this.rank[px] < this.rank[py]) {
            this.parent[px] = py;
        } else {
            this.parent[py] = px;
            if (this.rank[px] === this.rank[py]) {
                this.rank[px]++;
            }
        }
        return true;
    }
}

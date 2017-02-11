import * as ImmutableUtils from './ImmutableUtils';

const getDefaultGetId = (idAttribute) => (input) =>
  ImmutableUtils.isImmutable(input) ? input.get(idAttribute) : input[idAttribute];

export default class EntitySchema {
  constructor(key, definition = {}, options = {}) {
    if (!key || typeof key !== 'string') {
      throw new Error(`Expected a string key for Entity, but found ${key}.`);
    }

    const {
      idAttribute = 'id',
      mergeStrategy = (entityA, entityB) => {
        return { ...entityA, ...entityB };
      },
      processStrategy = (input) => ({ ...input })
    } = options;

    this._key = key;
    this._getId = typeof idAttribute === 'function' ? idAttribute : getDefaultGetId(idAttribute);
    this._idAttribute = idAttribute;
    this._mergeStrategy = mergeStrategy;
    this._processStrategy = processStrategy;
    this.define(definition);
  }

  get key() {
    return this._key;
  }

  get idAttribute() {
    return this._idAttribute;
  }

  define(definition) {
    this.schema = Object.keys(definition).reduce((entitySchema, key) => {
      const schema = definition[key];
      return { ...entitySchema, [key]: schema };
    }, this.schema || {});
  }

  getId(input, parent, key) {
    return this._getId(input, parent, key);
  }

  merge(entityA, entityB) {
    return this._mergeStrategy(entityA, entityB);
  }

  normalize(input, parent, key, visit, addEntity) {
    const processedEntity = this._processStrategy(input, parent, key);
    Object.keys(this.schema).forEach((key) => {
      if (processedEntity.hasOwnProperty(key) && typeof processedEntity[key] === 'object') {
        const schema = this.schema[key];
        processedEntity[key] = visit(processedEntity[key], processedEntity, key, schema, addEntity);
      }
    });

    addEntity(this, processedEntity, input, parent, key);
    return this.getId(input, parent, key);
  }

  denormalize(entityOrId, unvisit, getDenormalizedEntity, cache) {
    const entity = getDenormalizedEntity(this, entityOrId);
    if (typeof entity !== 'object' || entity === null) {
      return entity;
    }

    const schemaKey = this.key;
    const entityId = this.getId(entity);

    if (!cache[schemaKey]) {
      cache[schemaKey] = {};
    }

    const cachedEntity = cache[schemaKey][entityId];

    if (cachedEntity) {
      return cachedEntity;
    } else {
      if (ImmutableUtils.isImmutable(entity)) {
        return ImmutableUtils.denormalizeImmutable(
          this.schema, entity, unvisit, getDenormalizedEntity, cache);
      }

      cache[schemaKey][entityId] = entity;

      const processedEntity = cache[schemaKey][entityId];
      Object.keys(this.schema).forEach((key) => {
        if (processedEntity.hasOwnProperty(key)) {
          const schema = this.schema[key];
          processedEntity[key] = unvisit(processedEntity[key], schema, getDenormalizedEntity, cache);
        }
      });

      return processedEntity;
    }
  }
}

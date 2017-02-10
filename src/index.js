import EntitySchema from './schemas/Entity';
import UnionSchema from './schemas/Union';
import ValuesSchema from './schemas/Values';
import ArraySchema, * as ArrayUtils from './schemas/Array';
import ObjectSchema, * as ObjectUtils from './schemas/Object';
import * as ImmutableUtils from './schemas/ImmutableUtils';

const visit = (value, parent, key, schema, addEntity) => {
  if (typeof value !== 'object' || !value) {
    return value;
  }

  if (typeof schema === 'object' && (!schema.normalize || typeof schema.normalize !== 'function')) {
    const method = Array.isArray(schema) ? ArrayUtils.normalize : ObjectUtils.normalize;
    return method(schema, value, parent, key, visit, addEntity);
  }

  return schema.normalize(value, parent, key, visit, addEntity);
};

const addEntities = (entities) => (schema, processedEntity, value, parent, key) => {
  const schemaKey = schema.key;
  const id = schema.getId(value, parent, key);
  if (!(schemaKey in entities)) {
    entities[schemaKey] = {};
  }

  const existingEntity = entities[schemaKey][id];
  if (existingEntity) {
    entities[schemaKey][id] = schema.merge(existingEntity, processedEntity);
  } else {
    entities[schemaKey][id] = processedEntity;
  }
};

export const schema = {
  Array: ArraySchema,
  Entity: EntitySchema,
  Object: ObjectSchema,
  Union: UnionSchema,
  Values: ValuesSchema
};

export const normalize = (input, schema) => {
  if (!input || typeof input !== 'object') {
    throw new Error(`Unexpected input given to normalize. Expected type to be "object", found "${typeof input}".`);
  }

  const entities = {};
  const addEntity = addEntities(entities);

  const result = visit(input, input, null, schema, addEntity);
  return { entities, result };
};

const unvisit = (input, schema, getDenormalizedEntity, cache) => {
  if (typeof schema === 'object' && (!schema.denormalize || typeof schema.denormalize !== 'function')) {
    const method = Array.isArray(schema) ? ArrayUtils.denormalize : ObjectUtils.denormalize;
    return method(schema, input, unvisit, getDenormalizedEntity, cache);
  }

  if (input === undefined || input === null) {
    return input;
  }

  return schema.denormalize(input, unvisit, getDenormalizedEntity, cache);
};

const getEntity = (entityOrId, schemaKey, entities, isImmutable) => {
  if (typeof entityOrId === 'object') {
    return entityOrId;
  }

  return isImmutable ?
    entities.getIn([ schemaKey, entityOrId.toString() ]) :
    entities[schemaKey][entityOrId];
};

const getEntities = (entities, isImmutable) => (schema, entityOrId) => {
  const schemaKey = schema.key;

  return getEntity(entityOrId, schemaKey, entities, isImmutable);
};

export const denormalize = (input, schema, entities, cache = {}) => {
  if (!input) {
    return input;
  }

  const isImmutable = ImmutableUtils.isImmutable(entities);
  const getDenormalizedEntity = getEntities(entities, isImmutable);
  return unvisit(input, schema, getDenormalizedEntity, cache);
};

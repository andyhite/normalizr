'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.denormalize = exports.normalize = exports.schema = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _Entity = require('./schemas/Entity');

var _Entity2 = _interopRequireDefault(_Entity);

var _Union = require('./schemas/Union');

var _Union2 = _interopRequireDefault(_Union);

var _Values = require('./schemas/Values');

var _Values2 = _interopRequireDefault(_Values);

var _Array = require('./schemas/Array');

var ArrayUtils = _interopRequireWildcard(_Array);

var _Object = require('./schemas/Object');

var ObjectUtils = _interopRequireWildcard(_Object);

var _ImmutableUtils = require('./schemas/ImmutableUtils');

var ImmutableUtils = _interopRequireWildcard(_ImmutableUtils);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var visit = function visit(value, parent, key, schema, addEntity) {
  if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) !== 'object' || !value) {
    return value;
  }

  if ((typeof schema === 'undefined' ? 'undefined' : _typeof(schema)) === 'object' && (!schema.normalize || typeof schema.normalize !== 'function')) {
    var method = Array.isArray(schema) ? ArrayUtils.normalize : ObjectUtils.normalize;
    return method(schema, value, parent, key, visit, addEntity);
  }

  return schema.normalize(value, parent, key, visit, addEntity);
};

var addEntities = function addEntities(entities) {
  return function (schema, processedEntity, value, parent, key) {
    var schemaKey = schema.key;
    var id = schema.getId(value, parent, key);
    if (!(schemaKey in entities)) {
      entities[schemaKey] = {};
    }

    var existingEntity = entities[schemaKey][id];
    if (existingEntity) {
      entities[schemaKey][id] = schema.merge(existingEntity, processedEntity);
    } else {
      entities[schemaKey][id] = processedEntity;
    }
  };
};

var schema = exports.schema = {
  Array: ArrayUtils.default,
  Entity: _Entity2.default,
  Object: ObjectUtils.default,
  Union: _Union2.default,
  Values: _Values2.default
};

var normalize = exports.normalize = function normalize(input, schema) {
  if (!input || (typeof input === 'undefined' ? 'undefined' : _typeof(input)) !== 'object') {
    throw new Error('Unexpected input given to normalize. Expected type to be "object", found "' + (typeof input === 'undefined' ? 'undefined' : _typeof(input)) + '".');
  }

  var entities = {};
  var addEntity = addEntities(entities);

  var result = visit(input, input, null, schema, addEntity);
  return { entities: entities, result: result };
};

var unvisit = function unvisit(input, schema, getDenormalizedEntity) {
  if ((typeof schema === 'undefined' ? 'undefined' : _typeof(schema)) === 'object' && (!schema.denormalize || typeof schema.denormalize !== 'function')) {
    var method = Array.isArray(schema) ? ArrayUtils.denormalize : ObjectUtils.denormalize;
    return method(schema, input, unvisit, getDenormalizedEntity);
  }

  if (input === undefined || input === null) {
    return input;
  }

  return schema.denormalize(input, unvisit, getDenormalizedEntity);
};

var getEntity = function getEntity(entityOrId, schemaKey, entities, isImmutable) {
  if ((typeof entityOrId === 'undefined' ? 'undefined' : _typeof(entityOrId)) === 'object') {
    return entityOrId;
  }

  return isImmutable ? entities.getIn([schemaKey, entityOrId.toString()]) : entities[schemaKey][entityOrId];
};

var getEntities = function getEntities(entities, cache, isImmutable) {
  var addToCache = function addToCache(schemaKey, entityId, entity) {
    cache[schemaKey][entityId] = entity;
    return entity;
  };

  return function (schema, entityOrId, handleCacheMiss) {
    var schemaKey = schema.key;
    var entityId = (typeof entityOrId === 'undefined' ? 'undefined' : _typeof(entityOrId)) === 'object' ? schema.getId(entityOrId) : entityOrId;

    if (!cache[schemaKey]) {
      cache[schemaKey] = {};
    }

    if (cache[schemaKey][entityId]) {
      return cache[schemaKey][entityId];
    }

    var entity = getEntity(entityOrId, schemaKey, entities, isImmutable);
    return handleCacheMiss(entity, addToCache);
  };
};

var denormalize = exports.denormalize = function denormalize(input, schema, entities) {
  if (!input) {
    return input;
  }

  var isImmutable = ImmutableUtils.isImmutable(entities);
  var getDenormalizedEntity = getEntities(entities, {}, isImmutable);
  return unvisit(input, schema, getDenormalizedEntity);
};
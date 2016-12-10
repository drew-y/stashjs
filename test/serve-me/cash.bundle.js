/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	const Cash_1 = __webpack_require__(1);
	window["Cash"] = Cash_1.Cash;
	const people = new Cash_1.Cash();
	people.insert({ name: "Drew", info: { age: 21, sex: "male" } });
	people.insert({ name: "Alex", info: { age: 19, sex: "male" } });
	people.insert({ name: "Abbe", info: { age: 16, sex: "female" } });
	window["people"] = people;


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	const eventemitter3_1 = __webpack_require__(2);
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	///////// Main Collection Class
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	/** Collection - Mongo like evented data Cache */
	class Cash extends eventemitter3_1.EventEmitter {
	    constructor() {
	        super(...arguments);
	        this.documents = {};
	        this.cachedQueries = {};
	    }
	    /** Generate a unique ID */
	    genID() {
	        const randArray = new Uint32Array(8);
	        crypto.getRandomValues(randArray);
	        let id = "";
	        randArray.forEach((rand) => {
	            id += rand.toString(36);
	        });
	        return id;
	    }
	    insertDoc(doc) {
	        const _id = this.genID();
	        const document = { _id };
	        Object.assign(document, doc);
	        this.documents[_id] = document;
	        this.emit("insert", doc);
	        return { success: true, document };
	    }
	    updateDoc(query, update, name, one) {
	        const docsToUpdate = this.find(query, name, one);
	        for (const key in update) {
	            if (updateOperators.hasOwnProperty(key)) {
	                updateOperators[key](docsToUpdate, update[key]);
	            }
	        }
	        this.emit("update", docsToUpdate);
	        return { success: true, documents: docsToUpdate };
	    }
	    parseQueryItem(queryItemField, queryItem) {
	        const queryType = typeof (queryItem);
	        const isPrimitive = queryType === "string" || queryType === "number" || queryType === "boolean";
	        if (isPrimitive) {
	            return (doc) => getField(queryItemField, doc).value === queryItem;
	        }
	        if (queryItem instanceof RegExp) {
	            return (doc) => queryItem.test(getField(queryItemField, doc).value);
	        }
	        const opName = Object.keys(queryItem)[0];
	        let opFunc;
	        if (comparisonOperators.hasOwnProperty(opName)) {
	            opFunc = comparisonOperators[opName];
	        }
	        else if (logicalOperators.hasOwnProperty(opName)) {
	            opFunc = logicalOperators[opName];
	        }
	        else {
	            throw new Error(`Invalid operator for ${queryItemField}`);
	        }
	        return opFunc(queryItemField, queryItem[opName]);
	    }
	    /** Reutrns an array of functions that check a doc and return true if the doc matches the function */
	    parseQuery(query) {
	        const checks = [];
	        for (const key in query) {
	            if (query.hasOwnProperty(key)) {
	                const queryItem = query[key];
	                const check = this.parseQueryItem(key, queryItem);
	                checks.push(check);
	            }
	        }
	        return checks;
	    }
	    insert(doc) {
	        return new Promise((resolve, reject) => {
	            const hResolve = () => resolve(this.insertDoc(doc));
	            const hasHooks = this.emit("beforeInsert", doc, hResolve, reject);
	            if (!hasHooks)
	                hResolve();
	        });
	    }
	    update(query, update, name, one) {
	        if (update.hasOwnProperty("_id")) {
	            delete update["_id"];
	        }
	        return new Promise((resolve, reject) => {
	            const hResolve = () => resolve(this.updateDoc(query, update, name, one));
	            const hasHooks = this.emit("beforeUpdate", update, query, hResolve, reject);
	            if (!hasHooks)
	                hResolve();
	        });
	    }
	    remove(query, name, one) {
	        this.emit("beforeRemove", query);
	        const docsToRemove = this.find(query, name, one);
	        const removedDocs = [];
	        for (const doc of docsToRemove) {
	            removedDocs.push(Object.assign({}, doc));
	            delete this.documents[doc._id];
	        }
	        this.emit("remove", removedDocs);
	        return removedDocs;
	    }
	    findOne(query, name) {
	        return this.find(query, name, true)[0];
	    }
	    find(query, name, one) {
	        const matchingDocs = [];
	        let docs = this.documents;
	        // If query has an _id find the doc it correponds too (if it exists)
	        if (query.hasOwnProperty("_id")) {
	            if (!docs.hasOwnProperty(query._id))
	                return [];
	            docs = {};
	            docs[query._id] = Object.assign({}, this.documents[query._id]);
	        }
	        const queryIsCached = !!this.cachedQueries[name];
	        const checks = queryIsCached ? this.cachedQueries[name] : this.parseQuery(query);
	        if (name && !queryIsCached) {
	            this.cachedQueries[name] = checks;
	        }
	        for (const docID in docs) {
	            if (docs.hasOwnProperty(docID)) {
	                const document = docs[docID];
	                let isValid = true;
	                for (const check of checks) {
	                    isValid = check(document);
	                }
	                if (isValid)
	                    matchingDocs.push(document);
	                if (isValid && one)
	                    break;
	            }
	        }
	        return matchingDocs;
	    }
	}
	exports.Cash = Cash;
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	///////// Operators
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	/** Parse a mongo field string ("field.subdoc.val etc") and return the containing subdocument, and the value of the subdoc */
	function getField(fieldStr, doc) {
	    const parsedFields = fieldStr.split(".");
	    const lastField = parsedFields.pop();
	    let docLevel = doc;
	    for (const fieldLevel of parsedFields) {
	        try {
	            docLevel = docLevel[fieldLevel];
	        }
	        catch (error) {
	            return { success: false };
	        }
	    }
	    return { success: true, reference: docLevel, field: lastField, value: docLevel[lastField] };
	}
	function genericUpdate(docsToUpdate, fields, operation) {
	    for (const doc of docsToUpdate) {
	        for (const field in fields) {
	            if (!fields.hasOwnProperty(field))
	                continue;
	            const docField = getField(field, doc);
	            if (docField.success) {
	                operation(docField, docField.field, fields[field]);
	            }
	        }
	    }
	}
	const updateOperators = {
	    $set: function (docsToUpdate, fields) {
	        const set = (obj, field, value) => { obj[field] = value; };
	        genericUpdate(docsToUpdate, fields, set);
	    },
	    $unset: function (docsToUpdate, fields) {
	        const unset = (obj, field, value) => { delete obj[field]; };
	        genericUpdate(docsToUpdate, fields, unset);
	    },
	    $inc: function (docsToUpdate, fields) {
	        const inc = (obj, field, value) => { obj[field] += value; };
	        genericUpdate(docsToUpdate, fields, inc);
	    },
	    $mul: function (docsToUpdate, fields) {
	        const mul = (obj, field, value) => { obj[field] *= value; };
	        genericUpdate(docsToUpdate, fields, mul);
	    }
	};
	const comparisonOperators = {
	    $gte: function (fieldStr, queryItemValue) {
	        return (doc) => {
	            const fieldInfo = getField(fieldStr, doc);
	            if (fieldInfo.success)
	                return fieldInfo.value >= queryItemValue;
	            return false;
	        };
	    },
	    $lte: function (queryItemField, queryItemValue) {
	        return (doc) => {
	            const fieldInfo = getField(queryItemField, doc);
	            if (fieldInfo.success)
	                return fieldInfo.value <= queryItemValue;
	            return false;
	        };
	    },
	    $gt: function (queryItemField, queryItemValue) {
	        return (doc) => {
	            const fieldInfo = getField(queryItemField, doc);
	            if (fieldInfo.success)
	                return fieldInfo.value > queryItemValue;
	            return false;
	        };
	    },
	    $lt: function (queryItemField, queryItemValue) {
	        return (doc) => {
	            const fieldInfo = getField(queryItemField, doc);
	            if (fieldInfo.success)
	                return fieldInfo.value < queryItemValue;
	            return false;
	        };
	    },
	    $eq: function (queryItemField, queryItemValue) {
	        return (doc) => {
	            const fieldInfo = getField(queryItemField, doc);
	            if (fieldInfo.success)
	                return fieldInfo.value === queryItemValue;
	            return false;
	        };
	    },
	    $ne: function (queryItemField, queryItemValue) {
	        return (doc) => {
	            const fieldInfo = getField(queryItemField, doc);
	            if (fieldInfo.success)
	                return fieldInfo.value !== queryItemValue;
	            return false;
	        };
	    },
	    $in: function (queryItemField, queryItemValue) {
	        return (doc) => {
	            const fieldInfo = getField(queryItemField, doc);
	            if (fieldInfo.success)
	                return queryItemValue.indexOf(fieldInfo.value) !== -1;
	            return false;
	        };
	    },
	    $nin: function (queryItemField, queryItemValue) {
	        return (doc) => {
	            const fieldInfo = getField(queryItemField, doc);
	            if (fieldInfo.success)
	                return queryItemValue.indexOf(fieldInfo.value) === -1;
	            return false;
	        };
	    }
	};
	function getChecksFromArray(queryItemField, queryItemValue) {
	    if (queryItemValue !== Array) {
	        throw new Error(`QueryItem ${queryItemField} is missing an Array`);
	    }
	    const checks = [];
	    queryItemValue.forEach((item) => {
	        const funcName = Object.keys(item)[0];
	        let func;
	        if (comparisonOperators.hasOwnProperty(funcName)) {
	            func = comparisonOperators[funcName];
	        }
	        else if (logicalOperators.hasOwnProperty(funcName)) {
	            func = logicalOperators[funcName];
	        }
	        else {
	            throw new Error(`Invaid operator in ${queryItemField}`);
	        }
	        checks.push(func(queryItemField, item[funcName]));
	    });
	    return checks;
	}
	const logicalOperators = {
	    $and: function (queryItemField, queryItemValue) {
	        const checks = getChecksFromArray(queryItemField, queryItemValue);
	        return (doc) => {
	            for (const check of checks) {
	                const success = check(doc);
	                if (!success)
	                    return false;
	            }
	            return true;
	        };
	    },
	    $or: function (queryItemField, queryItemValue) {
	        const checks = getChecksFromArray(queryItemField, queryItemValue);
	        return (doc) => {
	            for (const check of checks) {
	                const success = check(doc);
	                if (success)
	                    return true;
	            }
	            return false;
	        };
	    },
	    $nor: function (queryItemField, queryItemValue) {
	        const checks = getChecksFromArray(queryItemField, queryItemValue);
	        return (doc) => {
	            for (const check of checks) {
	                const success = check(doc);
	                if (success)
	                    return false;
	            }
	            return true;
	        };
	    },
	    $not: function (queryItemField, queryItemValue) {
	        const opName = Object.keys(queryItemValue)[0];
	        const checkOP = comparisonOperators[opName];
	        if (!checkOP)
	            throw new Error(`Bad operator for $not at`);
	        const check = checkOP(queryItemField, queryItemValue);
	        return (doc) => !check(doc);
	    }
	};


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var has = Object.prototype.hasOwnProperty
	  , prefix = '~';
	
	/**
	 * Constructor to create a storage for our `EE` objects.
	 * An `Events` instance is a plain object whose properties are event names.
	 *
	 * @constructor
	 * @api private
	 */
	function Events() {}
	
	//
	// We try to not inherit from `Object.prototype`. In some engines creating an
	// instance in this way is faster than calling `Object.create(null)` directly.
	// If `Object.create(null)` is not supported we prefix the event names with a
	// character to make sure that the built-in object properties are not
	// overridden or used as an attack vector.
	//
	if (Object.create) {
	  Events.prototype = Object.create(null);
	
	  //
	  // This hack is needed because the `__proto__` property is still inherited in
	  // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
	  //
	  if (!new Events().__proto__) prefix = false;
	}
	
	/**
	 * Representation of a single event listener.
	 *
	 * @param {Function} fn The listener function.
	 * @param {Mixed} context The context to invoke the listener with.
	 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
	 * @constructor
	 * @api private
	 */
	function EE(fn, context, once) {
	  this.fn = fn;
	  this.context = context;
	  this.once = once || false;
	}
	
	/**
	 * Minimal `EventEmitter` interface that is molded against the Node.js
	 * `EventEmitter` interface.
	 *
	 * @constructor
	 * @api public
	 */
	function EventEmitter() {
	  this._events = new Events();
	  this._eventsCount = 0;
	}
	
	/**
	 * Return an array listing the events for which the emitter has registered
	 * listeners.
	 *
	 * @returns {Array}
	 * @api public
	 */
	EventEmitter.prototype.eventNames = function eventNames() {
	  var names = []
	    , events
	    , name;
	
	  if (this._eventsCount === 0) return names;
	
	  for (name in (events = this._events)) {
	    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
	  }
	
	  if (Object.getOwnPropertySymbols) {
	    return names.concat(Object.getOwnPropertySymbols(events));
	  }
	
	  return names;
	};
	
	/**
	 * Return the listeners registered for a given event.
	 *
	 * @param {String|Symbol} event The event name.
	 * @param {Boolean} exists Only check if there are listeners.
	 * @returns {Array|Boolean}
	 * @api public
	 */
	EventEmitter.prototype.listeners = function listeners(event, exists) {
	  var evt = prefix ? prefix + event : event
	    , available = this._events[evt];
	
	  if (exists) return !!available;
	  if (!available) return [];
	  if (available.fn) return [available.fn];
	
	  for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
	    ee[i] = available[i].fn;
	  }
	
	  return ee;
	};
	
	/**
	 * Calls each of the listeners registered for a given event.
	 *
	 * @param {String|Symbol} event The event name.
	 * @returns {Boolean} `true` if the event had listeners, else `false`.
	 * @api public
	 */
	EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
	  var evt = prefix ? prefix + event : event;
	
	  if (!this._events[evt]) return false;
	
	  var listeners = this._events[evt]
	    , len = arguments.length
	    , args
	    , i;
	
	  if (listeners.fn) {
	    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);
	
	    switch (len) {
	      case 1: return listeners.fn.call(listeners.context), true;
	      case 2: return listeners.fn.call(listeners.context, a1), true;
	      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
	      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
	      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
	      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
	    }
	
	    for (i = 1, args = new Array(len -1); i < len; i++) {
	      args[i - 1] = arguments[i];
	    }
	
	    listeners.fn.apply(listeners.context, args);
	  } else {
	    var length = listeners.length
	      , j;
	
	    for (i = 0; i < length; i++) {
	      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);
	
	      switch (len) {
	        case 1: listeners[i].fn.call(listeners[i].context); break;
	        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
	        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
	        case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
	        default:
	          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
	            args[j - 1] = arguments[j];
	          }
	
	          listeners[i].fn.apply(listeners[i].context, args);
	      }
	    }
	  }
	
	  return true;
	};
	
	/**
	 * Add a listener for a given event.
	 *
	 * @param {String|Symbol} event The event name.
	 * @param {Function} fn The listener function.
	 * @param {Mixed} [context=this] The context to invoke the listener with.
	 * @returns {EventEmitter} `this`.
	 * @api public
	 */
	EventEmitter.prototype.on = function on(event, fn, context) {
	  var listener = new EE(fn, context || this)
	    , evt = prefix ? prefix + event : event;
	
	  if (!this._events[evt]) this._events[evt] = listener, this._eventsCount++;
	  else if (!this._events[evt].fn) this._events[evt].push(listener);
	  else this._events[evt] = [this._events[evt], listener];
	
	  return this;
	};
	
	/**
	 * Add a one-time listener for a given event.
	 *
	 * @param {String|Symbol} event The event name.
	 * @param {Function} fn The listener function.
	 * @param {Mixed} [context=this] The context to invoke the listener with.
	 * @returns {EventEmitter} `this`.
	 * @api public
	 */
	EventEmitter.prototype.once = function once(event, fn, context) {
	  var listener = new EE(fn, context || this, true)
	    , evt = prefix ? prefix + event : event;
	
	  if (!this._events[evt]) this._events[evt] = listener, this._eventsCount++;
	  else if (!this._events[evt].fn) this._events[evt].push(listener);
	  else this._events[evt] = [this._events[evt], listener];
	
	  return this;
	};
	
	/**
	 * Remove the listeners of a given event.
	 *
	 * @param {String|Symbol} event The event name.
	 * @param {Function} fn Only remove the listeners that match this function.
	 * @param {Mixed} context Only remove the listeners that have this context.
	 * @param {Boolean} once Only remove one-time listeners.
	 * @returns {EventEmitter} `this`.
	 * @api public
	 */
	EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
	  var evt = prefix ? prefix + event : event;
	
	  if (!this._events[evt]) return this;
	  if (!fn) {
	    if (--this._eventsCount === 0) this._events = new Events();
	    else delete this._events[evt];
	    return this;
	  }
	
	  var listeners = this._events[evt];
	
	  if (listeners.fn) {
	    if (
	         listeners.fn === fn
	      && (!once || listeners.once)
	      && (!context || listeners.context === context)
	    ) {
	      if (--this._eventsCount === 0) this._events = new Events();
	      else delete this._events[evt];
	    }
	  } else {
	    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
	      if (
	           listeners[i].fn !== fn
	        || (once && !listeners[i].once)
	        || (context && listeners[i].context !== context)
	      ) {
	        events.push(listeners[i]);
	      }
	    }
	
	    //
	    // Reset the array, or remove it completely if we have no more listeners.
	    //
	    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
	    else if (--this._eventsCount === 0) this._events = new Events();
	    else delete this._events[evt];
	  }
	
	  return this;
	};
	
	/**
	 * Remove all listeners, or those of the specified event.
	 *
	 * @param {String|Symbol} [event] The event name.
	 * @returns {EventEmitter} `this`.
	 * @api public
	 */
	EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
	  var evt;
	
	  if (event) {
	    evt = prefix ? prefix + event : event;
	    if (this._events[evt]) {
	      if (--this._eventsCount === 0) this._events = new Events();
	      else delete this._events[evt];
	    }
	  } else {
	    this._events = new Events();
	    this._eventsCount = 0;
	  }
	
	  return this;
	};
	
	//
	// Alias methods names because people roll like that.
	//
	EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
	EventEmitter.prototype.addListener = EventEmitter.prototype.on;
	
	//
	// This function doesn't apply anymore.
	//
	EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
	  return this;
	};
	
	//
	// Expose the prefix.
	//
	EventEmitter.prefixed = prefix;
	
	//
	// Allow `EventEmitter` to be imported as module namespace.
	//
	EventEmitter.EventEmitter = EventEmitter;
	
	//
	// Expose the module.
	//
	if (true) {
	  module.exports = EventEmitter;
	}


/***/ }
/******/ ]);
//# sourceMappingURL=cash.bundle.js.map
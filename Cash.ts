import { EventEmitter } from "eventemitter3";
import { Document, Result, Query, Sort, Update, compiledQuery, Collection } from "./definitions";
import Cursor = require('./Cursor');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////// Main Collection Class
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Collection - Mongo like evented data Cache */
class Cash extends EventEmitter implements Collection {
  readonly documents: { [_id: string]: Document } = {};
  private readonly cachedQueries: { [_id: string]: compiledQuery } = {};

  /** Generate a unique ID */
  genID(length: number = 18): string {
    let ID = "";
    while (ID.length < length) {
      const randNum = Math.floor((Math.random() * 100000000));
      ID += randNum.toString(36);
    }

    return ID.substring(0, length);
  }

  private insertDoc(doc: Object): Result {
    const _id = this.genID();
    doc[_id] = _id;
    this.documents[_id] = doc as Document;
    this.emit("insert", doc);
    return { success: true, document: doc as Document };
  }

  private parseQueryItem(queryItemField: string, queryItem: any): (doc: Document) => boolean {
    const queryType = typeof(queryItem);
    const isPrimitive = queryType === "string" || queryType === "number" || queryType === "boolean";
    if (isPrimitive) {
      return (doc: Document): boolean => getField(queryItemField, doc).value === queryItem;
    }
    if (queryItem instanceof RegExp) {
      return (doc: Document): boolean => queryItem.test(getField(queryItemField, doc).value);
    }

    const opName = Object.keys(queryItem)[0];
    let opFunc: (queryItemField: string, queryItem: Object) => (doc: Document) => boolean;
    if (comparisonOperators.hasOwnProperty(opName)) {
      opFunc = comparisonOperators[opName];
    } else if (logicalOperators.hasOwnProperty(opName)) {
      opFunc = logicalOperators[opName];
    } else {
      throw new Error(`Invalid operator for ${queryItemField}`);
    }
    return opFunc(queryItemField, queryItem[opName]);
  }

  /** Reutrns an array of functions that check a doc and return true if the doc matches the function */
  private parseQuery(query: Query): ((doc: Document) => boolean)[] {
    const checks: ((doc: Document) => boolean)[] = [];
    for (const key in query) {
      if (query.hasOwnProperty(key)) {
        const queryItem = query[key];
        const check = this.parseQueryItem(key, queryItem);
        checks.push(check);
      }
    }
    return checks;
  }

  insert(doc: Object): Promise<Result> {
    return new Promise((resolve, reject) => {
      const hResolve = () => resolve(this.insertDoc(doc));
      const hasHooks = this.emit("beforeInsert", doc, hResolve, reject);
      if (!hasHooks) hResolve();
    });
  }

  update(query: Query, update: Object, name?: string, one?: boolean): Promise<Result> {
    const docs = this.find(query, name, one);

    function act() {
      for (const key in update) {
        if (updateOperators.hasOwnProperty(key)) {
          updateOperators[key](docs, update[key]);
        }
      }

      this.emit("update", docs);
      return { success: true, documents: docs };
    }

    return new Promise((resolve, reject) => {
      const hResolve = () => resolve(act);
      const hasHooks = this.emit("beforeUpdate", docs, hResolve, reject);
      if (!hasHooks) hResolve();
    });
  }

  /** Remove a document from the cache. Promise resolves with the removed document(s). */
  remove(query: Query, name?: string, one?: boolean): Promise<Document[]> {
    const docsToRemove = this.find(query, name, one);

    return new Promise((resolve, reject) => {
      const hResolve = () => {
        const removedDocs: Document[] = [];
        for (const doc of docsToRemove) {
          removedDocs.push(Object.assign({}, doc));
          delete this.documents[doc._id];
        }
        this.emit("remove", removedDocs);

        return resolve(removedDocs);
      }

      const hasHooks = this.emit("beforeRemove", docsToRemove, hResolve, reject);
      if (!hasHooks) hResolve();
    });
  }

  findOne(query: Query, name?: string): Document | void {
    return this.find(query, name, true)[0];
  }

  find(query: Query, name?: string, one?: boolean): Document[] {
    const matchingDocs: Document[] = [];

    let docs = this.documents;

    // If query has an _id find the doc it correponds too (if it exists)
    if (query.hasOwnProperty("_id")) {
      if (!docs.hasOwnProperty(query._id)) return [];
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
        if (isValid) matchingDocs.push(document);
        if (isValid && one) break;
      }
    }
    return matchingDocs;
  }
}

export = Cash;

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////// Operators
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Parse a mongo field string ("field.subdoc.val etc") and return the containing subdocument, and the value of the subdoc */
function getField(fieldStr: string, doc: Document): { success: boolean, reference?: Object, field?: string, value?: any } {
  const parsedFields = fieldStr.split(".");
  const lastField = parsedFields.pop();

  let docLevel = doc;
  for (const fieldLevel of parsedFields) {
    try {
      docLevel = docLevel[fieldLevel];
    } catch (error) {
      return { success: false };
    }
  }

  return { success: true, reference: docLevel, field: lastField, value: docLevel[lastField] };
}

type operator = (object: Object, field: string, value) => void;

function genericUpdate(docsToUpdate: Document[], fields: Object, operation: operator) {
  for (const doc of docsToUpdate) {
    for (const field in fields) {
      if (!fields.hasOwnProperty(field)) continue;

      const docField = getField(field, doc);
      if (docField.success) {
        operation(docField.reference, docField.field, fields[field])
      }
    }
  }
}

const updateOperators = {
  $set: function(docsToUpdate: Document[], fields: Object) {
    const set = (obj, field, value) => { obj[field] = value };
    genericUpdate(docsToUpdate, fields, set);
  },
  $unset: function(docsToUpdate: Document[], fields: Object) {
    const unset = (obj, field, value) => { delete obj[field] };
    genericUpdate(docsToUpdate, fields, unset);
  },
  $inc: function(docsToUpdate: Document[], fields: Object) {
    const inc = (obj, field, value) => { obj[field] += value };
    genericUpdate(docsToUpdate, fields, inc);
  },
  $mul: function(docsToUpdate: Document[], fields: Object) {
    const mul = (obj, field, value) => { obj[field] *= value };
    genericUpdate(docsToUpdate, fields, mul);
  }
};

const comparisonOperators = {
  $gte: function(fieldStr: string, queryItemValue: any): (doc: Document) => boolean {
    return (doc: Document) => {
      const fieldInfo = getField(fieldStr, doc);
      if (fieldInfo.success) return fieldInfo.value >= queryItemValue;
      return false;
    };
  },
  $lte: function(queryItemField: string, queryItemValue: any): (doc: Document) => boolean {
    return (doc: Document) => {
      const fieldInfo = getField(queryItemField, doc);
      if (fieldInfo.success) return fieldInfo.value <= queryItemValue;
      return false;
    };
  },
  $gt: function(queryItemField: string, queryItemValue: any): (doc: Document) => boolean {
    return (doc: Document) => {
      const fieldInfo = getField(queryItemField, doc);
      if (fieldInfo.success) return fieldInfo.value > queryItemValue;
      return false;
    };
  },
  $lt: function(queryItemField: string, queryItemValue: any): (doc: Document) => boolean {
    return (doc: Document) => {
      const fieldInfo = getField(queryItemField, doc);
      if (fieldInfo.success) return fieldInfo.value < queryItemValue;
      return false;
    };
  },
  $eq: function(queryItemField: string, queryItemValue: any): (doc: Document) => boolean {
    return (doc: Document) => {
      const fieldInfo = getField(queryItemField, doc);
      if (fieldInfo.success) return fieldInfo.value === queryItemValue;
      return false;
    };
  },
  $ne: function(queryItemField: string, queryItemValue: any): (doc: Document) => boolean {
    return (doc: Document) => {
      const fieldInfo = getField(queryItemField, doc);
      if (fieldInfo.success) return fieldInfo.value !== queryItemValue;
      return false;
    };
  },
  $in: function(queryItemField: string, queryItemValue: any): (doc: Document) => boolean  {
    return (doc: Document) => {
      const fieldInfo = getField(queryItemField, doc);
      if (fieldInfo.success) return queryItemValue.indexOf(fieldInfo.value) !== -1;
      return false;
    };
  },
  $nin: function(queryItemField: string, queryItemValue: any): (doc: Document) => boolean  {
    return (doc: Document) => {
      const fieldInfo = getField(queryItemField, doc);
      if (fieldInfo.success) return queryItemValue.indexOf(fieldInfo.value) === -1;
      return false;
    };
  }
};

function getChecksFromArray(queryItemField: string, queryItemValue: any): ((doc: Document) => boolean)[] {
    if (queryItemValue !== Array) {
      throw new Error(`QueryItem ${queryItemField} is missing an Array`);
    }

    const checks: ((doc: Document) => boolean)[] = [];
    queryItemValue.forEach((item) => {
      const funcName = Object.keys(item)[0];

      let func;
      if (comparisonOperators.hasOwnProperty(funcName)) {
        func = comparisonOperators[funcName];
      } else if (logicalOperators.hasOwnProperty(funcName)) {
        func = logicalOperators[funcName];
      } else {
        throw new Error(`Invaid operator in ${queryItemField}`);
      }

      checks.push(func(queryItemField, item[funcName]));
    });

    return checks;
}

const logicalOperators = {
  $and: function(queryItemField: string, queryItemValue: any): (doc: Document) => boolean {
    const checks = getChecksFromArray(queryItemField, queryItemValue);
    return (doc: Document): boolean => {
      for (const check of checks) {
        const success = check(doc);
        if (!success) return false;
      }
      return true;
    };
  },
  $or: function(queryItemField: string, queryItemValue: any): (doc: Document) => boolean {
    const checks = getChecksFromArray(queryItemField, queryItemValue);
    return (doc: Document): boolean => {
      for (const check of checks) {
        const success = check(doc);
        if (success) return true;
      }
      return false;
    };
  },
  $nor: function(queryItemField: string, queryItemValue: any): (doc: Document) => boolean {
    const checks = getChecksFromArray(queryItemField, queryItemValue);
    return (doc: Document): boolean => {
      for (const check of checks) {
        const success = check(doc);
        if (success) return false;
      }
      return true;
    };
  },
  $not: function(queryItemField: string, queryItemValue: any): (doc: Document) => boolean {
    const opName = Object.keys(queryItemValue)[0];
    const checkOP = comparisonOperators[opName];
    if (!checkOP) throw new Error(`Bad operator for $not at`);
    const check = checkOP(queryItemField, queryItemValue);
    return (doc: Document) => !check(doc);
  }
};
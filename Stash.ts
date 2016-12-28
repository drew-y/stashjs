import { EventEmitter } from "eventemitter3";
import { Document, Result, Query, Sort, Update, Collection, documents } from "./definitions";
import { getField, testDocAgainstQuery } from "./query";
import Cursor = require('./Cursor');
import clone = require('./clone');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////// Main Collection Class
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Collection - Mongo like evented data Cache */
class Stash extends EventEmitter implements Collection {
  readonly documents: documents = {};

  /** Generate a unique ID */
  genID(length: number = 18): string {
    let ID = "";
    while (ID.length < length) {
      const randNum = Math.floor((Math.random() * 100000000));
      ID += randNum.toString(36);
    }

    return ID.substring(0, length);
  }

  insert(doc: Object): Promise<Result> {
    const doInsert = () => {
      const _id = this.genID();
      doc = clone(doc) // Clone the doc
      doc["_id"] = _id;
      this.documents[_id] = doc as Document;
      this.emit("insert", doc);
      return { success: true, document: doc as Document };
    }

    return new Promise((resolve, reject) => {
      const hResolve = () => resolve(doInsert());
      const hasHooks = this.emit("beforeInsert", doc, hResolve, reject);
      if (!hasHooks) hResolve();
    });
  }

  update(query: Query, update: Object): Promise<Result> {
    const docs = this.findDocs(query);
    const oldDocs = docs.map((doc) => clone(doc));

    const act = () => {
      for (const key in update) {
        if (updateOperators.hasOwnProperty(key)) {
          updateOperators[key](docs, update[key]);
        }
      }

      this.emit("update", docs, oldDocs);
      return { success: true, documents: docs };
    }

    return new Promise((resolve, reject) => {
      const hResolve = () => { resolve(act()) };
      const hasHooks = this.emit("beforeUpdate", oldDocs, hResolve, reject);
      if (!hasHooks) hResolve();
    });
  }

  /** Remove a document from the cache. Promise resolves with the removed document(s). */
  remove(query: Query): Promise<Document[]> {
    const docsToRemove = this.findDocs(query);

    return new Promise((resolve, reject) => {
      const hResolve = () => {
        const removedDocs: Document[] = [];
        for (const doc of docsToRemove) {
          removedDocs.push(doc);
          delete this.documents[doc._id];
        }
        this.emit("remove", removedDocs);

        return resolve(removedDocs);
      }

      const hasHooks = this.emit("beforeRemove", docsToRemove, hResolve, reject);
      if (!hasHooks) hResolve();
    });
  }

  findOne(query: Query): Document | undefined {
    const doc = this.findDocs(query)[0];
    return doc ? clone(doc) : undefined;
  }

  find(query: Query): Cursor {
    return new Cursor(this.findDocs(query), query, this);
  }

  private findDocs(query: Query): Document[] {
    const matchingDocs: Document[] = [];

    let docs = this.documents;

    // If query has an _id find the doc it correponds too (if it exists)
    if (query.hasOwnProperty("_id")) {
      if (!docs.hasOwnProperty(query._id)) return [];

      docs = {};
      docs[query._id] = this.documents[query._id];
    }

    for (const docID in docs) {
      const document = docs[docID];
      if (testDocAgainstQuery(query, document)) matchingDocs.push(document);
    }

    return matchingDocs;
  }
}

export = Stash;

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////// Operators
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

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
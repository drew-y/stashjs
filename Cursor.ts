import { Document, Result, Query, Collection, documents } from "./definitions";
import { EventEmitter } from "eventemitter3";
import { testDocAgainstQuery } from "./query";
import clone = require('./clone');

class Cursor extends EventEmitter {
  private documents: documents = {};
  private collection: Collection;
  private query: Query;

  constructor(documents: Document[], query: Query, collection: Collection) {
    super();
    this.query = query;
    this.collection = collection;
    documents.forEach((doc) => { this.documents[doc._id] = clone(doc)});

    this.collection.on("insert", this.onInsert, this);
    this.collection.on("update", this.onUpdate, this);
    this.collection.on("remove", this.onRemove, this);
  }

  private onInsert(doc: Document) {
    if (testDocAgainstQuery(this.query, doc)) {
      this.documents[doc._id] = clone(doc);
      this.emit("added", this.documents[doc._id])
    }
  }

  private onUpdate(docs: Document[]) {
    docs.forEach((doc) => {
      if (doc._id in this.documents) {
        const oldDoc = clone(this.documents[doc._id]);
        this.documents[doc._id] = clone(doc);
        this.emit("changed", this.documents[doc._id], oldDoc);
      }
    });
  }

  private onRemove(docs) {
    docs.forEach((doc) => {
      this.emit("removed", clone(doc));
      if (doc._id in this.documents) delete this.documents[doc._id];
    });
  }

  get count(): number {
    return Object.keys(this.documents).length;
  }

  destroy() {
    this.collection.removeListener("insert", this.onInsert, this);
    this.collection.removeListener("insert", this.onUpdate, this);
    this.collection.removeListener("insert", this.onRemove, this);
    this.removeAllListeners();
    this.collection = undefined;
    this.documents = undefined;
  }

  fetch(): Document[] {
    const docs: Document[] = [];
    for (const docID in docs) {
      docs.push(docs[docID]);
    }
    return docs;
  }
}

export = Cursor;
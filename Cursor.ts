import { Document, Result, compiledQuery, Query, Collection } from "./definitions";
import { EventEmitter } from "eventemitter3";

class Cursor extends EventEmitter {
  readonly documents: { [_id: string]: Document } = {};
  readonly checks: compiledQuery;

  constructor(checks: compiledQuery, collection: Collection) {
    super();

    collection.on("update")
  }
}

export = Cursor;
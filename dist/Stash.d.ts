import { EventEmitter } from "eventemitter3";
import { Document, Result, Query, Collection, documents } from "./definitions";
import Cursor = require('./Cursor');
/** Collection - Mongo like evented data Cache */
declare class Stash extends EventEmitter implements Collection {
    readonly documents: documents;
    /** Generate a unique ID */
    genID(length?: number): string;
    insert(doc: Object): Promise<Result>;
    update(query: Query, update: Object): Promise<Result>;
    /** Remove a document from the cache. Promise resolves with the removed document(s). */
    remove(query: Query): Promise<Document[]>;
    findOne(query: Query): Document | undefined;
    find(query: Query): Cursor;
    private findDocs(query);
}
export = Stash;

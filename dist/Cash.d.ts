import { EventEmitter } from "eventemitter3";
import { Document, Result, Query } from "./cashInterfaces";
/** Collection - Mongo like evented data Cache */
declare class Cash extends EventEmitter {
    readonly documents: {
        [_id: string]: Document;
    };
    readonly cachedQueries: {
        [_id: string]: ((doc: Document) => boolean)[];
    };
    /** Generate a unique ID */
    genID(length?: number): string;
    private insertDoc(doc);
    private updateDoc(query, update, name?, one?);
    private parseQueryItem(queryItemField, queryItem);
    /** Reutrns an array of functions that check a doc and return true if the doc matches the function */
    private parseQuery(query);
    insert(doc: Object): Promise<Result>;
    update(query: Query, update: Object, name?: string, one?: boolean): Promise<Result>;
    /** Remove a document from the cache. Promise resolves with the removed document(s). */
    remove(query: Query, name?: string, one?: boolean): Promise<Document[]>;
    findOne(query: Query, name?: string): Document | void;
    find(query: Query, name?: string, one?: boolean): Document[];
}
export = Cash;

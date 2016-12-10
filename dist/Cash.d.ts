import { EventEmitter } from "eventemitter3";
import { Result as SchemaResult } from "schemerjs";
export interface Query {
    _id?: string;
    /** Queries can access subdocuments with dot syntax i.e. "doc.subdoc.subsubdoc.etc" */
    [fieldStr: string]: any;
}
export interface Update {
    /** Updates can access subdocuments with dot syntax i.e. "doc.subdoc.subsubdoc.etc" */
    [fieldStr: string]: any;
}
export interface Sort {
    /** Sorts can access subdocuments with dot syntax i.e. "doc.subdoc.subsubdoc.etc" */
    [fieldStr: string]: any;
}
export interface Document {
    _id: string;
    /** Fields can not have a "." in their names */
    [field: string]: any;
}
/** Result of a collection insert, remove, or update operation */
export interface Result {
    /** True on success, false otherwise */
    success: boolean;
    /** If success is false this will give the reasons */
    reasons?: {
        [key: string]: SchemaResult | string;
    };
    /** If success is false this will be all the invalid property names */
    invalidFields?: string[];
    /** If succes is true this will be the inserted document */
    document?: Document;
    documents?: Document[];
}
/** Collection - Mongo like evented data Cache */
export declare class Cash extends EventEmitter {
    readonly documents: {
        [_id: string]: Document;
    };
    readonly cachedQueries: {
        [_id: string]: ((doc: Document) => boolean)[];
    };
    /** Generate a unique ID */
    genID(): string;
    private insertDoc(doc);
    private updateDoc(query, update, name?, one?);
    private parseQueryItem(queryItemField, queryItem);
    /** Reutrns an array of functions that check a doc and return true if the doc matches the function */
    private parseQuery(query);
    insert(doc: Object): Promise<Result>;
    update(query: Query, update: Object, name?: string, one?: boolean): Promise<Result>;
    remove(query: Query, name?: string, one?: boolean): Document[];
    findOne(query: Query, name?: string): Document | void;
    find(query: Query, name?: string, one?: boolean): Document[];
}

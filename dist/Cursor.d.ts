import { Document, Query, Collection } from "./definitions";
import { EventEmitter } from "eventemitter3";
declare class Cursor extends EventEmitter {
    private documents;
    private collection;
    private query;
    constructor(documents: Document[], query: Query, collection: Collection);
    private onInsert(doc);
    private onUpdate(docs);
    private onRemove(docs);
    readonly count: number;
    destroy(): void;
    fetch(): Document[];
}
export = Cursor;

"use strict";
const eventemitter3_1 = require("eventemitter3");
const query_1 = require("./query");
const clone = require('./clone');
class Cursor extends eventemitter3_1.EventEmitter {
    constructor(documents, query, collection) {
        super();
        this.documents = {};
        this.query = query;
        this.collection = collection;
        documents.forEach((doc) => { this.documents[doc._id] = clone(doc); });
        this.collection.on("insert", this.onInsert, this);
        this.collection.on("update", this.onUpdate, this);
        this.collection.on("remove", this.onRemove, this);
    }
    onInsert(doc) {
        if (query_1.testDocAgainstQuery(this.query, doc)) {
            this.documents[doc._id] = clone(doc);
            this.emit("added", this.documents[doc._id]);
        }
    }
    onUpdate(docs) {
        docs.forEach((doc) => {
            if (doc._id in this.documents) {
                const oldDoc = clone(this.documents[doc._id]);
                this.documents[doc._id] = clone(doc);
                this.emit("changed", this.documents[doc._id], oldDoc);
            }
        });
    }
    onRemove(docs) {
        docs.forEach((doc) => {
            this.emit("removed", clone(doc));
            if (doc._id in this.documents)
                delete this.documents[doc._id];
        });
    }
    get count() {
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
    fetch() {
        const docs = [];
        for (const docID in docs) {
            docs.push(docs[docID]);
        }
        return docs;
    }
}
module.exports = Cursor;
//# sourceMappingURL=Cursor.js.map
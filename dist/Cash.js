"use strict";
const eventemitter3_1 = require("eventemitter3");
const query_1 = require("./query");
const Cursor = require('./Cursor');
const clone = require('./clone');
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
    }
    /** Generate a unique ID */
    genID(length = 18) {
        let ID = "";
        while (ID.length < length) {
            const randNum = Math.floor((Math.random() * 100000000));
            ID += randNum.toString(36);
        }
        return ID.substring(0, length);
    }
    insert(doc) {
        function doInsert() {
            const _id = this.genID();
            doc = clone(doc); // Clone the doc
            doc["_id"] = _id;
            this.documents[_id] = doc;
            this.emit("insert", doc);
            return { success: true, document: doc };
        }
        return new Promise((resolve, reject) => {
            const hResolve = () => resolve(doInsert());
            const hasHooks = this.emit("beforeInsert", doc, hResolve, reject);
            if (!hasHooks)
                hResolve();
        });
    }
    update(query, update) {
        const docs = this.findDocs(query);
        const oldDocs = docs.map((doc) => clone(doc));
        function act() {
            for (const key in update) {
                if (updateOperators.hasOwnProperty(key)) {
                    updateOperators[key](docs, update[key]);
                }
            }
            this.emit("update", docs, oldDocs);
            return { success: true, documents: docs };
        }
        return new Promise((resolve, reject) => {
            const hResolve = () => resolve(act);
            const hasHooks = this.emit("beforeUpdate", oldDocs, hResolve, reject);
            if (!hasHooks)
                hResolve();
        });
    }
    /** Remove a document from the cache. Promise resolves with the removed document(s). */
    remove(query) {
        const docsToRemove = this.findDocs(query);
        return new Promise((resolve, reject) => {
            const hResolve = () => {
                const removedDocs = [];
                for (const doc of docsToRemove) {
                    removedDocs.push(doc);
                    delete this.documents[doc._id];
                }
                this.emit("remove", removedDocs);
                return resolve(removedDocs);
            };
            const hasHooks = this.emit("beforeRemove", docsToRemove, hResolve, reject);
            if (!hasHooks)
                hResolve();
        });
    }
    findOne(query) {
        const doc = this.findDocs(query)[0];
        return doc ? clone(doc) : undefined;
    }
    find(query) {
        return new Cursor(this.findDocs(query), query, this);
    }
    findDocs(query) {
        const matchingDocs = [];
        let docs = this.documents;
        // If query has an _id find the doc it correponds too (if it exists)
        if (query.hasOwnProperty("_id")) {
            if (!docs.hasOwnProperty(query._id))
                return [];
            docs = {};
            docs[query._id] = this.documents[query._id];
        }
        for (const docID in docs) {
            const document = docs[docID];
            if (query_1.testDocAgainstQuery(query, document))
                matchingDocs.push(document);
        }
        return matchingDocs;
    }
}
function genericUpdate(docsToUpdate, fields, operation) {
    for (const doc of docsToUpdate) {
        for (const field in fields) {
            if (!fields.hasOwnProperty(field))
                continue;
            const docField = query_1.getField(field, doc);
            if (docField.success) {
                operation(docField.reference, docField.field, fields[field]);
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
module.exports = Cash;

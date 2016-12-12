"use strict";
const eventemitter3_1 = require("eventemitter3");
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
        this.cachedQueries = {};
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
    insertDoc(doc) {
        const _id = this.genID();
        const document = { _id };
        Object.assign(document, doc);
        this.documents[_id] = document;
        this.emit("insert", doc);
        return { success: true, document };
    }
    updateDoc(query, update, name, one) {
        const docsToUpdate = this.find(query, name, one);
        for (const key in update) {
            if (updateOperators.hasOwnProperty(key)) {
                updateOperators[key](docsToUpdate, update[key]);
            }
        }
        this.emit("update", docsToUpdate);
        return { success: true, documents: docsToUpdate };
    }
    parseQueryItem(queryItemField, queryItem) {
        const queryType = typeof (queryItem);
        const isPrimitive = queryType === "string" || queryType === "number" || queryType === "boolean";
        if (isPrimitive) {
            return (doc) => getField(queryItemField, doc).value === queryItem;
        }
        if (queryItem instanceof RegExp) {
            return (doc) => queryItem.test(getField(queryItemField, doc).value);
        }
        const opName = Object.keys(queryItem)[0];
        let opFunc;
        if (comparisonOperators.hasOwnProperty(opName)) {
            opFunc = comparisonOperators[opName];
        }
        else if (logicalOperators.hasOwnProperty(opName)) {
            opFunc = logicalOperators[opName];
        }
        else {
            throw new Error(`Invalid operator for ${queryItemField}`);
        }
        return opFunc(queryItemField, queryItem[opName]);
    }
    /** Reutrns an array of functions that check a doc and return true if the doc matches the function */
    parseQuery(query) {
        const checks = [];
        for (const key in query) {
            if (query.hasOwnProperty(key)) {
                const queryItem = query[key];
                const check = this.parseQueryItem(key, queryItem);
                checks.push(check);
            }
        }
        return checks;
    }
    insert(doc) {
        return new Promise((resolve, reject) => {
            const hResolve = () => resolve(this.insertDoc(doc));
            const hasHooks = this.emit("beforeInsert", doc, hResolve, reject);
            if (!hasHooks)
                hResolve();
        });
    }
    update(query, update, name, one) {
        if (update.hasOwnProperty("_id")) {
            delete update["_id"];
        }
        return new Promise((resolve, reject) => {
            const hResolve = () => resolve(this.updateDoc(query, update, name, one));
            const hasHooks = this.emit("beforeUpdate", update, query, hResolve, reject);
            if (!hasHooks)
                hResolve();
        });
    }
    /** Remove a document from the cache. Promise resolves with the removed document(s). */
    remove(query, name, one) {
        const docsToRemove = this.find(query, name, one);
        return new Promise((resolve, reject) => {
            const hResolve = () => {
                const removedDocs = [];
                for (const doc of docsToRemove) {
                    removedDocs.push(Object.assign({}, doc));
                    delete this.documents[doc._id];
                }
                this.emit("remove", removedDocs);
                return resolve(removedDocs);
            };
            const hasHooks = this.emit("beforeRemove", docsToRemove, query, hResolve, reject);
            if (!hasHooks)
                hResolve();
        });
    }
    findOne(query, name) {
        return this.find(query, name, true)[0];
    }
    find(query, name, one) {
        const matchingDocs = [];
        let docs = this.documents;
        // If query has an _id find the doc it correponds too (if it exists)
        if (query.hasOwnProperty("_id")) {
            if (!docs.hasOwnProperty(query._id))
                return [];
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
                if (isValid)
                    matchingDocs.push(document);
                if (isValid && one)
                    break;
            }
        }
        return matchingDocs;
    }
}
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////// Operators
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
/** Parse a mongo field string ("field.subdoc.val etc") and return the containing subdocument, and the value of the subdoc */
function getField(fieldStr, doc) {
    const parsedFields = fieldStr.split(".");
    const lastField = parsedFields.pop();
    let docLevel = doc;
    for (const fieldLevel of parsedFields) {
        try {
            docLevel = docLevel[fieldLevel];
        }
        catch (error) {
            return { success: false };
        }
    }
    return { success: true, reference: docLevel, field: lastField, value: docLevel[lastField] };
}
function genericUpdate(docsToUpdate, fields, operation) {
    for (const doc of docsToUpdate) {
        for (const field in fields) {
            if (!fields.hasOwnProperty(field))
                continue;
            const docField = getField(field, doc);
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
const comparisonOperators = {
    $gte: function (fieldStr, queryItemValue) {
        return (doc) => {
            const fieldInfo = getField(fieldStr, doc);
            if (fieldInfo.success)
                return fieldInfo.value >= queryItemValue;
            return false;
        };
    },
    $lte: function (queryItemField, queryItemValue) {
        return (doc) => {
            const fieldInfo = getField(queryItemField, doc);
            if (fieldInfo.success)
                return fieldInfo.value <= queryItemValue;
            return false;
        };
    },
    $gt: function (queryItemField, queryItemValue) {
        return (doc) => {
            const fieldInfo = getField(queryItemField, doc);
            if (fieldInfo.success)
                return fieldInfo.value > queryItemValue;
            return false;
        };
    },
    $lt: function (queryItemField, queryItemValue) {
        return (doc) => {
            const fieldInfo = getField(queryItemField, doc);
            if (fieldInfo.success)
                return fieldInfo.value < queryItemValue;
            return false;
        };
    },
    $eq: function (queryItemField, queryItemValue) {
        return (doc) => {
            const fieldInfo = getField(queryItemField, doc);
            if (fieldInfo.success)
                return fieldInfo.value === queryItemValue;
            return false;
        };
    },
    $ne: function (queryItemField, queryItemValue) {
        return (doc) => {
            const fieldInfo = getField(queryItemField, doc);
            if (fieldInfo.success)
                return fieldInfo.value !== queryItemValue;
            return false;
        };
    },
    $in: function (queryItemField, queryItemValue) {
        return (doc) => {
            const fieldInfo = getField(queryItemField, doc);
            if (fieldInfo.success)
                return queryItemValue.indexOf(fieldInfo.value) !== -1;
            return false;
        };
    },
    $nin: function (queryItemField, queryItemValue) {
        return (doc) => {
            const fieldInfo = getField(queryItemField, doc);
            if (fieldInfo.success)
                return queryItemValue.indexOf(fieldInfo.value) === -1;
            return false;
        };
    }
};
function getChecksFromArray(queryItemField, queryItemValue) {
    if (queryItemValue !== Array) {
        throw new Error(`QueryItem ${queryItemField} is missing an Array`);
    }
    const checks = [];
    queryItemValue.forEach((item) => {
        const funcName = Object.keys(item)[0];
        let func;
        if (comparisonOperators.hasOwnProperty(funcName)) {
            func = comparisonOperators[funcName];
        }
        else if (logicalOperators.hasOwnProperty(funcName)) {
            func = logicalOperators[funcName];
        }
        else {
            throw new Error(`Invaid operator in ${queryItemField}`);
        }
        checks.push(func(queryItemField, item[funcName]));
    });
    return checks;
}
const logicalOperators = {
    $and: function (queryItemField, queryItemValue) {
        const checks = getChecksFromArray(queryItemField, queryItemValue);
        return (doc) => {
            for (const check of checks) {
                const success = check(doc);
                if (!success)
                    return false;
            }
            return true;
        };
    },
    $or: function (queryItemField, queryItemValue) {
        const checks = getChecksFromArray(queryItemField, queryItemValue);
        return (doc) => {
            for (const check of checks) {
                const success = check(doc);
                if (success)
                    return true;
            }
            return false;
        };
    },
    $nor: function (queryItemField, queryItemValue) {
        const checks = getChecksFromArray(queryItemField, queryItemValue);
        return (doc) => {
            for (const check of checks) {
                const success = check(doc);
                if (success)
                    return false;
            }
            return true;
        };
    },
    $not: function (queryItemField, queryItemValue) {
        const opName = Object.keys(queryItemValue)[0];
        const checkOP = comparisonOperators[opName];
        if (!checkOP)
            throw new Error(`Bad operator for $not at`);
        const check = checkOP(queryItemField, queryItemValue);
        return (doc) => !check(doc);
    }
};
module.exports = Cash;

"use strict";
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
exports.getField = getField;
function testField(queryField, queryVal, document) {
    const queryType = typeof (queryVal);
    const isPrimitive = queryType === "string" || queryType === "number" || queryType === "boolean";
    if (isPrimitive) {
        return getField(queryField, document).value === queryVal;
    }
    if (queryVal instanceof RegExp) {
        return queryVal.test(getField(queryField, document).value);
    }
    const opName = Object.keys(queryVal)[0];
    const opVal = queryVal[opName];
    if (comparisonOperators.hasOwnProperty(opName)) {
        const opFunc = comparisonOperators[opName];
        return opFunc(opVal, getField(queryField, document).value);
    }
    if (logicalOperators.hasOwnProperty(opName)) {
        const opFunc = logicalOperators[opName];
        return opFunc(opVal, document);
    }
    throw new Error(`Invalid operator for ${queryField}`);
}
function testDocAgainstQuery(query, document) {
    for (const queryField in query) {
        if (!testField(queryField, query[queryField], document))
            return false;
    }
    return true;
}
exports.testDocAgainstQuery = testDocAgainstQuery;
const comparisonOperators = {
    $gte: function (opVal, docVal) {
        return docVal >= opVal;
    },
    $lte: function (opVal, docVal) {
        return docVal <= opVal;
    },
    $gt: function (opVal, docVal) {
        return docVal > opVal;
    },
    $lt: function (opVal, docVal) {
        return docVal < opVal;
    },
    $eq: function (opVal, docVal) {
        return docVal === opVal;
    },
    $ne: function (opVal, docVal) {
        return docVal !== opVal;
    },
    $in: function (opVal, docVal) {
        return docVal.indexOf(opVal) !== -1;
    },
    $nin: function (opVal, docVal) {
        return docVal.indexOf(opVal) === -1;
    },
};
const logicalOperators = {
    $or: function (opVal, document) {
        for (const query of opVal) {
            if (testDocAgainstQuery(query, document))
                return true;
        }
        return false;
    },
    $nor: function (opVal, document) {
        for (const query of opVal) {
            if (testDocAgainstQuery(query, document))
                return false;
        }
        return true;
    },
    $and: function (opVal, document) {
        for (const query of opVal) {
            if (!testDocAgainstQuery(query, document))
                return false;
        }
        return true;
    },
    $not: function (opVal, document) {
        return !testDocAgainstQuery(opVal[Object.keys(opVal)[0]], document);
    }
};

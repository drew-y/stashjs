import { Document, Query } from "./definitions";

/** Parse a mongo field string ("field.subdoc.val etc") and return the containing subdocument, and the value of the subdoc */
export function getField(fieldStr: string, doc: Document): { success: boolean, reference?: Object, field?: string, value?: any } {
  const parsedFields = fieldStr.split(".");
  const lastField = parsedFields.pop();

  let docLevel = doc;
  for (const fieldLevel of parsedFields) {
    try {
      docLevel = docLevel[fieldLevel];
    } catch (error) {
      return { success: false };
    }
  }

  return { success: true, reference: docLevel, field: lastField, value: docLevel[lastField] };
}

function testField(queryField: string, queryVal: any, document: Document): boolean {
  const queryType = typeof(queryVal);
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

export function testDocAgainstQuery(query: Query, document: Document) {
  for (const queryField in query) {
    if (!testField(queryField, query[queryField], document)) return false;
  }

  return true;
}

const comparisonOperators: { [opName: string]: (opVal: any, docVal: any | any[]) => boolean } =
  {
    $gte: function(opVal: any, docVal: any): boolean {
      return docVal >= opVal;
    },
    $lte: function(opVal: any, docVal: any): boolean {
      return docVal <= opVal;
    },
    $gt: function(opVal: any, docVal: any): boolean {
      return docVal > opVal;
    },
    $lt: function(opVal: any, docVal: any): boolean {
      return docVal < opVal;
    },
    $eq: function(opVal: any, docVal: any): boolean {
      return docVal === opVal;
    },
    $ne: function(opVal: any, docVal: any): boolean {
      return docVal !== opVal;
    },
    $in: function(opVal: any, docVal: any[]): boolean  {
      return docVal.indexOf(opVal) !== -1;
    },
    $nin: function(opVal: any, docVal: any[]): boolean  {
      return docVal.indexOf(opVal) === -1;
    },
  };

const logicalOperators: { [opName: string]: (opVal: Object[] | Object, document: Document) => boolean } =
  {
    $or: function(opVal: Object[], document: Document): boolean {
      for (const query of opVal) {
        if (testDocAgainstQuery(query, document)) return true;
      }

      return false;
    },
    $nor: function(opVal: Object[], document: Document): boolean {
      for (const query of opVal) {
        if (testDocAgainstQuery(query, document)) return false;
      }

      return true;
    },
    $and: function(opVal: Object[], document: Document): boolean {
      for (const query of opVal) {
        if (!testDocAgainstQuery(query, document)) return false;
      }

      return true;
    },
    $not: function(opVal: Object, document): boolean {
      return !testDocAgainstQuery(opVal[Object.keys(opVal)[0]], document);
    }
  }
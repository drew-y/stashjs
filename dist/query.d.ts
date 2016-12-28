import { Document, Query } from "./definitions";
/** Parse a mongo field string ("field.subdoc.val etc") and return the containing subdocument, and the value of the subdoc */
export declare function getField(fieldStr: string, doc: Document): {
    success: boolean;
    reference?: Object;
    field?: string;
    value?: any;
};
export declare function testDocAgainstQuery(query: Query, document: Document): boolean;

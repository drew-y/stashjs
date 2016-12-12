import { Result as SchemaResult } from "schemerjs";

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////// Interfaces and types
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

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
  reasons?: { [key: string]: SchemaResult | string };
  /** If success is false this will be all the invalid property names */
  invalidFields?: string[];
  /** If succes is true this will be the inserted document */
  document?: Document;
  documents?: Document[];
}
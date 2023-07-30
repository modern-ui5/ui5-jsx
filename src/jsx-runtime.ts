import type ManagedObject from "sap/ui/base/ManagedObject";
import { Aggregation } from "./ui5-component.js";

export function jsx() {}

export namespace JSX {
  export type Element = ManagedObject | Aggregation<any>;
  export type ElementClass = never;

  export interface IntrinsicElements {}

  export interface ElementChildrenAttribute {
    children: {};
  }
}

export { jsx as jsxs, jsx as jsxDEV };

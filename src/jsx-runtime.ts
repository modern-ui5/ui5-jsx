import type ManagedObject from "sap/ui/base/ManagedObject";

export function jsx(
  type: (props: any) => JSX.Element,
  props: Record<string, any>,
  key?: any
): JSX.Element {
  if (props != null && key !== undefined) {
    props.key = key;
  }

  return type(props);
}

export namespace JSX {
  export type Element = ManagedObject;
  export type ElementClass = never;

  export interface IntrinsicElements {}

  export interface ElementChildrenAttribute {
    children: {};
  }
}

export { jsx as jsxs, jsx as jsxDEV };

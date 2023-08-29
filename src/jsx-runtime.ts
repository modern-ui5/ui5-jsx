import type ManagedObject from "sap/ui/base/ManagedObject";

export function jsx<T extends (props: any) => JSX.Element>(
  type: T,
  props: T extends (props: infer P) => infer _ ? P : {},
  key?: never
): ReturnType<T> {
  if (props != null && key !== undefined) {
    props.key = key;
  }

  return type(props) as ReturnType<T>;
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

import { TypedPropertyBindingInfo } from "ui5-typed-model";
import type Event from "sap/ui/base/Event";
import type {
  AggregationBindingInfo,
  PropertyBindingInfo,
} from "sap/ui/base/ManagedObject";
import type Control from "sap/ui/core/Control";

export function jsx() {}

type Ui5Props<T> = T extends new (id: any, props: infer P) => any
  ? NonNullable<P>
  : never;

type OmitNever<T> = Omit<
  T,
  { [K in keyof T]: T[K] extends never ? K : never }[keyof T]
>;

export type Ui5Properties<T, P = Ui5Props<T>> = OmitNever<{
  [K in keyof P]-?: PropertyBindingInfo extends Extract<
    P[K],
    PropertyBindingInfo
  >
    ? Exclude<P[K], PropertyBindingInfo | `{${string}}`>
    : never;
}>;

export type Ui5Aggregations<T, P = Ui5Props<T>> = Omit<
  {
    [K in keyof P]-?: Exclude<P[K], AggregationBindingInfo | `{${string}}`>;
  },
  keyof Ui5Properties<T> | keyof Ui5Events<T>
>;

export type Ui5SingleAggregations<T> = OmitNever<{
  [K in keyof Ui5Aggregations<T>]: Extract<
    Ui5Aggregations<T>[K],
    any[]
  > extends never
    ? Ui5Aggregations<T>[K]
    : never;
}>;

export type Ui5MultipleAggregations<T> = OmitNever<{
  [K in keyof Ui5Aggregations<T>]: Extract<
    Ui5Aggregations<T>[K],
    any[]
  > extends (infer U)[]
    ? U
    : never;
}>;

export type Ui5Events<T, P = Ui5Props<T>> = OmitNever<{
  [K in keyof P]-?: NonNullable<P[K]> extends (event: Event<infer _>) => void
    ? P[K]
    : never;
}>;

export type ConvertedComponentProps<T extends new (id?: string) => any> = {
  id?: string;
  ref?: (control: InstanceType<T>) => void;
  children?: Control | Control[];
} & {
  [K in keyof Ui5Properties<T>]?:
    | Ui5Properties<T>[K]
    | TypedPropertyBindingInfo<Ui5Properties<T>[K]>;
} & {
  [K in keyof Ui5Events<T> as `on${Capitalize<K>}`]?: Ui5Events<T>[K];
} & Partial<Ui5SingleAggregations<T>>;

export namespace JSX {
  export type Element = Control;
  export type ElementClass = Control;

  export interface IntrinsicElements {}

  export interface ElementChildrenAttribute {
    children: {};
  }

  export type IntrinsicClassAttributes<T> = {
    id?: string;
    ref?: (control: T) => void;
    children?: Control | Control[];
  };
}

export { jsx as jsxs, jsx as jsxDEV };

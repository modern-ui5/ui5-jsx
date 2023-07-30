import type Event from "sap/ui/base/Event";
import ManagedObject from "sap/ui/base/ManagedObject";
import type {
  AggregationBindingInfo,
  MetadataOptions,
  PropertyBindingInfo,
} from "sap/ui/base/ManagedObject";
import {
  TypedAggregationBindingInfo,
  TypedModel,
  TypedPropertyBindingInfo,
} from "ui5-typed-model";
import type { JSX } from "./jsx-runtime.js";

type Ui5Props<T> = T extends new (id: any, props: infer P) => any
  ? NonNullable<P>
  : never;

type OmitNever<T> = Omit<
  T,
  { [K in keyof T]: T[K] extends never ? K : never }[keyof T]
>;

type Ui5Properties<T, P = Ui5Props<T>> = OmitNever<{
  [K in keyof P]-?: PropertyBindingInfo extends Extract<
    P[K],
    PropertyBindingInfo
  >
    ? Exclude<P[K], PropertyBindingInfo | `{${string}}`>
    : never;
}>;

type Ui5Events<T, P = Ui5Props<T>> = OmitNever<{
  [K in keyof P]-?: NonNullable<P[K]> extends (event: Event<infer _>) => void
    ? P[K]
    : never;
}>;

type Ui5Aggregations<T, P = Ui5Props<T>> = Omit<
  {
    [K in keyof P]-?: Exclude<P[K], AggregationBindingInfo | `{${string}}`>;
  },
  keyof Ui5Properties<T> | keyof Ui5Events<T>
>;

type Ui5SingleAggregations<T> = OmitNever<{
  [K in keyof Ui5Aggregations<T>]: Extract<
    Ui5Aggregations<T>[K],
    any[]
  > extends never
    ? Ui5Aggregations<T>[K]
    : never;
}>;

type Ui5MultipleAggregations<T> = OmitNever<
  Omit<
    {
      [K in keyof Ui5Aggregations<T>]: Extract<
        Ui5Aggregations<T>[K],
        any[]
      > extends (infer U)[]
        ? U
        : never;
    },
    keyof Ui5SingleAggregations<T>
  >
>;

const aggregationSym = Symbol("aggregation");

export interface AggregationComponentProps<T> {
  bind?: TypedAggregationBindingInfo<T>;
  children?: JSX.Element | JSX.Element[];
}

export type AggregationComponent<T> = (
  props: AggregationComponentProps<T>
) => JSX.Element & {
  [aggregationSym]: {
    name: string;
    aggregation: MetadataOptions.Aggregation;
    children?: TypedAggregationBindingInfo<T> | JSX.Element[];
  };
};

export type Ui5ComponentProps<T extends typeof ManagedObject> = {
  id?: string;
  ref?: (control: InstanceType<T>) => void;
  children?: JSX.Element | JSX.Element[];
} & {
  [K in keyof Ui5Properties<T>]?:
    | Ui5Properties<T>[K]
    | TypedPropertyBindingInfo<Ui5Properties<T>[K]>;
} & {
  [K in keyof Ui5Events<T> as `on${Capitalize<K>}`]?: Ui5Events<T>[K];
} & Partial<Ui5SingleAggregations<T>>;

export type Ui5Component<T extends typeof ManagedObject> = {
  (props: Ui5ComponentProps<T>): InstanceType<T>;
} & {
  [K in keyof Ui5MultipleAggregations<T>]-?: AggregationComponent<
    Ui5MultipleAggregations<T>[K]
  >;
};

function capitalize(key: string) {
  return key[0].toUpperCase() + key.slice(1);
}

function convertComponent<T extends typeof ManagedObject>(
  control: T
): Ui5Component<T> {
  const aggregations = control.getMetadata().getAllAggregations();

  const component = ((props) => {
    const result = new control(props.id) as InstanceType<T> &
      Record<string, any>;
    const modelName = Symbol("name");

    const bindModel = (typedModel: TypedModel<any, any>): string => {
      const name = ((typedModel.model as { [modelName]?: string })[
        modelName
      ] ??= crypto.randomUUID());

      if (result.getModel(name) !== typedModel.model) {
        typedModel.bindTo(result, name);
      }

      return name;
    };

    for (const key in props) {
      if (["control", "id", "ref", "children"].includes(key)) continue;

      const value = props[key as keyof typeof props] as any;

      if (key.startsWith("on")) {
        // Handle events

        result["attach" + key.slice(2)](value);
      } else {
        // Handle properties and 0..1 aggregations

        if (value instanceof TypedPropertyBindingInfo) {
          const typedModels =
            value.typedModel != null
              ? [value.typedModel]
              : value.parts
                  ?.filter(
                    (part): part is TypedPropertyBindingInfo<any> =>
                      part instanceof TypedPropertyBindingInfo &&
                      part.typedModel != null
                  )
                  .map((part) => part.typedModel!) ?? [];

          for (const typedModel of typedModels) {
            const name = bindModel(typedModel);

            value.model = name;
            result.bindProperty(key, value);
          }
        } else {
          if (value == null && key in aggregations) {
            // Destroy 0..1 aggregation
            result[`destroy${capitalize(key)}`]();
          } else {
            // Set property or aggregation
            result[`set${capitalize(key)}`](value);
          }
        }
      }
    }

    if (props.children != null) {
      const defaultAggregationName = control
        .getMetadata()
        .getDefaultAggregationName();

      if (!Array.isArray(props.children)) props.children = [props.children];

      for (const child of props.children) {
        if (aggregationSym in child) {
          const aggregationInfo = (
            child as ReturnType<AggregationComponent<T>>
          )[aggregationSym];

          if (aggregationInfo.children instanceof TypedAggregationBindingInfo) {
            const typedModel = aggregationInfo.children.typedModel;
            const name = bindModel(typedModel);

            aggregationInfo.children.model = name;
            result.bindAggregation(
              aggregationInfo.name,
              aggregationInfo.children
            );
          } else {
            for (const control of aggregationInfo.children ?? []) {
              result[
                `add${capitalize(
                  aggregationInfo.aggregation.singularName ??
                    aggregationInfo.name
                )}`
              ](control);
            }
          }
        } else {
          if (defaultAggregationName == null) continue;

          const aggregation = aggregations[defaultAggregationName];

          if (aggregation.multiple) {
            result[
              `add${capitalize(
                aggregation.singularName ?? defaultAggregationName
              )}`
            ](child);
          } else {
            result[`set${capitalize(defaultAggregationName)}`](child);
          }
        }
      }
    }

    props.ref?.(result);

    return result;
  }) as Ui5Component<T>;

  for (const [name, aggregation] of Object.entries(aggregations)) {
    if (!aggregation.multiple) continue;

    (component as any)[name] = (props: AggregationComponentProps<T>) =>
      Object.assign(() => new ManagedObject(), {
        [aggregationSym]: {
          name,
          aggregation,
          children:
            props.bind ??
            (Array.isArray(props.children) || props.children == null
              ? props.children
              : [props.children]),
        } satisfies ReturnType<
          AggregationComponent<any>
        >[typeof aggregationSym],
      });
  }

  return component;
}

export function Ui5<const T extends readonly (typeof ManagedObject)[]>(
  ...controls: T
): {
  [K in keyof T]: Ui5Component<T[K]>;
} {
  return controls.map((control) => convertComponent(control)) as any;
}

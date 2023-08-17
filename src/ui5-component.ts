import type Event from "sap/ui/base/Event";
import ManagedObject from "sap/ui/base/ManagedObject";
import type Control from "sap/ui/core/Control";
import type {
  AggregationBindingInfo,
  MetadataOptions,
  PropertyBindingInfo,
} from "sap/ui/base/ManagedObject";
import type {
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
  children?: TypedAggregationBindingInfo<T> | JSX.Element | JSX.Element[];
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
} & (InstanceType<T> extends Control
  ? {
      class?: string;
    }
  : {}) & {
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

    if ("class" in props && props.class != null) {
      (result as unknown as Control).addStyleClass(props.class);
    }

    const bindModel = (typedModel: TypedModel<any, any>): string => {
      const name = typedModel.model.getId();

      if (result.getModel(name) !== typedModel.model) {
        typedModel.bindTo(result, name);
      }

      if (typedModel.context != null) {
        if (result.getBindingContext(name) == null) {
          result.setBindingContext(typedModel.context, name);
        } else if (result.getBindingContext(name) !== typedModel.context) {
          throw new Error("cannot bind multiple contexts");
        }
      }

      return name;
    };

    for (const key in props) {
      if (["id", "ref", "class", "children"].includes(key)) continue;

      const value = props[key as keyof typeof props] as any;

      if (
        key.length > 2 &&
        key.startsWith("on") &&
        key[2] === key[2].toUpperCase()
      ) {
        // Handle events

        result["attach" + key.slice(2)](value);
      } else {
        // Handle properties and 0..1 aggregations

        if (
          Array.isArray(value.parts) ||
          (typeof value.path === "string" && value.typedModel != null)
        ) {
          const binding = value as TypedPropertyBindingInfo<any>;
          const typedModels =
            binding.typedModel != null
              ? [binding.typedModel]
              : binding.parts
                  ?.filter(
                    (part): part is TypedPropertyBindingInfo<any> =>
                      typeof part !== "string" &&
                      "typedModel" in part &&
                      part.typedModel != null
                  )
                  .map((part) => part.typedModel!) ?? [];

          for (const typedModel of typedModels) {
            const name = bindModel(typedModel);

            binding.model = name;
            result.bindProperty(key, binding);
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

          if (Array.isArray(aggregationInfo.children)) {
            for (const control of aggregationInfo.children ?? []) {
              result[
                `add${capitalize(
                  aggregationInfo.aggregation.singularName ??
                    aggregationInfo.name
                )}`
              ](control);
            }
          } else if (aggregationInfo.children != null) {
            const typedModel = aggregationInfo.children.typedModel;
            const name = bindModel(typedModel);

            aggregationInfo.children.model = name;
            result.bindAggregation(
              aggregationInfo.name,
              aggregationInfo.children
            );
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
            props.children instanceof ManagedObject
              ? [props.children]
              : props.children,
        } satisfies ReturnType<
          AggregationComponent<any>
        >[typeof aggregationSym],
      });
  }

  return component;
}

export function jsxify<T extends Record<string, typeof ManagedObject>>(
  controls: T
): {
  [K in keyof T]: Ui5Component<T[K]>;
} {
  return Object.assign(
    {},
    ...Object.entries(controls).map(([key, control]) => ({
      [key]: convertComponent(control),
    }))
  );
}

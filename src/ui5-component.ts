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

type Ui5ControlSettings<T> = T extends new (id: any, props: infer P) => any
  ? NonNullable<P>
  : never;

type OmitNever<T> = Omit<
  T,
  { [K in keyof T]: T[K] extends never ? K : never }[keyof T]
>;

// Property field types include `PropertyBindingInfo` in its union
type Ui5Properties<T, P = Ui5ControlSettings<T>> = OmitNever<{
  [K in keyof P]-?: PropertyBindingInfo extends Extract<
    P[K],
    PropertyBindingInfo
  >
    ? Exclude<P[K], PropertyBindingInfo | `{${string}}`>
    : never;
}>;

// Event field types are event handler functions with event argument
type Ui5Events<T, P = Ui5ControlSettings<T>> = OmitNever<{
  [K in keyof P]-?: NonNullable<P[K]> extends (event: Event<infer _>) => void
    ? P[K]
    : never;
}>;

// Single aggregation types are of the form `ManagedObject | undefined`
type Ui5SingleAggregations<T, P = Ui5ControlSettings<T>> = OmitNever<{
  [K in keyof P]-?: P[K] extends ManagedObject | undefined ? P[K] : never;
}>;

// Multiple aggregation types include `AggregationBindingInfo` in its union
type Ui5MultipleAggregations<T, P = Ui5ControlSettings<T>> = OmitNever<{
  [K in keyof P]-?: AggregationBindingInfo extends Extract<
    P[K],
    AggregationBindingInfo
  >
    ? Exclude<P[K], AggregationBindingInfo | `{${string}}`>
    : never;
}>;

// Single association types are of the form `string | ManagedObject | undefined`
type Ui5SingleAssociations<T, P = Ui5ControlSettings<T>> = OmitNever<{
  [K in keyof P]-?: P[K] extends string | ManagedObject | undefined
    ? string extends P[K]
      ? P[K]
      : never
    : never;
}>;

// Single association types are of the form `(string | ManagedObject)[] | undefined`
type Ui5MultipleAssociations<T, P = Ui5ControlSettings<T>> = OmitNever<{
  [K in keyof P]-?: P[K] extends (string | ManagedObject)[] | undefined
    ? string[] extends P[K]
      ? P[K]
      : never
    : never;
}>;

const aggregationSym = Symbol("aggregation");

export interface AggregationJsxComponentProps<T> {
  children?: TypedAggregationBindingInfo<T> | JSX.Element | JSX.Element[];
}

export type AggregationJsxComponent<T> = (
  props: AggregationJsxComponentProps<T>
) => JSX.Element & {
  [aggregationSym]: {
    name: string;
    aggregation: MetadataOptions.Aggregation;
    children?: TypedAggregationBindingInfo<T> | JSX.Element[];
  };
};

export type Ui5JsxComponentProps<T extends typeof ManagedObject> = {
  id?: string;
  ref?: (control: InstanceType<T>) => void;
  children?: JSX.Element | JSX.Element[];
} & (InstanceType<T> extends Control ? { class?: string } : {}) & {
    [K in keyof Ui5Properties<T>]?:
      | Ui5Properties<T>[K]
      | TypedPropertyBindingInfo<Ui5Properties<T>[K]>;
  } & {
    [K in Extract<
      keyof Ui5Events<T>,
      string
    > as `on${Capitalize<K>}`]?: Ui5Events<T>[K];
  } & Partial<Ui5SingleAggregations<T>> &
  Partial<Ui5SingleAssociations<T>> &
  Partial<Ui5MultipleAssociations<T>>;

export type Ui5JsxComponent<T extends typeof ManagedObject> = {
  (props: Ui5JsxComponentProps<T>): InstanceType<T>;
} & {
  [K in keyof Ui5MultipleAggregations<T>]-?: AggregationJsxComponent<
    Ui5MultipleAggregations<T>[K]
  >;
};

function capitalize(key: string) {
  return key[0].toUpperCase() + key.slice(1);
}

function convertComponent<T extends typeof ManagedObject>(
  control: T
): Ui5JsxComponent<T> {
  const aggregations = control.getMetadata().getAllAggregations();
  const associations = control.getMetadata().getAllAssociations();

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
      } else if (key in associations) {
        // Handle associations

        const association = associations[key];

        if (association.multiple) {
          for (const item of value ?? []) {
            result[`add${capitalize(association.singularName ?? key)}`](item);
          }
        } else {
          result[`set${capitalize(key)}`](value);
        }
      } else {
        // Handle properties and 0..1 aggregations

        if (
          Array.isArray(value.parts) ||
          (typeof value.path === "string" && value.typedModel != null)
        ) {
          // Handle `TypedPropertyBindingInfo`
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
          // Set property or 0..1 aggregation
          result[`set${capitalize(key)}`](value);
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
            child as ReturnType<AggregationJsxComponent<T>>
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
  }) as Ui5JsxComponent<T>;

  for (const [name, aggregation] of Object.entries(aggregations)) {
    if (!aggregation.multiple) continue;

    Object.assign(component, {
      [name]: (props: AggregationJsxComponentProps<T>) =>
        Object.assign(() => new ManagedObject(), {
          [aggregationSym]: {
            name,
            aggregation,
            children:
              props.children instanceof ManagedObject
                ? [props.children]
                : props.children,
          } satisfies ReturnType<
            AggregationJsxComponent<any>
          >[typeof aggregationSym],
        }),
    });
  }

  return component;
}

export function createJsxComponents<
  T extends Record<string, typeof ManagedObject>
>(
  controls: T
): {
  [K in keyof T]: Ui5JsxComponent<T[K]>;
} {
  return Object.assign(
    {},
    ...Object.entries(controls).map(([key, control]) => ({
      [key]: convertComponent(control),
    }))
  );
}

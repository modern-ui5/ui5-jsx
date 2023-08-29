import "@wdio/globals/types";
import "./loadUi5.js";
import { expect } from "@wdio/globals";
import { createJsxComponents } from "./dist/main.js";
import { TypedModel } from "./dist/vendor.js";
import VBox from "sap/m/VBox";
import Button from "sap/m/Button";
import Select from "sap/m/Select";
import MultiComboBox from "sap/m/MultiComboBox";

describe("Sample", () => {
  it("should work", async () => {
    expect(5).toEqual(5);

    const model = new TypedModel({
      items: [{ row: 0 }, { row: 1 }, { row: 2 }],
    });
    const ui5 = createJsxComponents({ VBox, Button, Select, MultiComboBox });

    let vbox!: VBox;

    <ui5.VBox class="content" ref={(control) => (vbox = control)}>
      <ui5.VBox.items>
        {model.aggregationBinding(
          (data) => data.items,
          (id, model) => (
            <ui5.Button
              id={id}
              text={model
                .binding((_, context) => context.row)
                .map((row) => `Button ${row}`)}
              onPress={() => {
                console.log(
                  `You clicked row #${model.get((_, context) => context.row)}`
                );
              }}
            />
          )
        )}
      </ui5.VBox.items>
    </ui5.VBox>;

    vbox.placeAt(document.body);

    model.get((data) => data.items).splice(1, 1);
    model.refresh();
  });
});

/** @jsxImportSource #internal */

import "@wdio/globals/types";
import "./loadUi5.js";
import { expect } from "@wdio/globals";
import { Ui5, TypedModel } from "./dist/main.js";
import _VBox from "sap/m/VBox";
import _Button from "sap/m/Button";
import _CustomData from "sap/ui/core/CustomData";
import _Control from "sap/ui/core/Control";

describe("Sample", () => {
  it("should work", async () => {
    expect(5).toEqual(5);

    const model = new TypedModel({
      items: [{ row: 0 }, { row: 1 }, { row: 2 }],
    });
    const [VBox, Button, CustomData] = Ui5(_VBox, _Button, _CustomData);

    let vbox!: _VBox;

    <VBox class="content" ref={(control) => (vbox = control)}>
      <VBox.items>
        {model.aggregationBinding(
          (data) => data.items,
          (id, model) => (
            <Button
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
      </VBox.items>
    </VBox>;

    vbox.placeAt(document.body);

    model.get((data) => data.items).splice(1, 1);
    model.model.refresh();

    await new Promise((r) => setTimeout(r, 10000000));
  });
});

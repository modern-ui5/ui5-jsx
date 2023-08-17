import "@wdio/globals/types";
import "./loadUi5.js";
import { expect } from "@wdio/globals";
import { Ui5 } from "./dist/main.js";
import { TypedModel } from "./dist/vendor.js";
import VBox from "sap/m/VBox";
import Button from "sap/m/Button";

describe("Sample", () => {
  it("should work", async () => {
    expect(5).toEqual(5);

    const model = new TypedModel({
      items: [{ row: 0 }, { row: 1 }, { row: 2 }],
    });
    const jsx = Ui5({ VBox, Button });

    let vbox!: VBox;

    <jsx.VBox class="content" ref={(control) => (vbox = control)}>
      <jsx.VBox.items>
        {model.aggregationBinding(
          (data) => data.items,
          (id, model) => (
            <jsx.Button
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
      </jsx.VBox.items>
    </jsx.VBox>;

    vbox.placeAt(document.body);

    model.get((data) => data.items).splice(1, 1);
    model.model.refresh();
  });
});

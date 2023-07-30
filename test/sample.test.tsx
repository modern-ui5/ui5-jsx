/** @jsxImportSource #internal */

import "@wdio/globals/types";
import "./loadUi5.js";
import { expect } from "@wdio/globals";
import { Ui5 } from "./dist/main.js";
import _VBox from "sap/m/VBox";
import _Button from "sap/m/Button";
import _CustomData from "sap/ui/core/CustomData";
import _Control from "sap/ui/core/Control";

describe("Sample", () => {
  it("should work", async () => {
    expect(5).toEqual(5);

    const [VBox, Button, CustomData] = Ui5(_VBox, _Button, _CustomData);

    let vbox!: _VBox;

    <VBox ref={(control) => (vbox = control)}>
      <Button text="Hello World!" />
    </VBox>;

    vbox.placeAt(document.body);
  });
});

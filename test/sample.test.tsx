/** @jsxImportSource #internal */

import "@wdio/globals/types";
import "./loadUi5.js";
import { expect } from "@wdio/globals";
import { Ui5 } from "./dist/main.js";
import _VBox from "sap/m/VBox";
import _Button from "sap/m/Button";
import _CustomData from "sap/ui/core/CustomData";

describe("Sample", () => {
  it("should work", async () => {
    expect(5).toEqual(5);

    const VBox = Ui5(_VBox);
    const Button = Ui5(_Button);
    const CustomData = Ui5(_CustomData);

    <VBox>
      {/* <VBox.items>
        <Button />
      </VBox.items>
      <VBox.customData>

      </VBox.customData> */}
    </VBox>;
  });
});

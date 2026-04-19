import fs from "fs";
import path from "path";
import { describe, test, expect } from "vitest";
import cartDeliveryOptionsTransformRun from "../src/cart_delivery_options_transform_run";

const fixturesDir = path.join(__dirname, "fixtures");
const fixtureFiles = fs
  .readdirSync(fixturesDir)
  .filter((file) => file.endsWith(".json"))
  .sort();

describe("cartDeliveryOptionsTransformRun", () => {
  fixtureFiles.forEach((fixtureFile) => {
    test(`matches ${fixtureFile}`, () => {
      const fixture = JSON.parse(
        fs.readFileSync(path.join(fixturesDir, fixtureFile), "utf8"),
      );

      const result = cartDeliveryOptionsTransformRun(fixture.payload.input);

      expect(result).toEqual(fixture.payload.output);
    });
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildProductImageObjectKey,
  extensionForContentType,
} from "../src/storage/keys.js";

describe("product image object keys", () => {
  it("builds the canonical user-scoped key pattern", () => {
    const key = buildProductImageObjectKey({
      userId: "user-demo",
      ownerRef: "sku-1",
      fileId: "11111111-1111-1111-1111-111111111111",
      contentType: "image/png",
    });
    assert.equal(
      key,
      "users/user-demo/products/sku-1/11111111-1111-1111-1111-111111111111.png",
    );
  });

  it("rejects unsafe path segments", () => {
    assert.throws(() =>
      buildProductImageObjectKey({
        userId: "../etc",
        ownerRef: "x",
        fileId: "y",
        contentType: "image/jpeg",
      }),
    );
  });

  it("maps content types to extensions", () => {
    assert.equal(extensionForContentType("image/webp"), "webp");
    assert.equal(extensionForContentType("application/pdf"), undefined);
  });
});

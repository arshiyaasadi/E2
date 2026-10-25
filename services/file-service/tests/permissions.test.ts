import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canAccessStore,
  hasPermission,
  permissionsForRoles,
} from "../src/auth/permissions.js";

describe("file-service permissions", () => {
  it("maps store-editor to product image permissions", () => {
    const perms = permissionsForRoles(["store-editor"]);
    assert.equal(perms.has("file.product_image.upload"), true);
    assert.equal(perms.has("*"), false);
  });

  it("gives platform-super-admin wildcard", () => {
    assert.equal(hasPermission(["platform-super-admin"], "file.product_image.delete"), true);
  });

  it("enforces store scope for staff", () => {
    assert.equal(
      canAccessStore(["store-admin"], "store-demo", "store-demo"),
      true,
    );
    assert.equal(
      canAccessStore(["store-admin"], "store-demo", "other-store"),
      false,
    );
  });

  it("allows platform-super-admin across stores", () => {
    assert.equal(
      canAccessStore(["platform-super-admin"], undefined, "any-store"),
      true,
    );
  });
});

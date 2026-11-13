import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canAccessUser,
  hasPermission,
  isPrivilegedCaller,
  permissionsForRoles,
} from "../src/auth/permissions.js";

describe("file-service permissions", () => {
  it("maps file-service-caller to product image permissions", () => {
    const perms = permissionsForRoles(["file-service-caller"]);
    assert.equal(perms.has("file.product_image.upload"), true);
    assert.equal(perms.has("file.product_image.replace"), true);
    assert.equal(perms.has("file.product_image.delete"), true);
    assert.equal(perms.has("*"), false);
  });

  it("gives platform-super-admin wildcard", () => {
    assert.equal(hasPermission(["platform-super-admin"], "file.product_image.delete"), true);
    assert.equal(isPrivilegedCaller(["platform-super-admin"]), true);
  });

  it("enforces user scope for callers", () => {
    assert.equal(
      canAccessUser(["file-service-caller"], "user-a", "user-a"),
      true,
    );
    assert.equal(
      canAccessUser(["file-service-caller"], "user-a", "user-b"),
      false,
    );
    assert.equal(
      canAccessUser(["file-service-caller"], undefined, "user-a"),
      false,
    );
  });

  it("allows privileged callers across users", () => {
    assert.equal(
      canAccessUser(["file-service-admin"], undefined, "any-user"),
      true,
    );
  });
});

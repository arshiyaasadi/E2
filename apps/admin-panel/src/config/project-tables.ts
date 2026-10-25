/** Tables that hold project / store configuration (highlighted in schema browser). */
export const PROJECT_CONFIG_TABLES = new Set([
  "store_settings",
  "shipping_methods",
  "payment_gateways",
  "store_payment_gateways",
  "sms_providers",
  "sms_otp_challenges",
  "sms_message_logs",
  "shipping_providers",
  "shipping_shipment_logs",
  "order_status_definitions",
  "pages",
  "blog_categories",
  "blog_tags",
  "blog_posts",
  "blog_post_categories",
  "blog_post_tags",
  "blog_post_history",
  "entity_metafields",
  "roles",
  "permissions",
  "role_permissions",
  "admin_users",
  "audit_logs",
]);

export function isProjectConfigTable(tableName: string) {
  return PROJECT_CONFIG_TABLES.has(tableName);
}

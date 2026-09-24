"use strict";
/**
 * Resolving the "Rekening" (bookkeeping / ledger account) of an invoice line.
 *
 * In the Teamleader Focus UI every invoice line has a "Rekening" column, e.g.
 * "700000 Omzet". Behind that dropdown sits a product category, which holds a
 * ledger account number per department. The API only accepts the category id
 * (`product_category_id`) on a line item — omit it and the line is created
 * without a rekening, which breaks the bookkeeping export afterwards.
 *
 * So: every line we create gets a category. Callers may pass one explicitly;
 * otherwise we look up the category whose ledger account number matches the
 * default (700000 unless overridden) and use that.
 *
 * Environment variables:
 *   TEAMLEADER_DEFAULT_PRODUCT_CATEGORY_ID - skip the lookup, use this id
 *   TEAMLEADER_DEFAULT_LEDGER_ACCOUNT      - ledger number to look up (700000)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LEDGER_ACCOUNT_NUMBER = void 0;
exports.resolveDefaultProductCategoryId = resolveDefaultProductCategoryId;
/** The sales ledger account every invoice line defaults to. */
exports.DEFAULT_LEDGER_ACCOUNT_NUMBER = Number(process.env.TEAMLEADER_DEFAULT_LEDGER_ACCOUNT ?? 700000);
/** Resolved category ids, keyed by department id ("*" when unscoped). */
const categoryIdCache = new Map();
/**
 * Return the product_category_id ("Rekening") to put on invoice lines.
 *
 * @param departmentId Scopes the lookup — ledger numbers are configured per
 *                     department. Omit when the department isn't known.
 * @throws When no category carries the default ledger account, so an invoice
 *         is never silently created with lines that have no rekening.
 */
async function resolveDefaultProductCategoryId(client, departmentId) {
    const explicit = process.env.TEAMLEADER_DEFAULT_PRODUCT_CATEGORY_ID;
    if (explicit)
        return explicit;
    const cacheKey = departmentId ?? "*";
    const cached = categoryIdCache.get(cacheKey);
    if (cached)
        return cached;
    const body = { page: { number: 1, size: 100 } };
    if (departmentId)
        body.filter = { department_id: departmentId };
    const result = await client.request({
        endpoint: "productCategories.list",
        body,
    });
    const categories = result?.data ?? [];
    const match = categories.find((category) => category.ledgers?.some((ledger) => Number(ledger.ledger_account_number) === exports.DEFAULT_LEDGER_ACCOUNT_NUMBER &&
        (!departmentId ||
            !ledger.department?.id ||
            ledger.department.id === departmentId)));
    if (!match) {
        throw new Error(`No product category ("Rekening") found with ledger account ` +
            `${exports.DEFAULT_LEDGER_ACCOUNT_NUMBER}` +
            (departmentId ? ` for department ${departmentId}` : "") +
            `. Run teamleader_list_product_categories and pass ` +
            `product_category_id explicitly on each line item, or set ` +
            `TEAMLEADER_DEFAULT_PRODUCT_CATEGORY_ID.`);
    }
    categoryIdCache.set(cacheKey, match.id);
    return match.id;
}
//# sourceMappingURL=product-categories.js.map
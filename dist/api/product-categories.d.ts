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
import type { TeamleaderClient } from "./client.js";
export interface ProductCategory {
    id: string;
    name?: string;
    ledgers?: Array<{
        department?: {
            type: string;
            id: string;
        };
        ledger_account_number?: number;
    }>;
}
/** The sales ledger account every invoice line defaults to. */
export declare const DEFAULT_LEDGER_ACCOUNT_NUMBER: number;
/**
 * Return the product_category_id ("Rekening") to put on invoice lines.
 *
 * @param departmentId Scopes the lookup — ledger numbers are configured per
 *                     department. Omit when the department isn't known.
 * @throws When no category carries the default ledger account, so an invoice
 *         is never silently created with lines that have no rekening.
 */
export declare function resolveDefaultProductCategoryId(client: TeamleaderClient, departmentId?: string): Promise<string>;
//# sourceMappingURL=product-categories.d.ts.map
/**
 * Teamleader Focus API Types
 *
 * Based on https://developer.focus.teamleader.eu/
 * All endpoints use POST with JSON body.
 */
export interface TeamleaderAuthConfig {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    accessToken?: string;
    tokenExpiresAt?: number;
}
export interface TokenResponse {
    token_type: string;
    expires_in: number;
    access_token: string;
    refresh_token: string;
}
export interface PageParams {
    number?: number;
    size?: number;
}
export interface PaginationMeta {
    page: {
        size: number;
        number: number;
    };
    matches: number;
}
export interface IdObject {
    type: string;
    id: string;
}
export interface Money {
    amount: number;
    currency: string;
}
export interface Address {
    line_1?: string;
    postal_code?: string;
    city?: string;
    country?: string;
}
export interface PhoneNumber {
    type: "phone" | "mobile" | "fax";
    number: string;
}
export interface Email {
    type: "primary" | "invoicing";
    email: string;
}
export interface Contact {
    id: string;
    first_name: string;
    last_name: string;
    salutation?: string;
    emails?: Email[];
    telephones?: PhoneNumber[];
    website?: string;
    addresses?: Address[];
    gender?: "male" | "female";
    birthdate?: string;
    language?: string;
    tags?: string[];
    added_at?: string;
    updated_at?: string;
}
export interface ContactListFilter {
    email?: {
        type: string;
        email: string;
    };
    ids?: string[];
    term?: string;
    tags?: string[];
    updated_since?: string;
}
export interface ContactCreateParams {
    first_name: string;
    last_name: string;
    emails?: Email[];
    telephones?: PhoneNumber[];
    addresses?: Address[];
    language?: string;
    gender?: "male" | "female";
    tags?: string[];
}
export interface ContactUpdateParams {
    id: string;
    first_name?: string;
    last_name?: string;
    emails?: Email[];
    telephones?: PhoneNumber[];
    addresses?: Address[];
    language?: string;
    gender?: "male" | "female";
    tags?: string[];
}
export interface Company {
    id: string;
    name: string;
    business_type?: IdObject;
    vat_number?: string;
    national_identification_number?: string;
    emails?: Email[];
    telephones?: PhoneNumber[];
    website?: string;
    addresses?: Address[];
    language?: string;
    tags?: string[];
    added_at?: string;
    updated_at?: string;
}
export interface CompanyListFilter {
    email?: {
        type: string;
        email: string;
    };
    ids?: string[];
    term?: string;
    tags?: string[];
    updated_since?: string;
    vat_number?: string;
}
export interface CompanyCreateParams {
    name: string;
    emails?: Email[];
    telephones?: PhoneNumber[];
    addresses?: Address[];
    language?: string;
    vat_number?: string;
    tags?: string[];
    website?: string;
}
export interface Deal {
    id: string;
    title: string;
    summary?: string;
    reference?: string;
    status?: string;
    lead?: IdObject;
    department?: IdObject;
    estimated_value?: Money;
    estimated_closing_date?: string;
    estimated_probability?: number;
    current_phase?: IdObject;
    responsible_user?: IdObject;
    closed_at?: string;
    source?: IdObject;
    created_at?: string;
    updated_at?: string;
}
export interface DealListFilter {
    ids?: string[];
    term?: string;
    phase_id?: string;
    responsible_user_id?: string;
    updated_since?: string;
}
export interface DealCreateParams {
    title: string;
    lead: {
        customer: IdObject;
        contact_person_id?: string;
    };
    phase_id: string;
    estimated_value?: Money;
    estimated_closing_date?: string;
    estimated_probability?: number;
    responsible_user_id?: string;
    department_id?: string;
    source_id?: string;
}
export interface DealUpdateParams {
    id: string;
    title?: string;
    summary?: string;
    estimated_value?: Money;
    estimated_closing_date?: string;
    estimated_probability?: number;
    responsible_user_id?: string;
    source_id?: string;
    department_id?: string;
    lead?: {
        customer?: IdObject;
        contact_person_id?: string;
    };
}
export interface DealMoveParams {
    id: string;
    phase_id: string;
}
export interface DealLoseParams {
    id: string;
    reason_id?: string;
    extra_info?: string;
}
export type ProjectBillingMethod = "time_and_materials" | "fixed_price" | "non_billable";
export type ProjectColor = "#00B2B2" | "#008A8C" | "#992600" | "#ED9E00" | "#D157D3" | "#A400B2" | "#0071F2" | "#004DA6" | "#64788F" | "#C0C0C4" | "#82828C" | "#1A1C20";
export interface TimeSpan {
    value: number;
    unit: "hours" | "minutes" | "seconds";
}
export interface Project {
    id: string;
    project_key?: number;
    title: string;
    description?: string | null;
    status?: "open" | "closed";
    billing_method?: ProjectBillingMethod;
    time_budget?: TimeSpan | null;
    time_tracked?: TimeSpan | null;
    external_budget?: Money | null;
    internal_budget?: Money | null;
    price?: Money | null;
    fixed_price?: Money | null;
    cost?: Money | null;
    margin?: Money | null;
    start_date?: string | null;
    end_date?: string | null;
    purchase_order_number?: string | null;
    company_entity?: IdObject | null;
    owners?: IdObject[];
    color?: ProjectColor;
    assignees?: {
        assignee: IdObject;
        assign_type: string;
    }[];
    customers?: IdObject[];
    deals?: IdObject[];
    quotations?: IdObject[];
}
export interface ProjectListFilter {
    ids?: string[];
    status?: "open" | "planned" | "running" | "overdue" | "over_budget" | "closed";
    deal_ids?: string[];
    quotation_ids?: string[];
    term?: string;
    customers?: IdObject[];
}
export interface ProjectCreateParams {
    title: string;
    description?: string;
    owner_ids?: string[];
    time_budget?: TimeSpan;
    billing_method?: ProjectBillingMethod;
    external_budget?: Money;
    internal_budget?: Money;
    fixed_price?: Money;
    start_date?: string;
    end_date?: string;
    purchase_order_number?: string;
    company_entity_id?: string;
    color?: ProjectColor;
    customers?: IdObject[];
    assignees?: IdObject[];
    deal_ids?: string[];
    quotation_ids?: string[];
}
export interface Task {
    id: string;
    description: string;
    completed: boolean;
    completed_at?: string;
    due_on?: string;
    customer?: IdObject;
    assignee?: IdObject;
    created_at?: string;
    updated_at?: string;
}
export interface TaskListFilter {
    ids?: string[];
    term?: string;
    customer?: IdObject;
    assignee?: IdObject;
}
export interface TaskCreateParams {
    description: string;
    due_on?: string;
    customer?: IdObject;
    assignee?: IdObject;
    work_type_id?: string;
}
export interface Event {
    id: string;
    title: string;
    description?: string;
    creator?: IdObject;
    task?: IdObject;
    activity_type?: IdObject;
    starts_at?: string;
    ends_at?: string;
    location?: string;
    attendees?: IdObject[];
    links?: IdObject[];
}
export interface EventListFilter {
    ids?: string[];
    starts_after?: string;
    starts_before?: string;
    ends_after?: string;
    ends_before?: string;
    attendee?: IdObject;
}
export interface EventCreateParams {
    title: string;
    description?: string;
    activity_type_id: string;
    starts_at: string;
    ends_at: string;
    attendees?: {
        type: string;
        id: string;
    }[];
    links?: IdObject[];
    location?: string;
}
export interface Invoice {
    id: string;
    department?: IdObject;
    invoice_number?: string;
    invoice_date?: string;
    status?: string;
    due_on?: string;
    paid?: boolean;
    paid_at?: string;
    invoicee?: {
        customer: IdObject;
        for_attention_of?: IdObject;
    };
    total?: {
        tax_exclusive: Money;
        tax_inclusive: Money;
        payable: Money;
        taxes: {
            rate: number;
            taxable: Money;
            tax: Money;
        }[];
    };
    grouped_lines?: InvoiceGroupedLine[];
    created_at?: string;
    updated_at?: string;
}
export interface InvoiceGroupedLine {
    section?: {
        title: string;
    };
    line_items: InvoiceLineItem[];
}
export interface InvoiceLineItem {
    quantity: number;
    description: string;
    extended_description?: string;
    unit_price: Money;
    tax_rate_id: string;
    discount?: {
        type: "percentage";
        value: number;
    };
    product_id?: string;
    /** The "Rekening" (bookkeeping account) the line is booked on. */
    product_category_id?: string;
}
export interface InvoiceListFilter {
    ids?: string[];
    department_id?: string;
    status?: string[];
    updated_since?: string;
    invoice_date_after?: string;
    invoice_date_before?: string;
}
export interface InvoiceCreateParams {
    invoicee: {
        customer: IdObject;
        for_attention_of?: IdObject;
    };
    department_id: string;
    payment_term: {
        type: string;
        days?: number;
    };
    grouped_lines: InvoiceGroupedLine[];
    invoice_date?: string;
    discounts?: {
        type: string;
        value: number;
    }[];
    note?: string;
}
export interface QuotationLineItem {
    quantity: number;
    description: string;
    extended_description?: string;
    unit_price: {
        amount: number;
        tax: "excluding";
    };
    tax_rate_id: string;
    discount?: {
        type: "percentage";
        value: number;
    };
    product_id?: string;
}
export interface QuotationGroupedLine {
    section?: {
        title: string;
    };
    line_items: QuotationLineItem[];
}
export interface Quotation {
    id: string;
    deal?: IdObject;
    status?: string;
    currency?: {
        code: string;
        exchange_rate?: number;
    };
    text?: string;
    document_template?: IdObject;
    expiry?: {
        expires_after?: string;
        action_after_expiry?: "lock" | "none";
    };
    grouped_lines?: QuotationGroupedLine[];
    discounts?: {
        type: "percentage";
        value: number;
        description?: string;
    }[];
    total?: {
        tax_exclusive: Money;
        tax_inclusive: Money;
        taxes: {
            rate: number;
            taxable: Money;
            tax: Money;
        }[];
    };
    created_at?: string;
    updated_at?: string;
}
export type TimeTrackingSubjectType = "company" | "contact" | "event" | "milestone" | "nextgenTask" | "ticket" | "todo";
export interface TimeTracking {
    id: string;
    work_type?: IdObject;
    description?: string;
    subject?: IdObject;
    invoiceable?: boolean;
    user?: IdObject;
    started_at?: string;
    ended_at?: string;
    duration?: number;
    created_at?: string;
    updated_at?: string;
}
export interface TimeTrackingListFilter {
    ids?: string[];
    user_id?: string;
    started_after?: string;
    started_before?: string;
    ended_after?: string;
    ended_before?: string;
    subject?: IdObject;
    subject_types?: TimeTrackingSubjectType[];
}
export interface TimeTrackingAddParams {
    work_type_id?: string;
    description?: string;
    subject: IdObject;
    invoiceable?: boolean;
    user_id?: string;
    started_at: string;
    duration: number;
}
export interface TimeTrackingUpdateParams {
    id: string;
    work_type_id?: string;
    duration?: number;
    description?: string;
    subject?: IdObject;
    invoiceable?: boolean;
    started_at?: string;
}
export interface TeamleaderListResponse<T> {
    data: T[];
    meta?: PaginationMeta;
}
export interface TeamleaderInfoResponse<T> {
    data: T;
}
//# sourceMappingURL=index.d.ts.map
import { z } from "zod";

export const CustomerSchema = z.object({
  name: z.string().min(2, "Customer name is required"),
  companyName: z.string().optional().nullable(),
  address: z.string().min(3, "Address is required"),
  city: z.string().min(2, "City is required"),
  phone: z.string().min(7, "Valid phone number is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")).nullable(),
  notes: z.string().optional().nullable(),
});

export const ProductSchema = z.object({
  name: z.string().min(2, "Product/Service name is required"),
  productCode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  category: z.string().default("General"),
  unit: z.string().default("Pcs"),
  rate: z.number().min(0, "Rate cannot be negative"),
  warranty: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const InvoiceItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().optional().nullable(),
  section: z.string().optional().nullable(),
  serialNumber: z.number().default(1),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  rate: z.number().min(0, "Rate cannot be negative"),
  amount: z.number().min(0, "Amount cannot be negative"),
});

export const InvoiceSchema = z.object({
  customerId: z.string().min(1, "Please select or create a customer"),
  invoiceNumber: z.string().optional(),
  quotationId: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
  invoiceDate: z.string().or(z.date()),
  dueDate: z.string().or(z.date()).optional().nullable(),
  items: z.array(InvoiceItemSchema).min(1, "At least one item is required"),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  additionalCharges: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  total: z.number().min(0),
  advance: z.number().min(0).default(0),
  status: z.enum(["Draft", "Issued", "Partially Paid", "Paid", "Overdue", "Cancelled"]).default("Issued"),
  notes: z.string().optional().nullable(),
});

export const PaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.number().positive("Payment amount must be greater than 0"),
  paymentDate: z.string().or(z.date()),
  paymentMethod: z.enum(["Cash", "Bank Transfer", "Cheque", "Other"]).default("Cash"),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const QuotationSchema = z.object({
  customerId: z.string().min(1, "Please select or create a customer"),
  quotationNumber: z.string().optional(),
  date: z.string().or(z.date()),
  items: z.array(InvoiceItemSchema).min(1, "At least one item is required"),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  total: z.number().min(0),
  status: z.enum(["Draft", "Sent", "Accepted", "Converted", "Rejected"]).default("Draft"),
  notes: z.string().optional().nullable(),
});

export const SettingsSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  logo: z.string().optional().nullable(),
  address: z.string().min(3, "Address is required"),
  city: z.string().min(2, "City is required"),
  phone: z.string().min(5, "Phone is required"),
  email: z.string().email("Valid email required"),
  website: z.string().optional().nullable(),
  ntn: z.string().optional().nullable(),
  strn: z.string().optional().nullable(),
  invoicePrefix: z.string().default("INV-"),
  startingInvoiceNumber: z.number().int().min(1).default(1),
  quotationPrefix: z.string().default("QT-"),
  startingQuotationNum: z.number().int().min(1).default(1),
  customerPrefix: z.string().default("CUST-"),
  startingCustomerNum: z.number().int().min(1).default(1),
  currency: z.string().default("PKR"),
  defaultPaymentTerms: z.string().optional().nullable(),
  defaultNotes: z.string().optional().nullable(),
  footerText: z.string().optional().nullable(),
});

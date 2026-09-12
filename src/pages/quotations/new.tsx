"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { MdDeleteOutline } from "react-icons/md";
import { Input, toast } from "@heroui/react";
import DashboardLayout from "@/layout/DashboardLayout";
import { Field, SelectInput, TextInput } from "@/components/shared/FormFields";
import { AsyncProductSelect } from "@/components/shared/AsyncProductSelect";
import { ErrorState, LoadingState } from "@/components/shared/PageState";
import { useApiResource } from "@/hooks/useApiResource";
import { useAxios } from "@/hooks/useAxios";
import { apiErrorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { Customer, Product } from "@/types/types";

interface QuoteLine {
  product: Product;
  quantity: string;
  unitPrice: string;
}

const schema = Yup.object({
  customerId: Yup.string().required("Choose a customer"),
  discount: Yup.number().min(0, "Can't be negative"),
  validUntil: Yup.date().min(new Date(), "Must be a future date"),
  notes: Yup.string(),
});

export default function NewQuotationPage() {
  const router = useRouter();
  const { secureAxios } = useAxios();
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [lineError, setLineError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useApiResource(
    async (client) => {
      const response = await client.get<{ customers: Customer[] }>("/customers", {
        params: { page: 1, limit: 100, active: true },
      });
      return { customers: response.data.customers };
    },
    () => "We couldn't load customers right now.",
  );

  const formik = useFormik({
    initialValues: {
      customerId: "",
      discount: "0",
      validUntil: "",
      notes: "",
    },
    validationSchema: schema,
    onSubmit: async (values, { setSubmitting }) => {
      const validLines = lines.filter(
        (line) => Number.parseInt(line.quantity, 10) > 0,
      );
      if (validLines.length === 0) {
        setLineError("Add at least one item to the quotation.");
        return;
      }
      setLineError(null);
      try {
        await secureAxios.post("/quotations", {
          customerId: values.customerId,
          discount: values.discount,
          validUntil: values.validUntil
            ? `${values.validUntil}T23:59:59Z`
            : undefined,
          notes: values.notes.trim() || undefined,
          items: validLines.map((line) => ({
            productId: line.product.id,
            quantity: Number.parseInt(line.quantity, 10),
            unitPrice: line.unitPrice,
          })),
        });
        toast.success("Quotation created", {
          description: "Send it to the customer to start the conversation.",
        });
        router.push("/quotations");
      } catch (error: unknown) {
        toast.danger("Couldn't create the quotation", {
          description: apiErrorMessage(error, "Check the details and try again"),
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  const addProduct = (product: Product) => {
    setLines((current) => {
      if (current.some((line) => line.product.id === product.id)) {
        return current.map((line) =>
          line.product.id === product.id
            ? { ...line, quantity: String(Number(line.quantity) + 1) }
            : line,
        );
      }
      return [
        ...current,
        { product, quantity: "1", unitPrice: product.sellingPrice },
      ];
    });
  };

  const updateLine = (productId: string, patch: Partial<QuoteLine>) => {
    setLines((current) =>
      current.map((line) =>
        line.product.id === productId ? { ...line, ...patch } : line,
      ),
    );
  };

  const removeLine = (productId: string) => {
    setLines((current) => current.filter((line) => line.product.id !== productId));
  };

  const subtotal = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          sum +
          Number.parseFloat(line.unitPrice || "0") *
            Number.parseInt(line.quantity || "0", 10),
        0,
      ),
    [lines],
  );

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 pb-12 md:p-8">
        <header>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
            New record
          </span>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-secondary">
            New quotation
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-secondary/55">
            Build the offer, then send it. Totals are calculated by the server
            when the quotation is created.
          </p>
        </header>

        {isLoading ? (
          <LoadingState label="Loading products and customers…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <form
            onSubmit={formik.handleSubmit}
            className="flex flex-col gap-6 rounded-[24px] border border-black/5 bg-card p-5 md:p-8"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Customer"
                required
                error={
                  formik.touched.customerId ? formik.errors.customerId : undefined
                }
              >
                <SelectInput
                  name="customerId"
                  value={formik.values.customerId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="Select a customer…"
                >
                  <option value="">Select a customer…</option>
                  {(data?.customers ?? []).map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <Field
                label="Valid until"
                error={
                  formik.touched.validUntil ? formik.errors.validUntil : undefined
                }
              >
                <TextInput
                  name="validUntil"
                  type="date"
                  value={formik.values.validUntil}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </Field>

              <Field
                label="Discount"
                error={
                  formik.touched.discount ? formik.errors.discount : undefined
                }
              >
                <TextInput
                  name="discount"
                  inputMode="decimal"
                  value={formik.values.discount}
                  onChange={formik.handleChange}
                />
              </Field>

              <Field label="Notes">
                <TextInput
                  name="notes"
                  placeholder="Terms, delivery, etc."
                  value={formik.values.notes}
                  onChange={formik.handleChange}
                />
              </Field>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-secondary">Items</h2>
                <span className="text-xs text-secondary/45">
                  {subtotal > 0 ? `${formatMoney(String(subtotal))} subtotal` : ""}
                </span>
              </div>

              <Field
                label="Add products"
                hint="Search the catalog, then set quantities below."
              >
                <AsyncProductSelect
                  value=""
                  onChange={(id, product) => {
                    if (product) addProduct(product);
                  }}
                  autoClear
                  placeholder="Search products to add…"
                />
              </Field>

              {lines.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {lines.map((line) => (
                    <div
                      key={line.product.id}
                      className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-3 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-secondary">
                          {line.product.name}
                        </p>
                        <p className="truncate text-[11px] text-secondary/45">
                          {line.product.sku}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-secondary/55">
                          Qty
                          <Input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(event) =>
                              updateLine(line.product.id, {
                                quantity: event.target.value,
                              })
                            }
                            aria-label={`Quantity for ${line.product.name}`}
                            variant="secondary"
                            className="w-16! min-h-10! rounded-xl! border! border-black/10! bg-white! px-2! py-1! text-sm!"
                          />
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-secondary/55">
                          Price
                          <Input
                            inputMode="decimal"
                            value={line.unitPrice}
                            onChange={(event) =>
                              updateLine(line.product.id, {
                                unitPrice: event.target.value,
                              })
                            }
                            aria-label={`Price for ${line.product.name}`}
                            variant="secondary"
                            className="w-24! min-h-10! rounded-xl! border! border-black/10! bg-white! px-2! py-1! text-sm!"
                          />
                        </label>
                        <button
                          type="button"
                          aria-label={`Remove ${line.product.name}`}
                          onClick={() => removeLine(line.product.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/5 text-secondary/60 transition hover:bg-black/10"
                        >
                          <MdDeleteOutline />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {lineError ? (
                <p className="text-xs font-medium text-rose-600">{lineError}</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={formik.isSubmitting}
              className="flex min-h-12 items-center justify-center rounded-2xl bg-secondary px-5 text-sm font-semibold text-white transition hover:bg-secondary/90 disabled:opacity-60"
            >
              {formik.isSubmitting ? "Creating…" : "Create quotation"}
            </button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
"use client";

import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Checkbox, toast } from "@heroui/react";
import DashboardLayout from "@/layout/DashboardLayout";
import { Field, SelectInput, TextAreaInput, TextInput } from "@/components/shared/FormFields";
import { useAxios } from "@/hooks/useAxios";
import { apiErrorMessage } from "@/lib/errors";
import { CustomerType } from "@/types/types";

const schema = Yup.object({
  name: Yup.string().required("Customer name is required"),
  customerCode: Yup.string(),
  phone: Yup.string(),
  email: Yup.string().email("Enter a valid email"),
  address: Yup.string(),
  customerType: Yup.mixed<CustomerType>().oneOf(["INDIVIDUAL", "BUSINESS"]),
  taxNumber: Yup.string(),
  creditAllowed: Yup.boolean(),
  creditLimit: Yup.number().min(0, "Can't be negative"),
  notes: Yup.string(),
});

export default function NewCustomerPage() {
  const router = useRouter();
  const { secureAxios } = useAxios();

  const formik = useFormik({
    initialValues: {
      name: "",
      customerCode: "",
      phone: "",
      email: "",
      address: "",
      customerType: "INDIVIDUAL" as CustomerType,
      taxNumber: "",
      creditAllowed: false,
      creditLimit: "0",
      notes: "",
    },
    validationSchema: schema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await secureAxios.post("/customers", {
          name: values.name.trim(),
          customerCode: values.customerCode.trim() || undefined,
          phone: values.phone.trim() || undefined,
          email: values.email.trim() || undefined,
          address: values.address.trim() || undefined,
          customerType: values.customerType,
          taxNumber: values.taxNumber.trim() || undefined,
          creditAllowed: values.creditAllowed,
          creditLimit: values.creditAllowed ? values.creditLimit : "0",
          notes: values.notes.trim() || undefined,
        });
        toast.success("Customer added", {
          description: `${values.name} is now in the directory.`,
        });
        router.push("/customers");
      } catch (error: unknown) {
        toast.danger("Couldn't add the customer", {
          description: apiErrorMessage(error, "Check the details and try again"),
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <DashboardLayout>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 pb-12 md:p-8">
        <header>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
            New record
          </span>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-secondary">
            Add a customer
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-secondary/55">
            A code is generated automatically when you leave it blank.
          </p>
        </header>

        <form
          onSubmit={formik.handleSubmit}
          className="flex flex-col gap-6 rounded-[24px] border border-black/5 bg-card p-5 md:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Full name / business name"
              required
              error={formik.touched.name ? formik.errors.name : undefined}
            >
              <TextInput
                name="name"
                placeholder="e.g. Zim Auto Spares (Pvt) Ltd"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
            </Field>

            <Field
              label="Customer code"
              hint="Leave blank to auto-generate"
              error={
                formik.touched.customerCode ? formik.errors.customerCode : undefined
              }
            >
              <TextInput
                name="customerCode"
                placeholder="CUS-000123"
                value={formik.values.customerCode}
                onChange={formik.handleChange}
              />
            </Field>

            <Field
              label="Phone"
              error={formik.touched.phone ? formik.errors.phone : undefined}
            >
              <TextInput
                name="phone"
                inputMode="tel"
                placeholder="+263 77 000 0000"
                value={formik.values.phone}
                onChange={formik.handleChange}
              />
            </Field>

            <Field
              label="Email"
              error={formik.touched.email ? formik.errors.email : undefined}
            >
              <TextInput
                name="email"
                type="email"
                placeholder="billing@example.co.zw"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
            </Field>

            <Field label="Customer type">
              <SelectInput
                name="customerType"
                value={formik.values.customerType}
                onChange={formik.handleChange}
              >
                <option value="INDIVIDUAL">Individual</option>
                <option value="BUSINESS">Business</option>
              </SelectInput>
            </Field>

            <Field label="Tax / VAT number">
              <TextInput
                name="taxNumber"
                placeholder="e.g. 1234567890"
                value={formik.values.taxNumber}
                onChange={formik.handleChange}
              />
            </Field>

            <Field label="Address" className="sm:col-span-2">
              <TextInput
                name="address"
                placeholder="Street, city, country"
                value={formik.values.address}
                onChange={formik.handleChange}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-4">
            <Checkbox
              name="creditAllowed"
              isSelected={formik.values.creditAllowed}
              onChange={(selected) =>
                formik.handleChange({
                  target: {
                    name: "creditAllowed",
                    type: "checkbox",
                    checked: selected,
                  },
                } as React.ChangeEvent<HTMLInputElement>)
              }
              variant="secondary"
            >
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Allow credit purchases
              </Checkbox.Content>
            </Checkbox>
            {formik.values.creditAllowed ? (
              <Field label="Credit limit">
                <TextInput
                  name="creditLimit"
                  inputMode="decimal"
                  placeholder="5000.00"
                  value={formik.values.creditLimit}
                  onChange={formik.handleChange}
                />
              </Field>
            ) : null}
          </div>

          <Field label="Notes">
            <TextAreaInput
              name="notes"
              placeholder="Optional notes about this customer…"
              value={formik.values.notes}
              onChange={formik.handleChange}
            />
          </Field>

          <button
            type="submit"
            disabled={formik.isSubmitting}
            className="flex min-h-12 items-center justify-center rounded-2xl bg-secondary px-5 text-sm font-semibold text-white transition hover:bg-secondary/90 disabled:opacity-60"
          >
            {formik.isSubmitting ? "Saving…" : "Save customer"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Checkbox, toast } from "@heroui/react";
import DashboardLayout from "@/layout/DashboardLayout";
import {
  Field,
  SelectInput,
  TextAreaInput,
  TextInput,
} from "@/components/shared/FormFields";
import { OnlinePartSearch, ChosenPart } from "@/components/products/OnlinePartSearch";
import { ErrorState, LoadingState } from "@/components/shared/PageState";
import { useApiResource } from "@/hooks/useApiResource";
import { useAxios } from "@/hooks/useAxios";
import { apiErrorMessage } from "@/lib/errors";
import { Brand, Category, Product } from "@/types/types";

const schema = Yup.object({
  name: Yup.string().required("Product name is required"),
  sku: Yup.string().required("SKU is required"),
  categoryId: Yup.string().required("Choose a category"),
  brandId: Yup.string(),
  partNumber: Yup.string(),
  oemNumber: Yup.string(),
  costPrice: Yup.number()
    .min(0, "Can't be negative")
    .required("Cost price is required"),
  sellingPrice: Yup.number()
    .min(0, "Can't be negative")
    .required("Selling price is required"),
  quantity: Yup.number()
    .integer("Must be a whole number")
    .min(0, "Can't be negative")
    .required("Opening stock is required"),
  minimumStockLevel: Yup.number()
    .integer("Must be a whole number")
    .min(0, "Can't be negative")
    .required("Reorder level is required"),
  unit: Yup.string(),
  description: Yup.string(),
  isActive: Yup.boolean(),
});

export default function NewProductPage() {
  const router = useRouter();
  const { secureAxios } = useAxios();
  const [chosenPart, setChosenPart] = useState<ChosenPart | null>(null);
  const [fitVehicleIds, setFitVehicleIds] = useState<string[]>([]);

  const { data, isLoading, error, refetch } = useApiResource(
    async (client) => {
      const [categories, brands] = await Promise.all([
        client.get<{ categories: Category[] }>("/categories", {
          params: { active: true },
        }),
        client.get<{ brands: Brand[] }>("/brands", {
          params: { active: true },
        }),
      ]);
      return {
        categories: categories.data.categories,
        brands: brands.data.brands,
      };
    },
    () => "We couldn't load categories and brands right now.",
  );

  const categoryOptions = useMemo(() => data?.categories ?? [], [data]);
  const brandOptions = useMemo(() => data?.brands ?? [], [data]);

  const applyChosenPart = (part: ChosenPart) => {
    setChosenPart(part);
    setFitVehicleIds(part.fitVehicleIds);
    formik.setValues((values) => ({
      ...values,
      name: part.name,
      sku: `${part.brandName.replace(/\s+/g, "")}-${part.article}`,
      partNumber: part.article,
      oemNumber: part.article,
      brandId: part.brandId,
      description: part.description,
    }));
  };

  const formik = useFormik({
    initialValues: {
      name: "",
      sku: "",
      categoryId: "",
      brandId: "",
      partNumber: "",
      oemNumber: "",
      costPrice: "",
      sellingPrice: "",
      quantity: "0",
      minimumStockLevel: "0",
      unit: "UNIT",
      description: "",
      isActive: true,
    },
    validationSchema: schema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const { data } = await secureAxios.post<{ product: Product }>(
          "/products",
          {
            name: values.name.trim(),
            sku: values.sku.trim(),
            categoryId: values.categoryId,
            brandId: values.brandId || undefined,
            partNumber: values.partNumber.trim() || undefined,
            oemNumber: values.oemNumber.trim() || undefined,
            costPrice: values.costPrice,
            sellingPrice: values.sellingPrice,
            quantity: Number(values.quantity),
            minimumStockLevel: Number(values.minimumStockLevel),
            unit: values.unit.trim().toUpperCase() || "UNIT",
            description: values.description.trim() || undefined,
            isActive: values.isActive,
          },
        );

        let linked = 0;
        for (const vehicleId of fitVehicleIds) {
          try {
            await secureAxios.post("/compatibilities", {
              productId: data.product.id,
              vehicleId,
            });
            linked++;
          } catch {
            // a failed fitment link must not undo the created product
          }
        }

        toast.success("Product added", {
          description:
            linked > 0
              ? `${values.name} was added and linked to ${linked} vehicle${linked === 1 ? "" : "s"}.`
              : `${values.name} is now in the catalog.`,
        });
        router.push("/products");
      } catch (error: unknown) {
        toast.danger("Couldn't add the product", {
          description: apiErrorMessage(
            error,
            "Check the details and try again",
          ),
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
            Add a product
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-secondary/55">
            Capture the details your team needs at the counter. Prices are in
            the store currency; opening stock creates an initial stock-in
            movement.
          </p>
        </header>

        {isLoading ? (
          <LoadingState label="Loading categories and brands…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <div className="flex flex-col gap-6">
            <OnlinePartSearch
              brands={brandOptions}
              onBrandsRefreshed={refetch}
              onChosen={applyChosenPart}
            />

            {chosenPart ? (
              <p className="text-xs text-secondary/45">
                Pre-filled from the online part “{chosenPart.brandName} ·{" "}
                {chosenPart.article}”. Adjust the details and prices, then save.
              </p>
            ) : null}

            <form
              onSubmit={formik.handleSubmit}
              className="flex flex-col gap-6 rounded-[24px] border border-black/5 bg-card p-5 md:p-8"
            >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Product name"
                required
                error={formik.touched.name ? formik.errors.name : undefined}
              >
                <TextInput
                  name="name"
                  placeholder="e.g. Toyota Hilux Front Brake Pad"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </Field>

              <Field
                label="SKU"
                required
                error={formik.touched.sku ? formik.errors.sku : undefined}
                hint="Unique code, e.g. BP-HILUX-001"
              >
                <TextInput
                  name="sku"
                  placeholder="BP-HILUX-001"
                  value={formik.values.sku}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </Field>

              <Field
                label="Category"
                required
                error={
                  formik.touched.categoryId
                    ? formik.errors.categoryId
                    : undefined
                }
              >
                <SelectInput
                  name="categoryId"
                  value={formik.values.categoryId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                >
                  <option value="">Select a category…</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <Field label="Brand">
                <SelectInput
                  name="brandId"
                  value={formik.values.brandId}
                  onChange={formik.handleChange}
                  placeholder="No brand"
                >
                  <option value="">No brand</option>
                  {brandOptions.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <Field label="Part number">
                <TextInput
                  name="partNumber"
                  placeholder="04465-0K240"
                  value={formik.values.partNumber}
                  onChange={formik.handleChange}
                />
              </Field>

              <Field label="OEM number">
                <TextInput
                  name="oemNumber"
                  placeholder="04465-0K240"
                  value={formik.values.oemNumber}
                  onChange={formik.handleChange}
                />
              </Field>

              <Field
                label="Cost price"
                required
                error={
                  formik.touched.costPrice ? formik.errors.costPrice : undefined
                }
              >
                <TextInput
                  name="costPrice"
                  inputMode="decimal"
                  placeholder="25.00"
                  value={formik.values.costPrice}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </Field>

              <Field
                label="Selling price"
                required
                error={
                  formik.touched.sellingPrice
                    ? formik.errors.sellingPrice
                    : undefined
                }
              >
                <TextInput
                  name="sellingPrice"
                  inputMode="decimal"
                  placeholder="40.00"
                  value={formik.values.sellingPrice}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </Field>

              <Field
                label="Opening stock"
                required
                error={
                  formik.touched.quantity ? formik.errors.quantity : undefined
                }
                hint="Writes an initial stock-in movement"
              >
                <TextInput
                  name="quantity"
                  type="number"
                  min={0}
                  value={formik.values.quantity}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </Field>

              <Field
                label="Reorder level"
                required
                error={
                  formik.touched.minimumStockLevel
                    ? formik.errors.minimumStockLevel
                    : undefined
                }
                hint="Alert when stock drops to this level"
              >
                <TextInput
                  name="minimumStockLevel"
                  type="number"
                  min={0}
                  value={formik.values.minimumStockLevel}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </Field>

              <Field label="Unit" hint="e.g. PAIR, UNIT, SET">
                <TextInput
                  name="unit"
                  placeholder="UNIT"
                  value={formik.values.unit}
                  onChange={formik.handleChange}
                />
              </Field>
            </div>

            <Field label="Description">
              <TextAreaInput
                name="description"
                placeholder="Optional notes about this part…"
                value={formik.values.description}
                onChange={formik.handleChange}
                className="resize-none"
              />
            </Field>

            <Checkbox
              name="isActive"
              isSelected={formik.values.isActive}
              onChange={(selected) =>
                formik.handleChange({
                  target: {
                    name: "isActive",
                    type: "checkbox",
                    checked: selected,
                  },
                } as React.ChangeEvent<HTMLInputElement>)
              }
              variant="secondary"
            >
              <Checkbox.Content className="text-black">
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Active (available for sale)
              </Checkbox.Content>
            </Checkbox>

            <button
              type="submit"
              disabled={formik.isSubmitting}
              className="flex min-h-12 items-center justify-center rounded-2xl bg-secondary px-5 text-sm font-semibold text-white transition hover:bg-secondary/90 disabled:opacity-60"
            >
              {formik.isSubmitting ? "Saving…" : "Save product"}
            </button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

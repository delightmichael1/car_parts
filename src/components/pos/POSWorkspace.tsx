"use client";

import {
  KeyboardEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MdAdd,
  MdCheckCircle,
  MdClose,
  MdDeleteOutline,
  MdDialpad,
  MdDirectionsCar,
  MdExpandMore,
  MdLocalOffer,
  MdPersonAdd,
  MdPointOfSale,
  MdRemove,
  MdSearch,
  MdShoppingCart,
} from "react-icons/md";
import { Input, toast } from "@heroui/react";
import { ErrorState, LoadingState } from "@/components/shared/PageState";
import { AppModal } from "@/components/shared/AppModal";
import { PaymentModal } from "@/components/shared/PaymentModal";
import { Keypad } from "@/components/pos/Keypad";
import { useApiResource } from "@/hooks/useApiResource";
import { useAxios } from "@/hooks/useAxios";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { apiErrorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import {
  Brand,
  Category,
  Customer,
  PartCompatibility,
  Product,
  ProductsResponse,
  Sale,
  Vehicle,
} from "@/types/types";
import CustomersModal from "../modals/CustomersModal";
import { BiChevronDown } from "react-icons/bi";

interface CartLine {
  product: Product;
  quantity: number;
}

// Swap for `product.minimumStockLevel` if your Product type exposes it —
// this is just a sane default so low stock is visible at a glance.
const LOW_STOCK_THRESHOLD = 3;

export default function POSWorkspace() {
  const { secureAxios } = useAxios();
  const [query, setQuery] = useState("");
  const [vehicleQuery, setVehicleQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [brandId, setBrandId] = useState<string>("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [discountCents, setDiscountCents] = useState(0);
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [qtyTarget, setQtyTarget] = useState<Product | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const [isCustomersDialogOpen, setIsCustomersDialogOpen] = useState(false);

  const flashTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  const debouncedQuery = useDebouncedValue(query, 350);
  const debouncedVehicleQuery = useDebouncedValue(vehicleQuery, 300);

  const { data: vehicleData, isLoading: isLoadingVehicles } = useApiResource(
    async (client) => {
      const response = await client.get<{ vehicles: Vehicle[]; total: number }>(
        "/vehicles",
      );
      return response.data.vehicles;
    },
    () => "We couldn't load vehicles right now.",
  );

  const { data: lookupData, refetch: refetchLookups } = useApiResource(
    async (client) => {
      const [brands, categories] = await Promise.all([
        client.get<{ brands: Brand[] }>("/brands", {
          params: { active: true },
        }),
        client.get<{ categories: Category[] }>("/categories", {
          params: { active: true },
        }),
      ]);
      return {
        brands: brands.data.brands,
        categories: categories.data.categories,
      };
    },
    () => "We couldn't load catalog filters right now.",
  );

  const productsKey = `${debouncedQuery}::${brandId}::${categoryId}`;
  const {
    data: productData,
    isLoading: isLoadingProducts,
    error: productsError,
    refetch: refetchProducts,
  } = useApiResource(
    async (client, key) => {
      setIsSearching(true);
      try {
        const [search, brand, category] = String(key ?? "").split("::");
        const params: Record<string, string | number | boolean> = {
          page: 1,
          limit: 100,
          active: true,
        };
        if (search) params.search = search;
        if (brand && brand !== "all") params.brandId = brand;
        if (category && category !== "all") params.categoryId = category;
        const response = await client.get<ProductsResponse>("/products", {
          params,
        });
        return response.data.products;
      } finally {
        setIsSearching(false);
      }
    },
    () => "We couldn't load products right now.",
    productsKey,
  );

  const { data: compatData, isLoading: isLoadingCompat } = useApiResource(
    async (client, key) => {
      const vehicleId = String(key ?? "");
      if (!vehicleId || vehicleId === "none") return [];
      const response = await client.get<{
        compatibilities: PartCompatibility[];
      }>("/compatibilities", { params: { vehicleId, page: 1, limit: 100 } });
      return response.data.compatibilities;
    },
    () => "We couldn't load vehicle fitments right now.",
    selectedVehicle?.id ?? "none",
  );

  const vehicles = useMemo(() => vehicleData ?? [], [vehicleData]);
  const brands = useMemo(() => lookupData?.brands ?? [], [lookupData]);
  const categories = useMemo(() => lookupData?.categories ?? [], [lookupData]);
  const products = useMemo(() => productData ?? [], [productData]);
  const compatibleIds = useMemo(
    () =>
      new Set(
        (compatData ?? []).map((compatibility) => compatibility.productId),
      ),
    [compatData],
  );

  const filteredVehicles = useMemo(() => {
    const term = debouncedVehicleQuery.trim().toLowerCase();
    if (!term) return vehicles;
    return vehicles.filter((vehicle) =>
      [vehicle.make, vehicle.model, vehicle.engine, vehicle.variant]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [vehicles, debouncedVehicleQuery]);

  const vehicleFiltered = useMemo(() => {
    if (!selectedVehicle) return products;
    return products.filter((product) => compatibleIds.has(product.id));
  }, [products, selectedVehicle, compatibleIds]);

  const visibleProducts = useMemo(() => {
    if (!onlyInStock) return vehicleFiltered;
    return vehicleFiltered.filter((product) => product.quantity > 0);
  }, [vehicleFiltered, onlyInStock]);

  const entries = cart.filter((line) => line.quantity > 0);
  const subtotal = useMemo(
    () =>
      entries.reduce(
        (sum, line) =>
          sum + Number.parseFloat(line.product.sellingPrice) * line.quantity,
        0,
      ),
    [entries],
  );
  const totalItems = entries.reduce((sum, line) => sum + line.quantity, 0);
  const effectiveDiscountCents = Math.min(
    discountCents,
    Math.round(subtotal * 100),
  );
  const discountAmount = effectiveDiscountCents / 100;
  const estimatedTotal = Math.max(subtotal - discountAmount, 0);

  const inCart = (productId: string) =>
    cart.find((line) => line.product.id === productId)?.quantity ?? 0;

  const flashAdd = (id: string) => {
    setJustAddedId(id);
    if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = window.setTimeout(() => {
      setJustAddedId((current) => (current === id ? null : current));
    }, 350);
  };

  const add = (product: Product) => {
    if (product.quantity <= 0) return;
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) return current;
        return current.map((line) =>
          line.product.id === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [...current, { product, quantity: 1 }];
    });
    flashAdd(product.id);
  };

  const removeOne = (productId: string) => {
    setCart((current) =>
      current
        .map((line) =>
          line.product.id === productId
            ? { ...line, quantity: line.quantity - 1 }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  };

  const removeAll = (productId: string) => {
    setCart((current) =>
      current.filter((line) => line.product.id !== productId),
    );
  };

  const setQuantity = (product: Product, quantity: number) => {
    setCart((current) => {
      const exists = current.some((line) => line.product.id === product.id);
      if (!exists) {
        return quantity > 0 ? [...current, { product, quantity }] : current;
      }
      return current
        .map((line) =>
          line.product.id === product.id ? { ...line, quantity } : line,
        )
        .filter((line) => line.quantity > 0);
    });
  };

  const clearCart = () => {
    setCart([]);
    setCustomerId("");
    setCustomerName("");
    setDiscountCents(0);
  };

  const checkout = async () => {
    if (entries.length === 0) return;
    setIsCheckingOut(true);
    try {
      const { data: draft } = await secureAxios.post<{ sale: Sale }>("/sales", {
        customerId: customerId || undefined,
        customerName: customerName,
        discount: discountAmount.toFixed(2),
        notes: "POS checkout",
        items: entries.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
        })),
      });
      const { data: completed } = await secureAxios.post<{ sale: Sale }>(
        `/sales/${draft.sale.id}/complete`,
      );
      setCompletedSale(completed.sale);
    } catch (error: unknown) {
      toast.danger("Couldn't complete the sale", {
        description: apiErrorMessage(error, "Check stock levels and try again"),
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const createCustomer = async (name: string, phone: string) => {
    const { data } = await secureAxios.post<{ customer: Customer }>(
      "/customers",
      {
        name,
        phone: phone || undefined,
      },
    );
    setCustomerId(data.customer.id);
    setCustomerName(data.customer.name);
    setIsAddingCustomer(false);
    toast.success("Customer added", {
      description: `${data.customer.name} is selected for this sale.`,
    });
    refetchLookups();
  };

  const handleSearchKeyDown = async (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key !== "Enter") return;
    const term = query.trim();
    if (!term) return;
    event.preventDefault();
    try {
      const { data } = await secureAxios.get<ProductsResponse>("/products", {
        params: { search: term, limit: 5, active: true },
      });
      const lower = term.toLowerCase();
      const exact = data.products.find(
        (product) =>
          product.sku.toLowerCase() === lower ||
          product.partNumber?.toLowerCase() === lower ||
          product.oemNumber?.toLowerCase() === lower,
      );
      if (exact) {
        add(exact);
        setQuery("");
      } else {
        toast.danger("No exact match", {
          description: `Nothing matches "${term}" by SKU or part number.`,
        });
      }
    } catch (error: unknown) {
      toast.danger("Search failed", {
        description: apiErrorMessage(error, "Try again."),
      });
    }
  };

  const isLoadingCatalog = isLoadingVehicles;
  const hasActiveFilters =
    brandId !== "all" ||
    categoryId !== "all" ||
    Boolean(selectedVehicle) ||
    Boolean(query);
  const activeBrand = brands.find((b) => b.id === brandId);
  const activeCategory = categories.find((c) => c.id === categoryId);

  return (
    <div className="flex h-full min-h-[calc(100vh-90px)] flex-col gap-4 p-4 md:p-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
            Sales desk
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-secondary">
            Point of sale
          </h1>
          <p className="text-sm text-secondary/55">
            Touch-first checkout for busy counters.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-secondary shadow-sm">
          <MdPointOfSale />
          <span className="text-sm font-semibold">Register 01</span>
        </div>
      </div>

      {/* Vehicle picker */}
      <div className="flex flex-col gap-3 rounded-3xl border border-black/5 bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="flex min-h-13 flex-1 items-center gap-3 rounded-2xl bg-black/5 px-4">
            <MdDirectionsCar className="text-secondary/45" />
            <span className="sr-only">Search vehicles</span>
            <Input
              value={vehicleQuery}
              onChange={(event) => setVehicleQuery(event.target.value)}
              placeholder="Search a vehicle: make, model, engine…"
              aria-label="Search vehicles"
              variant="secondary"
              className="w-full border-transparent bg-transparent px-0 py-0 text-base shadow-none outline-none focus:border-transparent focus:ring-0 placeholder:text-secondary/40"
            />
          </label>
          {selectedVehicle ? (
            <button
              type="button"
              onClick={() => setSelectedVehicle(null)}
              className="flex min-h-13 shrink-0 items-center gap-1.5 rounded-2xl bg-rose-500/10 px-4 text-sm font-semibold text-rose-700 transition active:scale-95"
            >
              <MdClose className="h-4 w-4" />
              Clear
            </button>
          ) : null}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {isLoadingVehicles ? (
            <p className="text-xs text-secondary/45">Loading vehicles…</p>
          ) : filteredVehicles.length === 0 ? (
            <p className="text-xs text-secondary/45">
              No vehicles match &quot;{vehicleQuery}&quot;. Try a make or model.
            </p>
          ) : (
            filteredVehicles.slice(0, 30).map((vehicle) => {
              const selected = selectedVehicle?.id === vehicle.id;
              return (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => setSelectedVehicle(vehicle)}
                  className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition active:scale-95 ${
                    selected
                      ? "bg-secondary text-white shadow-sm"
                      : "bg-black/5 text-secondary/70 hover:bg-black/10"
                  }`}
                >
                  {selected ? (
                    <MdCheckCircle className="h-4 w-4 text-primary" />
                  ) : null}
                  {vehicle.make} {vehicle.model}
                  {vehicle.yearFrom
                    ? ` · ${vehicle.yearFrom}${vehicle.yearTo ? `–${vehicle.yearTo}` : ""}`
                    : ""}
                </button>
              );
            })
          )}
        </div>

        {selectedVehicle ? (
          <div className="flex items-center gap-2 rounded-2xl bg-primary/15 px-4 py-2.5 text-sm font-medium text-secondary">
            <MdDirectionsCar className="h-4 w-4 text-primary" />
            Fitting: {selectedVehicle.make} {selectedVehicle.model}
            <span className="text-secondary/55">
              ·{" "}
              {isLoadingCompat
                ? "checking fitments…"
                : `${compatibleIds.size} compatible parts`}
            </span>
          </div>
        ) : null}
      </div>

      {/* Product search + filters — one compact row instead of a search bar
          plus two full-width chip rows, so brand/category selection doesn't
          eat vertical space when they're usually left on "All". */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-h-13 min-w-40 flex-1 items-center gap-3 rounded-2xl bg-black/5 px-4 shadow-sm">
          <MdSearch className="text-secondary/45" />
          <span className="sr-only">Search parts</span>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search or scan: SKU, part number, or OEM…"
            aria-label="Search parts"
            variant="secondary"
            className="w-full border-transparent bg-transparent px-0 py-0 text-base shadow-none outline-none focus:border-transparent focus:ring-0 placeholder:text-secondary/40"
          />
        </label>

        <FilterPopover
          label="Brand"
          value={activeBrand?.name ?? "All"}
          isActive={brandId !== "all"}
        >
          {(close) => (
            <div className="flex flex-col gap-0.5">
              <PopoverOption
                active={brandId === "all"}
                onClick={() => {
                  setBrandId("all");
                  close();
                }}
              >
                All brands
              </PopoverOption>
              {brands.map((brand) => (
                <PopoverOption
                  key={brand.id}
                  active={brandId === brand.id}
                  onClick={() => {
                    setBrandId(brand.id);
                    close();
                  }}
                >
                  {brand.name}
                </PopoverOption>
              ))}
            </div>
          )}
        </FilterPopover>

        <FilterPopover
          label="Category"
          value={activeCategory?.name ?? "All"}
          isActive={categoryId !== "all"}
        >
          {(close) => (
            <div className="flex flex-col gap-0.5">
              <PopoverOption
                active={categoryId === "all"}
                onClick={() => {
                  setCategoryId("all");
                  close();
                }}
              >
                All categories
              </PopoverOption>
              {categories.map((category) => (
                <PopoverOption
                  key={category.id}
                  active={categoryId === category.id}
                  onClick={() => {
                    setCategoryId(category.id);
                    close();
                  }}
                >
                  {category.name}
                </PopoverOption>
              ))}
            </div>
          )}
        </FilterPopover>

        <button
          type="button"
          onClick={() => setOnlyInStock((current) => !current)}
          className={`flex min-h-13 shrink-0 items-center gap-2 rounded-2xl px-4 text-sm font-semibold transition active:scale-95 ${
            onlyInStock
              ? "bg-secondary text-white shadow-sm"
              : "bg-black/5 text-secondary/60 hover:bg-black/10"
          }`}
        >
          <MdCheckCircle className="h-4 w-4" />
          In stock
        </button>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={() => {
              setBrandId("all");
              setCategoryId("all");
              setSelectedVehicle(null);
              setQuery("");
            }}
            className="flex min-h-13 shrink-0 items-center gap-1.5 rounded-2xl px-3 text-xs font-semibold text-secondary/50 transition hover:text-secondary active:scale-95"
          >
            <MdClose className="h-4 w-4" />
            Reset
          </button>
        ) : null}
      </div>

      {isLoadingCatalog ? (
        <LoadingState label="Loading the register…" />
      ) : productsError ? (
        <ErrorState message={productsError} onRetry={refetchProducts} />
      ) : (
        <div className="grid flex-1 gap-5 xl:grid-cols-[1fr_390px] min-h-fit">
          <section className="flex min-h-0 flex-col gap-4 rounded-3xl border border-black/5 bg-card p-4 shadow-sm md:p-5">
            <div className="col-span-full flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-secondary/45">
                {visibleProducts.length} parts
                {selectedVehicle ? " · fitted to vehicle" : ""}
              </p>
              <div className="flex items-center gap-2">
                {isSearching ? (
                  <span className="text-xs text-secondary/45">searching…</span>
                ) : null}
                <span className="text-xs text-secondary/45">
                  {onlyInStock ? "In stock only" : "All stock"} · Tap to add
                </span>
              </div>
            </div>

            {isLoadingProducts && products.length === 0 ? (
              <LoadingState label="Loading parts…" />
            ) : selectedVehicle && isLoadingCompat && products.length === 0 ? (
              <LoadingState label="Checking fitments…" />
            ) : visibleProducts.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="flex max-w-sm flex-col items-center gap-4 rounded-3xl bg-black/3 px-8 py-10 text-center">
                  <div className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <MdSearch className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-secondary">
                      No parts match
                    </p>
                    <p className="mt-1 text-xs text-secondary/45">
                      {selectedVehicle
                        ? "This vehicle has no compatible parts in the current filter."
                        : "Try a different search, brand, or category."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {selectedVehicle ? (
                      <button
                        type="button"
                        onClick={() => setSelectedVehicle(null)}
                        className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-white active:scale-95"
                      >
                        Clear vehicle
                      </button>
                    ) : null}
                    {query ? (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="rounded-full bg-black/5 px-4 py-2 text-xs font-semibold text-secondary/70 active:scale-95"
                      >
                        Clear search
                      </button>
                    ) : null}
                    {brandId !== "all" || categoryId !== "all" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setBrandId("all");
                          setCategoryId("all");
                        }}
                        className="rounded-full bg-black/5 px-4 py-2 text-xs font-semibold text-secondary/70 active:scale-95"
                      >
                        Clear brand & category
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid min-h-0 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
                {visibleProducts.map((product) => {
                  const out = product.quantity <= 0;
                  const low = !out && product.quantity <= LOW_STOCK_THRESHOLD;
                  const inCartQty = inCart(product.id);
                  return (
                    <div
                      key={product.id}
                      role="button"
                      tabIndex={out ? -1 : 0}
                      aria-disabled={out}
                      aria-label={`Add ${product.name}${out ? " (out of stock)" : ""}`}
                      onClick={() => add(product)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          add(product);
                        }
                      }}
                      className={`relative flex min-h-40 flex-col justify-between rounded-2xl border p-4 text-left transition active:scale-[.97] ${
                        out
                          ? "cursor-not-allowed border-black/5 bg-white opacity-50"
                          : justAddedId === product.id
                            ? "cursor-pointer border-primary bg-primary/15"
                            : selectedVehicle
                              ? "cursor-pointer border-primary/30 bg-primary/5 hover:border-primary/60"
                              : "cursor-pointer border-black/5 bg-white hover:border-primary hover:bg-primary/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="rounded-lg bg-black/5 px-2 py-1 text-[10px] font-semibold text-secondary/55">
                          {product.category?.name ?? "Part"}
                        </span>
                        <div className="flex shrink-0 items-center gap-1">
                          {selectedVehicle ? (
                            <MdCheckCircle className="h-4 w-4 text-primary" />
                          ) : null}
                          <button
                            type="button"
                            aria-label={`Set quantity for ${product.name}`}
                            disabled={out}
                            onClick={(event) => {
                              event.stopPropagation();
                              setQtyTarget(product);
                            }}
                            className="flex size-8 items-center justify-center rounded-lg bg-black/5 text-secondary/60 transition hover:bg-black/10 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <MdDialpad className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="line-clamp-2 font-semibold leading-snug text-secondary">
                          {product.name}
                        </p>
                        <p className="mt-1 truncate text-xs text-secondary/45">
                          {product.sku}
                          {product.brand ? ` · ${product.brand.name}` : ""}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-secondary">
                          {formatMoney(product.sellingPrice)}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        {inCartQty > 0 ? (
                          <button
                            type="button"
                            aria-label={`Edit quantity, currently ${inCartQty}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setQtyTarget(product);
                            }}
                            className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-secondary active:scale-90"
                          >
                            ×{inCartQty}
                          </button>
                        ) : (
                          <span />
                        )}
                        <span
                          className={`text-[10px] font-medium ${
                            out
                              ? "text-rose-600"
                              : low
                                ? "text-amber-600"
                                : "text-secondary/40"
                          }`}
                        >
                          {out
                            ? "Out of stock"
                            : `${product.quantity} in stock`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-4 rounded-3xl bg-secondary p-5 text-white shadow-sm pb-20 md:pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/50">Current order</p>
                <h2 className="text-xl font-semibold">New sale</h2>
              </div>
              <MdShoppingCart className="text-primary" />
            </div>

            <div className="flex min-h-13 items-center gap-3 rounded-2xl bg-white/10 px-4">
              <button
                type="button"
                aria-label="Add new customer"
                onClick={() => setIsAddingCustomer(true)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary transition hover:bg-primary/30 active:scale-90"
              >
                <MdPersonAdd className="h-4 w-4" />
              </button>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-xs text-white/50">Customer</span>
                <button
                  className="flex items-center justify-between gap-4"
                  onClick={() => setIsCustomersDialogOpen(true)}
                >
                  <span className="text-sm font-semibold">
                    {customerName ? customerName : "Walk-in customer"}
                  </span>
                  <BiChevronDown className="w-4 h-4" />
                </button>
                {/* <Select
                  selectedKey={customerId || null}
                  onSelectionChange={(key) =>
                    setCustomerId(key ? String(key) : "")
                  }
                  placeholder="Walk-in customer"
                  className="gap-0"
                  fullWidth
                >
                  <Select.Trigger className="min-h-0! bg-transparent! border-0! py-0! ps-0! pe-7! text-white! shadow-none!">
                    <Select.Value className="text-sm! font-semibold! text-white!" />
                    <Select.Indicator className="text-white/60" />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {customers.map((customer) => (
                        <ListBox.Item
                          key={customer.id}
                          id={customer.id}
                          textValue={customer.name}
                          className="text-black"
                        >
                          {customer.name}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select> */}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
              {entries.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-white/40">
                  <MdShoppingCart className="text-3xl" />
                  <p className="text-sm">Cart is empty</p>
                  <p className="max-w-55 text-xs text-white/30">
                    Search or scan a part, or select one from the grid, to add
                    it here.
                  </p>
                </div>
              ) : (
                entries.map(({ product, quantity }) => (
                  <div key={product.id} className="rounded-2xl bg-white/10 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {product.name}
                        </p>
                        <p className="text-xs text-white/50">{product.sku}</p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${product.name}`}
                        onClick={() => removeAll(product.id)}
                        className="text-white/60 transition hover:text-white"
                      >
                        <MdDeleteOutline />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-xl bg-white/10 p-1">
                        <button
                          type="button"
                          aria-label={`Remove one ${product.name}`}
                          className="flex size-11 items-center justify-center rounded-lg bg-white/10 active:scale-90"
                          onClick={() => removeOne(product.id)}
                        >
                          <MdRemove />
                        </button>
                        <button
                          type="button"
                          onClick={() => setQtyTarget(product)}
                          className="flex min-w-11 items-center justify-center rounded-lg bg-white/15 px-2 py-2 text-sm font-bold active:scale-90"
                          aria-label="Set quantity"
                        >
                          {quantity}
                        </button>
                        <button
                          type="button"
                          aria-label={`Add one more ${product.name}`}
                          className="flex size-11 items-center justify-center rounded-lg bg-primary text-secondary active:scale-90"
                          onClick={() => add(product)}
                        >
                          <MdAdd />
                        </button>
                      </div>
                      <span className="font-semibold">
                        {formatMoney(
                          String(
                            Number.parseFloat(product.sellingPrice) * quantity,
                          ),
                        )}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-white/15 pt-4 text-sm">
              <div className="flex justify-between text-white/50">
                <span>
                  Subtotal ({totalItems} item{totalItems === 1 ? "" : "s"})
                </span>
                <span>{formatMoney(String(subtotal))}</span>
              </div>
              <div className="flex items-center justify-between text-white/50">
                <span>Discount</span>
                {discountAmount > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-white">
                      -{formatMoney(String(discountAmount))}
                    </span>
                    <button
                      type="button"
                      aria-label="Edit discount"
                      onClick={() => setIsDiscountOpen(true)}
                      className="text-primary"
                    >
                      <MdDialpad className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Remove discount"
                      onClick={() => setDiscountCents(0)}
                      className="text-white/40 hover:text-white"
                    >
                      <MdClose className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsDiscountOpen(true)}
                    disabled={subtotal <= 0}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary disabled:opacity-40"
                  >
                    <MdLocalOffer className="h-3.5 w-3.5" />
                    Add
                  </button>
                )}
              </div>
              <div className="flex justify-between text-white/50">
                <span>Tax</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>Est. total</span>
                <span>{formatMoney(String(estimatedTotal))} + tax</span>
              </div>
              <button
                type="button"
                onClick={checkout}
                disabled={!entries.length || isCheckingOut}
                className="mt-2 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-secondary active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isCheckingOut
                  ? "Processing…"
                  : `Charge ${formatMoney(String(estimatedTotal))}`}
              </button>
            </div>
          </aside>
        </div>
      )}

      {qtyTarget ? (
        <QtyModal
          product={qtyTarget}
          initialQuantity={inCart(qtyTarget.id) || 1}
          onClose={() => setQtyTarget(null)}
          onSet={(quantity) => {
            setQuantity(qtyTarget, quantity);
            setQtyTarget(null);
          }}
        />
      ) : null}

      {isDiscountOpen ? (
        <DiscountModal
          initialCents={effectiveDiscountCents}
          maxAmount={subtotal}
          onClose={() => setIsDiscountOpen(false)}
          onSet={(cents) => {
            setDiscountCents(cents);
            setIsDiscountOpen(false);
          }}
        />
      ) : null}

      {isAddingCustomer ? (
        <AddCustomerModal
          onClose={() => setIsAddingCustomer(false)}
          onCreate={createCustomer}
        />
      ) : null}

      {isCustomersDialogOpen && (
        <CustomersModal
          isOpen={isCustomersDialogOpen}
          onClose={() => setIsCustomersDialogOpen(false)}
          setCustomerId={setCustomerId}
          setCustomerName={setCustomerName}
        />
      )}

      {completedSale ? (
        <PaymentModal
          sale={completedSale}
          title="Complete payment"
          onClose={() => {
            setCompletedSale(null);
            clearCart();
            refetchProducts();
          }}
          onPaid={async (amount, method, reference, notes) => {
            await secureAxios.post("/payments", {
              saleId: completedSale.id,
              amount,
              paymentMethod: method,
              reference: reference || undefined,
              notes: notes || undefined,
            });
            setCompletedSale(null);
            clearCart();
            refetchProducts();
          }}
        />
      ) : null}
    </div>
  );
}

function FilterPopover({
  label,
  value,
  isActive,
  children,
}: {
  label: string;
  value: string;
  isActive: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex min-h-13 shrink-0 items-center gap-1.5 rounded-2xl px-4 text-sm font-semibold transition active:scale-95 ${
          isActive
            ? "bg-secondary text-white shadow-sm"
            : "bg-black/5 text-secondary/60 hover:bg-black/10"
        }`}
      >
        <span className={isActive ? "text-white/50" : "text-secondary/40"}>
          {label}
        </span>
        {value}
        <MdExpandMore
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-20 max-h-72 w-64 overflow-y-auto rounded-2xl border border-black/5 bg-white p-2 shadow-lg">
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

function PopoverOption({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 items-center rounded-xl px-3 text-left text-sm font-medium transition active:scale-[.98] ${
        active
          ? "bg-secondary text-white"
          : "text-secondary/70 hover:bg-black/5"
      }`}
    >
      {children}
    </button>
  );
}

function QtyModal({
  product,
  initialQuantity,
  onClose,
  onSet,
}: {
  product: Product;
  initialQuantity: number;
  onClose: () => void;
  onSet: (quantity: number) => void;
}) {
  const [input, setInput] = useState(String(initialQuantity));
  const [error, setError] = useState<string | null>(null);

  const append = (digit: string) => {
    setError(null);
    setInput((current) => {
      if (current === "0") return digit;
      const next = current + digit;
      return next.length > 4 ? current : next;
    });
  };

  const backspace = () => {
    setError(null);
    setInput((current) => current.slice(0, -1));
  };

  const clear = () => {
    setError(null);
    setInput("");
  };

  const submit = () => {
    const quantity = input === "" ? 0 : Number.parseInt(input, 10);
    if (!Number.isInteger(quantity) || quantity < 0) {
      setError("Enter a whole number, or clear it to remove.");
      return;
    }
    if (quantity > product.quantity) {
      setError(`Only ${product.quantity} in stock.`);
      return;
    }
    onSet(quantity);
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      icon={<MdShoppingCart className="h-5 w-5" />}
      title={`Quantity · ${product.name}`}
      subtitle={`${product.quantity} in stock · ${formatMoney(product.sellingPrice)} each`}
      size="sm"
    >
      <div className="flex flex-col gap-3">
        <div className="w-full text-center text-5xl font-bold tracking-tight text-secondary">
          {input || "0"}
        </div>
        {error ? (
          <p className="text-center text-xs font-medium text-rose-600">
            {error}
          </p>
        ) : null}
        <Keypad
          onDigit={append}
          onBackspace={backspace}
          onClear={clear}
          onSubmit={submit}
          submitLabel={
            input === "" || input === "0" ? "Remove from cart" : "Set quantity"
          }
        />
      </div>
    </AppModal>
  );
}

function DiscountModal({
  initialCents,
  maxAmount,
  onClose,
  onSet,
}: {
  initialCents: number;
  maxAmount: number;
  onClose: () => void;
  onSet: (cents: number) => void;
}) {
  const [digits, setDigits] = useState(
    initialCents > 0 ? String(initialCents) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const amount = (Number.parseInt(digits || "0", 10) || 0) / 100;

  const append = (digit: string) => {
    setError(null);
    setDigits((current) => (current.length >= 6 ? current : current + digit));
  };

  const backspace = () => {
    setError(null);
    setDigits((current) => current.slice(0, -1));
  };

  const clear = () => {
    setError(null);
    setDigits("");
  };

  const submit = () => {
    if (amount > maxAmount) {
      setError(
        `Discount can't exceed the subtotal of ${formatMoney(String(maxAmount))}.`,
      );
      return;
    }
    onSet(Number.parseInt(digits || "0", 10));
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      icon={<MdLocalOffer className="h-5 w-5" />}
      title="Add a discount"
      subtitle={`Up to ${formatMoney(String(maxAmount))} off this sale`}
      size="sm"
    >
      <div className="flex flex-col gap-3">
        <div className="w-full text-center text-5xl font-bold tracking-tight text-secondary">
          {formatMoney(String(amount))}
        </div>
        <p className="text-center text-xs text-secondary/45">
          Digits fill in from the right — the last two are cents.
        </p>
        {error ? (
          <p className="text-center text-xs font-medium text-rose-600">
            {error}
          </p>
        ) : null}
        <Keypad
          onDigit={append}
          onBackspace={backspace}
          onClear={clear}
          onSubmit={submit}
          submitLabel={digits ? "Apply discount" : "Remove discount"}
        />
      </div>
    </AppModal>
  );
}

function AddCustomerModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, phone: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) {
      setError("Enter a customer name.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onCreate(name.trim(), phone.trim());
    } catch (err: unknown) {
      setError(apiErrorMessage(err, "Couldn't add this customer."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      icon={<MdPersonAdd className="h-5 w-5" />}
      title="New customer"
      subtitle="Save their details for this and future sales"
      size="sm"
    >
      <div className="flex flex-col gap-3">
        <Input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Full name"
          aria-label="Customer name"
        />
        <Input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Phone (optional)"
          aria-label="Customer phone"
          type="tel"
        />
        {error ? (
          <p className="text-xs font-medium text-rose-600">{error}</p>
        ) : null}
        <button
          type="button"
          onClick={submit}
          disabled={isSaving}
          className="mt-1 flex min-h-13 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-secondary active:scale-[.98] disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save customer"}
        </button>
      </div>
    </AppModal>
  );
}

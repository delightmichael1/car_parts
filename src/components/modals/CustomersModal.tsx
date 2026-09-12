import { BiUser } from "react-icons/bi";
import { MdSearch } from "react-icons/md";
import { useEffect, useState } from "react";
import { Button, Input, Skeleton } from "@heroui/react";
import { LuUserSearch } from "react-icons/lu";
import { AppModal } from "../shared/AppModal";
import { CustomersResponse } from "@/types/types";
import { useApiResource } from "@/hooks/useApiResource";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  setCustomerId?: (id: string) => void;
  setCustomerName?: (id: string) => void;
};

const CustomersModal: React.FC<Props> = (props) => {
  const [query, setQuery] = useState("");

  const { data, isLoading, error, refetch } = useApiResource(
    async (client) => {
      const response = await client.get<CustomersResponse>("/customers", {
        params: { page: 1, limit: 10, search: query },
      });
      return response.data;
    },
    () => "We couldn't load your customers right now.",
  );

  useEffect(() => {
    refetch();
  }, [query, refetch]);

  return (
    <AppModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      icon={<LuUserSearch className="w-5 h-5" />}
      title="Customers Search"
      subtitle="Search customers by name of client id"
    >
      <label className="flex min-h-11 max-w-md items-center gap-3 rounded-2xl bg-black/5 px-4">
        <MdSearch className="h-4 w-4 text-secondary/45" />
        <span className="sr-only">Search customers</span>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, code, phone, or email"
          aria-label="Search customers"
          variant="secondary"
          className="w-full border-transparent rounded-none bg-transparent px-0 py-0 text-sm shadow-none outline-none focus:border-transparent focus:ring-0 placeholder:text-secondary/40"
        />
      </label>
      {!isLoading &&
        data?.customers.map((customer) => (
          <button
            key={customer.id}
            onClick={() => {
              props.setCustomerId?.(customer.id);
              props.setCustomerName?.(customer.name);
              props.onClose();
            }}
            className="flex gap-2 items-center hover:bg-backdrop/10 duration-300 transition-all px-4 py-2 rounded-lg"
          >
            <BiUser className="w-10 h-10 rounded-full p-2 bg-primary/50" />
            <div className="flex flex-col items-start">
              <span className="text-black">{customer.name}</span>
              <span>{customer.email ?? customer.phone ?? "-"}</span>
            </div>
          </button>
        ))}
      {!isLoading && data?.customers.length === 0 && (
        <div className="flex flex-col py-10 gap-4 mx-auto items-center justify-center">
          <LuUserSearch className="w-10 h-10" />
          <span>No customers to display</span>
          {query !== "" && (
            <Button onClick={() => setQuery("")}>Clear search</Button>
          )}
        </div>
      )}
      {isLoading &&
        [1, 2, 3, 4, 5].map((n) => (
          <div className="flex items-center gap-2 px-4">
            <Skeleton key={n} className="w-10 h-10 rounded-full" />
            <div className="flex flex-col items-start gap-1">
              <Skeleton className="w-40 h-4 rounded-field" />
              <Skeleton className="w-30 h-4 rounded-field" />
            </div>
          </div>
        ))}
    </AppModal>
  );
};

export default CustomersModal;

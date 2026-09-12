import { User } from "@/types/types";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

const useUserStore = create<User>()(
  immer((set, get) => ({
    id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role_id: "",
    status: "",
    countryCode: "",
    created_at: "",
    updated_at: "",
    online: false,
    role: undefined,
  })),
);

export default useUserStore;

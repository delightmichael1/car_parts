import { User } from "@/types/types";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface UserStore extends User {}

const useUserStore = create<UserStore>()(
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
  })),
);

export default useUserStore;

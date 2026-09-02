import { BsFillBellFill } from "react-icons/bs";
import { IoIosMail } from "react-icons/io";

function TopBar() {
  return (
    <div className="flex h-20 w-full items-center justify-between px-2">
      {/* Page heading / breadcrumb */}
      <div>
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-gray-500">Here's what's happening today.</p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-strokedark bg-card text-black p-2 transition hover:bg-card-2"
        >
          <BsFillBellFill className="w-full h-full" />
        </button>

        <button
          type="button"
          className="flex h-10 w-10 items-center p-1 text-black justify-center rounded-full border border-strokedark bg-card transition hover:bg-card-2"
        >
          <IoIosMail className="w-full h-full" />
        </button>
      </div>
    </div>
  );
}

export default TopBar;

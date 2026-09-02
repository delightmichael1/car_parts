import { RiShieldCheckLine, RiArrowDownLine } from "react-icons/ri";

function AuthHero() {
  return (
    <div className="relative hidden h-full w-full overflow-hidden rounded-3xl bg-[#0B0D08] p-10 lg:flex lg:w-[46%] lg:flex-col lg:justify-between">
      {/* grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />
      {/* glow */}
      <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#C6FF3D] opacity-25 blur-[90px]" />

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#C6FF3D] text-sm font-bold text-black">
            P
          </div>
          <span className="text-sm font-medium text-white">PartsDesk</span>
        </div>
        <span className="text-xs text-white/50">
          Counter sales, stock &amp; quotations
        </span>
      </div>

      <div className="relative z-10">
        <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
          Built for the parts counter
        </span>
        <h1 className="text-[2.6rem] font-extrabold leading-[1.05] text-white">
          Every part priced.
          <br />
          Every sale <span className="text-[#C6FF3D]">accounted for.</span>
        </h1>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
          Quote a job, complete the sale, and watch stock adjust itself. One
          system for the counter, the warehouse, and the books.
        </p>
      </div>

      {/* floating status cards, echoing the reference composition */}
      <div className="relative z-10 mt-10 h-40">
        <div className="absolute left-4 top-6 w-72 rounded-2xl border border-white/10 bg-[#14170F]/90 p-4 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>Sale · INV-000482</span>
            <span className="rounded-full bg-[#C6FF3D]/15 px-2 py-0.5 font-medium text-[#C6FF3D]">
              Completed
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                3 items · Toyota Hilux brake set
              </p>
              <p className="text-xs text-white/40">Paid in full · ECOCASH</p>
            </div>
            <RiShieldCheckLine className="h-5 w-5 text-[#C6FF3D]" />
          </div>
        </div>

        <div className="absolute left-16 top-24 flex w-60 items-center justify-between rounded-2xl border border-white/10 bg-[#14170F]/90 p-4 shadow-2xl backdrop-blur">
          <div>
            <p className="text-xs text-white/50">Low stock</p>
            <p className="text-sm font-semibold text-white">
              Brake pads · 2 left
            </p>
          </div>
          <RiArrowDownLine className="h-5 w-5 text-orange-400" />
        </div>
      </div>
    </div>
  );
}

export default AuthHero;

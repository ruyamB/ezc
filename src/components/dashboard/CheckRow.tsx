import { CheckCircle, CircleDashed, XCircle } from "@phosphor-icons/react";

export default function CheckRow({
  state,
  title,
  body,
  action,
}: {
  state: "pass" | "fail" | "wait";
  title: string;
  body: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-2xl bg-paper p-4 dark:bg-white/[0.04]">
      <span className="mt-0.5">
        {state === "pass" ? (
          <CheckCircle size={22} weight="fill" className="text-accent-deep dark:text-emerald-400" />
        ) : state === "fail" ? (
          <XCircle size={22} weight="fill" className="text-red-500 dark:text-red-400" />
        ) : (
          <CircleDashed size={22} weight="regular" className="text-muted dark:text-fog" />
        )}
      </span>
      <div className="min-w-52 flex-1">
        <p className="text-[14.5px] font-bold">{title}</p>
        <div className="mt-0.5 text-[13px] leading-relaxed text-inksoft dark:text-fog">{body}</div>
        {action && <div className="mt-2.5">{action}</div>}
      </div>
    </div>
  );
}

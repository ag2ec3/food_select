"use client";

import { Geist_Mono } from "next/font/google";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/Button";

const geistMono = Geist_Mono({
  subsets: ["latin"],
});

type TeamJoinModalProps = {
  open: boolean;
  onClose: () => void;
  onJoin: (
    inviteCode: string,
  ) =>
    | Promise<{ ok: true } | { ok: false; message: string }>
    | { ok: true }
    | { ok: false; message: string };
};

export function TeamJoinModal({ open, onClose, onJoin }: TeamJoinModalProps) {
  const titleId = useId();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCode("");
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await Promise.resolve(onJoin(code));
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/40"
        aria-label="닫기"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-lg"
      >
        <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
          팀 참가하기
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          팀에서 공유한 초대 코드(예: INV-XXXXXX)를 입력하세요.
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label
              htmlFor="team-join-code"
              className="block text-sm font-medium text-zinc-700"
            >
              초대 코드
            </label>
            <input
              id="team-join-code"
              name="inviteCode"
              type="text"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={`mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 ${geistMono.className}`}
              placeholder="DESIGN2025"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button type="submit">참가</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

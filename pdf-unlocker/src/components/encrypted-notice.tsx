"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { isPdfEncrypted } from "@/lib/pdf-utils";

export function EncryptedNotice({ file }: { file: File | null }) {
  const [encrypted, setEncrypted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setEncrypted(false);
    if (!file) return;
    isPdfEncrypted(file).then((v) => {
      if (!cancelled) setEncrypted(v);
    });
    return () => {
      cancelled = true;
    };
  }, [file]);

  if (!file || !encrypted) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-[#3d2828] bg-[#1a1010] px-4 py-3 text-xs text-[#e0b4b4]">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <p>
        This PDF appears password-protected.{" "}
        <Link href="/unlock" className="font-medium underline hover:text-[#f2efe9]">
          Unlock it first
        </Link>{" "}
        before using this tool.
      </p>
    </div>
  );
}

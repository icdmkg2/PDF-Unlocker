"use client";

import { useState, useSyncExternalStore } from "react";
import { KeyRound, Eye, EyeOff, Pencil, Trash2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  type SavedPassword,
  clearPasswords,
  deletePassword,
  getSavedPasswords,
  getServerSnapshot,
  renamePassword,
  sortForUse,
  subscribe,
} from "@/lib/saved-passwords";

export function useSavedPasswords(): SavedPassword[] {
  return sortForUse(useSyncExternalStore(subscribe, getSavedPasswords, getServerSnapshot));
}

/** Chips for filling a password field from saved ones, plus a manage list. */
export function SavedPasswordPicker({
  onPick,
  selected,
}: {
  onPick: (password: string) => void;
  selected?: string;
}) {
  const saved = useSavedPasswords();
  const [managing, setManaging] = useState(false);

  if (saved.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Saved passwords</p>
        <button
          type="button"
          onClick={() => setManaging((m) => !m)}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {managing ? "Done" : "Manage"}
        </button>
      </div>

      {managing ? (
        <ManageList saved={saved} />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {saved.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p.password)}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                selected === p.password
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
              )}
            >
              <KeyRound className="h-3 w-3 shrink-0" />
              <span className="truncate">{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ManageList({ saved }: { saved: SavedPassword[] }) {
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {saved.map((p) => (
          <ManageRow key={p.id} entry={p} />
        ))}
      </ul>
      <div className="flex items-center justify-end gap-3 text-xs">
        {confirmClear ? (
          <>
            <span className="text-muted-foreground">Forget all {saved.length}?</span>
            <button type="button" onClick={() => clearPasswords()} className="text-destructive hover:underline">
              Forget all
            </button>
            <button type="button" onClick={() => setConfirmClear(false)} className="text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmClear(true)} className="text-muted-foreground hover:text-destructive">
            Forget all saved passwords
          </button>
        )}
      </div>
    </div>
  );
}

function ManageRow({ entry }: { entry: SavedPassword }) {
  const [reveal, setReveal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(entry.name);

  const commit = () => {
    renamePassword(entry.id, name);
    setEditing(false);
  };

  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <div className="min-w-0 flex-1">
        {editing ? (
          <Input
            id={`rename-${entry.id}`}
            aria-label="Password name"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="h-7 text-sm"
          />
        ) : (
          <p className="truncate text-sm text-foreground">{entry.name}</p>
        )}
        <p className="truncate font-mono text-[11px] text-muted-foreground">
          {reveal ? entry.password : "•".repeat(Math.min(entry.password.length, 12))}
        </p>
      </div>
      {editing ? (
        <>
          <IconButton label="Save name" onClick={commit}><Check className="h-3.5 w-3.5" /></IconButton>
          <IconButton label="Cancel" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5" /></IconButton>
        </>
      ) : (
        <>
          <IconButton label={reveal ? "Hide password" : "Show password"} onClick={() => setReveal((r) => !r)}>
            {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </IconButton>
          <IconButton label="Rename" onClick={() => { setName(entry.name); setEditing(true); }}>
            <Pencil className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="Forget" onClick={() => deletePassword(entry.id)} danger>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </>
      )}
    </li>
  );
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted",
        danger ? "hover:text-destructive" : "hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export interface RememberChoice {
  remember: boolean;
  name: string;
}

/** Opt-in control: off by default, asks for a name once turned on. */
export function RememberPassword({
  id,
  value,
  onChange,
}: {
  id: string;
  value: RememberChoice;
  onChange: (v: RememberChoice) => void;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={`${id}-remember`} className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <input
          id={`${id}-remember`}
          type="checkbox"
          checked={value.remember}
          onChange={(e) => onChange({ ...value, remember: e.target.checked })}
          className="h-4 w-4 accent-[var(--paper)]"
        />
        Remember this password on this device
      </label>
      {value.remember && (
        <div className="space-y-1.5 pl-6">
          <Input
            id={`${id}-name`}
            aria-label="Name for this password"
            placeholder="Name it, e.g. Bank statements"
            value={value.name}
            maxLength={60}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Stored only in this browser, never uploaded. It is not encrypted, so anyone using this
            browser profile could see it. You can forget it any time.
          </p>
        </div>
      )}
    </div>
  );
}

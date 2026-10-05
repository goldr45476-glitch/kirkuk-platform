"use client";

import { Store, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { normalizeIraqiPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Tab = "phone" | "email";
type AccountType = "user" | "owner";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({ t, explicitNext, initialType, configured }: { t: Dictionary["auth"]; explicitNext: string | null; initialType: AccountType; configured: boolean }) {
  const router = useRouter();
  const [type, setType] = useState<AccountType>(initialType);
  // Owners land on their dashboard, regular users on the home feed (unless the visitor came from a specific page).
  const next = explicitNext ?? (type === "owner" ? "/dashboard" : "/");
  const meta = { account_type: type };
  const [tab, setTab] = useState<Tab>("phone");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // phone flow
  const [phone, setPhone] = useState("");
  const [e164, setE164] = useState<string | null>(null);
  const [code, setCode] = useState("");
  // email flow
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false);

  const done = () => { router.replace(next); router.refresh(); };
  const run = (fn: () => Promise<void>) => { setError(null); setInfo(null); start(fn); };

  const sendCode = () => run(async () => {
    const n = normalizeIraqiPhone(phone);
    if (!n) return setError(t.invalidPhone);
    const { error } = await createClient().auth.signInWithOtp({ phone: n, options: { data: meta } });
    if (error) return setError(error.message);
    setE164(n);
  });

  const verify = () => run(async () => {
    if (!/^\d{6}$/.test(code) || !e164) return setError(t.invalidCode);
    const { error } = await createClient().auth.verifyOtp({ phone: e164, token: code, type: "sms" });
    if (error) return setError(t.invalidCode);
    done();
  });

  const emailSubmit = () => run(async () => {
    if (!EMAIL_RE.test(email)) return setError(t.invalidEmail);
    if (password.length < 8) return setError(t.shortPassword);
    const supabase = createClient();
    if (signup) {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: meta, emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) return setError(error.message);
      if (!data.session) return setInfo(t.checkEmail);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return setError(error.message);
    }
    done();
  });

  const google = () => run(async () => {
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) setError(error.message);
  });

  const picker = (
    <fieldset className="space-y-2">
      <legend className="mb-2 block text-center text-sm font-bold">{t.typeLabel}</legend>
      <div className="grid grid-cols-2 gap-2">
        {([["user", User, t.typeUser, t.typeUserHint], ["owner", Store, t.typeOwner, t.typeOwnerHint]] as const).map(([k, Icon, label, hint]) => (
          <button key={k} type="button" aria-pressed={type === k} onClick={() => setType(k)}
            className={cn("flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center transition", type === k ? "border-primary bg-primary/8 shadow-sm shadow-primary/15" : "border-border bg-card hover:bg-muted")}>
            <span className={cn("grid size-10 place-items-center rounded-xl", type === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}><Icon className="size-5" aria-hidden /></span>
            <span className="text-sm font-extrabold leading-tight">{label}</span>
            <span className="text-[11px] leading-snug text-muted-foreground">{hint}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );

  if (!configured) return <p role="alert" className="rounded-lg bg-accent/15 p-4 text-sm font-semibold">{t.notConfigured}</p>;

  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-extrabold">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{type === "owner" ? t.ownerSubtitle : t.subtitle}</p>
      </div>
      {picker}
      <div role="tablist" className="grid grid-cols-2 rounded-xl bg-muted p-1">
        {(["phone", "email"] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setError(null); setInfo(null); }}
            className={cn("h-10 rounded-lg text-sm font-bold transition", tab === k ? "bg-card shadow-sm" : "text-muted-foreground")}>
            {k === "phone" ? t.tabPhone : t.tabEmail}
          </button>
        ))}
      </div>

      {tab === "phone" && !e164 && (
        <form onSubmit={(e) => { e.preventDefault(); sendCode(); }} className="space-y-3">
          <div>
            <Label htmlFor="phone">{t.phone}</Label>
            <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder={t.phoneHint} value={phone} onChange={(e) => setPhone(e.target.value)} className="text-start" />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>{t.sendCode}</Button>
        </form>
      )}

      {tab === "phone" && e164 && (
        <form onSubmit={(e) => { e.preventDefault(); verify(); }} className="space-y-3">
          <p className="text-sm text-muted-foreground">{t.codeHint} <bdi dir="ltr" className="font-bold text-foreground">{e164}</bdi></p>
          <div>
            <Label htmlFor="code">{t.code}</Label>
            <Input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} dir="ltr" value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="text-center text-xl tracking-[0.5em]" autoFocus />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>{t.verify}</Button>
          <div className="flex justify-between text-sm">
            <button type="button" className="font-semibold text-primary" onClick={() => { setE164(null); setCode(""); }}>{t.changeNumber}</button>
            <button type="button" className="font-semibold text-primary" onClick={sendCode} disabled={pending}>{t.resend}</button>
          </div>
        </form>
      )}

      {tab === "email" && (
        <form onSubmit={(e) => { e.preventDefault(); emailSubmit(); }} className="space-y-3">
          <div>
            <Label htmlFor="email">{t.email}</Label>
            <Input id="email" type="email" autoComplete="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} className="text-start" />
          </div>
          <div>
            <Label htmlFor="password">{t.password}</Label>
            <Input id="password" type="password" autoComplete={signup ? "new-password" : "current-password"} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} className="text-start" />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>{signup ? t.signUp : t.signIn}</Button>
          <p className="text-center text-sm text-muted-foreground">
            {signup ? t.haveAccount : t.noAccount}{" "}
            <button type="button" className="font-bold text-primary" onClick={() => setSignup(!signup)}>{signup ? t.signIn : t.signUp}</button>
          </p>
        </form>
      )}

      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p>}
      {info && <p role="status" className="rounded-lg bg-success/10 p-3 text-sm font-semibold text-success">{info}</p>}

      <div className="flex items-center gap-3 text-xs text-muted-foreground"><hr className="flex-1" />{t.or}<hr className="flex-1" /></div>
      <Button type="button" variant="outline" className="w-full" onClick={google} disabled={pending}>
        <svg viewBox="0 0 24 24" className="!size-5" aria-hidden><path fill="#4285F4" d="M23 12.3c0-.8-.1-1.5-.2-2.3H12v4.4h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.5z"/><path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.6 14.7a7.2 7.2 0 0 1 0-4.6v-3H1.8a12 12 0 0 0 0 10.6l3.8-3z"/><path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.8 7.1l3.8 3C6.5 6.8 9 4.8 12 4.8z"/></svg>
        {t.google}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t.terms}</p>
    </div>
  );
}

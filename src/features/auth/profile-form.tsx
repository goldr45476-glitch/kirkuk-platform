"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Profile } from "@/lib/types";
import { updateProfileAction, type ProfileState } from "@/app/(main)/account/actions";

export function ProfileForm({ profile, t, common }: { profile: Profile; t: Dictionary["account"]; common: Dictionary["common"] }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfileAction, {});
  const msg = state.error === "name" ? t.nameRequired : state.error === "username" ? t.usernameInvalid
    : state.error === "taken" ? t.usernameTaken : state.error === "generic" ? common.error : null;
  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="full_name">{t.fullName}</Label>
        <Input id="full_name" name="full_name" required defaultValue={profile.full_name} maxLength={80} autoComplete="name" />
      </div>
      <div>
        <Label htmlFor="username">{t.username}</Label>
        <Input id="username" name="username" defaultValue={profile.username ?? ""} dir="ltr" className="text-start" maxLength={30} autoCapitalize="none" />
      </div>
      <div>
        <Label htmlFor="bio">{t.bio}</Label>
        <Textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} maxLength={300} />
      </div>
      {msg && <p role="alert" className="text-sm font-semibold text-destructive">{msg}</p>}
      {state.ok && <p role="status" className="text-sm font-semibold text-success">{t.saved}</p>}
      <Button type="submit" disabled={pending}>{pending ? common.saving : common.save}</Button>
    </form>
  );
}

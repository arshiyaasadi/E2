"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/atoms/Alert";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Spinner } from "@/components/atoms/Spinner";
import { FormField } from "@/components/molecules/FormField";
import { AppTemplate } from "@/components/templates/AppTemplate";
import {
  useAddMemberMutation,
  useMembersQuery,
  useMyBusinessesQuery,
  useRemoveMemberMutation,
} from "@/features/businesses/queries";
import { handleApiError } from "@/lib/api/client";
import { ROUTES } from "@/config/routes";

export function MembersContent({ businessId }: { businessId: string }) {
  const t = useTranslations("businesses");
  const businesses = useMyBusinessesQuery();
  const members = useMembersQuery(businessId);
  const addMut = useAddMemberMutation(businessId);
  const removeMut = useRemoveMemberMutation(businessId);

  const [inviteCode, setInviteCode] = useState("");
  const [role, setRole] = useState<"MANAGER" | "ASSISTANT">("ASSISTANT");
  const [error, setError] = useState<string | null>(null);

  const current = businesses.data?.find((b) => b.business?.id === businessId);
  const businessName = current?.business?.name ?? t("membersTitle");

  return (
    <AppTemplate
      title={t("membersTitle")}
      crumbs={[
        { label: t("nav"), href: ROUTES.businesses },
        { label: businessName },
      ]}
    >
      <form
        className="mb-mol flex flex-col gap-mol rounded-2xl border border-border bg-surface p-pad-mol"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          try {
            await addMut.mutateAsync({
              inviteCode: inviteCode.trim(),
              role,
            });
            setInviteCode("");
          } catch (err) {
            setError(handleApiError(err));
          }
        }}
      >
        <FormField label={t("inviteCode")}>
          <Input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder={t("invitePlaceholder")}
            dir="ltr"
            required
            pattern="\d{8}"
          />
        </FormField>
        <FormField label={t("roleManager")}>
          <select
            className="w-full rounded-xl border border-border bg-surface px-pad-mol py-pad-atom-md text-sm"
            value={role}
            onChange={(e) =>
              setRole(e.target.value as "MANAGER" | "ASSISTANT")
            }
          >
            <option value="ASSISTANT">{t("roleAssistant")}</option>
            <option value="MANAGER">{t("roleManager")}</option>
          </select>
        </FormField>
        {error ? <Alert variant="error">{error}</Alert> : null}
        <Button type="submit" fullWidth loading={addMut.isPending}>
          {t("addMember")}
        </Button>
      </form>

      {members.isLoading ? (
        <div className="flex justify-center py-pad-org">
          <Spinner />
        </div>
      ) : (members.data?.length ?? 0) === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-pad-mol py-pad-org text-center text-sm text-muted">
          {t("membersEmpty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-atom-md">
          {members.data!.map((m) => (
            <li
              key={m.membershipId}
              className="flex items-center justify-between gap-mol rounded-xl border border-border bg-surface-2/50 p-pad-mol"
            >
              <div>
                <p className="font-medium text-foreground">
                  {m.displayName || m.inviteCode}
                </p>
                <p className="text-xs text-muted" dir="ltr">
                  {t("inviteCode")}: {m.inviteCode}
                </p>
                <p className="text-xs text-muted">
                  {m.role === "MANAGER" ? t("roleManager") : t("roleAssistant")}
                </p>
              </div>
              <Button
                size="sm"
                variant="danger"
                loading={removeMut.isPending}
                onClick={async () => {
                  await removeMut.mutateAsync(m.membershipId);
                }}
              >
                {t("removeMember")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </AppTemplate>
  );
}

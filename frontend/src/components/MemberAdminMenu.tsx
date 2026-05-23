import { useState } from "react";
import { Minus, Plus, UserX } from "lucide-react";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { haptic } from "@/hooks/useHaptic";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  groupId: string;
  member: { user_id: string; name: string };
  onChanged: () => void;        // refresh leaderboard / group after change
};

/**
 * Admin actions bottom sheet for a member. Owner-only.
 * Three actions: grant +1 point, reduce −1 point, remove from league.
 */
export function MemberAdminMenu({ open, onOpenChange, groupId, member, onChanged }: Props) {
  const { lang, t } = useI18n();
  const [busy, setBusy] = useState(false);

  const adjust = async (delta: 1 | -1) => {
    if (busy) return;
    setBusy(true);
    try {
      await api.groupAdjustPoints(groupId, member.user_id, delta);
      haptic(delta > 0 ? "success" : "medium");
      toast.success(delta > 0
        ? (lang === "he" ? `+1 נקודה ל-${member.name}` : `+1 point for ${member.name}`)
        : (lang === "he" ? `−1 נקודה ל-${member.name}` : `−1 point for ${member.name}`));
      onChanged();
      onOpenChange(false);
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message ?? "Error");
      haptic("error");
    } finally {
      setBusy(false);
    }
  };

  const kick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.groupKick(groupId, member.user_id);
      haptic("heavy");
      toast.success(lang === "he" ? `${member.name} הוסר` : `${member.name} removed`);
      onChanged();
      onOpenChange(false);
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message ?? "Error");
      haptic("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={lang === "he" ? `ניהול: ${member.name}` : `Manage: ${member.name}`}
    >
      <div className="space-y-2">
        <Button
          onClick={() => adjust(1)}
          disabled={busy}
          size="lg"
          className="press ripple w-full justify-start gap-3 bg-success/15 text-success hover:bg-success/25"
        >
          <Plus className="h-5 w-5" />
          <span className="font-bold">
            {lang === "he" ? "הוסף נקודה" : "Grant +1 point"}
          </span>
        </Button>

        <Button
          onClick={() => adjust(-1)}
          disabled={busy}
          size="lg"
          variant="secondary"
          className="press ripple w-full justify-start gap-3"
        >
          <Minus className="h-5 w-5" />
          <span className="font-bold">
            {lang === "he" ? "הפחת נקודה" : "Reduce −1 point"}
          </span>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="lg"
              disabled={busy}
              className="press ripple w-full justify-start gap-3 bg-destructive/15 text-destructive hover:bg-destructive/25"
            >
              <UserX className="h-5 w-5" />
              <span className="font-bold">
                {lang === "he" ? "הסר מהליגה" : "Remove from league"}
              </span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {lang === "he" ? `הסרת ${member.name}` : `Remove ${member.name}`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("kickConfirm")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("decline")}</AlertDialogCancel>
              <AlertDialogAction onClick={kick} className="bg-destructive text-destructive-foreground">
                {lang === "he" ? "הסר" : "Remove"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Sheet>
  );
}

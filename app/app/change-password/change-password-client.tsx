"use client";

import { useState, useTransition } from "react";
import { KeyRound, Lock, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { changePassword } from "@/src/actions/profile";

export function ChangePasswordClient() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ currentPassword?: string; newPassword?: string; confirmPassword?: string; _errors?: string[] }>({});

  function validateForm() {
    const newErrors: typeof errors = {};
    let isValid = true;

    if (!currentPassword.trim()) {
      newErrors.currentPassword = "Vui lòng nhập mật khẩu hiện tại";
      isValid = false;
    }

    if (!newPassword) {
      newErrors.newPassword = "Vui lòng nhập mật khẩu mới";
      isValid = false;
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Mật khẩu mới phải có ít nhất 8 ký tự";
      isValid = false;
    } else if (!/[A-Z]/.test(newPassword)) {
      newErrors.newPassword = "Mật khẩu phải chứa ít nhất 1 chữ hoa";
      isValid = false;
    } else if (!/[a-z]/.test(newPassword)) {
      newErrors.newPassword = "Mật khẩu phải chứa ít nhất 1 chữ thường";
      isValid = false;
    } else if (!/[0-9]/.test(newPassword)) {
      newErrors.newPassword = "Mật khẩu phải chứa ít nhất 1 số";
      isValid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu mới";
      isValid = false;
    } else if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) return;

    startTransition(async () => {
      const result = await changePassword({
        currentPassword,
        newPassword,
      });

      if (result.success) {
        toast.success("Đổi mật khẩu thành công!", {
          description: "Bạn có thể đăng nhập lại với mật khẩu mới.",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        router.push("/profile");
        router.refresh();
      } else {
        toast.error(result.error, {
          icon: <AlertCircle className="h-4 w-4" />,
        });
        setErrors({ _errors: result.error ? [result.error] : undefined });
      }
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-indigo-50/30">
      <div className="container mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <KeyRound className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Đổi mật khẩu</CardTitle>
            <CardDescription className="text-base">
              Bảo vệ tài khoản của bạn bằng mật khẩu mạnh
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {errors._errors && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{errors._errors[0]}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="currentPassword">
                    Mật khẩu hiện tại <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="currentPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Nhập mật khẩu hiện tại"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={isPending}
                      className="pl-9"
                      aria-invalid={Boolean(errors.currentPassword)}
                    />
                  </div>
                  {errors.currentPassword ? (
                    <p className="text-xs text-destructive">{errors.currentPassword}</p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="newPassword">
                    Mật khẩu mới <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mật khẩu mạnh (8+ ký tự, chữ hoa, chữ thường, số)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isPending}
                      className="pl-9"
                      aria-invalid={Boolean(errors.newPassword)}
                    />
                  </div>
                  {errors.newPassword ? (
                    <p className="text-xs text-destructive">{errors.newPassword}</p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">
                    Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Nhập lại mật khẩu mới"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isPending}
                      className="pl-9"
                      aria-invalid={Boolean(errors.confirmPassword)}
                    />
                  </div>
                  {errors.confirmPassword ? (
                    <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="showPassword"
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  disabled={isPending}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                <label htmlFor="showPassword" className="text-sm text-muted-foreground">
                  Hiện mật khẩu
                </label>
              </div>

              <div className="grid gap-3">
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Đang thay đổi...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4" />
                      Cập nhật mật khẩu
                    </span>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between border-t pt-4 text-sm">
                <Link href="/profile" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Quay lại hồ sơ
                </Link>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Đổi mật khẩu an toàn</span>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
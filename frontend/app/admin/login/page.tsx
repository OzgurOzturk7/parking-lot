"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock, LogIn } from "lucide-react";
import { api, ApiError, auth } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username || !password) {
      toast.warning("Enter username and password");
      return;
    }
    setLoading(true);
    try {
      const r = await api.login(username.trim(), password);
      auth.set(r.access_token);
      toast.success("Signed in");
      router.push("/admin");
    } catch (e) {
      const err = e as ApiError;
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center">
      <Card>
        <CardContent className="space-y-6 p-7">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Admin sign in</h1>
            <p className="text-sm text-muted-foreground">
              The flagged plates registry is protected. Sign in to continue.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="u">Username</Label>
              <Input
                id="u"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="admin"
                autoComplete="username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p">Password</Label>
              <Input
                id="p"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <Button className="w-full" onClick={submit} disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
              <LogIn className="h-3.5 w-3.5" />
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Demo credentials: <span className="font-mono">admin / admin123</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

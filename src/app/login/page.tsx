"use client";

import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Lock, Mail, ShoppingBag } from "lucide-react";
import { Capacitor, PluginListenerHandle } from "@capacitor/core";
import { App } from "@capacitor/app";
import api from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

type FirebaseDeps = {
  auth: import("firebase/auth").Auth | null;
  googleProvider: import("firebase/auth").GoogleAuthProvider | null;
  signInWithPopup: typeof import("firebase/auth").signInWithPopup;
  signInWithRedirect: typeof import("firebase/auth").signInWithRedirect;
  getRedirectResult: typeof import("firebase/auth").getRedirectResult;
  signInWithEmailAndPassword: typeof import("firebase/auth").signInWithEmailAndPassword;
};

async function loadFirebaseDeps(): Promise<FirebaseDeps> {
  const [{ auth, googleProvider }, authModule] = await Promise.all([
    import("@/lib/firebase"),
    import("firebase/auth"),
  ]);

  return {
    auth,
    googleProvider,
    signInWithPopup: authModule.signInWithPopup,
    signInWithRedirect: authModule.signInWithRedirect,
    getRedirectResult: authModule.getRedirectResult,
    signInWithEmailAndPassword: authModule.signInWithEmailAndPassword,
  };
}

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Please enter your password"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, user } = useAuth();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema) as Resolver<LoginFormData>,
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (user) {
      navigate("/pos", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      let listener: PluginListenerHandle;
      const setupListener = async () => {
        listener = await App.addListener("appUrlOpen", async (event) => {
          if (event.url.startsWith("one.shomaj.supershop://")) {
            try {
              const { auth, getRedirectResult } = await loadFirebaseDeps();
              if (!auth) {
                setError("Google authentication not configured");
                return;
              }

              const result = await getRedirectResult(auth!);
              if (result) {
                const idToken = await result.user.getIdToken();
                const response = await api.post("/auth/firebase", { idToken });
                const data = response.data;

                if (data?.user && data?.accessToken) {
                  localStorage.setItem("accessToken", data.accessToken);
                  login(data.user);

                  if (data.user.tenantId) {
                    try {
                      const tenantResponse = await api.get("/tenants/me");
                      if (tenantResponse.data) {
                        localStorage.setItem("tenant", JSON.stringify(tenantResponse.data));
                      }
                    } catch {}
                  }

                  navigate("/pos");
                } else {
                  localStorage.removeItem("accessToken");
                  localStorage.removeItem("user");
                  localStorage.removeItem("tenant");
                  setError("Login failed: Access token missing from API response");
                }
              }
            } catch {
              setError("Google sign-in failed");
            }
          }
        });
      };

      setupListener();
      return () => { if (listener) listener.remove(); };
    }
  }, [navigate, login]);

  if (user && !loading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Redirecting...</p>
        </div>
      </main>
    );
  }

  const submit = async (values: LoginFormData) => {
    const { auth, signInWithEmailAndPassword } = await loadFirebaseDeps();
    if (!auth) { setError("Authentication not configured"); return; }

    setError(null);
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const idToken = await userCredential.user.getIdToken();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const response = await api.post("/auth/firebase", { idToken });
      const data = response.data;
      const accessToken = data?.accessToken;
      const userData = data?.user;

      if (userData && accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        login(data.user);
        if (data.user.tenantId) fetchTenantInfo();
        navigate("/pos");
      } else {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        localStorage.removeItem("tenant");
        const errorMsg = !data ? "No response data" : !data.accessToken ? "Missing accessToken" : "Missing user data";
        setError(`Login failed: ${errorMsg}. Please try again or contact support.`);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantInfo = async () => {
    try {
      const tenantResponse = await api.get("/tenants/me");
      if (tenantResponse.data) {
        localStorage.setItem("tenant", JSON.stringify(tenantResponse.data));
      }
    } catch {}
  };

  const handleGoogleSignIn = async () => {
    const { auth, googleProvider, signInWithPopup, signInWithRedirect } = await loadFirebaseDeps();

    if (!auth && !Capacitor.isNativePlatform()) {
      setError("Google authentication not configured");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      let idToken: string;

      if (Capacitor.isNativePlatform()) {
        if (!auth || !googleProvider) { setError("Google authentication not configured"); return; }
        await signInWithRedirect(auth, googleProvider);
        return;
      } else {
        if (!auth || !googleProvider) { setError("Google authentication not configured"); return; }
        const result = await signInWithPopup(auth, googleProvider);
        idToken = await result.user.getIdToken();
      }

      await new Promise((resolve) => setTimeout(resolve, 0));
      const response = await api.post("/auth/firebase", { idToken });
      const data = response.data;

      if (data?.user && data?.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        login(data.user);
        if (data.user.tenantId) fetchTenantInfo();
        navigate("/pos");
      } else {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        localStorage.removeItem("tenant");
        const errorMsg = !data ? "No response data" : !data.accessToken ? "Missing accessToken" : "Missing user data";
        setError(`Google sign-in failed: ${errorMsg}. Please try again or contact support.`);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-6">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
              <ShoppingBag className="text-2xl text-primary-foreground" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground mt-2">Sign in to access your shop dashboard</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6 rounded-lg">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="login-email"
                          aria-label="Email address"
                          placeholder="Enter your email"
                          autoComplete="email"
                          className="pl-10 h-12 rounded-lg"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type="password"
                          aria-label="Password"
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          className="pl-10 h-12 rounded-lg"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-12 rounded-lg font-semibold text-base" 
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-card text-muted-foreground font-medium">Or continue with</span>
            </div>
          </div>

          <Button
            variant="outline"
            aria-label="Sign in with Google"
            className="w-full h-12 rounded-lg font-semibold border-2 flex items-center justify-center gap-3"
            disabled={loading}
            onClick={handleGoogleSignIn}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.8055 10.2292C19.8055 9.55056 19.7501 8.86667 19.6306 8.19861H10.2002V12.0492H15.6014C15.3773 13.2911 14.6571 14.3898 13.6025 15.0875V17.5866H16.8251C18.7173 15.8449 19.8055 13.2728 19.8055 10.2292Z" fill="hsl(var(--brand-google-blue))" />
              <path d="M10.2002 20.0006C12.9516 20.0006 15.2727 19.1151 16.8296 17.5865L13.607 15.0874C12.7096 15.6972 11.5521 16.0428 10.2046 16.0428C7.54618 16.0428 5.28651 14.2828 4.48892 11.9165H1.16797V14.4923C2.75903 17.8695 6.30967 20.0006 10.2002 20.0006Z" fill="hsl(var(--brand-google-green))" />
              <path d="M4.48449 11.9165C4.04532 10.6746 4.04532 9.33008 4.48449 8.08818V5.51233H1.16797C-0.389324 8.66385 -0.389324 12.3408 1.16797 15.4923L4.48449 11.9165Z" fill="hsl(var(--brand-google-yellow))" />
              <path d="M10.2002 3.95805C11.6257 3.936 13.0035 4.47247 14.036 5.45722L16.8914 2.60178C15.1888 0.990498 12.9383 0.0808105 10.2002 0.104376C6.30967 0.104376 2.75903 2.23549 1.16797 5.51234L4.48449 8.08819C5.27764 5.71748 7.54174 3.95805 10.2002 3.95805Z" fill="hsl(var(--brand-google-red))" />
            </svg>
            <span className="text-foreground">Sign in with Google</span>
          </Button>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Secure login powered by SuperShop</p>
          </div>
        </div>
      </div>
    </main>
  );
}

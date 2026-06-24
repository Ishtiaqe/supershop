"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input, Button } from "@heroui/react";
import { User, Lock, ShoppingCart } from "lucide-react";
import { Capacitor, PluginListenerHandle } from "@capacitor/core";
import { App } from "@capacitor/app";
import api from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import AdBanner from "@/components/ads/AdBanner";
import { AD_SLOTS } from "@/config/ads";

// Validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

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

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, user } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.replace("/pos");
    }
  }, [user, router]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      let listener: PluginListenerHandle;
      const setupListener = async () => {
        listener = await App.addListener("appUrlOpen", async (event) => {
          if (event.url.startsWith("one.shomaj.supershop://")) {
            // Handle Firebase redirect
            try {
              const { auth, getRedirectResult } = await loadFirebaseDeps();
              if (!auth) {
                setError("Google authentication not configured");
                return;
              }

              const result = await getRedirectResult(auth!);
              if (result) {
                const idToken = await result.user.getIdToken();

                // Send token to backend
                const response = await api.post("/auth/firebase", {
                  idToken,
                });
                const data = response.data;

                if (data?.user && data?.accessToken) {
                  // Store access token only (refresh token is now in httpOnly cookie)
                  localStorage.setItem("accessToken", data.accessToken);

                  // Update auth state
                  login(data.user);

                  if (data.user.tenantId) {
                    try {
                      const tenantResponse = await api.get("/tenants/me");
                      if (tenantResponse.data) {
                        localStorage.setItem(
                          "tenant",
                          JSON.stringify(tenantResponse.data),
                        );
                      }
                    } catch (err) {
                      console.error("Failed to fetch tenant info:", err);
                    }
                  }
                } else {
                  localStorage.removeItem("accessToken");
                  localStorage.removeItem("user");
                  localStorage.removeItem("tenant");
                  setError(
                    "Login failed: Access token missing from API response",
                  );
                  return;
                }

                router.push("/pos");
              }
            } catch (err) {
              console.error("Redirect result error:", err);
              setError("Google sign-in failed");
            }
          }
        });
      };

      setupListener();

      return () => {
        if (listener) {
          listener.remove();
        }
      };
    }
  }, [router, login]);

  // Prevent form flicker if user is logged in
  if (user) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Redirecting...</p>
        </div>
      </main>
    );
  }

  const submit = async (values: LoginFormInputs) => {
    const { auth, signInWithEmailAndPassword } = await loadFirebaseDeps();

    if (!auth) {
      setError("Authentication not configured");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Firebase authentication (this can be slow)
      const userCredential = await signInWithEmailAndPassword(
        auth,
        values.email,
        values.password,
      );
      const idToken = await userCredential.user.getIdToken();

      // Allow UI to update before making API calls
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Send token to backend
      const response = await api.post("/auth/firebase", {
        idToken,
      });

      const data = response.data;

      // Handle both old backend (returns refreshToken) and new backend (httpOnly cookie)
      const accessToken = data?.accessToken;
      const user = data?.user;

      if (user && accessToken) {
        // Store access token only (refresh token is now in httpOnly cookie)
        localStorage.setItem("accessToken", data.accessToken);

        // Update global auth state
        login(data.user);

        // Fetch tenant info (non-blocking)
        if (data.user.tenantId) {
          fetchTenantInfo();
        }

        // Navigate immediately - no delays needed!
        router.push("/pos");
      } else {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        localStorage.removeItem("tenant");
        const errorMsg = !data
          ? "No response data"
          : !data.accessToken
            ? "Missing accessToken"
            : "Missing user data";
        setError(
          `Login failed: ${errorMsg}. Please try again or contact support.`,
        );
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      console.error("[Login] Error during login:", e);
      setError(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Separate function for tenant info fetching (non-blocking)
  const fetchTenantInfo = async () => {
    try {
      const tenantResponse = await api.get("/tenants/me");
      if (tenantResponse.data) {
        localStorage.setItem("tenant", JSON.stringify(tenantResponse.data));
      }
    } catch (err) {
      console.error("Failed to fetch tenant info:", err);
      // Non-critical error, don't show to user
    }
  };

  const handleGoogleSignIn = async () => {
    const { auth, googleProvider, signInWithPopup, signInWithRedirect } =
      await loadFirebaseDeps();

    if (!auth && !Capacitor.isNativePlatform()) {
      setError("Google authentication not configured");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      let idToken: string;

      if (Capacitor.isNativePlatform()) {
        if (!auth || !googleProvider) {
          setError("Google authentication not configured");
          return;
        }
        // Use signInWithRedirect for mobile
        await signInWithRedirect(auth, googleProvider);
        // The redirect will happen, and the result will be handled in the listener
        return;
      } else {
        if (!auth || !googleProvider) {
          setError("Google authentication not configured");
          return;
        }
        // Use web Firebase Auth for browser
        const result = await signInWithPopup(auth, googleProvider);
        idToken = await result.user.getIdToken();
      }

      // Allow UI to update before making API calls
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Send token to backend
      const response = await api.post("/auth/firebase", {
        idToken,
      });
      const data = response.data;

      if (data?.user && data?.accessToken) {
        // Store access token only (refresh token is now in httpOnly cookie)
        localStorage.setItem("accessToken", data.accessToken);

        // Update global auth state
        login(data.user);

        // Fetch tenant info (non-blocking)
        if (data.user.tenantId) {
          fetchTenantInfo();
        }

        // Navigate immediately - no delays needed!
        router.push("/pos");
      } else {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        localStorage.removeItem("tenant");
        const errorMsg = !data
          ? "No response data"
          : !data.accessToken
            ? "Missing accessToken"
            : "Missing user data";
        setError(
          `Google sign-in failed: ${errorMsg}. Please try again or contact support.`,
        );
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Subtle brand-colored accents, consistent with the app's background treatment */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] bg-primary/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[32rem] h-[32rem] bg-secondary/12 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-tertiary/8 rounded-full blur-3xl" />
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md px-6 relative z-10 flex flex-col">
        <div className="glass-card p-8">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4 shadow-lg">
              <ShoppingCart className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              Welcome back
            </h1>
            <p className="text-muted-foreground mt-2">
              Sign in to access your shop dashboard
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <p className="text-red-800 dark:text-red-200 text-sm font-medium">
                {error}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(submit)} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="text-foreground font-medium text-sm mb-2 block">
                Email
              </label>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <div>
                    <Input
                      {...field}
                      id="login-email"
                      aria-label="Email address"
                      placeholder="Enter your email"
                      type="email"
                      autoComplete="email"
                      isClearable
                      isInvalid={!!errors.email}
                      errorMessage={errors.email?.message}
                      startContent={
                        <User className="w-4 h-4 text-muted-foreground" />
                      }
                      classNames={{
                        input: "rounded-lg",
                        mainWrapper: "h-12",
                      }}
                    />
                  </div>
                )}
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="text-foreground font-medium text-sm mb-2 block">
                Password
              </label>
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <div>
                    <Input
                      {...field}
                      id="login-password"
                      aria-label="Password"
                      placeholder="Enter your password"
                      type="password"
                      autoComplete="current-password"
                      isClearable
                      isInvalid={!!errors.password}
                      errorMessage={errors.password?.message}
                      startContent={
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      }
                      classNames={{
                        input: "rounded-lg",
                        mainWrapper: "h-12",
                      }}
                    />
                  </div>
                )}
              />
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              fullWidth
              isLoading={loading}
              disabled={loading}
              className="h-12 rounded-lg font-semibold text-base bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all duration-300"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-surface/80 text-muted-foreground font-medium">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Sign-In Button */}
            <Button
              type="button"
              fullWidth
              variant="bordered"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="h-12 rounded-lg font-semibold border-2 border-border hover:border-primary-hover hover:bg-primary-container transition-all duration-300"
              startContent={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M19.8055 10.2292C19.8055 9.55056 19.7501 8.86667 19.6306 8.19861H10.2002V12.0492H15.6014C15.3773 13.2911 14.6571 14.3898 13.6025 15.0875V17.5866H16.8251C18.7173 15.8449 19.8055 13.2728 19.8055 10.2292Z"
                    fill={`hsl(var(--brand-google-blue))`}
                  />
                  <path
                    d="M10.2002 20.0006C12.9516 20.0006 15.2727 19.1151 16.8296 17.5865L13.607 15.0874C12.7096 15.6972 11.5521 16.0428 10.2046 16.0428C7.54618 16.0428 5.28651 14.2828 4.48892 11.9165H1.16797V14.4923C2.75903 17.8695 6.30967 20.0006 10.2002 20.0006Z"
                    fill={`hsl(var(--brand-google-green))`}
                  />
                  <path
                    d="M4.48449 11.9165C4.04532 10.6746 4.04532 9.33008 4.48449 8.08818V5.51233H1.16797C-0.389324 8.66385 -0.389324 12.3408 1.16797 15.4923L4.48449 11.9165Z"
                    fill={`hsl(var(--brand-google-yellow))`}
                  />
                  <path
                    d="M10.2002 3.95805C11.6257 3.936 13.0035 4.47247 14.036 5.45722L16.8914 2.60178C15.1888 0.990498 12.9383 0.0808105 10.2002 0.104376C6.30967 0.104376 2.75903 2.23549 1.16797 5.51234L4.48449 8.08819C5.27764 5.71748 7.54174 3.95805 10.2002 3.95805Z"
                    fill={`hsl(var(--brand-google-red))`}
                  />
                </svg>
              }
            >
              Sign in with Google
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Secure login powered by SuperShop</p>
          </div>
        </div>
        <AdBanner slotId={AD_SLOTS.loginBanner} minHeight={90} className="mt-4" />
      </div>
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Form, Input, Button, Alert } from "antd";
import UserOutlined from "@ant-design/icons/UserOutlined";
import LockOutlined from "@ant-design/icons/LockOutlined";
import ShoppingOutlined from "@ant-design/icons/ShoppingOutlined";
import { Capacitor, PluginListenerHandle } from "@capacitor/core";
import { App } from "@capacitor/app";
import api from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";

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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  const submit = async (values: { email: string; password: string }) => {
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
      {/* Keep a static gradient background to avoid JS-driven animation work on first paint. */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 animate-gradient-shift" />

      {/* Static shapes maintain visual style without runtime animation cost */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-surface/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-surface/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-surface/5 rounded-full blur-3xl" />
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md px-6 relative z-10">
        <div className="glass-card rounded-2xl shadow-2xl p-8 backdrop-blur-xl bg-card/80 border border-border/20">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg">
              <ShoppingOutlined className="text-3xl text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="text-muted-foreground mt-2">
              Sign in to your account
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div>
              <Alert
                type="error"
                message={error}
                className="mb-6 rounded-lg"
                showIcon
              />
            </div>
          )}

          {/* Form */}
          <div>
            <Form onFinish={submit} layout="vertical" size="large">
              <div>
                <Form.Item
                  name="email"
                  label={
                    <span className="text-foreground font-medium">Email</span>
                  }
                  rules={[
                    {
                      required: true,
                      type: "email",
                      message: "Please enter a valid email",
                    },
                  ]}
                >
                  <Input
                    id="login-email"
                    aria-label="Email address"
                    prefix={<UserOutlined className="text-muted-foreground" />}
                    placeholder="Enter your email"
                    autoComplete="email"
                    className="rounded-lg h-12 hover:border-primary-hover focus:border-primary-active transition-all duration-300"
                  />
                </Form.Item>
              </div>

              <div>
                <Form.Item
                  name="password"
                  label={
                    <span className="text-foreground font-medium">
                      Password
                    </span>
                  }
                  rules={[
                    { required: true, message: "Please enter your password" },
                  ]}
                >
                  <Input.Password
                    id="login-password"
                    aria-label="Password"
                    prefix={<LockOutlined className="text-muted-foreground" />}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="rounded-lg h-12 hover:border-primary-hover focus:border-primary-active transition-all duration-300"
                  />
                </Form.Item>
              </div>

              <div>
                <Form.Item className="mb-0">
                  <div>
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      loading={loading}
                      className="h-12 rounded-lg font-semibold text-base bg-gradient-to-r from-blue-500 to-purple-600 border-0 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Signing in...
                        </span>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </div>
                </Form.Item>
              </div>

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
              <div>
                <div>
                  <Button
                    aria-label="Sign in with Google"
                    block
                    size="large"
                    className="h-12 rounded-lg font-semibold border-2 border-border hover:border-primary-hover hover:bg-primary-container transition-all duration-300 flex items-center justify-center gap-3"
                    onClick={handleGoogleSignIn}
                  >
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
                    <span className="text-foreground">Sign in with Google</span>
                  </Button>
                </div>
              </div>
            </Form>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Secure login powered by SuperShop</p>
          </div>
        </div>
      </div>

    </main>
  );
}

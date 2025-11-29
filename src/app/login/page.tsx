"use client";

import { useRouter } from "next/navigation";
import { useState, startTransition, useEffect } from "react";
import { Form, Input, Button, Alert } from "antd";
import {
  UserOutlined,
  LockOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { Capacitor, PluginListenerHandle } from "@capacitor/core";
import { App } from "@capacitor/app";
import api from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        // Decode JWT payload
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;

        if (payload.exp > currentTime) {
          router.push('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error decoding token:', error);
        // If token is invalid, stay on login page
      }
    }
  }, [router]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      let listener: PluginListenerHandle;
      const setupListener = async () => {
        listener = await App.addListener("appUrlOpen", async (event) => {
          if (event.url.startsWith("one.shomaj.supershop://")) {
            // Handle Firebase redirect
            try {
              const result = await getRedirectResult(auth!);
              if (result) {
                const idToken = await result.user.getIdToken();

                // Send token to backend
                const { data } = await api.post("/auth/firebase", {
                  idToken,
                });

                // Store tokens
                if (data.accessToken) {
                  localStorage.setItem("accessToken", data.accessToken);
                }
                if (data.refreshToken) {
                  localStorage.setItem("refreshToken", data.refreshToken);
                }

                if (data.user) {
                  localStorage.setItem("user", JSON.stringify(data.user));
                  if (data.user.tenantId) {
                    try {
                      const tenantResponse = await api.get("/tenants/me");
                      if (tenantResponse.data) {
                        localStorage.setItem(
                          "tenant",
                          JSON.stringify(tenantResponse.data)
                        );
                      }
                    } catch (err) {
                      console.error("Failed to fetch tenant info:", err);
                    }
                  }
                }

                router.push("/dashboard");
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
  }, [router]);

  const submit = async (values: { email: string; password: string }) => {
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
        values.password
      );
      const idToken = await userCredential.user.getIdToken();

      // Allow UI to update before making API calls
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Send token to backend
      const { data } = await api.post("/auth/firebase", {
        idToken,
      });

      // Store tokens immediately (critical for auth)
      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
      }
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }

      // Use startTransition for non-urgent updates
      startTransition(() => {
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));

          // Fetch tenant info asynchronously (non-blocking)
          if (data.user.tenantId) {
            fetchTenantInfo();
          }
        }
      });

      // Allow UI to update before navigation
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Navigate to dashboard
      router.push("/dashboard");
    } catch (err: unknown) {
      const e = err as { message?: string };
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
    if (!auth && !Capacitor.isNativePlatform()) {
      setError("Google authentication not configured");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      let idToken: string;

      if (Capacitor.isNativePlatform()) {
        // Use signInWithRedirect for mobile
        await signInWithRedirect(auth!, googleProvider!);
        // The redirect will happen, and the result will be handled in the listener
        return;
      } else {
        // Use web Firebase Auth for browser
        const result = await signInWithPopup(auth!, googleProvider!);
        idToken = await result.user.getIdToken();
      }

      // Allow UI to update before making API calls
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Send token to backend
      const { data } = await api.post("/auth/firebase", {
        idToken,
      });

      // Store tokens immediately (critical for auth)
      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
      }
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }

      // Use startTransition for non-urgent updates
      startTransition(() => {
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));

          // Fetch tenant info asynchronously (non-blocking)
          if (data.user.tenantId) {
            fetchTenantInfo();
          }
        }
      });

      // Allow UI to update before navigation
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Navigate to dashboard
      router.push("/dashboard");
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
    },
  };

  const cardTransition = {
    duration: 0.5,
    ease: [0.4, 0, 0.2, 1] as const,
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 animate-gradient-shift" />

      {/* Floating Shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 left-20 w-72 h-72 bg-surface/10 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-surface/10 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-64 h-64 bg-surface/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* Login Card */}
      <motion.div
        className="w-full max-w-md px-6 relative z-10"
        variants={cardVariants}
        initial="hidden"
        animate="show"
        transition={cardTransition}
      >
        <div className="glass-card rounded-2xl shadow-2xl p-8 backdrop-blur-xl bg-card/80 border border-border/20">
          {/* Logo and Title */}
          <motion.div className="text-center mb-8" variants={itemVariants}>
            <motion.div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <ShoppingOutlined className="text-3xl text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="text-muted-foreground mt-2">Sign in to your account</p>
          </motion.div>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Alert
                type="error"
                message={error}
                className="mb-6 rounded-lg"
                showIcon
              />
            </motion.div>
          )}

          {/* Form */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <Form onFinish={submit} layout="vertical" size="large">
              <motion.div variants={itemVariants}>
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
                    prefix={<UserOutlined className="text-muted-foreground" />}
                    placeholder="Enter your email"
                    autoComplete="email"
                    className="rounded-lg h-12 hover:border-primary-hover focus:border-primary-active transition-all duration-300"
                  />
                </Form.Item>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Form.Item
                  name="password"
                  label={
                    <span className="text-foreground font-medium">Password</span>
                  }
                  rules={[
                    { required: true, message: "Please enter your password" },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined className="text-muted-foreground" />}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="rounded-lg h-12 hover:border-primary-hover focus:border-primary-active transition-all duration-300"
                  />
                </Form.Item>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Form.Item className="mb-0">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      loading={loading}
                      className="h-12 rounded-lg font-semibold text-base bg-gradient-to-r from-blue-500 to-purple-600 border-0 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          >
                            ⏳
                          </motion.span>
                          Signing in...
                        </span>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </motion.div>
                </Form.Item>
              </motion.div>

              {/* Divider */}
              <motion.div variants={itemVariants} className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-surface/80 text-muted-foreground font-medium">
                    Or continue with
                  </span>
                </div>
              </motion.div>

              {/* Google Sign-In Button */}
              <motion.div variants={itemVariants}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
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
                </motion.div>
              </motion.div>
            </Form>
          </motion.div>

          {/* Footer */}
          <motion.div
            className="mt-6 text-center text-sm text-muted-foreground"
            variants={itemVariants}
            initial="hidden"
            animate="show"
          >
            <p>Secure login powered by SuperShop</p>
          </motion.div>
        </div>
      </motion.div>

      <style jsx global>{`
        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 15s ease infinite;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        /* Custom input focus styles */
        .ant-input:focus,
        .ant-input-password:focus,
        .ant-input-affix-wrapper:focus,
        .ant-input-affix-wrapper-focused {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Smooth transitions for all inputs */
        .ant-input,
        .ant-input-password,
        .ant-input-affix-wrapper {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Button gradient animation */
        .ant-btn-primary {
          position: relative;
          overflow: hidden;
        }

        .ant-btn-primary::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          transition: left 0.5s;
        }

        .ant-btn-primary:hover::before {
          left: 100%;
        }
      `}</style>
    </main>
  );
}

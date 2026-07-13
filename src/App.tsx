import { RouterProvider } from "react-router-dom";
import { Providers } from "./components/providers";
import { router } from "./router";
import { LazyImportErrorBoundary } from "@/components/LazyImportErrorBoundary";

export default function App() {
  return (
    <LazyImportErrorBoundary>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </LazyImportErrorBoundary>
  );
}

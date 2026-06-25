import { RouterProvider } from 'react-router-dom';
import { Providers } from './components/providers';
import { router } from './router';

export default function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}

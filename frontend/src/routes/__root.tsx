import { Outlet, Link, createRootRoute } from '@tanstack/react-router';

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-gradient-warm">404</h1>
        <p className="mt-4 text-muted-foreground">לא נמצא · Page not found</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-gradient-warm px-4 py-2 text-sm font-medium text-primary-foreground shadow-warm">
          חזרה · Home
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: NotFoundComponent,
});

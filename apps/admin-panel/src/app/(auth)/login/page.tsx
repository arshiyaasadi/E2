import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-login-bg min-h-screen" aria-busy="true" />}>
      <LoginForm />
    </Suspense>
  );
}

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, useAuth } from "../context/AuthContext";
import "./LoginPage.css";

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate("/catalog");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось войти");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-card__logo">warehouse.</div>
        <p className="login-card__subtitle">Вход для оптовых клиентов</p>

        <label className="login-field">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label className="login-field">
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        {error && <p className="login-card__error">{error}</p>}

        <button className="btn login-card__submit" type="submit" disabled={submitting}>
          {submitting ? "Входим..." : "Войти"}
        </button>

        <p className="login-card__hint">
          Логин и пароль выдаёт администратор — самостоятельная регистрация недоступна.
        </p>
      </form>
    </div>
  );
}

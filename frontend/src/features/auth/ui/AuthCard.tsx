import { FormEvent } from 'react';

type AuthCardProps = {
  isRegister: boolean;
  authForm: { fullName: string; email: string; password: string };
  authError?: string;
  setIsRegister: (value: boolean) => void;
  setAuthForm: (value: { fullName: string; email: string; password: string }) => void;
  onSubmit: (e: FormEvent) => Promise<void>;
};

export function AuthCard({
  isRegister,
  authForm,
  authError,
  setIsRegister,
  setAuthForm,
  onSubmit,
}: AuthCardProps) {
  return (
    <section className="card">
      <h2>{isRegister ? 'Регистрация' : 'Вход'}</h2>
      {authError ? (
        <p className="authError" role="alert">
          {authError}
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="grid">
        {isRegister && (
          <input
            placeholder="Имя"
            value={authForm.fullName}
            onChange={(e) => setAuthForm({ ...authForm, fullName: e.target.value })}
          />
        )}
        <input
          placeholder="Email"
          value={authForm.email}
          onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
        />
        <input
          placeholder="Пароль"
          type="password"
          value={authForm.password}
          onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
        />
        <button type="submit">{isRegister ? 'Создать аккаунт' : 'Войти'}</button>
      </form>
      <button
        type="button"
        onClick={() => setIsRegister(!isRegister)}
        className="ghost authSwitchButton"
      >
        {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Регистрация'}
      </button>
    </section>
  );
}

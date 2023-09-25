import React, { useEffect, useRef, useState } from "react";
import { useApi } from "../hooks/useApi";
import { useOnExternalClick, useValidatedInput } from "@bentley/react-hooks";
import { classNames, useOnNoLongerMouseInteracted } from "js-utils/lib/react-utils";


// FIXME: move to common and use on backend
function isValidPassword(value: string) {
  if (value.length < 8)
    return { status: "Too few characters, must be between 8 and 30", valid: false };
  if (value.length > 30)
    return { status: "Too many characters, must be between 8 and 30", valid: false };
  if (!/[A-Z]/.test(value))
    return { status: "Must contain at least one uppercase letter", valid: false };
  if (!/[a-z]/.test(value))
    return { status: "Must contain at least one lowercase letter", valid: false };
  if (!/[0-9]/.test(value))
    return { status: "Must contain at least one number", valid: false };
  return { valid: true };
}

export function LoginState(_props: LoginPage.Props) {
  const isLoggedIn = useApi(s => s.computed.isLoggedIn);
  const api = useApi(s => s.api);

  const [email, emailInput, setEmailInput, _emailStatus, emailError] = useValidatedInput<string>("", {
    parse: (x) => ({ value: x }),
    pattern: /[^@]+@[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+/,
  });
  const [password, passwordInput, setPasswordInput, _passwordStatus, passwordError] = useValidatedInput<string>("", {
    parse: (x) => ({ value: x }),
    validate: isValidPassword,
    pattern: /(?:)/
  });

  const [showLogin, setShowLogin] = useState(false)

  // just in case for security, clear inputs when login UI is closed
  useEffect(() => {
    if (!showLogin) {
      setPasswordInput("");
      setEmailInput("");
    }
  }, [showLogin]);

  const inputValid = email !== null && password !== null;

  const popupRef = useRef<HTMLDivElement>(null);

  useOnExternalClick(popupRef, () => setShowLogin(false));

  const login = async () => {
    if (!inputValid) return;
    await api.login({ email, password });
  };

  const logout = async () => {
    await api.logout();
  };

  return (
    <div>
      <button onClick={() => setShowLogin(prev => !prev)}>Login</button>
      {/* FIXME: use the form properly */}
      {/* FIXME: refactor styling */}
      <div style={{
          position: "fixed",
          right: 0,
          display: showLogin ? undefined : "none",
          zIndex: 1,
          backgroundColor: "var(--bg-1)",
          border: "1px solid var(--fg-1)",
          borderRadius: 5,
          padding: 6,
        }}
        ref={popupRef}
      >
        {isLoggedIn ? <button
          onClick={logout}
          title={"unimplemented"}
        >
          Logout
        </button>
          : <>
            <p>Login</p>
            <label className="split" style={{ maxWidth: 300 }}>
              Email:
              <input value={emailInput} type="email" onChange={(e) => setEmailInput(e.currentTarget.value)}/>
            </label>
            <div style={{color: "red"}}>{emailError}</div>
            <label className="split" style={{ maxWidth: 300 }}>
              Password:
              <input
                value={passwordInput}
                type="password"
                onChange={(e) => setPasswordInput(e.currentTarget.value)}
                onSubmit={login}
                onKeyDown={(e) => e.key === 'Enter' && login()}
              />
            </label>
            <div style={{color: "red"}}>{passwordError}</div>
            <button
              onClick={login}
              disabled={!inputValid}
              title={inputValid ? "Click to login" : "Invalid inputs"}
            >
              Login
            </button>
            <button
              onClick={async () => {
                if (!inputValid) return;
                // FIXME: need forgot password link
                // FIXME: test attempt to register existing email
                await api.register({ email, password });
              }}
              disabled={!inputValid}
              title={inputValid ? "Click to login" : "Invalid inputs"}
            >
              Register
            </button>
            </>}
      </div>
    </div>
  );
}

namespace LoginPage {
  export interface Props {
    //onSelectProject(project: string): void;
  }
}

export default LoginPage;

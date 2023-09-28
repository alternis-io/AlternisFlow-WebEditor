import React, { useEffect, useRef, useState } from "react";
import { useApi } from "../hooks/useApi";
import { useOnExternalClick, useValidatedInput } from "@bentley/react-hooks";
import { classNames, useOnNoLongerMouseInteracted } from "js-utils/lib/react-utils";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Center } from "../Center";


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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const encodedRedirectSource = searchParams.get("redirect");
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

  const inputValid = email !== null && password !== null;

  const popupRef = useRef<HTMLDivElement>(null);

  const login = async () => {
    if (!inputValid) return;
    await api.login({ email, password });
    if (encodedRedirectSource)
      navigate(decodeURIComponent(encodedRedirectSource), { replace: true });
  };

  const logout = async () => {
    await api.logout();
  };

  return (
    <div>
      {/* FIXME: use the form properly */}
      {/* FIXME: refactor styling */}
      <Center style={{
          height: "100%",
          width: "100%",
          position: "fixed",
          padding: 6,
        }}
        ref={popupRef}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
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
              <input
                value={emailInput}
                type="email"
                onChange={(e) => setEmailInput(e.currentTarget.value)}
                onKeyDown={(e) => inputValid && e.key === 'Enter' && login()}
              />
            </label>
            <div style={{color: "red"}}>{emailError}</div>
            <label className="split" style={{ maxWidth: 300 }}>
              Password:
              <input
                value={passwordInput}
                type="password"
                onChange={(e) => setPasswordInput(e.currentTarget.value)}
                onSubmit={login}
                onKeyDown={(e) => inputValid && e.key === 'Enter' && login()}
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
      </Center>
    </div>
  );
}

namespace LoginPage {
  export interface Props {
    //onSelectProject(project: string): void;
  }
}

export default LoginPage;

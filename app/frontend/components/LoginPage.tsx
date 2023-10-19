import React, { useEffect, useRef, useState } from "react";
import { useApi } from "../hooks/useApi";
import { useValidatedInput } from "@bentley/react-hooks";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Center } from "../Center";
import { assert } from "js-utils/lib/browser-utils";


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

function GoogleLogin() {
  const buttonId = "googleLoginBtn";

  useEffect(() => {
    const handleGoogleCredResp = (resp) => {
      console.log("google cred", resp.credential);
    };

    globalThis.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleGoogleCredResp,
    });
    globalThis.google.accounts.id.renderButton(
      document.getElementById(buttonId),
      { theme: "outline", size: "large" },
    );
  }, []);

  return (
    <div style={{ width: "200px" }} id={buttonId}/>
  );
}



export function LoginState(_props: LoginPage.Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
    pattern: /(?:)/,
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

  const apiOrigin
    = import.meta.env.PROD
    ? window.location.origin
    : "http://localhost:4222";

  const redirectUri = `${apiOrigin}/api/v1/users/me/login/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${
    import.meta.env.VITE_GITHUB_CLIENT_ID
  }&redirect_uri=${redirectUri}&login`;

  const githubLogin = (
    <a href={url}>
      <button
        onClick={() => {
        }}
      >
        <img width="20px" src="http://github.com/favicon.ico" />
        Sign in with GitHub
      </button>
    </a>
  );

  return (
    <div>
      <GoogleLogin />
      {githubLogin}
      {/* FIXME: use the form properly */}
      {/* FIXME: refactor styling */}
      <Center style={{
          height: "100%",
          width: "100%",
          position: "fixed",
          padding: 6,
          paddingBottom: "20vh",
        }}
        ref={popupRef}
      >
        <div>
          {encodedRedirectSource && (
            <div>
              You must be logged in to use Alternis.
              Want to just <Link to="/?trial">try it</Link> out now?
            </div>
          )}
          <div style={{
            marginTop: 20,
            display: "flex",
            flexDirection: "column",
            gap: 5,
            alignItems: "center"
          }}>
            {isLoggedIn ? <>
              <button
                onClick={logout}
                title={"unimplemented"}
              >
                Logout
              </button>
            </> : <>
              <label className="alternis__split" style={{ minWidth: 300 }}>
                Email:
                <input
                  value={emailInput}
                  type="email"
                  onChange={(e) => setEmailInput(e.currentTarget.value)}
                  onKeyDown={(e) => inputValid && e.key === 'Enter' && login()}
                />
              </label>
              {emailError && emailInput.length > 0 && <div className="alternis__invalidInputMessage">{emailError}</div>}
              <label className="alternis__split" style={{ minWidth: 300 }}>
                Password:
                <input
                  value={passwordInput}
                  type="password"
                  onChange={(e) => setPasswordInput(e.currentTarget.value)}
                  onSubmit={login}
                  onKeyDown={(e) => inputValid && e.key === 'Enter' && login()}
                />
              </label>
              {passwordError && passwordInput.length > 0 && <div className="alternis__invalidInputMessage">{passwordError}</div>}
              <Center>
                <button
                  onClick={login}
                  disabled={!inputValid}
                  title={inputValid ? "Click to login" : "Invalid inputs"}
                  style={{ width: "10em" }}
                >
                  Login
                </button>
              </Center>
              <Center>
                <button
                  onClick={async () => {
                    if (!inputValid) return;
                    // FIXME: need forgot password link
                    // FIXME: test attempt to register existing email
                    await api.register({ email, password });
                  }}
                  disabled={!inputValid}
                  title={inputValid ? "Click to login" : "Invalid inputs"}
                  style={{ width: "10em" }}
                >
                  Register
                </button>
              </Center>
              </>
            }
          </div>
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

import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApi } from "./useApi";

export function useRedirectIfNotLoggedIn() {
  const isLoggedIn = useApi(s => s.computed.isLoggedIn);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn)
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`)
  }, [isLoggedIn, navigate, location]);
}

export function RedirectIfNotLoggedIn() {
  useRedirectIfNotLoggedIn();
  return null;
}

export default useRedirectIfNotLoggedIn;

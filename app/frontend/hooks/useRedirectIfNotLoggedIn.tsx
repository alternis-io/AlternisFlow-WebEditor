import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApi } from "./useApi";

export function useRedirectIfNotLoggedIn() {
  const isLoggedIn = useApi(s => s.auth === undefined || s.auth.isLoggedIn);
  const location = useLocation();
  const navigate = useNavigate();

  // FIXME: do query param parsing!
  const inLocalDemo = location.search.includes("demo") || location.hash.includes("?demo");

  useEffect(() => {
    if (!isLoggedIn && !inLocalDemo)
      navigate(`/app/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true })
  }, [isLoggedIn, navigate, location, inLocalDemo]);
}

export function RedirectIfNotLoggedIn() {
  useRedirectIfNotLoggedIn();
  return null;
}

export default useRedirectIfNotLoggedIn;

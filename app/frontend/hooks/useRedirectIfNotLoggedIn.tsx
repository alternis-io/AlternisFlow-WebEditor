import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApi } from "./useApi";

export function useRedirectIfNotLoggedIn() {
  const isLoggedIn = useApi(s => s.computed.isLoggedIn);
  const location = useLocation();
  const navigate = useNavigate();

  // FIXME: do query param parsing!
  const inLocalTrial = location.search.includes("trial");

  useEffect(() => {
    if (!isLoggedIn && !inLocalTrial)
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true })
  }, [isLoggedIn, navigate, location, inLocalTrial]);
}

export function RedirectIfNotLoggedIn() {
  useRedirectIfNotLoggedIn();
  return null;
}

export default useRedirectIfNotLoggedIn;

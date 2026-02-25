import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * This page is the landing page after Google OAuth redirect.
 * The backend sends tokens and user info in the URL fragment (#...).
 */
const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Example redirect:
    // /oauth-callback#accessToken=...&refreshToken=...&user_id=...&username=...&email=...
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.substring(1)
      : window.location.hash;

    const params = new URLSearchParams(hash);

    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    const user_id = params.get("user_id");
    const username = params.get("username");
    const email = params.get("email") || "";

    if (!accessToken || !refreshToken || !user_id || !username) {
      navigate("/login", { replace: true, state: { error: "OAuth login failed." } });
      return;
    }

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user_id", user_id);
    localStorage.setItem("username", username);
    localStorage.setItem("email", email);

    // Full reload so AuthContext will re-initialize from localStorage.
    window.location.replace("/feed");
  }, [navigate]);

  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <h2>Signing you in...</h2>
      <p>Please wait.</p>
    </div>
  );
};

export default OAuthCallback;

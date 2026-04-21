import { useNavigate, useLocation } from "react-router-dom";

const AuthLinks = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div style={{ marginTop: "1rem" }}>
      {pathname !== "/register" && <button onClick={() => navigate("/register")}>Register</button>}
      {pathname !== "/email-login" && <button onClick={() => navigate("/email-login")}>Login with Email</button>}
      {pathname !== "/phone-login" && <button onClick={() => navigate("/phone-login")}>Login with Phone</button>}
    </div>
  );
};

export default AuthLinks;

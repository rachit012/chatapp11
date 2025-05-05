import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FiEye, FiEyeOff, FiMail, FiLock } from "react-icons/fi";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true); // ✅ New state

  const navigate = useNavigate();

  // ✅ Only run token verification
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setCheckingToken(false);
        return;
      }

      try {
        const res = await axios.get("http://localhost:5000/api/auth/verify", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.valid) {
          navigate("/chat", { replace: true });
        } else {
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
          setCheckingToken(false);
        }
      } catch (err) {
        console.warn("Token verification failed:", err);
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        setCheckingToken(false);
      }
    };

    verifyToken();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError("Please enter both email and password");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password,
      });

      const { token, user } = response.data;

      if (token && user) {
        localStorage.setItem("authToken", token);
        localStorage.setItem("user", JSON.stringify(user));
        navigate("/chat", { replace: true });
      } else {
        setError("Invalid login response from server");
      }
    } catch (err) {
      console.log("Login error:", err);
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Show spinner while verifying token
  if (checkingToken) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600 text-lg">Checking session...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-8 shadow-xl rounded-lg w-96">
        <h2 className="text-3xl font-bold text-center text-blue-600">Login</h2>
        <p className="text-center text-gray-500 mb-4">Welcome back! 👋</p>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <form onSubmit={handleLogin}>
          <div className="mb-4 relative">
            <label className="block text-gray-600">Email</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400">
                <FiMail />
              </span>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full pl-10 p-2 border rounded mt-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="mb-4 relative">
            <label className="block text-gray-600">Password</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400">
                <FiLock />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="w-full pl-10 pr-10 p-2 border rounded mt-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                required
                autoComplete="current-password"
              />
              <span
                className="absolute right-3 top-2.5 text-gray-400 cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>
          </div>

          <button
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors duration-200"
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-600">
          Don't have an account?{" "}
          <Link to="/register" className="text-blue-500 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

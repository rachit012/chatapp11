import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FiUser, FiMail, FiLock } from "react-icons/fi";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const { data } = await axios.post("http://localhost:5000/api/auth/register", {
        username,
        email,
        password,
      });

      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-8 shadow-xl rounded-lg w-96">
        <h2 className="text-3xl font-bold text-center text-blue-600">Register</h2>
        <p className="text-center text-gray-500 mb-4">Create your account! 🎉</p>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <form onSubmit={handleRegister}>
          <div className="mb-4 relative">
            <label className="block text-gray-600">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400">
                <FiUser />
              </span>
              <input
                type="text"
                placeholder="Enter your username"
                className="w-full pl-10 p-2 border rounded mt-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

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
                onChange={(e) => setEmail(e.target.value)}
                required
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
                type="password"
                placeholder="Enter your password"
                className="w-full pl-10 p-2 border rounded mt-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors duration-200"
            type="submit"
          >
            Register
          </button>
        </form>

        <p className="mt-4 text-center text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-500 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

import React, { useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../contexts/authContext";
import { doCreateUserWithEmailAndPassword } from "../../../firebase/auth";
import "../../../styles/students.css";
import LoginEmigrantStats from "../login/LoginEmigrantStats";
const Register = () => {
  const { userLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState(''); 
  

 const handleChange = (e) => {
  const { name, value } = e.target;
  if (name === 'email') setEmail(value);
  if (name === 'password') setPassword(value);
  if (name === 'confirmPassword') setConfirmPassword(value);
  if (name === 'studentId') setStudentId(value);
  if (name === 'firstName') setFirstName(value);
  if (name === 'lastName') setLastName(value);
};


  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    // Validate password match
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      alert("Passwords do not match.");
      return;
    }

    // Start registration process
    if (!isRegistering) {
      setIsRegistering(true);
      try {
        // Create user with email and password
       await doCreateUserWithEmailAndPassword(email, password, firstName, lastName);
        setSuccessMessage("Registration successful!");
        alert("Registration successful!");

        // Redirect to login after a short delay
        setTimeout(() => navigate("/student/login"), 2000);
      } catch (err) {
        setIsRegistering(false);
        setErrorMessage(err.message || "Something went wrong. Please try again.");
        alert(err.message || "Something went wrong. Please try again.");
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="login-logo">Emigration</div>
        <div className="login-subtitle">Data Management System</div>
       
        <div style={{ marginTop: "20px" }}>
         
           <LoginEmigrantStats />
          <p>Register now to view Filipino Emigrants in detailed!</p>
        </div>
      </div>

      <div className="login-right">
        <form className="login-form" onSubmit={handleRegister}>
          <h2 style={{ marginBottom: "30px", color: "var(--maroon)" }}>Create Your Account</h2>

          <div className="form-group">
          <label htmlFor="firstName">First Name</label>
          <input
            type="text"
            name="firstName"
            placeholder="Enter your first name"
            value={firstName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="lastName">Last Name</label>
          <input
            type="text"
            name="lastName"
            placeholder="Enter your last name"
            value={lastName}
            onChange={handleChange}
            required
          />
        </div>


          <div className="form-group">
            <label htmlFor="regEmail">Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="regPassword">Password</label>
            <input
              type="password"
              name="password"
              placeholder="Create a password"
              value={password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={handleChange}
              required
            />
          </div>


          {errorMessage && <span className="text-red-600 font-bold">{errorMessage}</span>}
          {successMessage && <span className="text-green-600 font-bold">{successMessage}</span>}

          <button
            type="submit"
            disabled={isRegistering}
            className={`btn btn-primary btn-block ${isRegistering ? 'bg-gray-300 cursor-not-allowed' : ''}`}
          >
            {isRegistering ? "Signing Up..." : "Sign Up"}
          </button>

          <div className="login-footer">
            <p>
              <Link
            className="text-sm text-blue-600 underline"
            to="/login"
            style={{ color: "var(--maroon)", fontWeight: 600 }}
          >
            Login Here
          </Link>
            </p>
          </div>
          {successMessage && (
  <div style={{ marginTop: "10px" }}>
    <button
      type="button"
      className="btn btn-secondary btn-block"
      onClick={() => navigate("/student/login")}
    >
      Go to Login
    </button>
  </div>
)}
        </form>
      </div>
    </div>
  );
};

export default Register;

//loginworking

import React, { useState , useEffect} from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/authContext';
import { doSignInWithEmailAndPassword, doSignInWithGoogle } from '../../../firebase/auth';
import "../../../styles/students.css";
import { Link } from 'react-router-dom';

import { getFirestore, doc, getDoc } from "firebase/firestore";

import LoginEmigrantStats from "./LoginEmigrantStats";



const Login = () => {
  const navigate = useNavigate();
  const { userLoggedIn } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [user, setUser] = useState(null);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Function to get user data (role) from Firestore
const getUserDataFromFirestore = async (uid) => {
  const db = getFirestore();
  const userDocRef = doc(db, "users", uid);  // Fetch the user document using the UID
  const docSnap = await getDoc(userDocRef);
  const user = JSON.parse(localStorage.getItem('user'));
  if (docSnap.exists()) {
    return docSnap.data();  // Return the user data (including role)
  } else {
    throw new Error("User not found");
  }
};



  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSigningIn(true);
    setErrorMessage('');
    try {
        const user = await doSignInWithEmailAndPassword(formData.email, formData.password);
        const userData = await getUserDataFromFirestore(user.uid);  // Fetch user data after sign-in
        setUser(userData); // Update user state
        localStorage.setItem('user', JSON.stringify(userData));
        navigate(userData.role === 'admin' ? '/adashboard' : '/student/dashboard');
    } catch (err) {
        setIsSigningIn(false);
        setErrorMessage('Invalid email or password');
    }
};

  const onGoogleSignIn = async (e) => {
    e.preventDefault();
    setIsSigningIn(true);
    try {
        const user = await doSignInWithGoogle();
        const userData = await getUserDataFromFirestore(user.uid);  // Fetch user data after Google sign-in
        setUser(userData); // Update user state
        localStorage.setItem('user', JSON.stringify(userData));
        navigate(userData.role === 'admin' ? '/adashboard' : '/dashboard');
    } catch (err) {
        setIsSigningIn(false);
        setErrorMessage('Something went wrong with Google Sign-In');
    }
};

   useEffect(() => {
    if (userLoggedIn && user) {
        if (user.role === 'admin') {
            navigate('/adashboard');
        } else {
            navigate('/student/dashboard');
        }
    }
}, [userLoggedIn, user, navigate]);

  return (
    <div className="login-container">
      <div className="login-left">  
        <div className="login-logo">Emigration</div>
        <div className="login-subtitle">
        Data Management System
        </div>
          {/* Add the stats here */}
    <LoginEmigrantStats />
  
      </div>

     <div className="login-right">

        <form className="login-form" onSubmit={handleLogin}>
          <h2 style={{ marginBottom: "30px", color: "var(--maroon)" }}>Login to Your Account</h2>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {errorMessage && <span className="text-red-600 font-bold">{errorMessage}</span>}

          <button
            type="submit"
            disabled={isSigningIn}
            className={`btn btn-primary btn-block ${isSigningIn ? 'cursor-not-allowed' : ''}`}
          >
            {isSigningIn ? 'Signing In...' : 'Login'}
          </button>

          <div className="login-footer">
            <p>
              Don't have an account?{" "}
              <Link
              className="text-sm text-blue-600 underline"
              to={'/register'} 
              style={{ color: "var(--maroon)", fontWeight: 600 }}
            >
              Register Here
            </Link>
            </p>
          </div>
        </form>

        <div className="divider">
          <div className="line"></div>
          <span className="or">OR</span>
          <div className="line"></div>
        </div>

        <button
          disabled={isSigningIn}
          onClick={onGoogleSignIn}
          className={`w-full flex items-center justify-center gap-x-3 py-2.5 border rounded-lg text-sm font-medium ${isSigningIn ? 'cursor-not-allowed' : ''}`}
        >
          <svg className="google-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20">
            {/* Add Google icon SVG here */}
          </svg>
          {isSigningIn ? 'Signing In...' : 'Continue with Google'}
        </button>
      </div>
    </div>
  );
};

export default Login;

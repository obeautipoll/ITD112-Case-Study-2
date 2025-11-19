// src/components/public-pages/LoginEmigrantStats.jsx
import React, { useState, useEffect } from "react";
import { db } from "../../../firebase/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Mars, Venus, FileText } from "lucide-react";
import './Login.css';

const LoginEmigrantStats = () => {
  const [sexData, setSexData] = useState([]);
  const [totalEmigrants, setTotalEmigrants] = useState(0);

  // Fetch male/female counts
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "sex"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSexData(data);
    });
    return () => unsubscribe();
  }, []);

  // Fetch total emigrants
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "allCountries"), (snapshot) => {
      let total = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        total += Number(data.count || 0);
      });
      setTotalEmigrants(total);
    });
    return () => unsubscribe();
  }, []);

  const totalMale = sexData
    .filter((r) => r.sex === "Male")
    .reduce((sum, r) => sum + (Number(r.count) || 0), 0);

  const totalFemale = sexData
    .filter((r) => r.sex === "Female")
    .reduce((sum, r) => sum + (Number(r.count) || 0), 0);

  return (
    <div className="emigrant-stats-container">
     
      <div className="stat-card">
        <div className="stat-icon male">
          <Mars size={20} />
        </div>
        <div className="stat-content">
          <h3>{totalMale.toLocaleString()}</h3>
          <p>Total Male</p>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon female">
          <Venus size={20} />
        </div>
        <div className="stat-content">
          <h3>{totalFemale.toLocaleString()}</h3>
          <p>Total Female</p>
        </div>
      </div>
    </div>
  );
};

export default LoginEmigrantStats;

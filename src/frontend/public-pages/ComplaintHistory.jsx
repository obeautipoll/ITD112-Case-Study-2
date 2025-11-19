import React, { useState } from "react";
import "../../styles/students.css";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import SideBar from "../public-pages/components/SideBar";
import MainNavbar from "./components/MainNavbar";

import { useEffect } from "react";
import { db, auth } from "../../firebase/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
const ComplaintHistory = () => {
  const navigate = useNavigate();
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  

  const [complaints, setComplaints] = useState([]);

useEffect(() => {
  const fetchComplaints = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "complaints"),
        where("userId", "==", user.uid)
      );

      const querySnapshot = await getDocs(q);
      const complaintList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setComplaints(complaintList);
    } catch (error) {
      console.error("❌ Error fetching complaint history:", error);
    }
  };

  fetchComplaints();
}, []);

  

  return (
    <div id="historyPage" className="container">
      <SideBar />

      {/* Main Content */}
      <div className="main-content">
        <MainNavbar/>
        <div className="card">
          <div className="card-header">
            <div className="card-title">All Submitted Complaints</div>
          </div>

          <table className="complain-table">
            <thead>
              <tr>
                <th style={{ width: "50%" }}>Complaint</th>
                <th style={{ width: "15%" }}>Category</th>
                <th style={{ width: "10%" }}>Date Filed</th>
                <th style={{ width: "15%" }}>Status</th>
                <th style={{ width: "10%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
                {complaints.map((c) => (
                  <tr key={c.id}>
                    {/* Complaint Description */}
                    <td>
                      {c.concernDescription ||
                        c.otherDescription ||
                        c.incidentDescription ||
                        c.facilityDescription ||
                        c.concernFeedback ||
                        "No description provided"}
                    </td>

                    {/* Category */}
                    <td>{c.category || "—"}</td>

                    {/* Date Filed */}
                    <td>{c.submissionDate?.toDate().toLocaleDateString() || "—"}</td>

                    {/* Status */}
                    <td>
                      <span className={`status ${c.status?.toLowerCase() || "pending"}`}>
                        {c.status || "Pending"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <button
                        className="btn"
                        style={{ padding: "5px 10px", fontSize: 12 }}
                        onClick={() => setSelectedComplaint(c)}
                      >
                        <i className="fas fa-eye"></i> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
          </table>
        </div>

        {/* Modal */}
        {selectedComplaint && (
          <div className="modal">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Complaint Details</h2>
                <button
                  className="close-btn"
                  onClick={() => setSelectedComplaint(null)}
                >
                  &times;
                </button>
              </div>
              <div className="modal-body">
                <table className="complaint-details-table">
                  <thead>
                    <tr>
                      <th>Complaint Category</th>
                      <th>Date Filed</th>
                      <th>Complaint Status</th>
                      <th>Date Resolved</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{selectedComplaint.category}</td>
                      <td>{selectedComplaint.dateFiled}</td>
                      <td>
                        <span
                          className={`status ${selectedComplaint.status.toLowerCase()}`}
                        >
                          {selectedComplaint.status}
                        </span>
                      </td>
                      <td>
                        {selectedComplaint.dateResolved || "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="complaint-description">
                  <h3>Complaint Description</h3>
                  <p>{selectedComplaint.description}</p>
                </div>

                {selectedComplaint.file && (
                  <div>
                    <h3>Attached File</h3>
                    <div className="file-attachment">
                      <i className="fas fa-file-pdf file-icon"></i>
                      <div>
                        <div>{selectedComplaint.file}</div>
                        <div
                          style={{ fontSize: 12, color: "var(--gray)" }}
                        >
                          2.4 MB
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-yellow">
                  <i className="fas fa-download"></i> Download
                </button>
                <button className="btn btn-primary">
                  <i className="fas fa-print"></i> Print
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintHistory;

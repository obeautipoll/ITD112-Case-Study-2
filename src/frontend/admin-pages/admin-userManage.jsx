//users 

import React, { useEffect, useState } from "react";
import "../../styles-admin/userManage.css";
import SideBar from "./components/SideBar";
import AdminNavbar from "./components/NavBar";
import { db } from "../../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";

const UserManagementView = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Fetch users from Firestore
  const fetchUsers = async () => {
  setIsLoading(true);
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    const fetchedUsers = querySnapshot.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
      }))
      .filter((user) => user.role === "public");
    setUsers(fetchedUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
  } finally {
    setIsLoading(false);
  }
};

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users by search term (search by email or name)
  const filteredUsers = users.filter((user) => {
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase();
  return (
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fullName.includes(searchTerm.toLowerCase())
  );
});

  // Highlight newly registered users (last 24 hours)
  const isNewUser = (createdAt) => {
    if (!createdAt) return false;
    const userDate = new Date(createdAt.seconds * 1000);
    const now = new Date();
    return now - userDate < 24 * 60 * 60 * 1000;
  };

  return (
    <div className="user-management-container">
      <SideBar />
      <AdminNavbar />

      <div className="content-area">
        <h3 className="page-title">Registered Accounts</h3>
        <p className="page-description">
          Total registered accounts: {users.length}
        </p>

        {/* search */}
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        {filteredUsers.length === 0 ? (
          <div className="no-pending-message">
            No registered accounts found.
          </div>
        ) : (
          <div className="approval-table-wrapper">
            <table className="approval-table">
              <thead>
                <tr className="table-header-row">
                  <th>Email</th>
                  <th>Name</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={isNewUser(user.createdAt) ? "new-user" : ""}
                  >
                    <td>{user.email || "N/A"}</td>
                    <td>
                      {user.firstName || user.lastName
                        ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                        : "N/A"}
                    </td>
                    <td>
                      {user.createdAt
                        ? new Date(user.createdAt.seconds * 1000).toLocaleString()
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagementView;

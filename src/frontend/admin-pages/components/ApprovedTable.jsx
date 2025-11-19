import React, { useState, useCallback } from 'react';
import '../../../styles-admin/approved-table.css';

// --- CONSTANTS ---
const ADMIN_ROLES = {
  OSDS: "OSDS Admin",
  OSDSLow: "OSDS-low",
  KASAMA: "KASAMA",
  DEPARTMENT: "Department",
};

// --- DUMMY DATA FOR APPROVED ACCOUNTS ---
const initialApprovedAccounts = [
  {
    id: "usr_1234",
    email: "john.doe@university.edu",
    office: "OSDS",
    role: ADMIN_ROLES.OSDS,
    dateApproved: "2024-10-15",
  },
  {
    id: "usr_5678",
    email: "jane.smith@university.edu",
    office: "KASAMA",
    role: ADMIN_ROLES.KASAMA,
    dateApproved: "2024-10-18",
  },
  {
    id: "usr_9012",
    email: "admin.dept@university.edu",
    office: "Computer Science Department",
    role: ADMIN_ROLES.DEPARTMENT,
    dateApproved: "2024-10-20",
  },
  {
    id: "usr_3456",
    email: "support.staff@university.edu",
    office: "OSDS",
    role: ADMIN_ROLES.OSDSLow,
    dateApproved: "2024-10-21",
  },
];

const ApprovedAccountsTable = () => {
  const [approvedAccounts, setApprovedAccounts] = useState(initialApprovedAccounts);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [editedRole, setEditedRole] = useState("");

  // Open Edit Modal
  const openEditModal = (account) => {
    setSelectedAccount(account);
    setEditedRole(account.role);
    setShowEditModal(true);
  };

  // Handle Role Update
  const handleUpdateRole = useCallback(() => {
    if (!selectedAccount) return;

    setApprovedAccounts((prevAccounts) =>
      prevAccounts.map((account) =>
        account.id === selectedAccount.id
          ? { ...account, role: editedRole }
          : account
      )
    );

    setShowEditModal(false);
    alert(`Role updated for ${selectedAccount.email}`);
  }, [selectedAccount, editedRole]);

  // Open Delete Modal
  const openDeleteModal = (account) => {
    setSelectedAccount(account);
    setShowDeleteModal(true);
  };

  // Handle Account Deletion
  const handleDeleteAccount = useCallback(() => {
    if (!selectedAccount) return;

    setApprovedAccounts((prevAccounts) =>
      prevAccounts.filter((account) => account.id !== selectedAccount.id)
    );

    setShowDeleteModal(false);
    alert(`Account ${selectedAccount.email} has been deleted.`);
  }, [selectedAccount]);

  return (
    <div className="approved-accounts-section">
      <div className="approved-header">
        <h3 className="approved-title">Registered Accounts</h3>
        <p className="approved-description">
          Total registered admin accounts: <span className="account-count">{approvedAccounts.length}</span>
        </p>
      </div>

      {approvedAccounts.length === 0 ? (
        <div className="no-accounts-message">
          No registered accounts found.
        </div>
      ) : (
        <div className="approved-table-wrapper">
          <table className="approved-table">
            <thead>
              <tr className="approved-header-row">
                <th className="approved-header-cell">User ID</th>
                <th className="approved-header-cell">Email</th>
                <th className="approved-header-cell">Office</th>
                <th className="approved-header-cell">Role</th>
                <th className="approved-header-cell">Date Approved</th>
                <th className="approved-header-cell actions-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {approvedAccounts.map((account) => (
                <tr key={account.id} className="approved-row">
                  <td className="approved-cell approved-cell-id" title={account.id}>
                    {account.id.substring(0, 8)}...
                  </td>
                  <td className="approved-cell approved-cell-email">
                    {account.email}
                  </td>
                  <td className="approved-cell">{account.office}</td>
                  <td className="approved-cell">
                    <span className={`role-badge role-${account.role.toLowerCase().replace(/\s/g, '-')}`}>
                      {account.role}
                    </span>
                  </td>
                  <td className="approved-cell approved-cell-date">
                    {account.dateApproved}
                  </td>
                  <td className="approved-cell approved-cell-actions">
                    <div className="approved-actions-container">
                      <button
                        onClick={() => openEditModal(account)}
                        className="action-btn btn-edit"
                        title="Edit Role"
                      >
                        <i className="fas fa-edit"></i> Edit
                      </button>
                      <button
                        onClick={() => openDeleteModal(account)}
                        className="action-btn btn-delete"
                        title="Delete Account"
                      >
                        <i className="fas fa-trash"></i> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedAccount && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4 className="modal-title">Edit User Role</h4>
            <p className="modal-text">
              Update the role for: <strong>{selectedAccount.email}</strong>
            </p>
            
            <div className="modal-form-group">
              <label htmlFor="role-select" className="modal-label">
                Select New Role:
              </label>
              <select
                id="role-select"
                value={editedRole}
                onChange={(e) => setEditedRole(e.target.value)}
                className="modal-role-dropdown"
              >
                <option value={ADMIN_ROLES.OSDS}>OSDS Admin</option>
                <option value={ADMIN_ROLES.OSDSLow}>OSDS-lowlevel</option>
                <option value={ADMIN_ROLES.KASAMA}>KASAMA Admin</option>
                <option value={ADMIN_ROLES.DEPARTMENT}>Department Admin</option>
              </select>
            </div>

            <div className="modal-actions">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-confirm"
                onClick={handleUpdateRole}
              >
                Update Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAccount && (
        <div className="modal-overlay">
          <div className="modal-content modal-delete">
            <h4 className="modal-title">Confirm Deletion</h4>
            <p className="modal-text">
              Are you sure you want to delete this account?
            </p>
            <p className="modal-email">
              <strong>{selectedAccount.email}</strong>
            </p>
            <p className="modal-warning">
              ⚠️ This action cannot be undone.
            </p>

            <div className="modal-actions">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-delete"
                onClick={handleDeleteAccount}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovedAccountsTable;
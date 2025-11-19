import React from "react";
import "./DeleteRecord.css";

const DeleteRecord = ({ category, record, onClose, onDeleteRecord }) => {
  const handleDeleteRecord = () => {
    // Show confirmation
    
      onDeleteRecord(record); // Call the parent function to delete the record
      onClose(); // Close the modal after deleting
    }
  

  return (
    <div className="delete-record-popup">
      <div className="popup-content">
        <h3>Delete Record</h3>
        <p>
          Are you sure you want to delete the record for the year <strong>{record.year}</strong>?
        </p>
        {/* Civil Status fields (visible if the category is civilStatus) */}
        {category === "civilStatus" && (
          <div className="record-details">
            <p>Single: {record.single}</p>
            <p>Married: {record.married}</p>
            <p>Widower: {record.widower}</p>
            <p>Separated: {record.separated}</p>
            <p>Divorced: {record.divorced}</p>
            <p>Not Reported: {record.notReported}</p>
          </div>
        )}
        <div className="popup-actions">
          <button className="btn-confirm" onClick={handleDeleteRecord}>
            Confirm Delete
          </button>
          <button className="btn-close" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteRecord;

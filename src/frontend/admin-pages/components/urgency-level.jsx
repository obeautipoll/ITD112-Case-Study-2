import React from 'react';
import '../../../styles-admin/urgency.css'; // Import the CSS file

const urgentComplaintsData = [
  {
    id: 'UCD-0045',
    category: 'Faculty Conduct',
    snippet: 'Professor used inappropriate language regarding my assignments...',
    priority: 'Critical',
    timeAgo: '35 mins ago',
    assigned: 'Unassigned',
  },
  {
    id: 'UCD-0044',
    category: 'Facilities',
    snippet: 'The air conditioning system in the main lecture hall is leaking badly.',
    priority: 'High',
    timeAgo: '1 hr ago',
    assigned: 'KASAMA',
  },
  {
    id: 'UCD-0043',
    category: 'Academic',
    snippet: 'My grade calculation seems incorrect after the last exam posting.',
    priority: 'Medium',
    timeAgo: '4 hrs ago',
    assigned: 'Ms. Torralba',
  },
  {
    id: 'UCD-0042',
    category: 'Admin Services',
    snippet: 'Financial aid documents were lost, delaying my enrollment confirmation.',
    priority: 'Critical',
    timeAgo: '5 hrs ago',
    assigned: 'Mr. Jones',
  },
];

// --- Sub-Component: Priority Tag ---
const PriorityTag = ({ priority }) => {
  let colorClasses;

  switch (priority) {
    case 'Critical':
      colorClasses = 'bg-red-600 text-white animate-pulse';
      break;
    case 'High':
      colorClasses = 'bg-orange-500 text-white';
      break;
    case 'Medium':
      colorClasses = 'bg-yellow-400 text-gray-800';
      break;
    default:
      colorClasses = 'bg-gray-300 text-gray-700';
  }

  return (
    <span
      className={`px-3 py-1 text-xs font-semibold rounded-full shadow-md ${colorClasses}`}
    >
      {priority.toUpperCase()}
    </span>
  );
};



const UrgentComplaintsWidget = () => {
  const newCount = urgentComplaintsData.filter(c => 
    c.timeAgo.includes('hr') || c.timeAgo.includes('min')
  ).length;

  const handleAction = (action, complaintId) => {
    console.log(`${action} triggered for complaint: ${complaintId}`);
  };

  return (
    <div className="urgent-complaints-widget">
      
      {/* Header */}
      <div className="widget-header">
        <h3 className="widget-title">
          <span className="widget-title-icon">🔥</span>
          Urgent Complaints Queue
        </h3>
        <span className="new-count-badge">
          {newCount} New
        </span>
      </div>

      {/* List Container */}
      <div className="complaints-list">
        {urgentComplaintsData.map((complaint) => (
          <div key={complaint.id} className="complaint-card">
            
            {/* Header with Priority + Category */}
            <div className="complaint-header">
              <span className={`priority-tag priority-${complaint.priority.toLowerCase()}`}>
                {complaint.priority.toUpperCase()}
              </span>
              <span className="complaint-category">
                {complaint.category}
              </span>
            </div>
            
            {/* Content */}
            <div className="complaint-content">
              <p className="complaint-id-snippet">
                {complaint.id}: {complaint.snippet}
              </p>
              
              <div className="complaint-meta">
                <span className="meta-time">
                  📅 Filed: {complaint.timeAgo}
                </span>
                <span className="meta-assignee">
                  👤 Assignee: 
                  <span className={complaint.assigned === 'Unassigned' ? 
                    'assignee-unassigned' : 'assignee-assigned'}>
                    {complaint.assigned}
                  </span>
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="complaint-actions">
              <button
                onClick={() => handleAction('View', complaint.id)}
                className="action-btn btn-view"
              >
                View Details
              </button>
              <button
                onClick={() => handleAction('Assign', complaint.id)}
                className={`action-btn ${
                  complaint.assigned === 'Unassigned' ? 'btn-assign' : 'btn-reassign'
                }`}
              >
                {complaint.assigned === 'Unassigned' ? 'Take Ownership' : 'Reassign'}
              </button>
            </div>
          </div>
        ))}

        {urgentComplaintsData.length === 0 && (
          <div className="empty-state">
            All quiet! No urgent complaints found.
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="widget-footer">
        <a 
          href="#"
          className="view-all-link"
          onClick={(e) => { 
            e.preventDefault(); 
            handleAction('Navigate to Full Queue'); 
          }}
        >
          View Full Complaints Queue
        </a>
      </div>

    </div>
  );
};

export default UrgentComplaintsWidget;
export default function StatusBadge({ status }) {
  const map = {
    "Low Risk": "badge-success",
    "Needs Review": "badge-warning",
    "High Priority Review Recommended": "badge-danger",
    "High Priority": "badge-danger",
  };
  return <span className={`badge ${map[status] || "badge-success"}`}>{status}</span>;
}

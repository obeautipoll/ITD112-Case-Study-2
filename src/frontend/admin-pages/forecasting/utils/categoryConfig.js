export const FORECAST_CATEGORIES = {
  sex: {
    label: "Sex",
    fields: [
      { key: "male", label: "Male", color: "#2563eb", predictedColor: "#60a5fa" },
      { key: "female", label: "Female", color: "#ec4899", predictedColor: "#f9a8d4" },
    ],
  },
  civilStatus: {
    label: "Civil Status",
    fields: [
      { key: "single", label: "Single", color: "#6366f1", predictedColor: "#c4b5fd" },
      { key: "married", label: "Married", color: "#f97316", predictedColor: "#fdba74" },
      { key: "widower", label: "Widower", color: "#10b981", predictedColor: "#6ee7b7" },
      { key: "separated", label: "Separated", color: "#facc15", predictedColor: "#fef08a" },
      { key: "divorced", label: "Divorced", color: "#0ea5e9", predictedColor: "#bae6fd" },
      { key: "notReported", label: "Not Reported", color: "#ef4444", predictedColor: "#fca5a5" },
    ],
  },
};

export const DEFAULT_CATEGORY = "sex";

export const getCategoryFields = (category) =>
  FORECAST_CATEGORIES[category]?.fields || FORECAST_CATEGORIES.sex.fields;

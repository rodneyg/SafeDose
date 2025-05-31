export interface FeedbackEntry {
  userId: string;
  feeling: "Great" | "Mild side effects" | "Something felt wrong";
  log?: string; // Optional, for the text input when "Something felt wrong" is selected
  timestamp: Date;
}

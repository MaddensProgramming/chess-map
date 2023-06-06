export interface LogData {
  action: string;
  eventName: string;
  newSourceUrl?: string;
  previousSourceUrl?: string | null;
  timestamp: Date;
}

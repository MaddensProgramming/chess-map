export interface LogData {
  action: string;
  eventName: string;
  newSourceUrl?: string;
  previousSourceUrl?: string;
  timestamp: Date;
}

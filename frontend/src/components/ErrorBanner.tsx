import { AlertCircle } from "lucide-react";

export interface ErrorBannerProps {
  errorMessage: string;
}

export function ErrorBanner({ errorMessage }: ErrorBannerProps) {
  return (
    <div className="error-banner" role="alert">
      <AlertCircle size={20} />
      <div>
        <strong>Unable to update weather</strong>
        <p>{errorMessage}</p>
      </div>
    </div>
  );
}

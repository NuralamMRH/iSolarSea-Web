import { AlertCircle, MapPin, Monitor, Smartphone } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LocationPermissionGuideProps {
  onRetry?: () => void;
  isDesktop?: boolean;
}

export function LocationPermissionGuide({ onRetry, isDesktop }: LocationPermissionGuideProps) {
  const deviceType = isDesktop ? 'desktop' : 'mobile';
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isDesktop ? <Monitor className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
          Location Access Required
        </CardTitle>
        <CardDescription>
          We need your location to provide accurate tracking and services.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Location Permission Needed</AlertTitle>
          <AlertDescription>
            {isDesktop 
              ? "Desktop browsers use network-based location which requires your permission."
              : "Mobile devices use GPS for more accurate location tracking."
            }
          </AlertDescription>
        </Alert>

        {isDesktop && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">How to enable location on desktop:</h4>
            <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
              <li>Look for the location icon (📍) in your browser's address bar</li>
              <li>Click on it and select "Allow" or "Always allow"</li>
              <li>If you don't see the icon, check your browser settings</li>
              <li>Refresh the page after granting permission</li>
            </ol>
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Desktop location is less accurate than mobile GPS but works well for general area detection.
              </p>
            </div>
          </div>
        )}

        {!isDesktop && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">How to enable location on mobile:</h4>
            <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
              <li>Ensure GPS/Location Services are enabled in your device settings</li>
              <li>Allow location access when prompted by the browser</li>
              <li>For best accuracy, move to an area with clear sky view</li>
              <li>Make sure you have a stable internet connection</li>
            </ol>
          </div>
        )}

        {onRetry && (
          <Button onClick={onRetry} className="w-full">
            <MapPin className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
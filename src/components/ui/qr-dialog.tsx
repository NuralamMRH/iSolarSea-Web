
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, Ship, Database, ArrowRightLeft } from 'lucide-react';

interface QrDialogProps {
  children?: React.ReactNode;
}

export function QrDialog({ children }: QrDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" /> 
            QR Actions
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>QR Code Quick Actions</DialogTitle>
          <DialogDescription>
            Use QR codes to quickly buy or sell from other vessels.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="buy" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy">
              <Database className="mr-2 h-4 w-4" />
              Buy Fish
            </TabsTrigger>
            <TabsTrigger value="sell">
              <Ship className="mr-2 h-4 w-4" />
              Sell Fish
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="buy" className="py-4">
            <div className="space-y-4">
              <h3 className="font-medium">Find Nearby Sellers</h3>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="flex flex-col items-center justify-center h-28 p-4">
                  <Ship className="h-10 w-10 mb-2" />
                  <span className="text-xs text-center">Show Vessels List</span>
                </Button>
                <Button variant="outline" className="flex flex-col items-center justify-center h-28 p-4">
                  <Ship className="h-10 w-10 mb-2" />
                  <span className="text-xs text-center">Show Map View</span>
                </Button>
              </div>
              <div className="pt-4 flex justify-center">
                <Button className="w-full">
                  <QrCode className="mr-2 h-4 w-4" />
                  Scan Seller QR Code
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="sell" className="py-4">
            <div className="space-y-4">
              <h3 className="font-medium">Your Sale Options</h3>
              <div className="border rounded-lg p-6 flex flex-col items-center justify-center space-y-4">
                <QrCode className="h-24 w-24" />
                <p className="text-sm text-center">Your Vessel QR Code</p>
              </div>
              <div className="pt-4">
                <Button className="w-full">
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Create Transaction
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

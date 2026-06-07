'use client';

import { User, Link } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CustomerInfoProps {
  customerName: string;
  customerContact: string;
  onNameChange: (value: string) => void;
  onContactChange: (value: string) => void;
}

export function CustomerInfoCard({
  customerName,
  customerContact,
  onNameChange,
  onContactChange,
}: CustomerInfoProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <User className="h-4 w-4 text-muted-foreground" />
          Thông tin khách hàng
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customer-name" className="text-sm text-muted-foreground">
              Họ và tên
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="customer-name"
                placeholder="Họ và tên khách"
                value={customerName}
                onChange={(e) => onNameChange(e.target.value)}
                onFocus={(e) => {
                  const target = e.target;
                  setTimeout(() => target.select(), 50);
                }}
                className="pl-10 h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-contact" className="text-sm text-muted-foreground">
              Liên hệ
            </Label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="customer-contact"
                placeholder="Link FB / Zalo / SĐT"
                value={customerContact}
                onChange={(e) => onContactChange(e.target.value)}
                onFocus={(e) => {
                  const target = e.target;
                  setTimeout(() => target.select(), 50);
                }}
                className="pl-10 h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

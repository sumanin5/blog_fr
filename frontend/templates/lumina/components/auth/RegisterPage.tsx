import React from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Cpu, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const RegisterPage: React.FC = () => {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center relative overflow-hidden">
       {/* Background Decor */}
       <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-secondary/30 rounded-full blur-[80px] -z-10"></div>
       <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-primary/20 rounded-full blur-[80px] -z-10"></div>

      <Card className="w-full max-w-md border-primary/20 bg-background/60 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Top glow bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
        
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/50 border border-border">
            <Cpu className="h-6 w-6 text-foreground" />
          </div>
          <CardTitle className="text-2xl font-mono tracking-tight">INITIALIZE_USER</CardTitle>
          <CardDescription>
            Create a new identity on the Lumina network.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="John" />
             </div>
             <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Doe" />
             </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="john@lumina.os" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" variant="default">
            Create Account
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Access System
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
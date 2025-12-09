import React from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Fingerprint, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] -z-10 animate-pulse-slow"></div>

      <Card className="w-full max-w-md border-primary/20 bg-background/60 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/50">
            <Fingerprint className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-mono tracking-tight">ACCESS_GRANTED</CardTitle>
          <CardDescription>
            Enter your credentials to access the mainframe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="pilot@lumina.os" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
               <Label htmlFor="password">Password</Label>
               <a href="#" className="text-xs text-primary hover:underline">Forgot?</a>
            </div>
            <Input id="password" type="password" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full group" variant="tech">
            Authenticate
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            Don't have an identity?{" "}
            <Link to="/register" className="text-primary hover:underline">
              Initialize New User
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
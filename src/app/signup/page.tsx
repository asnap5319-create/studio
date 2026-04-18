import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-5xl font-bold text-primary [filter:drop-shadow(0_0_8px_hsl(var(--primary)))]">
          A.snap
        </h1>
        <p className="text-muted-foreground">Sign up to see photos and videos from your friends.</p>
        
        <div className="flex justify-center pt-4">
            <div className="relative">
                <label htmlFor="photo-upload" className="cursor-pointer">
                    <Avatar className="h-24 w-24 border-2 border-dashed border-border">
                        <AvatarFallback className="bg-transparent">
                            <Camera className="h-10 w-10 text-muted-foreground" />
                        </AvatarFallback>
                    </Avatar>
                </label>
                <Input id="photo-upload" type="file" className="hidden" accept="image/*"/>
            </div>
        </div>
        
        <div className="w-full space-y-3 pt-2">
          <Input type="text" placeholder="Name" className="h-12 text-base" />
          <Input type="text" placeholder="Username" className="h-12 text-base" />
          <Input type="tel" placeholder="Phone number" className="h-12 text-base" />
          <Button className="w-full h-12 text-lg font-bold">
            Sign Up
          </Button>
        </div>

        <p className="px-8 text-center text-xs text-muted-foreground">
            By signing up, you agree to our Terms, Privacy Policy and Cookies Policy.
        </p>

        <div className="border-t border-border mt-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Have an account?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

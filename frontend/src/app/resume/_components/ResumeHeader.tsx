import React from "react";
import Image from "next/image";
import { Mail, Phone, Link as LinkIcon, Github, MapPin } from "lucide-react";

export function ResumeHeader() {
  return (
    <header
      className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 mb-12 border-b pb-8 print:border-b-2 print:border-black"
      id="resume-header"
    >
      <div className="flex-1 text-center md:text-left space-y-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-2 text-primary">
            田毅
          </h1>
          <p className="text-xl text-muted-foreground font-medium flex items-center justify-center md:justify-start gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse print:hidden"></span>
            Full-Stack Engineer
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 text-sm text-foreground/80">
          <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <a href="tel:+8613125156210">131 2515 6210</a>
          </div>
          <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <a href="mailto:ty1547@outlook.com">ty1547@outlook.com</a>
          </div>
          <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <LinkIcon className="w-4 h-4 text-muted-foreground" />
            <a
              href="https://ty1547.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              ty1547.com
            </a>
          </div>
          <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <Github className="w-4 h-4 text-muted-foreground" />
            <a
              href="https://github.com/sumanin5"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/sumanin5
            </a>
          </div>
        </div>
      </div>

      <div className="relative w-32 h-32 md:w-40 md:h-40 shrink-0 overflow-hidden rounded-full shadow-md border-4 border-background print:border-none print:shadow-none">
        {/* Replace with actual image in production */}
        <Image
          src="/个人照片.jpg"
          alt="Avatar"
          fill
          unoptimized
          className="object-cover"
        />
      </div>
    </header>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { activeAdConfig, CustomAdCampaign } from "@/config/ads";

interface AdBannerProps {
  slotId: string;
  format?: "auto" | "fluid" | "rectangle" | "vertical" | "horizontal";
  responsive?: "true" | "false";
  style?: React.CSSProperties;
  className?: string;
  minHeight?: number;
}

export default function AdBanner({
  slotId,
  format = "auto",
  responsive = "true",
  style,
  className = "",
  minHeight = 90,
}: AdBannerProps) {
  const [useFallback, setUseFallback] = useState(false);
  const [campaign, setCampaign] = useState<CustomAdCampaign | null>(null);
  const adRef = useRef<HTMLModElement>(null);
  const initialized = useRef(false);

  const provider = activeAdConfig.provider;
  const clientId = activeAdConfig.adsenseClientId;

  // Initialize and select a random custom campaign banner
  useEffect(() => {
    if (activeAdConfig.customCampaigns.length > 0) {
      const randomCampaign =
        activeAdConfig.customCampaigns[
          Math.floor(Math.random() * activeAdConfig.customCampaigns.length)
        ];
      setCampaign(randomCampaign);
    }
  }, []);

  // Determine if we should start with fallback immediately
  useEffect(() => {
    if (provider === "custom" || !clientId) {
      setUseFallback(true);
    }
  }, [provider, clientId]);

  // Load AdSense ads and set up fallback listeners
  useEffect(() => {
    if (useFallback || !clientId || initialized.current) return;

    const loadAd = () => {
      try {
        if (typeof window !== "undefined") {
          const adsbygoogle = (window as any).adsbygoogle || [];
          adsbygoogle.push({});
          initialized.current = true;
          
          // Monitor the ad slot to check if it gets filled
          // If it remains empty or is hidden after 2 seconds (e.g. adblocker or no fill),
          // fall back to a custom banner.
          const checkTimeout = setTimeout(() => {
            if (adRef.current) {
              const status = adRef.current.getAttribute("data-ad-status");
              const isHidden = 
                adRef.current.offsetHeight === 0 || 
                window.getComputedStyle(adRef.current).display === "none";
              
              if (status === "unfilled" || isHidden) {
                console.log(`AdSense slot ${slotId} unfilled or blocked. Falling back to custom banner.`);
                setUseFallback(true);
              }
            }
          }, 2000);

          return () => clearTimeout(checkTimeout);
        }
      } catch (err) {
        console.error("Error pushing AdSense banner:", err);
        setUseFallback(true);
      }
    };

    // Delay slightly to ensure script is fully ready
    const timer = setTimeout(loadAd, 200);
    return () => clearTimeout(timer);
  }, [useFallback, clientId, slotId]);

  // If fallback is active and we have a custom campaign, render it with high-end style
  if (useFallback && campaign) {
    return (
      <div 
        className={`relative my-4 overflow-hidden rounded-xl border border-border/40 bg-card/60 backdrop-blur-md transition-all duration-300 hover:border-primary/30 group ${className}`}
        style={{ minHeight, ...style }}
      >
        <Link 
          href={campaign.targetUrl} 
          className="flex flex-col md:flex-row items-center justify-between w-full h-full p-4 gap-4"
        >
          {/* Main Info */}
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted/30 flex-shrink-0">
              <Image 
                src={campaign.imageUrl}
                alt={campaign.altText}
                fill
                sizes="64px"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="text-left">
              <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-primary uppercase bg-primary/10 rounded mb-1">
                Sponsored
              </span>
              <h4 className="text-sm font-semibold text-foreground leading-tight group-hover:text-primary transition-colors duration-200">
                {campaign.title}
              </h4>
              {campaign.subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {campaign.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex-shrink-0">
            <span className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary rounded-lg shadow-sm hover:bg-primary/90 transition-colors duration-200">
              Learn More
            </span>
          </div>
        </Link>
      </div>
    );
  }

  // Render Google AdSense Slot
  return (
    <div 
      className={`ad-container my-4 overflow-hidden w-full flex flex-col items-center justify-center ${className}`}
      style={{ minHeight, ...style }}
    >
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60 mb-1 block">
        Advertisement
      </span>
      <ins
        key={slotId}
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block", width: "100%", minHeight }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
    </div>
  );
}

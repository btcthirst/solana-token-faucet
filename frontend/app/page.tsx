"use client";

import { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { FaucetCard } from "./components/FaucetCard";
import { ClaimHistory } from "./components/ClaimHistory";

export default function Home() {
  const [refreshTick, setRefreshTick] = useState(0);

  function handleClaimed() {
    setRefreshTick((n) => n + 1);
  }

  return (
    <div className="page-root">
      {/* Ambient background */}
      <div className="page-bg" aria-hidden="true">
        <div className="page-bg__orb page-bg__orb--1" />
        <div className="page-bg__orb page-bg__orb--2" />
        <div className="page-bg__grid" />
      </div>

      {/* Nav */}
      <header className="page-nav">
        <div className="page-nav__brand">
          <span className="page-nav__logo">◎</span>
          <span className="page-nav__name">Token Faucet</span>
        </div>
        <WalletMultiButton />
      </header>

      {/* Main */}
      <main className="page-main">
        <div className="page-hero">
          <h1 className="page-hero__title">
            Free Devnet
            <br />
            <em>Tokens</em>
          </h1>
          <p className="page-hero__sub">
            On-chain rate limiting · No sign-up · Instant delivery
          </p>
        </div>

        <div className="page-cards">
          <FaucetCard onClaimed={handleClaimed} />
          <ClaimHistory refreshTrigger={refreshTick} />
        </div>
      </main>

      <footer className="page-footer">
        Built with Anchor · Solana Devnet
      </footer>
    </div>
  );
}
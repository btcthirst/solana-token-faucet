"use client";

import { useEffect, useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import {
    fetchUserClaim,
    fetchFaucetConfig,
    getProgram,
    getSecondsUntilNextClaim,
    formatCooldown,
    formatAmount,
    formatTimestamp,
    type UserClaimData,
    type FaucetConfig,
} from "../../utils/faucet";

interface ClaimHistoryProps {
    refreshTrigger?: number;
}

export function ClaimHistory({ refreshTrigger }: ClaimHistoryProps) {
    const { connection } = useConnection();
    const wallet = useWallet();

    const [userClaim, setUserClaim] = useState<UserClaimData | null>(null);
    const [config, setConfig] = useState<FaucetConfig | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [loaded, setLoaded] = useState(false);

    const load = useCallback(async () => {
        if (!wallet.publicKey) return;
        try {
            const provider = new AnchorProvider(connection, wallet as never, {
                commitment: "confirmed",
            });
            const program = getProgram(provider);
            const [claim, cfg] = await Promise.all([
                fetchUserClaim(program, wallet.publicKey),
                fetchFaucetConfig(program),
            ]);
            setUserClaim(claim);
            setConfig(cfg);
            if (claim && cfg) {
                setSecondsLeft(
                    getSecondsUntilNextClaim(claim.lastClaimAt, cfg.cooldownSeconds)
                );
            }
        } catch (e) {
            console.error("ClaimHistory load error", e);
        } finally {
            setLoaded(true);
        }
    }, [wallet.publicKey, connection]);

    useEffect(() => {
        if (wallet.publicKey) {
            setLoaded(false);
            load();
        }
    }, [wallet.publicKey, load, refreshTrigger]);

    // Live countdown
    useEffect(() => {
        if (secondsLeft <= 0) return;
        const id = setInterval(() => {
            setSecondsLeft((s) => Math.max(0, s - 1));
        }, 1000);
        return () => clearInterval(id);
    }, [secondsLeft]);

    if (!wallet.connected) return null;

    if (!loaded) {
        return (
            <div className="history-card history-card--loading">
                <div className="faucet-spinner faucet-spinner--sm" />
            </div>
        );
    }

    if (!userClaim) {
        return (
            <div className="history-card">
                <h3 className="history-title">Your Claim History</h3>
                <p className="history-empty">
                    No claims yet. Make your first claim above!
                </p>
            </div>
        );
    }

    const totalDisplay = formatAmount(userClaim.totalClaimed.toNumber());
    const lastDisplay = formatTimestamp(userClaim.lastClaimAt);
    const perClaim = config
        ? formatAmount(config.amountPerClaim.toNumber())
        : "—";
    const claimCount =
        config && config.amountPerClaim.toNumber() > 0
            ? Math.round(
                userClaim.totalClaimed.toNumber() /
                config.amountPerClaim.toNumber()
            )
            : 0;

    return (
        <div className="history-card">
            <h3 className="history-title">Your Claim History</h3>

            <div className="history-grid">
                <StatBox label="Total Claimed" value={totalDisplay} unit="tokens" />
                <StatBox label="Claims Made" value={String(claimCount)} unit="times" />
                <StatBox label="Per Claim" value={perClaim} unit="tokens" />
                <StatBox
                    label="Next Claim"
                    value={secondsLeft > 0 ? formatCooldown(secondsLeft) : "Now!"}
                    unit={secondsLeft > 0 ? "remaining" : ""}
                    highlight={secondsLeft === 0}
                />
            </div>

            <div className="history-last">
                <span className="history-last__label">Last claimed</span>
                <span className="history-last__value">{lastDisplay}</span>
            </div>
        </div>
    );
}

function StatBox({
    label,
    value,
    unit,
    highlight,
}: {
    label: string;
    value: string;
    unit: string;
    highlight?: boolean;
}) {
    return (
        <div className={`stat-box${highlight ? " stat-box--highlight" : ""}`}>
            <span className="stat-box__label">{label}</span>
            <span className="stat-box__value">{value}</span>
            {unit && <span className="stat-box__unit">{unit}</span>}
        </div>
    );
}
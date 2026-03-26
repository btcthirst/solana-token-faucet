"use client";

import { useEffect, useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import {
    fetchFaucetConfig,
    fetchUserClaim,
    fetchTokenBalance,
    claimTokens,
    getProgram,
    getSecondsUntilNextClaim,
    formatCooldown,
    formatAmount,
    type FaucetConfig,
    type UserClaimData,
} from "../../utils/faucet";

type ClaimStatus = "idle" | "loading" | "success" | "error";

interface FaucetCardProps {
    onClaimed?: () => void;
}

export function FaucetCard({ onClaimed }: FaucetCardProps) {
    const { connection } = useConnection();
    const wallet = useWallet();

    const [config, setConfig] = useState<FaucetConfig | null>(null);
    const [userClaim, setUserClaim] = useState<UserClaimData | null>(null);
    const [balance, setBalance] = useState<number>(0);
    const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
    const [status, setStatus] = useState<ClaimStatus>("idle");
    const [txSig, setTxSig] = useState<string>("");
    const [errorMsg, setErrorMsg] = useState<string>("");
    const [dataLoaded, setDataLoaded] = useState(false);

    const loadData = useCallback(async () => {
        if (!wallet.publicKey) return;
        try {
            const provider = new AnchorProvider(connection, wallet as never, {
                commitment: "confirmed",
            });
            const program = getProgram(provider);
            const cfg = await fetchFaucetConfig(program);
            const claim = await fetchUserClaim(program, wallet.publicKey);
            const bal = cfg
                ? await fetchTokenBalance(connection, wallet.publicKey, cfg.mint)
                : 0;

            setConfig(cfg);
            setUserClaim(claim);
            setBalance(bal);

            if (cfg && claim) {
                setCooldownRemaining(
                    getSecondsUntilNextClaim(claim.lastClaimAt, cfg.cooldownSeconds)
                );
            }
            setDataLoaded(true);
        } catch (e) {
            console.error("loadData error", e);
        }
    }, [wallet.publicKey, connection]);

    useEffect(() => {
        if (wallet.publicKey) {
            loadData();
        } else {
            setDataLoaded(false);
            setConfig(null);
            setUserClaim(null);
            setBalance(0);
        }
    }, [wallet.publicKey, loadData]);

    // Countdown tick
    useEffect(() => {
        if (cooldownRemaining <= 0) return;
        const id = setInterval(() => {
            setCooldownRemaining((prev) => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(id);
    }, [cooldownRemaining]);

    const canClaim = cooldownRemaining === 0 && !!config;

    async function handleClaim() {
        if (!wallet.publicKey || !config) return;
        setStatus("loading");
        setErrorMsg("");
        setTxSig("");
        try {
            const provider = new AnchorProvider(connection, wallet as never, {
                commitment: "confirmed",
            });
            const program = getProgram(provider);
            const sig = await claimTokens(program, wallet.publicKey, config.mint);
            setTxSig(sig);
            setStatus("success");
            await loadData();
            setCooldownRemaining(config.cooldownSeconds.toNumber());
            onClaimed?.();
        } catch (e: unknown) {
            setStatus("error");
            const err = e as { error?: { errorMessage?: string }; message?: string };
            setErrorMsg(
                err?.error?.errorMessage ?? err?.message ?? "Transaction failed"
            );
        }
    }

    if (!wallet.connected) {
        return (
            <div className="faucet-card faucet-card--disconnected">
                <div className="faucet-icon">◎</div>
                <p className="faucet-hint">Connect your wallet to claim tokens</p>
            </div>
        );
    }

    if (!dataLoaded) {
        return (
            <div className="faucet-card faucet-card--loading">
                <div className="faucet-spinner" />
                <p>Loading faucet data…</p>
            </div>
        );
    }

    if (!config) {
        return (
            <div className="faucet-card faucet-card--error">
                <p>⚠ Faucet config not found on-chain.</p>
            </div>
        );
    }

    const amountDisplay = formatAmount(config.amountPerClaim.toNumber());
    const cooldownH = Math.floor(config.cooldownSeconds.toNumber() / 3600);
    const cooldownLabel =
        cooldownH > 0
            ? `${cooldownH}h`
            : `${config.cooldownSeconds.toNumber()}s`;

    const progressPct =
        config.cooldownSeconds.toNumber() > 0
            ? Math.max(
                0,
                100 -
                (cooldownRemaining / config.cooldownSeconds.toNumber()) * 100
            )
            : 100;

    return (
        <div className={`faucet-card${status === "loading" ? " faucet-card--busy" : ""}`}>
            {/* Header */}
            <div className="faucet-header">
                <span className="faucet-badge">DEVNET</span>
                <h2 className="faucet-title">Token Faucet</h2>
                <p className="faucet-subtitle">
                    Claim <strong>{amountDisplay}</strong> tokens every {cooldownLabel}
                </p>
            </div>

            {/* Balance */}
            <div className="faucet-balance">
                <span className="faucet-balance__label">Your Balance</span>
                <span className="faucet-balance__value">{formatAmount(balance)}</span>
            </div>

            {/* Cooldown bar */}
            {!canClaim && (
                <div className="faucet-cooldown">
                    <span className="faucet-cooldown__label">Next claim in</span>
                    <span className="faucet-cooldown__timer">
                        {formatCooldown(cooldownRemaining)}
                    </span>
                    <div className="faucet-cooldown__bar-track">
                        <div
                            className="faucet-cooldown__bar-fill"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Claim button */}
            <button
                className={`faucet-btn${!canClaim ? " faucet-btn--disabled" : ""}${status === "loading" ? " faucet-btn--loading" : ""
                    }`}
                onClick={handleClaim}
                disabled={!canClaim || status === "loading"}
            >
                {status === "loading" ? (
                    <>
                        <span className="faucet-btn__spinner" /> Claiming…
                    </>
                ) : canClaim ? (
                    "Claim Tokens"
                ) : (
                    `Cooldown: ${formatCooldown(cooldownRemaining)}`
                )}
            </button>

            {/* Feedback */}
            {status === "success" && (
                <div className="faucet-feedback faucet-feedback--success">
                    ✓ Claimed! Tx:{" "}
                    {/* <a
                        href={`https://solscan.io/tx/${txSig}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="faucet-tx-link"
                    >
                        {txSig.slice(0, 8)}…{txSig.slice(-8)}
                    </a>*/}
                    <span className="faucet-tx-link">
                        {txSig.slice(0, 8)}…{txSig.slice(-8)}
                    </span>
                </div>
            )}
            {status === "error" && (
                <div className="faucet-feedback faucet-feedback--error">
                    ✗ {errorMsg}
                </div>
            )}
        </div>
    );
}
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import {
    getAssociatedTokenAddress,
    getAccount,
    TokenAccountNotFoundError,
} from "@solana/spl-token";
import { SolanaTokenFaucet } from "../app/types/solana_token_faucet";
import idl from "../app/idl.json";

export const PROGRAM_ID = new PublicKey(
    "H6VGVgxYSvWfthBTs6p9r7EBqTAXn2967nF7ziQcFn1v"
);

export function getFaucetConfigPDA(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("faucet")],
        PROGRAM_ID
    );
    return pda;
}

export function getUserClaimPDA(userPubkey: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user-claim"), userPubkey.toBuffer()],
        PROGRAM_ID
    );
    return pda;
}

export function getProgram(
    provider: AnchorProvider
): Program<SolanaTokenFaucet> {
    return new Program(idl as SolanaTokenFaucet, provider);
}

export interface FaucetConfig {
    mint: PublicKey;
    amountPerClaim: BN;
    cooldownSeconds: BN;
    bump: number;
}

export interface UserClaimData {
    user: PublicKey;
    lastClaimAt: BN;
    totalClaimed: BN;
}

export async function fetchFaucetConfig(
    program: Program<SolanaTokenFaucet>
): Promise<FaucetConfig | null> {
    try {
        const pda = getFaucetConfigPDA();
        const config = await program.account.faucetConfig.fetch(pda);
        return config as FaucetConfig;
    } catch {
        return null;
    }
}

export async function fetchUserClaim(
    program: Program<SolanaTokenFaucet>,
    userPubkey: PublicKey
): Promise<UserClaimData | null> {
    try {
        const pda = getUserClaimPDA(userPubkey);
        const claim = await program.account.userClaim.fetch(pda);
        return claim as UserClaimData;
    } catch {
        return null;
    }
}

export async function fetchTokenBalance(
    connection: Connection,
    userPubkey: PublicKey,
    mintPubkey: PublicKey
): Promise<number> {
    try {
        const ata = await getAssociatedTokenAddress(mintPubkey, userPubkey);
        const account = await getAccount(connection, ata);
        return Number(account.amount);
    } catch (e) {
        if (e instanceof TokenAccountNotFoundError) return 0;
        return 0;
    }
}

export async function claimTokens(
    program: Program<SolanaTokenFaucet>,
    userPubkey: PublicKey,
    mintPubkey: PublicKey
): Promise<string> {
    const faucetConfigPDA = getFaucetConfigPDA();
    const tx = await program.methods
        .claim()
        .accounts({
            user: userPubkey,
            mint: mintPubkey,
            faucetConfig: faucetConfigPDA,
        } as never)
        .rpc();
    return tx;
}

export function getSecondsUntilNextClaim(
    lastClaimAt: BN,
    cooldownSeconds: BN
): number {
    const now = Math.floor(Date.now() / 1000);
    const nextClaimAt = lastClaimAt.toNumber() + cooldownSeconds.toNumber();
    return Math.max(0, nextClaimAt - now);
}

export function formatCooldown(seconds: number): string {
    if (seconds <= 0) return "Ready";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

export function formatTimestamp(ts: BN): string {
    if (ts.toNumber() === 0) return "Never";
    return new Date(ts.toNumber() * 1000).toLocaleString();
}

export function formatAmount(raw: number, decimals = 9): string {
    const value = raw / Math.pow(10, decimals);
    if (value === 0) return "0";
    if (value < 0.001) return value.toExponential(2);
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

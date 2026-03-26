import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaTokenFaucet } from "../target/types/solana_token_faucet";
import {
    AuthorityType,
    createMint,
    setAuthority,
} from "@solana/spl-token";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import fs from "fs";
import os from "os";
import path from "path";

// ── Налаштування ────────────────────────────────────────
const COOLDOWN_SECONDS = 24 * 60 * 60;               // 24 години
const AMOUNT_PER_CLAIM = new anchor.BN(1_000_000_000); // 1 токен (9 decimals)
const EXISTING_MINT: string | null = null;             // або вкажи адресу існуючого mint
const RPC = "http://127.0.0.1:8899";
// ────────────────────────────────────────────────────────

async function loadWallet(): Promise<Keypair> {
    const keyPath = path.join(os.homedir(), ".config", "solana", "id.json");
    const raw = fs.readFileSync(keyPath, "utf-8");
    const secret = Uint8Array.from(JSON.parse(raw));
    return Keypair.fromSecretKey(secret);
}

async function main() {
    const connection = new anchor.web3.Connection(RPC, "confirmed");
    const payer = await loadWallet();

    console.log("Payer:", payer.publicKey.toBase58());

    const balance = await connection.getBalance(payer.publicKey);
    console.log("Balance:", balance / LAMPORTS_PER_SOL, "SOL");
    if (balance < LAMPORTS_PER_SOL * 0.1) {
        console.log("Airdropping 2 SOL...");
        const sig = await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction(sig);
    }

    const provider = new anchor.AnchorProvider(
        connection,
        new anchor.Wallet(payer),
        { commitment: "confirmed" }
    );
    anchor.setProvider(provider);

    const program = anchor.workspace.solanaTokenFaucet as Program<SolanaTokenFaucet>;

    const [faucetConfig] = PublicKey.findProgramAddressSync(
        [Buffer.from("faucet")],
        program.programId
    );
    console.log("Faucet Config PDA:", faucetConfig.toBase58());

    // Mint — існуючий або створюємо новий
    let mint: PublicKey;
    if (EXISTING_MINT) {
        mint = new PublicKey(EXISTING_MINT);
        console.log("Using existing mint:", mint.toBase58());
    } else {
        mint = await createMint(connection, payer, payer.publicKey, null, 9);
        console.log("Created new mint:", mint.toBase58());
    }

    // Передати mint authority фосету
    await setAuthority(
        connection,
        payer,
        mint,
        payer.publicKey,
        AuthorityType.MintTokens,
        faucetConfig
    );
    console.log("✅ Mint authority transferred to faucet PDA");

    // Ініціалізувати фосет
    await program.methods
        .initialize(mint, AMOUNT_PER_CLAIM, new anchor.BN(COOLDOWN_SECONDS))
        .accounts({ mintAuthority: payer.publicKey })
        .rpc();

    console.log("✅ Faucet initialized");
    console.log(`   Mint:             ${mint.toBase58()}`);
    console.log(`   Amount per claim: ${AMOUNT_PER_CLAIM.toNumber() / 1e9} tokens`);
    console.log(`   Cooldown:         ${COOLDOWN_SECONDS / 3600}h`);
    console.log("");
    console.log("Збережи mint адресу — вона потрібна для фронтенду.");
}

main().catch(console.error);

// FILE: scripts/initialize.ts
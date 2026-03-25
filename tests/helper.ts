import { createMint } from "@solana/spl-token";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";


export async function createTestEnvironment(connection: Connection) {
    const user = Keypair.generate();

    const signature = await connection.requestAirdrop(user.publicKey, LAMPORTS_PER_SOL);
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
        signature,
        ...latestBlockhash,
    });
    const mint = await createMint(
        connection,
        user,
        user.publicKey,
        null,
        9
    );

    return { user, mint };
}
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaTokenFaucet } from "../target/types/solana_token_faucet";
import { createTestEnvironment } from "./helper";
import { AuthorityType, getAssociatedTokenAddress, setAuthority } from "@solana/spl-token";
import { assert } from "chai";



describe("solana-token-faucet", () => {
  let connection: anchor.web3.Connection;
  let provider: anchor.AnchorProvider;
  let user: anchor.web3.Keypair;
  let mint: anchor.web3.PublicKey;
  let program: Program<SolanaTokenFaucet>;
  let faucetConfig: anchor.web3.PublicKey;

  before(async () => {
    connection = new anchor.web3.Connection("http://localhost:8899");
    ({ user, mint } = await createTestEnvironment(connection));
    provider = new anchor.AnchorProvider(connection, new anchor.Wallet(user), { commitment: "confirmed" });
    anchor.setProvider(provider);
    program = anchor.workspace.solanaTokenFaucet as Program<SolanaTokenFaucet>;
    [faucetConfig] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("faucet")],
      program.programId
    );

    console.log("faucetConfig", faucetConfig.toBase58());

    const mintAuthority = await setAuthority(
      connection,
      user,
      mint,
      user.publicKey,
      AuthorityType.MintTokens,
      faucetConfig,
    );

    await program.methods.initialize(mint, new anchor.BN(3), new anchor.BN(1)).accounts({
      mintAuthority: user.publicKey,
    }).rpc();
  })


  it("claims", async () => {
    const ATA = await getAssociatedTokenAddress(
      mint,
      user.publicKey,
    );
    const tx = await program.methods.claim().accounts({
      user: user.publicKey,
      mint: mint,
      faucetConfig: faucetConfig,
    }).signers([user]).rpc();
    console.log("Your transaction signature", tx);
  });

  it("claims again error", async () => {
    try {
      const tx = await program.methods.claim()
        .accounts({
          user: user.publicKey,
          mint: mint,
          faucetConfig: faucetConfig,
        }).signers([user]).rpc();
      assert.fail("Should not be able to claim again");
    } catch (error) {
      assert.equal(error.error.errorCode.code, "CooldownNotExpired");
    }
  });


  it("claims again", async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const tx = await program.methods.claim()
      .accounts({
        user: user.publicKey,
        mint: mint,
        faucetConfig: faucetConfig,
      }).signers([user]).rpc();
    console.log("Your transaction signature", tx);
  });

});

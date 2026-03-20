use anchor_lang::prelude::*;

declare_id!("H6VGVgxYSvWfthBTs6p9r7EBqTAXn2967nF7ziQcFn1v");

#[program]
pub mod solana_token_faucet {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>,mint: Pubkey, amount_per_claim: u64, cooldown_seconds: u64) -> Result<()> {
        ctx.accounts.faucet_config.mint = mint;
        ctx.accounts.faucet_config.amount_per_claim = amount_per_claim;
        ctx.accounts.faucet_config.cooldown_seconds = cooldown_seconds;
        ctx.accounts.faucet_config.bump = ctx.bumps.faucet_config;
        Ok(())
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let user_claim = &mut ctx.accounts.user_claim;
        let faucet_config = &ctx.accounts.faucet_config;
        
        if !user_claim.can_claim(faucet_config.cooldown_seconds) {
            return Err(FaucetError::CooldownNotExpired.into());
        }

        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.user_ata.to_account_info(),
            authority: ctx.accounts.faucet_config.to_account_info(),
        };

        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            &[&[b"faucet", &[ctx.accounts.faucet_config.bump]]],
        );

        token::mint_to(cpi_context, faucet_config.amount_per_claim)?;
        
        user_claim.last_claim_at = Clock::get().unwrap().unix_timestamp;
        user_claim.total_claimed += faucet_config.amount_per_claim;
        
        Ok(())
    }
        
    
}

#[derive(Accounts)]
pub struct Initialize {
    #[account(mut, signer)]
    pub mint_authority: Signer<'info>,
    #[account(mut, init,  payer = mint_authority, space = FaucetConfig::LEN, seeds = [b"faucet"], bump)]
    pub faucet_config: Account<'info, FaucetConfig>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct FaucetConfig {
    pub mint: Pubkey,
    pub amount_per_claim: u64,
    pub cooldown_seconds: u64,
    pub bump: u8
}

impl FaucetConfig {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 1;
}

#[account]
pub struct UserClaim {
    pub user: Pubkey,
    pub last_claim_at: i64,
    pub total_claimed: u64
}

impl UserClaim {
    pub const LEN: usize = 8 + 32 + 8 + 8;

    pub fn can_claim(&self, cooldown_seconds: u64) -> bool {
        let now = Clock::get().unwrap().unix_timestamp;
        now - self.last_claim_at > cooldown_seconds as i64
    }
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut, signer)]
    pub user: Signer<'info>,
    #[account(mut, init_if_needed, payer = user, space = UserClaim::LEN, seeds = [b"user-claim", user.key().as_ref()], bump)]
    pub user_claim: Account<'info, UserClaim>,
    pub faucet_config: Account<'info, FaucetConfig>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    pub user_ata: Account<'info, TokenAccount>,
    #[account(mut, constraint = mint.mint_authority == COption::Some(faucet_config.key()))]
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}
    

#[error_code]
pub enum FaucetError {
    #[msg("Cooldown not expired. Try again later.")]
    CooldownNotExpired,
    #[msg("Faucet is empty.")]
    FaucetEmpty,
}
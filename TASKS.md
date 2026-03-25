# #06 Token Faucet — TASKS.md

## Мета
Web-додаток який видає тестові токени користувачам
з обмеженням частоти запитів (rate limiting) on-chain.
Перший проєкт де Rust контракт захищає від зловживань.

---

## Стек
- Rust + Anchor
- Next.js 14+ (App Router)
- `@solana/web3.js` + `@coral-xyz/anchor`
- `@solana/spl-token`
- TypeScript

---

## Архітектура

```
token-faucet/
├── programs/token-faucet/src/
│   └── lib.rs                   ← Anchor програма
├── tests/
│   └── token-faucet.ts
├── Anchor.toml
└── frontend/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── components/
    │       ├── FaucetCard.tsx    ← головний UI
    │       └── ClaimHistory.tsx  ← історія отримань
    └── utils/
        └── faucet.ts            ← логіка взаємодії з програмою
```

---

## Нові концепти (перед стартом прочитай)

### Rate Limiting on-chain
Зберігаємо в акаунті час останнього отримання.
При кожному запиті перевіряємо чи пройшло достатньо часу.

```rust
#[account]
pub struct UserClaim {
    pub user: Pubkey,         // 32 bytes
    pub last_claim_at: i64,   // 8 bytes — unix timestamp
    pub total_claimed: u64,   // 8 bytes — всього отримано
}

// Перевірка в інструкції:
let now = Clock::get()?.unix_timestamp;
let cooldown = 24 * 60 * 60; // 24 години в секундах
require!(
    now - ctx.accounts.user_claim.last_claim_at >= cooldown,
    FaucetError::CooldownNotExpired
);
```

### Custom Errors
Anchor дозволяє визначати власні помилки:
```rust
#[error_code]
pub enum FaucetError {
    #[msg("Cooldown not expired. Try again later.")]
    CooldownNotExpired,
    #[msg("Faucet is empty.")]
    FaucetEmpty,
}
```

### CPI до Token Program
Програма мінтить токени від свого імені через CPI:
```rust
// Faucet програма викликає SPL Token Program
token::mint_to(
    CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        token::MintTo { ... },
        &[&[b"faucet", &[bump]]],  // PDA підписує
    ),
    amount,
)?;
```

### Faucet PDA як Mint Authority
Щоб програма могла мінтити токени сама —
вона повинна бути `mint_authority` для токена.
PDA програми підписує CPI без приватного ключа.

```
Faucet PDA  →  mint_authority для SPL Token
    ↓
При claim: Faucet PDA підписує MintTo через CPI
```

---

## Tasks

### Task 1 — Anchor програма: initialize
- [x] `anchor init token-faucet`
- [x] Структура `FaucetConfig`: mint, amount_per_claim, cooldown_seconds
- [x] Структура `UserClaim`: user, last_claim_at, total_claimed
- [x] Інструкція `initialize(amount_per_claim, cooldown_seconds)`
- [x] PDA для faucet: seeds `[b"faucet"]`
- [x] Зберегти config в акаунті

> Підказка: `FaucetConfig` зберігає глобальні налаштування фосету.
> `initialize` викликається один раз адміном при деплої.
> Порахуй `space` для обох структур.

---

### Task 2 — Anchor програма: claim
- [x] Інструкція `claim()`
- [x] Створити `UserClaim` акаунт при першому claim (init_if_needed)
- [x] Перевірити cooldown через `Clock::get()`
- [x] Custom error `CooldownNotExpired`
- [x] CPI до Token Program: `mint_to` на ATA користувача
- [x] Оновити `last_claim_at` і `total_claimed`

> Підказка: `init_if_needed` в атрибуті акаунта створює акаунт
> якщо він не існує, або використовує існуючий:
> ```rust
> #[account(
>     init_if_needed,
>     payer = user,
>     space = 8 + 32 + 8 + 8,
>     seeds = [b"user-claim", user.key().as_ref()],
>     bump
> )]
> pub user_claim: Account<'info, UserClaim>,
> ```
> Додай `features = ["init-if-needed"]` в `Cargo.toml` для anchor-lang

---

### Task 3 — Тести
- [x] Тест успішного claim
- [x] Тест що другий claim до cooldown повертає помилку
- [x] Тест claim після cooldown (маніпуляція часом через `warp_to_slot`)

> Підказка: в тестах можна змінити час через:
> ```ts
> await provider.context.banksClient.warpToSlot(BigInt(1000));
> ```
> Або простіше — встанови cooldown = 1 секунда для тестів.

---

### Task 4 — Підготовка токена і деплой
- [ ] Створити SPL токен (можна скриптом або з проєкту #05)
- [ ] Встановити Faucet PDA як mint_authority токена
- [ ] Змінити `cluster = "devnet"` в `Anchor.toml`
- [ ] `anchor build && anchor deploy`
- [ ] Скопіювати IDL і types у фронтенд

> Підказка: зміна mint_authority:
> ```ts
> import { setAuthority, AuthorityType } from "@solana/spl-token";
> await setAuthority(connection, payer, mint, currentAuthority,
>   AuthorityType.MintTokens, faucetPDA);
> ```

---

### Task 5 — FaucetCard компонент
- [ ] Показати: назва токена, кількість за один claim
- [ ] Кнопка "Claim" — викликає інструкцію
- [ ] Після claim показати cooldown таймер (зворотній відлік)
- [ ] Стан завантаження під час транзакції
- [ ] Показати баланс токена користувача

> Підказка: cooldown таймер через `setInterval`:
> ```ts
> const remaining = lastClaimAt + cooldown - Math.floor(Date.now() / 1000);
> // оновлюй кожну секунду через setInterval
> // очищай через clearInterval в useEffect cleanup
> ```

---

### Task 6 — ClaimHistory компонент
- [ ] Отримати `UserClaim` акаунт користувача
- [ ] Показати: total_claimed, last_claim_at
- [ ] Показати час до наступного доступного claim

---

## Definition of Done
- [ ] Перший claim створює UserClaim акаунт і видає токени
- [ ] Повторний claim до cooldown повертає помилку з повідомленням
- [ ] Після cooldown claim знову доступний
- [ ] Cooldown таймер відображається в реальному часі
- [ ] Тести проходять (`anchor test`)
- [ ] Немає `any` типів у TypeScript

---

## Що закріплюємо
| Концепт | Де використовується |
|---------|-------------------|
| Rate limiting on-chain | `last_claim_at` + `Clock::get()` |
| Custom errors | `#[error_code]` enum |
| `init_if_needed` | створення акаунта при першому використанні |
| CPI до Token Program | `mint_to` через `CpiContext::new_with_signer` |
| PDA як підписант | faucet PDA підписує CPI без приватного ключа |
| `setAuthority` | передача mint_authority програмі |
| Cooldown таймер | `setInterval` + `useEffect` cleanup |
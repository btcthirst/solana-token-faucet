# 🛠️ Solana Token Faucet

**Solana Token Faucet** — це сучасний вебдодаток для роздачі тестових токенів (SPL) користувачам у мережі Solana (Devnet). Проєкт реалізує механізм **on-chain rate limiting**, що дозволяє контролювати частоту запитів безпосередньо в смартконтракті.

---

## 🚀 Основні Можливості

-   **On-chain Cooldown**: Смартконтракт Rust (Anchor) перевіряє час останнього отримання токенів, запобігаючи зловживанням (наприклад, ліміт 24 години).
-   **Автоматичний Mint**: Програма виступає в ролі `mint_authority` і самостійно мінтить токени для користувача через CPI (Cross-Program Invocation).
-   **Сучасний Frontend**: Інтерфейс на базі **Next.js 14 (App Router)** з підтримкою гаманців Solana.
-   **Зворотний відлік (Cooldown Timer)**: Веб-інтерфейс у реальному часі показує, коли користувач зможе знову отримати токени.
-   **Історія запитів**: Відображення загальної кількості отриманих токенів та часу останньої транзакції.

---

## 🛠️ Технологічний Стек

-   **Smart Contract**: Rust, Anchor Framework.
-   **Frontend**: Next.js 14, Tailwind CSS, TypeScript.
-   **Web3**: `@solana/web3.js`, `@coral-xyz/anchor`, `@solana/spl-token`.
-   **Wallet**: Стандартні Solana Wallet Adapters.

---

## 🏗️ Структура Проєкту

```text
token-faucet/
├── programs/token-faucet/src/  # Смартконтракт на Rust
├── frontend/                   # Веб-додаток (Next.js)
│   ├── app/                    # Сторінки та UI компоненти
│   └── utils/                  # Логіка взаємодії з Solana
├── tests/                      # Інтеграційні тести (Mocha/TypeScript)
├── Anchor.toml                 # Конфігурація Anchor
└── TASKS.md                    # Список завдань та прогрес розробки
```

---

## ⚙️ Початок Роботи

### Попередня підготовка
1. Встановіть [Solana Tool Suite](https://docs.solana.com/cli/install-solana-cli-toolsuite).
2. Встановіть [Anchor Version Manager (AVM)](https://www.anchor-lang.com/docs/installation).
3. Встановіть Node.js та Yarn/NPM.

### Підготовка Смартконтракту
1.  Складіть програму:
    ```bash
    anchor build
    ```
2.  Запустіть тести:
    ```bash
    anchor test
    ```
3.  Деплой у Devnet:
    ```bash
    anchor deploy
    ```

### Налаштування Фронтенду
1.  Перейдіть у папку `frontend`:
    ```bash
    cd frontend
    ```
2.  Встановіть залежності:
    ```bash
    yarn install
    ```
3.  Створіть `.env.local` на основі `.env.example` та вкажіть Program ID.
4.  Запустіть додаток:
    ```bash
    yarn dev
    ```

---

## 🔒 Безпека та Обмеження

Проєкт використовує PDA (Program Derived Address) як власника (`mint_authority`) вашого SPL токена. Це гарантує, що тільки смартконтракт фосету може створювати нові токени, дотримуючись правил періоду очікування (cooldown).

---

## 📄 Ліцензія

Цей проєкт розповсюджується під ліцензією **MIT**. Перегляньте файл [LICENSE](./LICENSE) для отримання детальної інформації.

---

## ✍️ Автор
Створено командою **Antigravity**.

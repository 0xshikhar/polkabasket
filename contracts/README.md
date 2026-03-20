# Paseo-first contract workflow

## Deploy

```bash
# Local development
npx hardhat --network hardhat run scripts/deploy.ts

# Paseo (default target)
npx hardhat --network paseo run scripts/deploy.ts

# Westend (optional)
npx hardhat --network westend run scripts/deploy.ts
```

## Useful npm scripts (run from `contracts/`)

```bash
npm run deploy:local
npm run deploy:paseo
npm run redeploy:paseo
npm run deploy:westend
npm run health:paseo
npm run check:basket
npm run check:xcm
npm run simulate:deposit
npm run disable:xcm
```
